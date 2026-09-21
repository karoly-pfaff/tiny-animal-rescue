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

function loadEpic(number) {
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
    id: `EPIC-${number}`,
    number,
    title,
    milestone,
    version,
    aggregateGate: Number(number) >= 7 ? 'validate:release' : 'validate:full',
    stories: [...content.matchAll(/^### (?<story>E\d{3}-S\d{2})\b/gmu)].map(
      (match) => match.groups.story,
    ),
  };
}

export function epicFromBranch(branch) {
  const number = /^epic\/(?<number>\d{3})-[a-z0-9]+(?:-[a-z0-9]+)*$/u.exec(branch)?.groups?.number;
  if (number === undefined)
    throw new Error(`Branch ${branch || '(detached)'} is not an epic branch.`);
  return loadEpic(number);
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
