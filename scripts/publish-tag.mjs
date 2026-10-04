import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { approvalRecordFromGithub } from './lib/approval-policy.mjs';
import { createGithubHistoryClient, deriveMainEvidence } from './lib/github-history.mjs';
import { commitsBetween, git, isAncestor } from './lib/history-repository.mjs';
import { mergeApprovalCommentIdFromBody, validateHistoryPolicy } from './lib/history-policy.mjs';
import { inspectionRecordFromGithub } from './lib/inspection-policy.mjs';
import {
  assetInventoryDigest,
  candidateVersion,
  verifyQualifiedMedia,
} from './lib/media-qualification.mjs';
import { validateRequiredQualityChecks } from './lib/merge-policy.mjs';
import {
  releasePredecessorTag,
  remoteTagHistoryDigest,
  remoteTagNames,
  validatePolicyAuthority,
  validateTagSequence,
  validateTagTargetAncestry,
  validateTagTargetCheckout,
} from './lib/tag-publication-policy.mjs';
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

async function releaseFiles(candidate) {
  const [product, pack, approvalPolicy, inspectionPolicy] = await Promise.all([
    readFile(path.join(candidate, 'package.json'), 'utf8').then(JSON.parse),
    readFile(path.join(candidate, 'content/base/pack.json'), 'utf8').then(JSON.parse),
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

async function qualifiedReleaseMetadata(
  candidate,
  qualification,
  expectedHeadSha,
  expectedPolicySha,
) {
  const files = await releaseFiles(candidate);
  const evidence = await verifyQualifiedMedia({
    source: candidate,
    qualification,
    expectedHeadSha,
    expectedPolicySha,
    artifactNamePrefix: files.inspectionPolicy.artifactNamePrefix,
  });
  return { ...files, ...evidence };
}

async function rebuiltReleaseMetadata(candidate, evidencePath, expectedHeadSha) {
  const [files, evidence, version, inventoryDigest] = await Promise.all([
    releaseFiles(candidate),
    readFile(evidencePath, 'utf8').then(JSON.parse),
    candidateVersion(candidate),
    assetInventoryDigest(candidate),
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
const workflowRef = requiredEnvironment('GITHUB_REF');
const workflowSha = requiredEnvironment('GITHUB_SHA');
const candidate = requiredArgument('--candidate');
const qualification = optionalArgument('--qualification');
const evidencePath = requiredArgument('--evidence');
const qualificationRun = Number(optionalArgument('--qualification-run'));
const { github, pullRequestInput, trustedQualityChecksForCommit } = createGithubHistoryClient(
  repository,
  token,
  { workItemRoot: candidate },
);
const [pullRequest, mainReference] = await Promise.all([
  github(`/pulls/${pullNumber}`),
  github('/git/ref/heads/main'),
]);
if (pullRequest.merged !== true || pullRequest.merge_commit_sha === null)
  throw new Error('Tag publication accepts only a merged canonical pull request.');
const policySha = git(['rev-parse', 'HEAD']);
const candidateSha = git(['-C', candidate, 'rev-parse', 'HEAD']);
const targetFindings = [
  ...validatePolicyAuthority({
    workflowRef,
    workflowSha,
    policySha,
    protectedMainSha: mainReference.object.sha,
  }),
  ...validateTagTargetAncestry({
    targetSha: pullRequest.merge_commit_sha,
    policySha,
    targetIsAncestor: isAncestor(pullRequest.merge_commit_sha, policySha),
  }),
  ...validateTagTargetCheckout({ targetSha: pullRequest.merge_commit_sha, candidateSha }),
];
if (targetFindings.length > 0) throw new Error(targetFindings.join('\n'));
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
    ? qualifiedReleaseMetadata(
        candidate,
        qualification,
        pullRequest.head.sha,
        qualificationPolicySha,
      )
    : rebuiltReleaseMetadata(candidate, evidencePath, pullRequest.merge_commit_sha),
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
const parentVersion = JSON.parse(
  git(['show', `${pullRequest.merge_commit_sha}^:package.json`]),
).version;
const predecessorTag = releasePredecessorTag({ tagName, parentVersion });
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

const remoteTagOutput = git(['ls-remote', '--refs', '--tags', 'origin', 'refs/tags/v*']);
const remoteTags = remoteTagNames(remoteTagOutput);
const sequenceFindings = validateTagSequence({ tagName, predecessorTag, existingTags: remoteTags });
if (sequenceFindings.length > 0) throw new Error(sequenceFindings.join('\n'));
if (predecessorTag === undefined) throw new Error('Release tag has no supported predecessor.');
await mkdir('build/release-tag', { recursive: true });
await Promise.all([
  writeFile('build/release-tag/tag-name.txt', `${tagName}\n`),
  writeFile('build/release-tag/tag-sha.txt', `${input.tag.squashSha}\n`),
  writeFile('build/release-tag/policy-sha.txt', `${policySha}\n`),
  writeFile('build/release-tag/predecessor-tag.txt', `${predecessorTag ?? 'none'}\n`),
  writeFile(
    'build/release-tag/tag-history-digest.txt',
    `${remoteTagHistoryDigest(remoteTagOutput)}\n`,
  ),
  writeFile('build/release-tag/tag-message.txt', `${input.tag.message}\n`),
]);
console.log(`Prepared approved annotated tag ${tagName} at ${input.tag.squashSha}.`);
