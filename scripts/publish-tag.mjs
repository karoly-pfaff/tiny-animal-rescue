import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { approvalRecordFromGithub } from './lib/approval-policy.mjs';
import { createGithubHistoryClient, deriveMainEvidence } from './lib/github-history.mjs';
import { commitsBetween, git } from './lib/history-repository.mjs';
import { mergeApprovalCommentIdFromBody, validateHistoryPolicy } from './lib/history-policy.mjs';
import { inspectionRecordFromGithub } from './lib/inspection-policy.mjs';
import {
  assetInventoryDigest,
  candidateVersion,
  verifyQualifiedMedia,
} from './lib/media-qualification.mjs';
import { validateRequiredQualityChecks } from './lib/merge-policy.mjs';
import { requiredEnvironment, requiredWorkflowArguments } from './lib/workflow-input.mjs';

function releaseMessage(input, tag) {
  return [
    input.pullRequest.body,
    `Merge-Approval-Comment: #${tag.mergeApprovalCommentId}`,
    tag.inspectionCommentId === undefined
      ? 'Inspection-Comment: none'
      : `Inspection-Comment: #${tag.inspectionCommentId}`,
    `Approval-Comment: #${tag.approvalCommentId}`,
    `Squash: ${tag.squashSha}`,
    `Artifact-Digest: ${tag.artifactDigest}`,
    `Asset-Inventory-Digest: ${tag.assetInventoryDigest}`,
  ].join('\n');
}

function requiredArgument(name) {
  const index = process.argv.indexOf(name);
  const value = index === -1 ? undefined : process.argv[index + 1];
  if (value === undefined || value.length === 0) throw new Error(`Missing ${name}.`);
  return value;
}

function optionalArgument(name) {
  const index = process.argv.indexOf(name);
  const value = index === -1 ? undefined : process.argv[index + 1];
  return value === undefined || value.length === 0 ? undefined : value;
}

async function releaseFiles() {
  const [product, pack, approvalPolicy, inspectionPolicy] = await Promise.all([
    readFile('package.json', 'utf8').then(JSON.parse),
    readFile('content/base/pack.json', 'utf8').then(JSON.parse),
    readFile('deploy/github/approval-policy.json', 'utf8').then(JSON.parse),
    readFile('deploy/github/inspection-policy.json', 'utf8').then(JSON.parse),
  ]);
  if (product.version !== pack.version) throw new Error('Product and base-pack versions differ.');
  return {
    version: product.version,
    approver: approvalPolicy.approver,
    inspectionPolicy,
  };
}

async function qualifiedReleaseMetadata(qualification, expectedHeadSha, expectedPolicySha) {
  const files = await releaseFiles();
  const evidence = await verifyQualifiedMedia({
    source: '.',
    qualification,
    expectedHeadSha,
    expectedPolicySha,
    artifactNamePrefix: files.inspectionPolicy.artifactNamePrefix,
  });
  return { ...files, ...evidence };
}

async function rebuiltReleaseMetadata(evidencePath, expectedHeadSha) {
  const [files, evidence, version, inventoryDigest] = await Promise.all([
    releaseFiles(),
    readFile(evidencePath, 'utf8').then(JSON.parse),
    candidateVersion('.'),
    assetInventoryDigest('.'),
  ]);
  if (
    evidence.headSha !== expectedHeadSha ||
    evidence.version !== version ||
    evidence.assetInventoryDigest !== inventoryDigest ||
    !/^sha256:[0-9a-f]{64}$/u.test(evidence.artifactDigest ?? '')
  ) {
    throw new Error('Rebuilt release evidence does not match the exact non-inspected candidate.');
  }
  return { ...files, ...evidence };
}

const { pullNumber, inspectionCommentId, approvalCommentId } = requiredWorkflowArguments(
  'publish-tag',
  { inspectionRequired: false },
);
const repository = requiredEnvironment('GITHUB_REPOSITORY');
const token = requiredEnvironment('GITHUB_TOKEN');
const qualification = optionalArgument('--qualification');
const evidencePath = requiredArgument('--evidence');
const qualificationRun = Number(optionalArgument('--qualification-run'));
const { github, pullRequestInput, trustedQualityChecksForCommit } = createGithubHistoryClient(
  repository,
  token,
);
const pullRequest = await github(`/pulls/${pullNumber}`);
if (pullRequest.merged !== true || pullRequest.merge_commit_sha === null)
  throw new Error('Tag publication accepts only a merged canonical pull request.');
if (git(['rev-parse', 'HEAD']) !== pullRequest.merge_commit_sha)
  throw new Error('Workflow checkout does not match the merged squash SHA.');
const qualificationPolicySha = git(['rev-parse', `${pullRequest.merge_commit_sha}^`]);
const input = await pullRequestInput(pullRequest, 'tag');
const requiresInspection = input.item.requiresInspection;
if (
  requiresInspection !== (inspectionCommentId !== undefined) ||
  requiresInspection !==
    (qualification !== undefined && Number.isInteger(qualificationRun) && qualificationRun > 0)
) {
  throw new Error('Tag inputs do not match the work-item inspection policy.');
}
const [approval, inspection, metadata] = await Promise.all([
  github(`/issues/comments/${approvalCommentId}`).then(approvalRecordFromGithub),
  inspectionCommentId === undefined
    ? undefined
    : github(`/issues/comments/${inspectionCommentId}`).then((comment) =>
        inspectionRecordFromGithub(comment, { github, repository }),
      ),
  requiresInspection
    ? qualifiedReleaseMetadata(qualification, pullRequest.head.sha, qualificationPolicySha)
    : rebuiltReleaseMetadata(evidencePath, pullRequest.merge_commit_sha),
]);
if (
  requiresInspection &&
  (inspection.artifact?.workflowRun?.id !== qualificationRun ||
    inspection.artifact?.name !== metadata.artifactName)
) {
  throw new Error('Downloaded media qualification differs from the inspection provider artifact.');
}
const [inspectedCommit, squashCommit] = await Promise.all([
  github(`/commits/${pullRequest.head.sha}`),
  github(`/commits/${pullRequest.merge_commit_sha}`),
]);
const mergeApprovalCommentId = mergeApprovalCommentIdFromBody(squashCommit.commit.message);
if (!Number.isInteger(mergeApprovalCommentId) || mergeApprovalCommentId <= 0) {
  throw new Error('Merged squash does not bind an immutable merge-approval comment.');
}
if (mergeApprovalCommentId === approvalCommentId) {
  throw new Error('Tag approval must be a new comment distinct from merge approval.');
}
const mergeApproval = await github(`/issues/comments/${mergeApprovalCommentId}`).then(
  approvalRecordFromGithub,
);

const mainInput = await pullRequestInput(pullRequest, 'main');
const squashParent = git(['rev-parse', `${pullRequest.merge_commit_sha}^`]);
const squashCommits = commitsBetween(squashParent, pullRequest.merge_commit_sha);
mainInput.main = deriveMainEvidence({
  pushedCommits: squashCommits,
  parentCounts: Object.fromEntries(
    squashCommits.map((commit) => [
      commit.sha,
      git(['rev-list', '--parents', '-n', '1', commit.sha]).split(' ').length - 1,
    ]),
  ),
  treeMatchesApprovedHead: inspectedCommit.commit.tree.sha === squashCommit.commit.tree.sha,
});
const mainFindings = [...validateHistoryPolicy(mainInput)];
const quality = await trustedQualityChecksForCommit(pullRequest.merge_commit_sha, 'push', 'main');
mainFindings.push(
  ...validateRequiredQualityChecks(quality.checkRuns, quality.expectation, quality.workflowRuns),
);
if (mainFindings.length > 0) throw new Error(mainFindings.join('\n'));

const tagName = `v${metadata.version}`;
input.tag = {
  annotated: true,
  name: tagName,
  targetSha: pullRequest.merge_commit_sha,
  squashSha: pullRequest.merge_commit_sha,
  artifactDigest: metadata.artifactDigest,
  assetInventoryDigest: metadata.assetInventoryDigest,
  observedArtifactDigest: metadata.artifactDigest,
  observedAssetInventoryDigest: metadata.assetInventoryDigest,
  inspectionCommentId,
  mergeApprovalCommentId,
  approvalCommentId,
  approver: metadata.approver,
  approval,
  mergeApproval,
  inspection,
  repository,
  requiredLocales: metadata.inspectionPolicy.requiredLocales,
  requiredInputs: metadata.inspectionPolicy.requiredInputs,
  requiredViewports: metadata.inspectionPolicy.requiredViewports,
  artifactNamePrefix: metadata.inspectionPolicy.artifactNamePrefix,
  artifactWorkflowPath: metadata.inspectionPolicy.artifactWorkflowPath,
  artifactWorkflowEvent: metadata.inspectionPolicy.artifactWorkflowEvent,
  artifactWorkflowBranch: metadata.inspectionPolicy.artifactWorkflowBranch,
  artifactWorkflowHeadSha: metadata.policySha,
  treeMatchesInspectedHead: inspectedCommit.commit.tree.sha === squashCommit.commit.tree.sha,
};
input.tag.message = releaseMessage(input, input.tag);
const findings = validateHistoryPolicy(input);
if (findings.length > 0) throw new Error(findings.join('\n'));

const remoteReference = git(['ls-remote', '--tags', 'origin', `refs/tags/${tagName}`]);
if (remoteReference.length > 0) throw new Error(`Release tag ${tagName} already exists.`);
await mkdir('build/release-tag', { recursive: true });
await Promise.all([
  writeFile('build/release-tag/tag-name.txt', `${tagName}\n`),
  writeFile('build/release-tag/tag-sha.txt', `${input.tag.squashSha}\n`),
  writeFile('build/release-tag/tag-message.txt', `${input.tag.message}\n`),
]);
console.log(`Prepared approved annotated tag ${tagName} at ${input.tag.squashSha}.`);
