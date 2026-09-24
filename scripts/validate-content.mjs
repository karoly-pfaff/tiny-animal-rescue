import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import { validateContentSemantics } from '../sources/content/content-semantic-validator.ts';
import { discoverContentPacks } from './lib/content-pack-discovery.mjs';
import { validateBasePackRelease } from './lib/content-release-policy.mjs';
import { semanticPacksFromDiscovery } from './lib/content-semantic-input.mjs';
import { listRepositoryFiles, readJson, repositoryPath } from './lib/repository-files.mjs';

const ajv = new Ajv2020({ allErrors: true, strict: true });
addFormats(ajv);

const packSchemaName = 'schemas/pack.schema.json';
const contracts = [
  ['content/examples/pack.example.json', packSchemaName],
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

for (const schemaName of new Set(contracts.map(([, schemaName]) => schemaName))) {
  validators.set(schemaName, ajv.compile(await readJson(schemaName)));
}

for (const [documentName, schemaName] of contracts) {
  const value = await readJson(documentName);
  validateDocument(documentName, schemaName, value);
}

const recordSchemas = {
  assets: 'schemas/asset-metadata.schema.json',
  animals: 'schemas/animal.schema.json',
  localizations: 'schemas/localization.schema.json',
  locations: 'schemas/location.schema.json',
  missions: 'schemas/mission.schema.json',
  shelterAreas: 'schemas/shelter-area.schema.json',
};

try {
  const discoveredPacks = await discoverContentPacks('content', {
    validateManifest: (manifest, path) => validateDocumentOrThrow(path, packSchemaName, manifest),
    validateRecord: (kind, record, path) =>
      validateDocumentOrThrow(path, recordSchemas[kind], record),
  });
  if (discoveredPacks.length === 0) {
    findings.push('Production content discovery found no pack manifests.');
  }
  findings.push(...validateContentSemantics(semanticPacksFromDiscovery(discoveredPacks)));
} catch (error) {
  findings.push(error instanceof Error ? error.message : String(error));
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

function validatorFor(schemaName) {
  let validate = validators.get(schemaName);
  if (validate === undefined) {
    throw new Error(`Schema validator was not compiled before use: ${schemaName}`);
  }
  return validate;
}

function validateDocument(documentName, schemaName, value) {
  const validate = validatorFor(schemaName);
  if (!validate(value)) {
    findings.push(`${documentName}: ${ajv.errorsText(validate.errors, { separator: '; ' })}`);
  }
}

function validateDocumentOrThrow(documentName, schemaName, value) {
  const validate = validatorFor(schemaName);
  if (!validate(value)) {
    throw new Error(`${documentName}: ${ajv.errorsText(validate.errors, { separator: '; ' })}`);
  }
}
