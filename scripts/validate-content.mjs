import path from 'node:path';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import { listRepositoryFiles, readJson, repositoryPath } from './lib/repository-files.mjs';

const ajv = new Ajv2020({ allErrors: true, strict: true });
addFormats(ajv);

const contracts = [
  ['pack.json', 'schemas/pack.schema.json'],
  ['mimi-kitten.json', 'schemas/animal.schema.json'],
  ['garden-kitten-tree.json', 'schemas/mission.schema.json'],
];
const findings = [];

for (const [exampleName, schemaName] of contracts) {
  const validate = ajv.compile(await readJson(schemaName));
  const value = await readJson(path.join('content', 'examples', exampleName));
  if (!validate(value)) {
    findings.push(`${exampleName}: ${ajv.errorsText(validate.errors, { separator: '; ' })}`);
  }
}

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
  `Validated ${contracts.length} schema example(s) and ${contentFiles.length} content file(s).`,
);
