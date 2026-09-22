import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { verifyQualifiedMedia } from './lib/media-qualification.mjs';

function argument(name) {
  const index = process.argv.indexOf(name);
  const value = index === -1 ? undefined : process.argv[index + 1];
  if (value === undefined || value.length === 0) throw new Error(`Missing ${name}.`);
  return value;
}

const output = argument('--output');
const evidence = await verifyQualifiedMedia({
  source: argument('--source'),
  qualification: argument('--qualification'),
  expectedHeadSha: argument('--expected-head'),
  expectedPolicySha: argument('--expected-policy'),
  artifactNamePrefix: argument('--artifact-prefix'),
});
evidence.qualificationRunId = Number(argument('--qualification-run'));
if (!Number.isInteger(evidence.qualificationRunId) || evidence.qualificationRunId <= 0) {
  throw new Error('Qualification run ID must be a positive integer.');
}
await mkdir(path.dirname(output), { recursive: true });
await writeFile(output, `${JSON.stringify(evidence, null, 2)}\n`);
console.log(`Verified qualified-media evidence for ${evidence.headSha}.`);
