import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { validateAssetRecord, validateRequiredAssetDelivery } from './lib/asset-policy.mjs';
import { listRepositoryFiles, readJson, repositoryPath } from './lib/repository-files.mjs';

const mediaExtensions = /\.(?:avif|gif|jpe?g|m4a|mp3|mp4|ogg|png|wav|webm|webp)$/iu;
const findings = [];
const requireMaterialized = process.argv.includes('--materialized');
const requiredFirstRescueRoles = new Set([
  'garden-ladder',
  'garden-map-background',
  'garden-mission-background',
  'indoor-shelter-background',
  'mimi-canonical',
  'mimi-celebration',
  'mimi-mission',
  'mimi-shelter',
  'start-background',
]);

async function localAssetFiles() {
  try {
    return (await listRepositoryFiles('content/base/assets')).filter((file) =>
      mediaExtensions.test(file),
    );
  } catch (error) {
    if (error?.code === 'ENOENT') return [];
    throw error;
  }
}

function pngMetadata(buffer) {
  if (buffer.length < 24 || buffer.subarray(1, 4).toString('ascii') !== 'PNG') return null;
  const colorType = buffer[25];
  return {
    bytes: buffer.length,
    digest: `sha256:${createHash('sha256').update(buffer).digest('hex')}`,
    height: buffer.readUInt32BE(20),
    transparent: colorType === 4 || colorType === 6,
    width: buffer.readUInt32BE(16),
  };
}

async function observedMediaFor(record) {
  const path = `content/base/assets/${record.objectKey}`;
  try {
    return pngMetadata(await readFile(path));
  } catch (error) {
    if (error?.code === 'ENOENT') {
      if (requireMaterialized) findings.push(`${record.id}: materialized asset is missing.`);
      return null;
    }
    throw error;
  }
}

const screenFiles = (await listRepositoryFiles('screens')).filter((file) => file.endsWith('.png'));
const promptFiles = (await listRepositoryFiles('prompts')).filter((file) => file.endsWith('.md'));
const screenReadme = await readFile('screens/README.md', 'utf8');
const assetReadme = await readFile('prompts/README.md', 'utf8');
const negativeConstraints = await readFile('prompts/images/negative-constraints.md', 'utf8');
const manifest = await readJson('content/base/assets/manifest.json');
const materializationLock = await readJson('content/base/assets/materialization-lock.json');
const product = await readJson('package.json');
const basePack = await readJson('content/base/pack.json');
const candidateVersion = product.version;

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
if (manifest.schemaVersion !== 1 || !Array.isArray(manifest.assets)) {
  findings.push('Base asset inventory must use schemaVersion 1 and an assets array.');
}

const assetRecords = Array.isArray(manifest.assets) ? manifest.assets : [];
const ids = new Set();
const keys = new Set();
const roles = new Set();
for (const record of assetRecords) {
  if (ids.has(record.id)) findings.push(`Duplicate asset ID: ${record.id}`);
  if (keys.has(record.objectKey)) findings.push(`Duplicate asset object key: ${record.objectKey}`);
  ids.add(record.id);
  keys.add(record.objectKey);
  if (roles.has(record.role)) findings.push(`Duplicate asset role: ${record.role}`);
  roles.add(record.role);
  const promptText = await readFile(record.promptRecord, 'utf8');
  const recordFindings = validateAssetRecord(record, promptText, await observedMediaFor(record));
  findings.push(...recordFindings.map((finding) => `${record.id}: ${finding}`));
}

for (const role of requiredFirstRescueRoles) {
  const record = assetRecords.find((asset) => asset.role === role);
  if (record === undefined) {
    findings.push(`Required first-rescue asset role is missing: ${role}`);
    continue;
  }
  findings.push(
    ...validateRequiredAssetDelivery(record).map((finding) => `${record.id}: ${finding}`),
  );
}

const lockedObjects = Array.isArray(materializationLock.objects) ? materializationLock.objects : [];
const lockedByKey = new Map(lockedObjects.map((object) => [object.objectKey, object]));
if (
  materializationLock.schemaVersion !== 1 ||
  materializationLock.packId !== 'base' ||
  basePack.version !== candidateVersion ||
  materializationLock.packVersion !== candidateVersion ||
  materializationLock.source !== 'r2'
) {
  findings.push('Base materialization lock identity differs from the product/base-pack version.');
}
for (const record of assetRecords.filter((asset) => asset.delivery === 'r2-locked')) {
  const locked = lockedByKey.get(record.objectKey);
  if (locked === undefined) {
    findings.push(`${record.id}: locked asset is absent from materialization-lock.json.`);
    continue;
  }
  for (const field of [
    'bytes',
    'digest',
    'height',
    'licenseStatus',
    'mediaType',
    'ownership',
    'provenanceStatus',
    'qaStatus',
    'width',
  ]) {
    if (locked[field] !== record[field]) {
      findings.push(`${record.id}: ${field} differs between inventory and lock.`);
    }
  }
}
for (const object of lockedObjects) {
  const record = assetRecords.find((asset) => asset.objectKey === object.objectKey);
  if (record === undefined || record.delivery !== 'r2-locked') {
    findings.push(`${object.objectKey}: lock object is not a locked inventory asset.`);
  }
}

for (const file of await localAssetFiles()) {
  const key = repositoryPath(file).replace('content/base/assets/', '');
  if (!keys.has(key)) findings.push(`${key} is missing from the base asset inventory.`);
}

const jsonFiles = (await listRepositoryFiles('content')).filter((file) => file.endsWith('.json'));
for (const file of jsonFiles) {
  const content = await readFile(file, 'utf8');
  if (/screens[\\/]/iu.test(content)) {
    findings.push(`${repositoryPath(file)} resolves presentation-only art as production content.`);
  }
  if (/https?:\/\//iu.test(content)) {
    findings.push(`${repositoryPath(file)} contains a remote asset URL.`);
  }
}

for (const screen of screenFiles) {
  if (pngMetadata(await readFile(screen)) === null) {
    findings.push(`${repositoryPath(screen)} is empty or is not a PNG file.`);
  }
}

if (findings.length > 0) {
  console.error(findings.join('\n'));
  process.exit(1);
}

console.log(
  `Validated ${String(screenFiles.length)} presentation reference(s), ${String(promptFiles.length)} prompt record(s), and ${String(assetRecords.length)} inventoried production asset(s)${requireMaterialized ? ' with materialized bytes' : ''}.`,
);
