import { appendFile } from 'node:fs/promises';
import { stageQualifiedMedia } from './lib/media-qualification.mjs';

function argument(name) {
  const index = process.argv.indexOf(name);
  const value = index === -1 ? undefined : process.argv[index + 1];
  if (value === undefined || value.length === 0) throw new Error(`Missing ${name}.`);
  return value;
}

const { evidence, artifactName } = await stageQualifiedMedia({
  source: argument('--source'),
  product: argument('--product'),
  materialized: argument('--materialized'),
  policy: argument('--policy'),
  output: argument('--output'),
  artifactNamePrefix: argument('--artifact-prefix'),
});
const githubOutput = argument('--github-output');
await appendFile(
  githubOutput,
  `artifact_name=${artifactName}\nhead_sha=${evidence.headSha}\nartifact_digest=${evidence.artifactDigest}\nasset_inventory_digest=${evidence.assetInventoryDigest}\n`,
);
console.log(`Prepared immutable qualified-media evidence for ${evidence.headSha}.`);
