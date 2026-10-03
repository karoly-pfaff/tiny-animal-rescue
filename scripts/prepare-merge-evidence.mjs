import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { analyzeArtifact } from './lib/artifact-evidence.mjs';
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

function optionalArgument(name) {
  const index = process.argv.indexOf(name);
  return index === -1 ? undefined : process.argv[index + 1];
}

const candidate = argument('--candidate').replaceAll('\\', '/').replace(/\/$/u, '');
const output = argument('--output');
const artifactRoot = (optionalArgument('--artifact') ?? candidate)
  .replaceAll('\\', '/')
  .replace(/\/$/u, '');
const qualityRunId = Number(optionalArgument('--quality-run'));
const { findings, report } = await analyzeArtifact(artifactRoot);
if (findings.length > 0) throw new Error(findings.join('\n'));
const evidence = {
  headSha: repositoryGit(candidate, ['rev-parse', 'HEAD']),
  version: await candidateVersion(candidate),
  artifactDigest: `sha256:${report.digest}`,
  assetInventoryDigest: await assetInventoryDigest(candidate),
  ...(Number.isInteger(qualityRunId) && qualityRunId > 0 ? { qualityRunId } : {}),
};
await mkdir(dirname(output), { recursive: true });
await writeFile(output, `${JSON.stringify(evidence, null, 2)}\n`);
console.log(`Prepared merge evidence for ${evidence.headSha}.`);
