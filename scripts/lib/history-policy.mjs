import { createHash } from 'node:crypto';
import { validateApprovalRecord } from './approval-policy.mjs';
import { validateInspectionRecord } from './inspection-policy.mjs';
import { isAllowedSubjectCase } from './commit-subject-policy.mjs';
import { validateWatermarkRecord } from './watermark-policy.mjs';

const allowedTypes = new Set([
  'build',
  'chore',
  'ci',
  'docs',
  'feat',
  'fix',
  'perf',
  'refactor',
  'revert',
  'test',
]);
const shaPattern = /^[0-9a-f]{40}$/u;
const digestPattern = /^sha256:[0-9a-f]{64}$/u;

export function mergeApprovalCommentIdFromBody(body) {
  const match = /^Merge-Approval-Comment: #(?<value>\d+)$/mu.exec(body ?? '');
  return Number(match?.groups?.value);
}

function push(findings, condition, message) {
  if (!condition) {
    findings.push(message);
  }
}

function expectedTitle(item) {
  const action = item.kind === 'epic' ? `deliver ${item.title}` : item.title;
  return `${item.commitType}(${item.id}): ${action.toLowerCase()}`;
}

function splitCommits(input) {
  if (input.item.kind !== 'epic') return { stories: input.commits, closures: [] };
  return {
    stories: input.commits.filter((commit) => commit.scope !== input.item.id),
    closures: input.commits.filter((commit) => commit.scope === input.item.id),
  };
}

function validateCommit(commit, input, findings) {
  push(findings, shaPattern.test(commit.sha), `${commit.sha}: commit identity must be a full SHA.`);
  const match = /^(?<type>[a-z]+)\((?<scope>[^)]+)\)(?<breaking>!)?: (?<description>.+)$/u.exec(
    commit.subject,
  );
  if (match?.groups === undefined) {
    findings.push(`${commit.sha}: subject is not a Conventional Commit.`);
    return;
  }
  const { type, scope, breaking, description } = match.groups;
  commit.scope = scope;
  push(findings, allowedTypes.has(type), `${commit.sha}: unsupported commit type ${type}.`);
  push(
    findings,
    input.item.kind === 'epic' || type === input.item.commitType,
    `${commit.sha}: commit type does not match ${input.item.id} policy.`,
  );
  push(
    findings,
    input.item.stories.includes(scope) || scope === input.item.id,
    `${commit.sha}: unknown scope ${scope}.`,
  );
  push(
    findings,
    commit.subject.length <= 72 && isAllowedSubjectCase(description) && !description.endsWith('.'),
    `${commit.sha}: subject style is invalid.`,
  );
  push(
    findings,
    breaking !== '!' || /^BREAKING CHANGE:/mu.test(commit.body ?? ''),
    `${commit.sha}: breaking marker has no footer.`,
  );
  findings.push(
    ...validateWatermarkRecord({
      channel: 'text',
      path: `commit:${commit.sha}`,
      content: `${commit.subject}\n${commit.body ?? ''}`,
    }),
  );
}

function validateBranch(input, findings, requireComplete) {
  push(
    findings,
    input.branch === input.item.branch,
    `${input.branch}: branch name does not match ${input.item.id}.`,
  );
  push(findings, input.mergeCommitCount === 0, 'Work-item branch contains merge commits.');
  push(findings, input.commits.length > 0, 'Work-item branch contains no canonical commit.');
  input.commits.forEach((commit) => validateCommit(commit, input, findings));
  const { stories, closures } = splitCommits(input);
  const observed = stories.map((commit) => commit.scope);
  for (const story of new Set(observed)) {
    push(
      findings,
      observed.filter((candidate) => candidate === story).length === 1,
      `${story} does not have exactly one canonical commit.`,
    );
  }
  const indexes = observed.map((story) => input.item.stories.indexOf(story));
  push(
    findings,
    indexes.every((value, index) => index === 0 || value >= indexes[index - 1]),
    'Canonical story commits are not in dependency order.',
  );
  push(findings, closures.length <= 1, 'Work-item branch contains more than one closure commit.');
  if (closures.length === 1) {
    const closure = closures[0];
    push(
      findings,
      closure === input.commits.at(-1) &&
        closure.subject === `chore(${input.item.id}): close milestone ${input.item.milestone}`,
      `${closure.sha}: closure commit is not the final canonical closure.`,
    );
  }
  if (requireComplete) {
    input.item.stories.forEach((story) =>
      push(findings, observed.includes(story), `Missing canonical commit for ${story}.`),
    );
  }
}

function evidenceDigest(input) {
  const { stories, closures } = splitCommits(input);
  const evidence = {
    item: input.item.id,
    kind: input.item.kind,
    milestone: input.item.milestone ?? 'none',
    version: input.item.version,
    pullRequest: input.pullRequest.number,
    stories: stories.map(({ scope, sha }) => [scope, sha]),
    closure: closures[0]?.sha ?? 'none',
    gate: input.item.aggregateGate,
  };
  return `sha256:${createHash('sha256').update(JSON.stringify(evidence)).digest('hex')}`;
}

export function generateSquashMessage(input) {
  const { stories, closures } = splitCommits(input);
  const identity =
    input.item.kind === 'epic'
      ? [`Epic: ${input.item.id}`, `Milestone: ${input.item.milestone}`]
      : [`Work-Item: ${input.item.id}`, `Kind: ${input.item.kind}`];
  const commitLabel = input.item.kind === 'epic' ? 'Story' : 'Commit';
  return {
    title: expectedTitle(input.item),
    body: [
      'Tiny-Rescue-Crosswalk: 1',
      ...identity,
      `Target-Version: ${input.item.version}`,
      `Pull-Request: #${input.pullRequest.number}`,
      `Pull-Request-URL: ${input.pullRequest.url}`,
      ...stories.map((commit) => `${commitLabel}: ${commit.scope} ${commit.sha}`),
      `Closure: ${closures[0]?.sha ?? 'none'}`,
      `Aggregate-Gate: ${input.item.aggregateGate}`,
      `Evidence-Digest: ${evidenceDigest(input)}`,
      `Release: ${input.item.publishesRelease ? `v${input.item.version}` : 'none'}`,
    ].join('\n'),
  };
}

function validatePullRequest(input, findings) {
  validateBranch(input, findings, true);
  push(
    findings,
    input.pullRequest.canonicalCount === 1,
    'Work item must have exactly one canonical pull request.',
  );
  push(findings, input.pullRequest.base === 'main', 'Work-item pull request must target main.');
  push(findings, input.pullRequest.headSha === input.headSha, 'Pull-request head SHA is stale.');
  const expected = generateSquashMessage(input);
  push(
    findings,
    input.pullRequest.title === expected.title,
    'Pull-request title is not the exact squash title.',
  );
  push(
    findings,
    input.pullRequest.body === expected.body,
    'Pull-request body is not the deterministic squash crosswalk.',
  );
  findings.push(
    ...validateWatermarkRecord({
      channel: 'text',
      path: `pull-request:#${input.pullRequest.number}`,
      content: `${input.pullRequest.title}\n${input.pullRequest.body}`,
    }),
  );
}

function validateQueue(input, findings) {
  validatePullRequest(input, findings);
  push(
    findings,
    input.queue.associatedPullRequests === 1,
    'Merge-queue candidate must contain exactly one work-item pull request.',
  );
  push(
    findings,
    input.queue.containsHead,
    'Merge-queue candidate does not contain the approved pull-request head.',
  );
  push(
    findings,
    !input.queue.unrelatedChanges,
    'Merge-queue candidate contains unrelated changes.',
  );
}

function validateMain(input, findings) {
  validateBranch(input, findings, true);
  push(
    findings,
    input.main.newCommits.length === 1,
    'Main must receive exactly one work-item squash commit.',
  );
  const commit = input.main.newCommits[0];
  if (commit === undefined) return;
  const expected = generateSquashMessage(input);
  const mergeApprovalCommentId = mergeApprovalCommentIdFromBody(commit.body);
  push(findings, commit.parentCount === 1, 'Main commit must be a non-merge squash commit.');
  push(
    findings,
    commit.subject === expected.title,
    'Main squash subject does not match the validated title.',
  );
  push(
    findings,
    Number.isInteger(mergeApprovalCommentId) && mergeApprovalCommentId > 0,
    'Main squash body does not bind the immutable merge-approval comment.',
  );
  push(
    findings,
    commit.body === `${expected.body}\nMerge-Approval-Comment: #${mergeApprovalCommentId}`,
    'Main squash body does not match the validated crosswalk.',
  );
  push(
    findings,
    input.main.treeMatchesApprovedHead,
    'Main squash tree differs from the approved pull-request head.',
  );
}

function validateTagCandidate(input, findings) {
  push(
    findings,
    input.item.publishesRelease === true,
    'Work item is not allowed to publish a tag.',
  );
  push(
    findings,
    input.item.requiresInspection === true,
    'Release work item must require live product inspection.',
  );
  push(findings, input.tag.annotated, 'Milestone tag must be annotated.');
  push(
    findings,
    input.tag.name === `v${input.item.version}`,
    'Tag name does not match the work-item target version.',
  );
  push(findings, shaPattern.test(input.tag.squashSha), 'Tag squash SHA must be a full commit SHA.');
  push(
    findings,
    input.tag.targetSha === input.tag.squashSha,
    'Tag does not target the validated squash commit.',
  );
  push(findings, digestPattern.test(input.tag.artifactDigest), 'Tag artifact digest is invalid.');
  push(
    findings,
    input.tag.artifactDigest === input.tag.observedArtifactDigest,
    'Tag artifact digest differs from the independently rebuilt artifact.',
  );
  push(
    findings,
    input.tag.assetInventoryDigest === input.tag.observedAssetInventoryDigest,
    'Tag asset-inventory digest differs from the independently rebuilt inventory.',
  );
  push(
    findings,
    input.tag.treeMatchesInspectedHead === true,
    'Tag squash tree differs from the live-inspected pull-request head.',
  );
  push(
    findings,
    Number.isInteger(input.tag.mergeApprovalCommentId) &&
      input.tag.mergeApprovalCommentId > 0 &&
      input.tag.mergeApprovalCommentId !== input.tag.approvalCommentId,
    'Tag publication requires a distinct immutable approval after the merge approval.',
  );
}

function tagInspectionExpectation(input) {
  return {
    commentId: input.tag.inspectionCommentId,
    pullNumber: input.pullRequest.number,
    targetSha: input.pullRequest.headSha,
    version: input.item.version,
    ownerLogin: input.tag.approver,
    artifactDigest: input.tag.artifactDigest,
    assetInventoryDigest: input.tag.assetInventoryDigest,
    repository: input.tag.repository,
    requiredLocales: input.tag.requiredLocales,
    requiredInputs: input.tag.requiredInputs,
    requiredViewports: input.tag.requiredViewports,
    requiredJourneys: input.item.inspectionJourneys,
    artifactNamePrefix: input.tag.artifactNamePrefix,
    artifactWorkflowPath: input.tag.artifactWorkflowPath,
    artifactWorkflowEvent: input.tag.artifactWorkflowEvent,
    artifactWorkflowBranch: input.tag.artifactWorkflowBranch,
    artifactWorkflowHeadSha: input.tag.artifactWorkflowHeadSha,
  };
}

function tagApprovalExpectation(input) {
  return {
    operation: 'tag',
    commentId: input.tag.approvalCommentId,
    pullNumber: input.pullRequest.number,
    targetSha: input.tag.squashSha,
    version: input.item.version,
    inspectionCommentId: input.tag.inspectionCommentId,
    artifactDigest: input.tag.artifactDigest,
    assetInventoryDigest: input.tag.assetInventoryDigest,
    approver: input.tag.approver,
  };
}

function mergeApprovalExpectation(input) {
  return {
    operation: 'merge',
    commentId: input.tag.mergeApprovalCommentId,
    pullNumber: input.pullRequest.number,
    targetSha: input.pullRequest.headSha,
    version: input.item.version,
    inspectionCommentId: input.tag.inspectionCommentId,
    approver: input.tag.approver,
  };
}

function expectedTagMessage(input) {
  return [
    generateSquashMessage(input).body,
    `Merge-Approval-Comment: #${input.tag.mergeApprovalCommentId}`,
    `Inspection-Comment: #${input.tag.inspectionCommentId}`,
    `Approval-Comment: #${input.tag.approvalCommentId}`,
    `Squash: ${input.tag.squashSha}`,
    `Artifact-Digest: ${input.tag.artifactDigest}`,
    `Asset-Inventory-Digest: ${input.tag.assetInventoryDigest}`,
  ].join('\n');
}

function validateTag(input, findings) {
  validateBranch(input, findings, true);
  validateTagCandidate(input, findings);
  findings.push(...validateInspectionRecord(input.tag.inspection, tagInspectionExpectation(input)));
  findings.push(
    ...validateApprovalRecord(input.tag.mergeApproval, mergeApprovalExpectation(input)),
  );
  findings.push(...validateApprovalRecord(input.tag.approval, tagApprovalExpectation(input)));
  push(
    findings,
    input.tag.message === expectedTagMessage(input),
    'Annotated tag message does not match the deterministic release crosswalk.',
  );
  findings.push(
    ...validateWatermarkRecord({
      channel: 'text',
      path: `tag:${input.tag.name}`,
      content: input.tag.message,
    }),
  );
}

export function validateHistoryPolicy(input) {
  const findings = [];
  const validators = {
    branch: () => validateBranch(input, findings, Boolean(input.requireComplete)),
    'pull-request': () => validatePullRequest(input, findings),
    'merge-queue': () => validateQueue(input, findings),
    main: () => validateMain(input, findings),
    tag: () => validateTag(input, findings),
  };
  const validator = validators[input.mode];
  if (validator === undefined) return [`Unknown history mode ${input.mode}.`];
  validator();
  return findings;
}
