import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { approvalRecordFromGithub } from './lib/approval-policy.mjs';
import { createGithubHistoryClient } from './lib/github-history.mjs';
import { generateAuthorizedSquashMessage } from './lib/history-policy.mjs';
import { git } from './lib/history-repository.mjs';
import { inspectionRecordFromGithub } from './lib/inspection-policy.mjs';
import {
  validateCandidateCheckoutIdentity,
  validateCurrentMainAncestry,
  validateEvidenceVersion,
  latestTrustedQualityRun,
  validateMergedCommitIdentity,
  validateMergeCandidate,
  validateMergeSnapshot,
  validateOwnerEvidenceProvenance,
  validateRequiredQualityChecks,
} from './lib/merge-policy.mjs';
import { requiredEnvironment, requiredWorkflowArguments } from './lib/workflow-input.mjs';

function requiredArgument(name) {
  const index = process.argv.indexOf(name);
  const value = index === -1 ? undefined : process.argv[index + 1];
  if (value === undefined || value.length === 0) throw new Error(`Missing ${name}.`);
  return value;
}

function githubCli(arguments_) {
  const result = spawnSync('gh', arguments_, { encoding: 'utf8' });
  if (result.status !== 0) {
    throw new Error(result.stderr.trim() || `gh ${arguments_.join(' ')} failed.`);
  }
  return result.stdout.trim();
}

function checkedCommand(command, arguments_, cwd) {
  const result = spawnSync(command, arguments_, { cwd, encoding: 'utf8', stdio: 'pipe' });
  if (result.status !== 0) {
    throw new Error(
      result.stderr?.trim() ||
        result.stdout?.trim() ||
        `${command} ${arguments_.join(' ')} failed.`,
    );
  }
}

function validateOwnerCandidatePolicy(candidateRoot, trustedRoot) {
  checkedCommand(
    process.execPath,
    [resolve(trustedRoot, 'scripts/validate-repository-policy.mjs')],
    candidateRoot,
  );
}

function prepareQualifiedOwnerEvidence({
  candidateRoot,
  currentHistory,
  inspection,
  inspectionPolicy,
  output,
  policySha,
  qualificationRun,
  repository,
  temporaryRoot,
  trustedRoot,
}) {
  if (
    inspection?.artifact?.name === undefined ||
    inspection.artifact.workflowRun?.id !== qualificationRun
  ) {
    throw new Error('Inspection does not identify the requested provider qualification artifact.');
  }
  const qualification = join(temporaryRoot, 'qualification');
  githubCli([
    'run',
    'download',
    String(qualificationRun),
    '--name',
    inspection.artifact.name,
    '--dir',
    qualification,
    '--repo',
    repository,
  ]);
  checkedCommand(
    process.execPath,
    [
      resolve(trustedRoot, 'scripts/verify-qualified-media.mjs'),
      '--source',
      candidateRoot,
      '--qualification',
      qualification,
      '--expected-head',
      currentHistory.headSha,
      '--expected-policy',
      policySha,
      '--artifact-prefix',
      inspectionPolicy.artifactNamePrefix,
      '--qualification-run',
      String(qualificationRun),
      '--output',
      output,
    ],
    trustedRoot,
  );
}

function prepareQualityOwnerEvidence({
  candidateRoot,
  output,
  quality,
  repository,
  temporaryRoot,
  trustedRoot,
}) {
  const qualityFindings = validateRequiredQualityChecks(
    quality.checkRuns,
    quality.expectation,
    quality.workflowRuns,
  );
  if (qualityFindings.length > 0) throw new Error(qualityFindings.join('\n'));
  const qualityRun = latestTrustedQualityRun(quality.workflowRuns, quality.expectation);
  if (qualityRun === undefined) throw new Error('Trusted quality workflow run is unavailable.');
  const artifact = join(temporaryRoot, 'quality-artifact');
  githubCli([
    'run',
    'download',
    String(qualityRun.id),
    '--name',
    `browser-${qualityRun.id}-${qualityRun.runAttempt}`,
    '--dir',
    artifact,
    '--repo',
    repository,
  ]);
  checkedCommand(
    process.execPath,
    [
      resolve(trustedRoot, 'scripts/prepare-merge-evidence.mjs'),
      '--candidate',
      candidateRoot,
      '--artifact',
      artifact,
      '--quality-run',
      String(qualityRun.id),
      '--output',
      output,
    ],
    trustedRoot,
  );
  return qualityRun;
}

async function prepareOwnerEvidence(options) {
  const temporaryRoot = await mkdtemp(join(tmpdir(), 'tiny-rescue-merge-'));
  const output = join(temporaryRoot, 'release-evidence.json');
  const trustedRoot = process.cwd();
  try {
    const qualityRun = options.currentHistory.item.requiresInspection
      ? undefined
      : prepareQualityOwnerEvidence({ ...options, output, temporaryRoot, trustedRoot });
    if (options.currentHistory.item.requiresInspection) {
      prepareQualifiedOwnerEvidence({ ...options, output, temporaryRoot, trustedRoot });
    }
    const evidence = JSON.parse(await readFile(output, 'utf8'));
    const provenanceFindings = validateOwnerEvidenceProvenance({
      requiresInspection: options.currentHistory.item.requiresInspection,
      source: qualityRun === undefined ? 'trusted-qualified-media' : 'trusted-quality-artifact',
      qualificationRunId: options.qualificationRun,
      evidenceQualificationRunId: evidence.qualificationRunId,
      qualityRunId: qualityRun?.id,
      evidenceQualityRunId: evidence.qualityRunId,
    });
    if (provenanceFindings.length > 0) throw new Error(provenanceFindings.join('\n'));
    return evidence;
  } finally {
    await rm(temporaryRoot, { recursive: true, force: true });
  }
}

const { pullNumber, inspectionCommentId, approvalCommentId } = requiredWorkflowArguments(
  'merge-epic',
  { inspectionRequired: false },
);
const ownerSession = process.argv.includes('--owner-session');
const repository = ownerSession
  ? githubCli(['repo', 'view', '--json', 'nameWithOwner', '--jq', '.nameWithOwner'])
  : requiredEnvironment('GITHUB_REPOSITORY');
const token = ownerSession ? githubCli(['auth', 'token']) : requiredEnvironment('GITHUB_TOKEN');
if (ownerSession) {
  if (git(['branch', '--show-current']) !== 'main') {
    throw new Error('Owner-session merge must execute from a checked-out trusted main branch.');
  }
  if (git(['status', '--porcelain']) !== '') {
    throw new Error('Owner-session merge requires a clean trusted main checkout.');
  }
} else if (requiredEnvironment('GITHUB_REF') !== 'refs/heads/main') {
  throw new Error('Authorization must execute from the trusted main ref.');
}
const evidencePath = ownerSession ? undefined : requiredArgument('--evidence');
const qualificationRun = Number(requiredArgument('--qualification-run'));
const candidateRoot = requiredArgument('--candidate');
const digestPattern = /^sha256:[0-9a-f]{64}$/u;
const { github, pullRequestInput, trustedQualityChecksForCommit } = createGithubHistoryClient(
  repository,
  token,
  { workItemRoot: candidateRoot },
);

const [pullRequest, approvalPolicy, inspectionPolicy] = await Promise.all([
  github(`/pulls/${pullNumber}`),
  readFile('deploy/github/approval-policy.json', 'utf8').then(JSON.parse),
  readFile('deploy/github/inspection-policy.json', 'utf8').then(JSON.parse),
]);

const postAuthorization = (state, description) =>
  github(`/statuses/${pullRequest.head.sha}`, {
    method: 'POST',
    body: JSON.stringify({ state, context: 'authorization', description }),
  });

await postAuthorization('pending', 'Exact candidate authorization is being validated.');
try {
  if (ownerSession) {
    const authenticatedLogin = githubCli(['api', 'user', '--jq', '.login']);
    if (authenticatedLogin.toLowerCase() !== approvalPolicy.approver.toLowerCase()) {
      throw new Error(
        'Owner-session merge is not authenticated as the configured repository owner.',
      );
    }
  }
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
  const candidateSha = git(['-C', candidateRoot, 'rev-parse', 'HEAD']);
  const candidateStatus = git(['-C', candidateRoot, 'status', '--porcelain']);
  if (candidateStatus !== '') throw new Error('Candidate checkout contains uncommitted changes.');
  if (ownerSession) validateOwnerCandidatePolicy(candidateRoot, process.cwd());
  const currentHistory = await pullRequestInput(pullRequest, 'pull-request');
  if (currentHistory.headSha !== currentHistory.pullRequest.headSha)
    throw new Error('Canonical pull-request head identity is inconsistent.');
  if (git(['rev-parse', 'HEAD']) !== git(['rev-parse', 'origin/main']))
    throw new Error('Authorization policy checkout is not trusted main.');
  const inspection =
    inspectionCommentId === undefined
      ? undefined
      : await github(`/issues/comments/${inspectionCommentId}`).then((comment) =>
          inspectionRecordFromGithub(comment, { github, repository }),
        );
  const [approval, quality] = await Promise.all([
    github(`/issues/comments/${approvalCommentId}`).then(approvalRecordFromGithub),
    trustedQualityChecksForCommit(pullRequest.head.sha, 'pull_request', pullRequest.head.ref),
  ]);
  const evidence = ownerSession
    ? await prepareOwnerEvidence({
        candidateRoot,
        currentHistory,
        inspection,
        policySha: git(['rev-parse', 'HEAD']),
        qualificationRun,
        repository,
        inspectionPolicy,
        quality,
      })
    : JSON.parse(await readFile(evidencePath, 'utf8'));
  const candidateIdentityFindings = validateCandidateCheckoutIdentity({
    checkoutSha: candidateSha,
    checkoutStatus: git(['-C', candidateRoot, 'status', '--porcelain']),
    pullRequestHeadSha: pullRequest.head.sha,
    evidenceHeadSha: evidence.headSha,
  });
  if (candidateIdentityFindings.length > 0) {
    throw new Error(candidateIdentityFindings.join('\n'));
  }
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
  const authorizedMessage = generateAuthorizedSquashMessage(currentHistory, approvalCommentId);
  const candidateCommit = await github(`/git/commits/${pullRequest.head.sha}`);
  await postAuthorization(
    'success',
    'Owner approval and exact candidate evidence are valid for protected merge.',
  );
  const result = await github(`/pulls/${pullNumber}/merge`, {
    method: 'PUT',
    body: JSON.stringify({
      merge_method: 'squash',
      sha: pullRequest.head.sha,
      commit_title: authorizedMessage.title,
      commit_message: authorizedMessage.body,
    }),
  });
  if (result.merged !== true)
    throw new Error(`Provider refused the squash merge: ${result.message}.`);
  const mergedCommit = await github(`/git/commits/${result.sha}`);
  const mergedIdentityFindings = validateMergedCommitIdentity({
    expectedBaseSha: pullRequest.base.sha,
    expectedTreeSha: candidateCommit.tree?.sha,
    commit: mergedCommit,
  });
  if (mergedIdentityFindings.length > 0) throw new Error(mergedIdentityFindings.join('\n'));
  console.log(`Squash-merged pull request #${pullNumber} at ${result.sha}.`);
} catch (error) {
  await postAuthorization('failure', 'Exact candidate authorization failed or was revoked.');
  throw error;
}
