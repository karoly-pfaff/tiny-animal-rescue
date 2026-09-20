import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { listRepositoryFiles, repositoryPath } from './lib/repository-files.mjs';

const dangerousPatterns = [
  ['dynamic code execution', /\b(?:eval|Function)\s*\(/gu],
  ['HTML injection escape hatch', /\bdangerouslySetInnerHTML\b/gu],
  ['document stream write', /\bdocument\.write\s*\(/gu],
  ['development endpoint', /https?:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?/gu],
  ['hard-coded public asset path', /['"]\/assets\//gu],
];
const files = (await listRepositoryFiles('sources')).filter((file) =>
  ['.js', '.jsx', '.mjs', '.ts', '.tsx'].includes(path.extname(file)),
);
const findings = [];

for (const file of files) {
  const content = await readFile(file, 'utf8');
  for (const [label, pattern] of dangerousPatterns) {
    pattern.lastIndex = 0;
    if (pattern.test(content)) {
      findings.push(`${repositoryPath(file)}: ${label}.`);
    }
  }
}

if (files.length === 0) {
  findings.push('Static security scan found no eligible source files.');
}

if (findings.length > 0) {
  console.error(findings.join('\n'));
  process.exit(1);
}

console.log(`Static security scan inspected ${files.length} source file(s).`);
