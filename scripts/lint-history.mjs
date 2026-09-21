import { readFileSync } from 'node:fs';
import { validateHistoryPolicy } from './lib/history-policy.mjs';
import { commitsBetween, epicFromBranch, git } from './lib/history-repository.mjs';

function argumentValue(name) {
  const index = process.argv.indexOf(name);
  return index === -1 ? undefined : process.argv[index + 1];
}

function branchInput(base) {
  const branch = git(['branch', '--show-current']);
  return {
    mode: 'branch',
    branch,
    epic: epicFromBranch(branch),
    commits: commitsBetween(base),
    mergeCommitCount: Number(git(['rev-list', '--count', '--merges', `${base}..HEAD`])),
    requireComplete: process.argv.includes('--require-complete'),
  };
}

const mode = argumentValue('--mode');
const base = argumentValue('--base');
const inputFile = argumentValue('--input');
if (
  mode === undefined ||
  (mode === 'branch' && base === undefined) ||
  (mode !== 'branch' && inputFile === undefined)
) {
  console.error(
    'Usage: lint-history --mode <branch|pull-request|merge-queue|main|tag> (--base <ref>|--input <json>)',
  );
  process.exit(2);
}

const input = mode === 'branch' ? branchInput(base) : JSON.parse(readFileSync(inputFile, 'utf8'));
if (input.mode !== mode) {
  console.error(`Input mode ${input.mode} does not match requested mode ${mode}.`);
  process.exit(2);
}
const findings = validateHistoryPolicy(input);
if (findings.length > 0) {
  console.error(findings.join('\n'));
  process.exit(1);
}
console.log(`Validated history policy in ${mode} mode.`);
