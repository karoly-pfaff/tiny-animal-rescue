import { readFile } from 'node:fs/promises';
import Ajv2020 from 'ajv/dist/2020.js';
import { listRepositoryFiles, readJson, repositoryPath } from './lib/repository-files.mjs';
import {
  validateRuntimeVoiceManifest,
  validateVoiceInventoryPair,
  validateVoicePolicyDocuments,
} from './lib/voice-prompt-policy.mjs';
import { createFirstRescueRuntimeVoiceCopy } from './lib/voice-runtime-copy.mjs';

const inventoryFiles = {
  en: 'prompts/voice/scripts/voice-lines.en.json',
  hu: 'prompts/voice/scripts/voice-lines.hu.json',
};
const policyFiles = [
  'prompts/voice/line-generation-template.md',
  'prompts/voice/localization/writing-rules.md',
  'prompts/voice/narrator-brief.md',
  'prompts/voice/pronunciation-guide.md',
  'prompts/voice/README.md',
  'prompts/voice/recording-and-generation.md',
  'prompts/voice/release-checklist.md',
];
const findings = [];
const ajv = new Ajv2020({ allErrors: true, strict: true });
const schema = await readJson('prompts/voice/schemas/voice-lines.schema.json');
const validateSchema = ajv.compile(schema);
const inventories = {
  en: await readJson(inventoryFiles.en),
  hu: await readJson(inventoryFiles.hu),
};
const canonicalContract = await readJson('prompts/voice/canonical-ids.json');

for (const locale of ['hu', 'en']) {
  if (!validateSchema(inventories[locale])) {
    findings.push(`${locale}: ${ajv.errorsText(validateSchema.errors, { separator: '; ' })}`);
  }
}
findings.push(...validateVoiceInventoryPair(inventories, canonicalContract));

const manifest = await readJson('content/base/assets/voice-manifest.json');
findings.push(...validateRuntimeVoiceManifest(manifest, inventories));
const runtimeCopy = await readJson('content/base/assets/first-rescue-voice-copy.json');
if (JSON.stringify(runtimeCopy) !== JSON.stringify(createFirstRescueRuntimeVoiceCopy(manifest))) {
  findings.push('Generated first-rescue runtime voice projection is stale.');
}

const example = await readJson('prompts/voice/manifest.example.json');
for (const locale of ['hu', 'en']) {
  if (example.locales?.[locale]?.assetRoot !== `audio/voice/${locale}`) {
    findings.push(`${locale}: example voice asset root differs from the canonical R2 root.`);
  }
}
findings.push(...validateVoicePolicyDocuments(await readPolicyDocuments()));

const promptFiles = await listRepositoryFiles('prompts/voice');
const media = promptFiles
  .map(repositoryPath)
  .filter((file) => /\.(?:m4a|mp3|ogg|wav)$/iu.test(file));
if (media.length > 0)
  findings.push(`Voice prompt pack must not contain media: ${media.join(', ')}`);

const readme = await readFile('prompts/voice/README.md', 'utf8');
if (!readme.includes('pronunciation-guide.md')) {
  findings.push('Voice README must route pronunciation review to pronunciation-guide.md.');
}
if (findings.length > 0) {
  console.error(findings.join('\n'));
  process.exit(1);
}

console.log('Validated 230 localized voice prompts and 3 first-rescue runtime cues.');

async function readPolicyDocuments() {
  const entries = await Promise.all(
    policyFiles.map(async (file) => [file, await readFile(file, 'utf8')]),
  );
  return Object.fromEntries(entries);
}
