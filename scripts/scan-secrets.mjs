import { execFileSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { findSecretLabels, scanGitHistory } from './lib/secret-policy.mjs';
import { listRepositoryFiles, repositoryPath } from './lib/repository-files.mjs';

const textExtensions = new Set([
  '.css',
  '.html',
  '.js',
  '.json',
  '.jsx',
  '.md',
  '.mjs',
  '.ts',
  '.tsx',
  '.txt',
  '.yaml',
  '.yml',
]);
const findings = [];
let scannedFiles = 0;

for (const file of await listRepositoryFiles()) {
  if (!textExtensions.has(path.extname(file).toLowerCase())) {
    continue;
  }

  scannedFiles += 1;
  const content = await readFile(file, 'utf8');
  for (const label of findSecretLabels(content)) {
    findings.push(`${repositoryPath(file)}: possible ${label}.`);
  }
}

if (scannedFiles === 0) {
  findings.push('Secret scan found no eligible authored text files.');
}

try {
  const history = scanGitHistory({
    repositoryDirectory: process.cwd(),
    runGit: (args) => execFileSync('git', args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }),
  });
  for (const label of history.labels) {
    findings.push(`Git history available to CI: possible ${label}.`);
  }
} catch {
  findings.push('Secret scan could not inspect the Git history available to CI.');
}

if (findings.length > 0) {
  console.error(findings.join('\n'));
  process.exit(1);
}

console.log(
  `Scanned ${scannedFiles} authored text file(s) and available Git history for known secret patterns.`,
);
