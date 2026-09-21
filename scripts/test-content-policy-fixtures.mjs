import assert from 'node:assert/strict';
import { validateBasePackRelease } from './lib/content-release-policy.mjs';
import { readJson } from './lib/repository-files.mjs';

const basePack = await readJson('content/base/pack.json');
const packageManifest = await readJson('package.json');

assert.deepEqual(validateBasePackRelease(basePack, packageManifest), []);

const versionDrift = structuredClone(basePack);
versionDrift.version = packageManifest.version === '0.0.0' ? '0.0.1' : '0.0.0';
assert.match(validateBasePackRelease(versionDrift, packageManifest).join('\n'), /must match/u);

console.log('Content policy fixtures detected base-pack release version drift.');
