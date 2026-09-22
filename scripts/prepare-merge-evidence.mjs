import { mkdir, readFile, writeFile } from 'node:fs/promises';
import {
  assetInventoryDigest,
  candidateVersion,
  repositoryGit,
} from './lib/media-qualification.mjs';

function argument(name) {
  const index = process.argv.indexOf(name);
  const value = index === -1 ? undefined : process.argv[index + 1];
  if (value === undefined || value.length === 0) throw new Error(`Missing ${name}.`);
  return value;
}

const candidate = argument('--candidate').replaceAll('\\', '/').replace(/\/$/u, '');
const output = argument('--output');
const artifact = JSON.parse(
  await readFile(`${candidate}/build/reports/artifact-integrity.json`, 'utf8'),
);
if (artifact.algorithm !== 'sha256' || !/^[0-9a-f]{64}$/u.test(artifact.digest ?? '')) {
  throw new Error('Candidate artifact-integrity report has no valid sha256 digest.');
}
const evidence = {
  headSha: repositoryGit(candidate, ['rev-parse', 'HEAD']),
  version: await candidateVersion(candidate),
  artifactDigest: `sha256:${artifact.digest}`,
  assetInventoryDigest: await assetInventoryDigest(candidate),
};
await mkdir(output.slice(0, Math.max(output.lastIndexOf('/'), 1)), { recursive: true });
await writeFile(output, `${JSON.stringify(evidence, null, 2)}\n`);
console.log(`Prepared merge evidence for ${evidence.headSha}.`);
