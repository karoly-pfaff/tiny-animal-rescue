import { readFile } from 'node:fs/promises';
import path from 'node:path';
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
const secretPatterns = [
  ['private key', /-----BEGIN (?:EC |OPENSSH |RSA )?PRIVATE KEY-----/gu],
  ['GitHub token', /\bgh[opsu]_[A-Za-z0-9]{30,}\b/gu],
  ['AWS access key', /\bAKIA[0-9A-Z]{16}\b/gu],
  ['Slack token', /\bxox[baprs]-[A-Za-z0-9-]{20,}\b/gu],
  ['Google API key', /\bAIza[0-9A-Za-z_-]{35}\b/gu],
];
const findings = [];
let scannedFiles = 0;

for (const file of await listRepositoryFiles()) {
  if (!textExtensions.has(path.extname(file).toLowerCase())) {
    continue;
  }

  scannedFiles += 1;
  const content = await readFile(file, 'utf8');
  for (const [label, pattern] of secretPatterns) {
    pattern.lastIndex = 0;
    if (pattern.test(content)) {
      findings.push(`${repositoryPath(file)}: possible ${label}.`);
    }
  }
}

if (scannedFiles === 0) {
  findings.push('Secret scan found no eligible authored text files.');
}

if (findings.length > 0) {
  console.error(findings.join('\n'));
  process.exit(1);
}

console.log(`Scanned ${scannedFiles} authored text file(s) for known secret patterns.`);
