import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import { validateBasePackRelease } from './lib/content-release-policy.mjs';
import { listRepositoryFiles, readJson, repositoryPath } from './lib/repository-files.mjs';

const ajv = new Ajv2020({ allErrors: true, strict: true });
addFormats(ajv);

const contracts = [
  ['content/examples/pack.json', 'schemas/pack.schema.json'],
  ['content/examples/mimi-kitten.json', 'schemas/animal.schema.json'],
  ['content/examples/garden-kitten-tree.json', 'schemas/mission.schema.json'],
  ['content/examples/garden.json', 'schemas/location.schema.json'],
  ['content/examples/indoor-room.json', 'schemas/shelter-area.schema.json'],
  ['content/examples/hu.json', 'schemas/localization.schema.json'],
  ['content/examples/garden-map-background.asset.json', 'schemas/asset-metadata.schema.json'],
  ['content/examples/drag-snap.asset.json', 'schemas/asset-metadata.schema.json'],
  ['content/base/pack.json', 'schemas/pack.schema.json'],
];
const findings = [];
const validators = new Map();

for (const [documentName, schemaName] of contracts) {
  let validate = validators.get(schemaName);
  if (validate === undefined) {
    validate = ajv.compile(await readJson(schemaName));
    validators.set(schemaName, validate);
  }
  const value = await readJson(documentName);
  if (!validate(value)) {
    findings.push(`${documentName}: ${ajv.errorsText(validate.errors, { separator: '; ' })}`);
  }
}

const basePack = await readJson('content/base/pack.json');
const packageManifest = await readJson('package.json');
findings.push(...validateBasePackRelease(basePack, packageManifest));

const mission = await readJson('content/examples/garden-kitten-tree.json');
if (mission.steps.length < 2 || mission.steps.length > 4) {
  findings.push('Example mission must contain 2–4 required steps.');
}
if (mission.type === 'rescue' && mission.reward.unlockResidentId !== mission.subjectAnimalId) {
  findings.push('Example Rescue mission must unlock exactly its subject resident.');
}

const contentFiles = (await listRepositoryFiles('content')).map(repositoryPath);
const executable = contentFiles.filter((file) => /\.(?:c?js|mjs|ts|tsx|wasm)$/u.test(file));
if (executable.length > 0) {
  findings.push(`Executable content is forbidden: ${executable.join(', ')}`);
}

if (contracts.length === 0 || contentFiles.length === 0) {
  findings.push('Content validation has no eligible contract or authored input.');
}

if (findings.length > 0) {
  console.error(findings.join('\n'));
  process.exit(1);
}

console.log(
  `Validated ${contracts.length} schema document(s) and ${contentFiles.length} content file(s).`,
);
