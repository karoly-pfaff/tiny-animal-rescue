import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import { readJson } from './lib/repository-files.mjs';

const ajv = new Ajv2020({ allErrors: true, strict: true });
addFormats(ajv);
const validate = ajv.compile(await readJson('schemas/quality-waiver.schema.json'));
const registry = await readJson('quality-waivers.json');

if (!validate(registry)) {
  console.error(ajv.errorsText(validate.errors, { separator: '\n' }));
  process.exit(1);
}

const today = new Date().toISOString().slice(0, 10);
const invalid = registry.waivers.filter(
  (waiver) => waiver.expiresOn < today || waiver.createdOn > waiver.expiresOn,
);

if (invalid.length > 0) {
  console.error(`Expired or invalid waiver(s): ${invalid.map((waiver) => waiver.id).join(', ')}`);
  process.exit(1);
}

console.log(`Validated ${registry.waivers.length} active quality waiver(s).`);
