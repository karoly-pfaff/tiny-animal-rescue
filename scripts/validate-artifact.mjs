import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { listRepositoryFiles, repositoryPath } from './lib/repository-files.mjs';

const artifactRoot = path.resolve('build/app');
let files;
try {
  files = await listRepositoryFiles(artifactRoot);
} catch {
  console.error('Production artifact is missing. Run npm run build first.');
  process.exit(1);
}

const findings = [];
const digest = createHash('sha256');
const forbiddenText = [
  ['absolute Windows development path', /[A-Z]:\\Users\\/gu],
  ['development endpoint', /https?:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?/gu],
  ['debugger statement', /\bdebugger\b/gu],
];

if (files.length === 0 || !files.some((file) => path.basename(file) === 'index.html')) {
  findings.push('Production artifact is empty or has no index.html.');
}

for (const file of files) {
  const relative = repositoryPath(file);
  const data = await readFile(file);
  digest.update(relative).update('\0').update(data);

  if (file.endsWith('.map')) {
    findings.push(`${relative}: public source maps are forbidden.`);
  }
  if (/\.(?:html|js|css|json|txt)$/u.test(file)) {
    const content = data.toString('utf8');
    for (const [label, pattern] of forbiddenText) {
      pattern.lastIndex = 0;
      if (pattern.test(content)) {
        findings.push(`${relative}: ${label}.`);
      }
    }
  }
}

if (findings.length > 0) {
  console.error(findings.join('\n'));
  process.exit(1);
}

const report = {
  algorithm: 'sha256',
  digest: digest.digest('hex'),
  fileCount: files.length,
  version: JSON.parse(await readFile('package.json', 'utf8')).version,
};
await mkdir('build/reports', { recursive: true });
await writeFile('build/reports/artifact-integrity.json', `${JSON.stringify(report, null, 2)}\n`);
console.log(`Validated ${files.length} artifact file(s); sha256 ${report.digest}.`);
