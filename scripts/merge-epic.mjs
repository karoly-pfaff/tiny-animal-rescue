import { readFile } from 'node:fs/promises';
import { approvalRecordFromGithub } from './lib/approval-policy.mjs';
import { createGithubHistoryClient } from './lib/github-history.mjs';
import { git } from './lib/history-repository.mjs';
import { inspectionRecordFromGithub } from './lib/inspection-policy.mjs';
import {
  validateCurrentMainAncestry,
  validateEvidenceVersion,
  validateMergeCandidate,
  validateMergeSnapshot,
} from './lib/merge-policy.mjs';
import { requiredEnvironment, requiredWorkflowArguments } from './lib/workflow-input.mjs';

function requiredArgument(name) {
  const index = process.argv.indexOf(name);
  const value = index === -1 ? undefined : process.argv[index + 1];
  if (value === undefined || value.length === 0) throw new Error(`Missing ${name}.`);
  return value;
}

const { pullNumber, inspectionCommentId, approvalCommentId } = requiredWorkflowArguments(
  'merge-epic',
  { inspectionRequired: false },
);
const repository = requiredEnvironment('GITHUB_REPOSITORY');
const token = requiredEnvironment('GITHUB_TOKEN');
if (requiredEnvironment('GITHUB_REF') !== 'refs/heads/main') {
  throw new Error('Authorization must execute from the trusted main ref.');
}
const evidencePath = requiredArgument('--evidence');
const qualificationRun = Number(requiredArgument('--qualification-run'));
const digestPattern = /^sha256:[0-9a-f]{64}$/u;
const { github, pullRequestInput, trustedQualityChecksForCommit } = createGithubHistoryClient(
  repository,
  token,
);

const [pullRequest, approvalPolicy, inspectionPolicy, evidence] = await Promise.all([
  github(`/pulls/${pullNumber}`),
  readFile('deploy/github/approval-policy.json', 'utf8').then(JSON.parse),
  readFile('deploy/github/inspection-policy.json', 'utf8').then(JSON.parse),
  readFile(evidencePath, 'utf8').then(JSON.parse),
]);

const postAuthorization = (state, description) =>
  github(`/statuses/${pullRequest.head.sha}`, {
    method: 'POST',
    body: JSON.stringify({ state, context: 'authorization', description }),
  });

await postAuthorization('pending', 'Exact candidate authorization is being validated.');
try {
  if (pullRequest.base.ref !== 'main' || pullRequest.state !== 'open' || pullRequest.draft) {
    throw new Error(
      'Merge automation accepts only an open, non-draft work-item pull request targeting main.',
    );
  }
  if (pullRequest.base.sha !== git(['rev-parse', 'HEAD']))
    throw new Error('Pull request is not based on the current trusted main commit.');
  const comparison = await github(`/compare/${pullRequest.base.sha}...${pullRequest.head.sha}`);
  const ancestryFindings = validateCurrentMainAncestry({
    baseSha: pullRequest.base.sha,
    headSha: pullRequest.head.sha,
    comparison,
  });
  if (ancestryFindings.length > 0) throw new Error(ancestryFindings.join('\n'));
  const currentHistory = await pullRequestInput(pullRequest, 'pull-request');
  if (currentHistory.headSha !== currentHistory.pullRequest.headSha)
    throw new Error('Canonical pull-request head identity is inconsistent.');
  if (git(['rev-parse', 'HEAD']) !== git(['rev-parse', 'origin/main']))
    throw new Error('Authorization policy checkout is not trusted main.');
  if (evidence.headSha !== currentHistory.headSha)
    throw new Error('Validation evidence does not match the exact pull-request head.');
  const versionFindings = validateEvidenceVersion(evidence.version, currentHistory.item.version);
  if (versionFindings.length > 0) throw new Error(versionFindings.join('\n'));
  if (
    !digestPattern.test(evidence.artifactDigest ?? '') ||
    !digestPattern.test(evidence.assetInventoryDigest ?? '')
  ) {
    throw new Error('Validation evidence digests are malformed.');
  }
  if (currentHistory.item.requiresInspection !== (inspectionCommentId !== undefined)) {
    throw new Error('Inspection-comment input does not match the work-item inspection policy.');
  }
  if (
    currentHistory.item.requiresInspection !==
    (Number.isInteger(qualificationRun) && qualificationRun > 0)
  ) {
    throw new Error('Qualification-run input does not match the work-item inspection policy.');
  }
  const [approval, inspection, quality] = await Promise.all([
    github(`/issues/comments/${approvalCommentId}`).then(approvalRecordFromGithub),
    inspectionCommentId === undefined
      ? undefined
      : github(`/issues/comments/${inspectionCommentId}`).then((comment) =>
          inspectionRecordFromGithub(comment, { github, repository }),
        ),
    trustedQualityChecksForCommit(pullRequest.head.sha, 'pull_request', pullRequest.head.ref),
  ]);
  const findings = validateMergeCandidate(currentHistory, quality.checkRuns, {
    approval,
    approvalExpectation: {
      operation: 'merge',
      commentId: approvalCommentId,
      pullNumber,
      targetSha: pullRequest.head.sha,
      version: currentHistory.item.version,
      inspectionCommentId,
      approver: approvalPolicy.approver,
    },
    inspection,
    inspectionExpectation:
      inspectionCommentId === undefined
        ? undefined
        : {
            commentId: inspectionCommentId,
            pullNumber,
            targetSha: pullRequest.head.sha,
            version: currentHistory.item.version,
            ownerLogin: approvalPolicy.approver,
            repository,
            requiredLocales: inspectionPolicy.requiredLocales,
            requiredInputs: inspectionPolicy.requiredInputs,
            requiredViewports: inspectionPolicy.requiredViewports,
            requiredJourneys: currentHistory.item.inspectionJourneys,
            artifactNamePrefix: inspectionPolicy.artifactNamePrefix,
            artifactWorkflowPath: inspectionPolicy.artifactWorkflowPath,
            artifactWorkflowEvent: inspectionPolicy.artifactWorkflowEvent,
            artifactWorkflowBranch: inspectionPolicy.artifactWorkflowBranch,
            artifactWorkflowHeadSha: evidence.policySha,
            ...evidence,
          },
    qualityExpectation: quality.expectation,
    qualityWorkflowRuns: quality.workflowRuns,
  });
  if (
    inspection !== undefined &&
    (inspection.artifact?.workflowRun?.id !== qualificationRun ||
      evidence.qualificationRunId !== qualificationRun ||
      inspection.artifact?.name !== evidence.artifactName)
  ) {
    findings.push('Downloaded media qualification differs from the inspection provider artifact.');
  }
  if (findings.length > 0) throw new Error(findings.join('\n'));
  const [freshPullRequest, freshMain] = await Promise.all([
    github(`/pulls/${pullNumber}`),
    github('/git/ref/heads/main'),
  ]);
  const snapshotFindings = validateMergeSnapshot({
    expectedBaseSha: pullRequest.base.sha,
    expectedHeadSha: pullRequest.head.sha,
    pullRequest: freshPullRequest,
    mainSha: freshMain.object?.sha,
  });
  if (snapshotFindings.length > 0) throw new Error(snapshotFindings.join('\n'));
  const result = await github(`/pulls/${pullNumber}/merge`, {
    method: 'PUT',
    body: JSON.stringify({
      merge_method: 'squash',
      sha: pullRequest.head.sha,
      commit_title: pullRequest.title,
      commit_message: `${pullRequest.body}\nMerge-Approval-Comment: #${approvalCommentId}`,
    }),
  });
  if (result.merged !== true)
    throw new Error(`Provider refused the squash merge: ${result.message}.`);
  await postAuthorization(
    'success',
    'Owner approval and candidate evidence were exact at protected merge.',
  );
  console.log(`Squash-merged pull request #${pullNumber} at ${result.sha}.`);
} catch (error) {
  await postAuthorization('failure', 'Exact candidate authorization failed or was revoked.');
  throw error;
}
