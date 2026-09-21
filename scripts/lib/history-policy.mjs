import { createHash } from 'node:crypto';
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

function push(findings, condition, message) {
  if (!condition) {
    findings.push(message);
  }
}

function expectedTitle(epic) {
  return `feat(${epic.id}): deliver ${epic.title.toLowerCase()}`;
}

function splitCommits(input) {
  return {
    stories: input.commits.filter((commit) => commit.scope !== input.epic.id),
    closures: input.commits.filter((commit) => commit.scope === input.epic.id),
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
    input.epic.stories.includes(scope) || scope === input.epic.id,
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
    new RegExp(`^epic/${input.epic.number}-[a-z0-9]+(?:-[a-z0-9]+)*$`, 'u').test(input.branch),
    `${input.branch}: branch name does not match ${input.epic.id}.`,
  );
  push(findings, input.mergeCommitCount === 0, 'Epic branch contains merge commits.');
  push(findings, input.commits.length > 0, 'Epic branch contains no canonical commit.');
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
  const indexes = observed.map((story) => input.epic.stories.indexOf(story));
  push(
    findings,
    indexes.every((value, index) => index === 0 || value >= indexes[index - 1]),
    'Canonical story commits are not in dependency order.',
  );
  push(findings, closures.length <= 1, 'Epic branch contains more than one closure commit.');
  if (closures.length === 1) {
    const closure = closures[0];
    push(
      findings,
      closure === input.commits.at(-1) &&
        closure.subject === `chore(${input.epic.id}): close milestone ${input.epic.milestone}`,
      `${closure.sha}: closure commit is not the final canonical closure.`,
    );
  }
  if (requireComplete) {
    input.epic.stories.forEach((story) =>
      push(findings, observed.includes(story), `Missing canonical commit for ${story}.`),
    );
  }
}

function evidenceDigest(input) {
  const { stories, closures } = splitCommits(input);
  const evidence = {
    epic: input.epic.id,
    milestone: input.epic.milestone,
    version: input.epic.version,
    pullRequest: input.pullRequest.number,
    stories: stories.map(({ scope, sha }) => [scope, sha]),
    closure: closures[0]?.sha ?? 'none',
    gate: input.epic.aggregateGate,
  };
  return `sha256:${createHash('sha256').update(JSON.stringify(evidence)).digest('hex')}`;
}

export function generateSquashMessage(input) {
  const { stories, closures } = splitCommits(input);
  return {
    title: expectedTitle(input.epic),
    body: [
      'Tiny-Rescue-Crosswalk: 1',
      `Epic: ${input.epic.id}`,
      `Milestone: ${input.epic.milestone}`,
      `Target-Version: ${input.epic.version}`,
      `Pull-Request: #${input.pullRequest.number}`,
      `Pull-Request-URL: ${input.pullRequest.url}`,
      ...stories.map((commit) => `Story: ${commit.scope} ${commit.sha}`),
      `Closure: ${closures[0]?.sha ?? 'none'}`,
      `Aggregate-Gate: ${input.epic.aggregateGate}`,
      `Evidence-Digest: ${evidenceDigest(input)}`,
      `Release: v${input.epic.version}`,
    ].join('\n'),
  };
}

function validatePullRequest(input, findings) {
  validateBranch(input, findings, true);
  push(
    findings,
    input.pullRequest.canonicalCount === 1,
    'Epic must have exactly one canonical pull request.',
  );
  push(findings, input.pullRequest.base === 'main', 'Epic pull request must target main.');
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
    'Merge-queue candidate must contain exactly one epic pull request.',
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
    'Main must receive exactly one epic squash commit.',
  );
  const commit = input.main.newCommits[0];
  if (commit === undefined) return;
  const expected = generateSquashMessage(input);
  push(findings, commit.parentCount === 1, 'Epic main commit must be a non-merge squash commit.');
  push(
    findings,
    commit.subject === expected.title,
    'Main squash subject does not match the validated title.',
  );
  push(
    findings,
    commit.body === expected.body,
    'Main squash body does not match the validated crosswalk.',
  );
  push(
    findings,
    input.main.treeMatchesApprovedHead,
    'Main squash tree differs from the approved pull-request head.',
  );
}

function validateTag(input, findings) {
  validateBranch(input, findings, true);
  push(findings, input.tag.annotated, 'Milestone tag must be annotated.');
  push(
    findings,
    input.tag.name === `v${input.epic.version}`,
    'Tag name does not match the epic target version.',
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
  const expected = `${generateSquashMessage(input).body}\nSquash: ${input.tag.squashSha}\nArtifact-Digest: ${input.tag.artifactDigest}`;
  push(
    findings,
    input.tag.message === expected,
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
