import { readFile } from 'node:fs/promises';
import { listRepositoryFiles, repositoryPath } from './lib/repository-files.mjs';

const findings = [];
const screenFiles = (await listRepositoryFiles('screens')).filter((file) => file.endsWith('.png'));
const promptFiles = (await listRepositoryFiles('prompts')).filter((file) => file.endsWith('.md'));
const screenReadme = await readFile('screens/README.md', 'utf8');
const assetReadme = await readFile('prompts/README.md', 'utf8');
const negativeConstraints = await readFile('prompts/images/negative-constraints.md', 'utf8');

if (screenFiles.length === 0 || promptFiles.length === 0) {
  findings.push('Asset validation has no presentation screen or authored prompt input.');
}
if (!/presentation-only/iu.test(screenReadme)) {
  findings.push('screens/README.md must classify concept screens as presentation-only.');
}
if (!/visual, music, and effect/iu.test(assetReadme)) {
  findings.push('prompts/README.md must identify the combined asset prompt pack.');
}
if (!/watermark/iu.test(negativeConstraints)) {
  findings.push('Visual negative constraints must forbid watermarks.');
}

const jsonFiles = (await listRepositoryFiles('content')).filter((file) => file.endsWith('.json'));
for (const file of jsonFiles) {
  const content = await readFile(file, 'utf8');
  if (/screens[\\/]/iu.test(content)) {
    findings.push(
      `${repositoryPath(file)} resolves a presentation-only screen as production content.`,
    );
  }
  if (/https?:\/\//iu.test(content)) {
    findings.push(`${repositoryPath(file)} contains a remote asset URL.`);
  }
}

for (const screen of screenFiles) {
  const header = await readFile(screen);
  if (header.length < 24 || header.subarray(1, 4).toString('ascii') !== 'PNG') {
    findings.push(`${repositoryPath(screen)} is empty or is not a PNG file.`);
  }
}

if (findings.length > 0) {
  console.error(findings.join('\n'));
  process.exit(1);
}

console.log(
  `Validated ${screenFiles.length} presentation reference(s) and ${promptFiles.length} prompt record(s).`,
);
