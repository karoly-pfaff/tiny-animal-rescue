import assert from 'node:assert/strict';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import {
  discoverContentPacks,
  validateContentDirectoryPath,
} from './lib/content-pack-discovery.mjs';

const validators = {
  validateManifest: () => undefined,
  validateRecord: () => undefined,
};
const invalidDirectories = [
  '',
  '/absolute',
  'C:/absolute',
  'https://example.test/content',
  '../outside',
  'animals/../missions',
  './animals',
  'animals/.',
  'animals\\nested',
  'Animals',
  'animals//nested',
];

for (const value of invalidDirectories) {
  assert.throws(() => validateContentDirectoryPath(value, 'fixture'), /pack-relative lower-kebab/u);
}

await withFixtureRoot(async (root) => {
  await writePack(root, 'z-pack', validManifest('z-pack'));
  await writePack(root, 'a-pack', validManifest('a-pack'));
  await mkdir(join(root, 'not-a-pack'));
  const discovered = await discoverContentPacks(root, validators);
  assert.deepEqual(
    discovered.map(({ manifest }) => manifest.id),
    ['a-pack', 'z-pack'],
  );
});

await withFixtureRoot(async (root) => {
  const manifest = validManifest('no-dependencies');
  delete manifest.dependencies;
  await writePack(root, 'no-dependencies', manifest);
  const [pack] = await discoverContentPacks(root, validators);
  assert.deepEqual(pack.manifest.dependencies, []);
  assert.equal(Object.isFrozen(pack.manifest.dependencies), true);
});

await withFixtureRoot(async (root) => {
  await writePack(root, 'broken-pack', {
    ...validManifest('broken-pack'),
    content: { ...validManifest('broken-pack').content, missions: '../outside' },
  });
  await assert.rejects(discoverContentPacks(root, validators), /content\.missions must be/u);
});

await withFixtureRoot(async (root) => {
  await writePack(root, 'missing-dependency', {
    ...validManifest('missing-dependency'),
    dependencies: ['absent-pack'],
  });
  await assert.rejects(discoverContentPacks(root, validators), /depends on missing pack/u);
});

await withFixtureRoot(async (root) => {
  await writePack(root, 'first-pack', validManifest('first-pack'));
  await writePack(root, 'second-pack', validManifest('second-pack'));
  await writeRecord(root, 'first-pack', 'locations', { id: 'duplicate-record' });
  await writeRecord(root, 'second-pack', 'locations', { id: 'duplicate-record' });
  await assert.rejects(discoverContentPacks(root, validators), /Duplicate global content ID/u);
});

console.log(
  `Content discovery fixtures rejected ${String(invalidDirectories.length)} unsafe directory form(s), missing dependencies, and duplicate IDs.`,
);

async function withFixtureRoot(run) {
  const root = await mkdtemp(join(tmpdir(), 'tiny-rescue-content-discovery-'));
  try {
    await run(root);
  } finally {
    await rm(root, { force: true, recursive: true });
  }
}

function validManifest(id) {
  return {
    id,
    version: '0.1.0',
    contractVersion: 1,
    titleKey: `pack.${id}.title`,
    locales: ['hu', 'en'],
    dependencies: [],
    content: {
      animals: 'animals',
      missions: 'missions',
      locations: 'locations',
      shelterAreas: 'shelter-areas',
    },
  };
}

async function writePack(rootDirectory, directory, manifest) {
  const packDirectory = join(rootDirectory, directory);
  await mkdir(packDirectory, { recursive: true });
  await writeFile(join(packDirectory, 'pack.json'), JSON.stringify(manifest), 'utf8');
}

async function writeRecord(rootDirectory, pack, kind, record) {
  const directory = join(rootDirectory, pack, kind);
  await mkdir(directory, { recursive: true });
  await writeFile(join(directory, 'record.json'), JSON.stringify(record), 'utf8');
}
