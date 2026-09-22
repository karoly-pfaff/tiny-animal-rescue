import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { analyzeArtifact } from './lib/artifact-evidence.mjs';

const { findings, report } = await analyzeArtifact();

if (findings.length > 0) {
  console.error(findings.join('\n'));
  process.exit(1);
}

report.version = JSON.parse(await readFile('package.json', 'utf8')).version;
await mkdir('build/reports', { recursive: true });
await writeFile('build/reports/artifact-integrity.json', `${JSON.stringify(report, null, 2)}\n`);
console.log(`Validated ${report.fileCount} artifact file(s); sha256 ${report.digest}.`);
