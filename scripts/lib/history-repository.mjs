import { readFileSync, readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

export function git(arguments_) {
  const result = spawnSync(
    'git',
    ['-c', `safe.directory=${process.cwd().replaceAll('\\', '/')}`, ...arguments_],
    { encoding: 'utf8' },
  );
  if (result.status !== 0)
    throw new Error(result.stderr.trim() || `git ${arguments_.join(' ')} failed.`);
  return result.stdout.trim();
}

export function isAncestor(ancestor, descendant) {
  const result = spawnSync(
    'git',
    [
      '-c',
      `safe.directory=${process.cwd().replaceAll('\\', '/')}`,
      'merge-base',
      '--is-ancestor',
      ancestor,
      descendant,
    ],
    { encoding: 'utf8' },
  );
  if (result.status !== 0 && result.status !== 1) {
    throw new Error(result.stderr.trim() || 'git merge-base --is-ancestor failed.');
  }
  return result.status === 0;
}

function metadata(content, label) {
  const prefix = `- ${label}: \``;
  const line = content.split('\n').find((candidate) => candidate.startsWith(prefix));
  return line?.endsWith('`') === true ? line.slice(prefix.length, -1) : undefined;
}

function listMetadata(content, label) {
  const value = metadata(content, label);
  return value === undefined ? [] : value.split(',').map((entry) => entry.trim());
}

function yesNoMetadata(content, label, name) {
  const value = metadata(content, label);
  if (value !== 'yes' && value !== 'no')
    throw new Error(`${name}: ${label} must be exactly yes or no.`);
  return value === 'yes';
}

function maintenanceDefaults(id) {
  return id.startsWith('PATCH-')
    ? {
        branchPrefix: 'fix/',
        commitType: 'fix',
        aggregateGate: 'validate:full',
        publishesRelease: true,
        requiresInspection: true,
      }
    : {
        branchPrefix: 'docs/',
        commitType: 'docs',
        aggregateGate: 'validate:quick',
        publishesRelease: false,
        requiresInspection: false,
      };
}

function maintenanceMetadata(content, name) {
  const heading = /^# (?<id>(?:DOC|PATCH)-\d{3}): (?<title>.+)$/mu.exec(content)?.groups;
  const values = {
    heading,
    version: metadata(content, 'Target version') ?? metadata(content, 'Related release'),
    aggregateGate: metadata(content, 'Aggregate gate'),
    commitType: metadata(content, 'Commit type'),
    publishesRelease: yesNoMetadata(content, 'Publishes release', name),
    requiresInspection: yesNoMetadata(content, 'Requires live inspection', name),
    inspectionJourneys: listMetadata(content, 'Inspection journeys'),
  };
  const complete = [
    values.heading !== undefined,
    /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/u.test(values.version ?? ''),
    values.aggregateGate !== undefined,
    values.commitType !== undefined,
  ].every(Boolean);
  if (!complete) throw new Error(`${name}: maintenance history metadata is incomplete.`);
  return values;
}

function assertMaintenancePolicy(values, branch, name) {
  const defaults = maintenanceDefaults(values.heading.id);
  const valid = [
    branch.startsWith(defaults.branchPrefix),
    values.commitType === defaults.commitType,
    values.aggregateGate === defaults.aggregateGate,
    values.publishesRelease === defaults.publishesRelease,
    values.requiresInspection === defaults.requiresInspection,
    values.requiresInspection === values.inspectionJourneys.length > 0,
  ].every(Boolean);
  if (!valid) {
    throw new Error(
      `${name}: maintenance policy differs from the fail-closed ${values.heading.id} class.`,
    );
  }
}

function loadEpic(number, branch) {
  const files = readdirSync('backlog/epics').filter((name) => name.startsWith(`EPIC-${number}-`));
  if (files.length !== 1) throw new Error(`Expected one backlog file for EPIC-${number}.`);
  const content = readFileSync(`backlog/epics/${files[0]}`, 'utf8');
  const title = /^# EPIC-\d{3}: (?<value>.+)$/mu.exec(content)?.groups?.value;
  const milestone = /^- Milestone: (?<value>.+)$/mu.exec(content)?.groups?.value;
  const version = /^- Target version: `(?<value>[^`]+)`$/mu.exec(content)?.groups?.value;
  if (title === undefined || milestone === undefined || version === undefined) {
    throw new Error(`EPIC-${number} metadata is incomplete.`);
  }
  return {
    kind: 'epic',
    id: `EPIC-${number}`,
    number,
    title,
    milestone,
    version,
    aggregateGate: Number(number) >= 7 ? 'validate:release' : 'validate:full',
    branch,
    commitType: 'feat',
    publishesRelease: true,
    requiresInspection: true,
    inspectionJourneys: listMetadata(content, 'Inspection journeys'),
    stories: [...content.matchAll(/^### (?<story>E\d{3}-S\d{2})\b/gmu)].map(
      (match) => match.groups.story,
    ),
  };
}

function loadMaintenance(branch) {
  const matches = readdirSync('backlog/maintenance')
    .filter((name) => name.endsWith('.md'))
    .map((name) => ({ name, content: readFileSync(`backlog/maintenance/${name}`, 'utf8') }))
    .filter(({ content }) => metadata(content, 'Branch') === branch);
  if (matches.length !== 1)
    throw new Error(`Expected one maintenance backlog item declaring branch ${branch}.`);
  const { content, name } = matches[0];
  const values = maintenanceMetadata(content, name);
  assertMaintenancePolicy(values, branch, name);
  return {
    kind: 'maintenance',
    id: values.heading.id,
    number: values.heading.id.slice(-3),
    title: values.heading.title,
    version: values.version,
    aggregateGate: values.aggregateGate,
    branch,
    commitType: values.commitType,
    publishesRelease: values.publishesRelease,
    requiresInspection: values.requiresInspection,
    inspectionJourneys: values.inspectionJourneys,
    stories: [values.heading.id],
  };
}

export function workItemFromBranch(branch) {
  const number = /^epic\/(?<number>\d{3})-[a-z0-9]+(?:-[a-z0-9]+)*$/u.exec(branch)?.groups?.number;
  return number === undefined ? loadMaintenance(branch) : loadEpic(number, branch);
}

export function commitsBetween(base, head = 'HEAD') {
  const record = '\u001e';
  const field = '\u001f';
  const output = git([
    'log',
    '--reverse',
    `--format=%H${field}%s${field}%b${record}`,
    `${base}..${head}`,
  ]);
  return output
    .split(record)
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const [sha, subject, body = ''] = entry.split(field);
      return { sha, subject, body };
    });
}

export function tagRevisions(tagName, resolve = git) {
  const targetSha = resolve(['rev-list', '-n', '1', `refs/tags/${tagName}`]);
  return { targetSha, policySha: resolve(['rev-parse', `${targetSha}^`]) };
}
