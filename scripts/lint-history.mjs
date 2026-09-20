import { readdirSync, readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

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
const forbiddenAuthorship = [
  /\bco-authored-by:/iu,
  /\breviewed-by:/iu,
  /\b(?:generated|created|written)\s+(?:by|with)\s+(?:ai|agent|bot)\b/iu,
];

function argumentValue(name) {
  const index = process.argv.indexOf(name);
  return index === -1 ? undefined : process.argv[index + 1];
}

function git(arguments_) {
  const result = spawnSync(
    'git',
    ['-c', `safe.directory=${process.cwd().replaceAll('\\', '/')}`, ...arguments_],
    { encoding: 'utf8' },
  );
  if (result.status !== 0) {
    throw new Error(result.stderr.trim() || `git ${arguments_.join(' ')} failed.`);
  }
  return result.stdout.trim();
}

function findEpicFile(epicNumber) {
  const matches = readdirSync('backlog/epics').filter(
    (name) => name.startsWith(`EPIC-${epicNumber}-`) && name.endsWith('.md'),
  );
  if (matches.length !== 1) {
    throw new Error(`Expected one backlog file for EPIC-${epicNumber}; found ${matches.length}.`);
  }
  return `backlog/epics/${matches[0]}`;
}

function parseCommits(base) {
  const recordSeparator = '\u001e';
  const fieldSeparator = '\u001f';
  const log = git([
    'log',
    '--reverse',
    `--format=%H${fieldSeparator}%s${fieldSeparator}%b${recordSeparator}`,
    `${base}..HEAD`,
  ]);
  if (log.length === 0) {
    return [];
  }
  return log
    .split(recordSeparator)
    .map((record) => record.trim())
    .filter(Boolean)
    .map((record) => {
      const [sha, subject, body = ''] = record.split(fieldSeparator);
      return { sha, subject, body };
    });
}

function validateCommit(commit, epicId, storyIds, findings) {
  const message = `${commit.subject}\n${commit.body}`;
  const parsed = /^(?<type>[a-z]+)\((?<scope>[^)]+)\)(?<breaking>!)?: (?<description>.+)$/u.exec(
    commit.subject,
  );
  if (parsed === null) {
    findings.push(`${commit.sha}: subject is not a Conventional Commit.`);
    return undefined;
  }

  const { type, scope, breaking, description } = parsed.groups;
  if (!allowedTypes.has(type)) {
    findings.push(`${commit.sha}: unsupported commit type ${type}.`);
  }
  if (!storyIds.includes(scope) && scope !== epicId) {
    findings.push(`${commit.sha}: unknown or wrong scope ${scope}.`);
  }
  if (
    commit.subject.length > 72 ||
    /[.]$/u.test(description) ||
    description !== description.toLowerCase()
  ) {
    findings.push(
      `${commit.sha}: subject must be lower-case, at most 72 characters, without a period.`,
    );
  }
  if (breaking === '!' && !/^BREAKING CHANGE:/mu.test(commit.body)) {
    findings.push(`${commit.sha}: breaking marker has no BREAKING CHANGE footer.`);
  }
  if (forbiddenAuthorship.some((pattern) => pattern.test(message))) {
    findings.push(`${commit.sha}: prohibited authorship watermark or fabricated trailer.`);
  }
  return scope;
}

const mode = argumentValue('--mode');
const base = argumentValue('--base');
if (mode !== 'branch' || base === undefined) {
  console.error('Usage: lint-history --mode branch --base <explicit-ref> [--require-complete]');
  process.exit(2);
}

const branch = git(['branch', '--show-current']);
const epicNumber = /^epic\/(?<number>\d{3})-[a-z0-9]+(?:-[a-z0-9]+)*$/u.exec(branch)?.groups
  ?.number;
if (epicNumber === undefined) {
  console.error(`Branch ${branch || '(detached)'} does not follow epic/<id>-<title>.`);
  process.exit(1);
}

const epicId = `EPIC-${epicNumber}`;
const epicFile = findEpicFile(epicNumber);
const epicContent = readFileSync(epicFile, 'utf8');
const storyIds = [...epicContent.matchAll(/^### (?<story>E\d{3}-S\d{2})\b/gmu)].map(
  (match) => match.groups.story,
);
const commits = parseCommits(base);
const findings = [];
const observedStories = [];
let closureCount = 0;

if (git(['rev-list', '--merges', `${base}..HEAD`]).length > 0) {
  findings.push('Epic branch contains merge commits.');
}
if (commits.length === 0) {
  findings.push('Epic branch contains no canonical story commit.');
}

for (const commit of commits) {
  const scope = validateCommit(commit, epicId, storyIds, findings);
  if (scope === epicId) {
    closureCount += 1;
    const expectedSubject = `chore(${epicId}): close milestone M${Number(epicNumber)}`;
    if (commit !== commits.at(-1) || commit.subject !== expectedSubject) {
      findings.push(`${commit.sha}: epic closure must be the final canonical closure subject.`);
    }
  } else if (scope !== undefined) {
    observedStories.push(scope);
  }
}

for (const storyId of new Set(observedStories)) {
  if (observedStories.filter((candidate) => candidate === storyId).length !== 1) {
    findings.push(`${storyId} has more than one canonical commit.`);
  }
}
const observedOrder = observedStories.map((storyId) => storyIds.indexOf(storyId));
if (observedOrder.some((value, index) => index > 0 && value < observedOrder[index - 1])) {
  findings.push('Canonical story commits are not in backlog dependency order.');
}
if (closureCount > 1) {
  findings.push('Epic branch contains more than one closure commit.');
}
if (process.argv.includes('--require-complete')) {
  for (const storyId of storyIds) {
    if (!observedStories.includes(storyId)) {
      findings.push(`Missing canonical commit for ${storyId}.`);
    }
  }
}

if (findings.length > 0) {
  console.error(findings.join('\n'));
  process.exit(1);
}

console.log(`Validated ${commits.length} canonical epic commit(s) against ${epicFile}.`);
