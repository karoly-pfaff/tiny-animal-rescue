import { describe, expect, it } from 'vitest';

import {
  assembleBundledContentRegistry,
  bundledContentRegistry,
  type BundledContentModules,
} from '../../sources/content/bundled-content-registry';
import type { ContentPackSource } from '../../sources/content/content-registry';
import { validateContentSemantics } from '../../sources/content/content-semantic-validator';
import type { PackManifestSource } from '../../sources/content/pack-contract';
import sampleEnglish from '../fixtures/content/sample-expansion/locales/en.json';
import sampleHungarian from '../fixtures/content/sample-expansion/locales/hu.json';
import sampleLocation from '../fixtures/content/sample-expansion/locations/sample-meadow.json';
import sampleManifest from '../fixtures/content/sample-expansion/pack.json';

const sampleDirectory = '../../tests/fixtures/content/sample-expansion';

describe('test-only content expansion seam', () => {
  it('loads a declarative non-release pack through the bundled-pack boundary', () => {
    const expanded = assembleBundledContentRegistry(withSampleExpansion(baseModules()));

    expect(validateContentSemantics(Object.values(expanded.packs))).toEqual([]);
    expect(expanded.packOrder).toEqual(['base', 'sample-expansion']);
    expect(expanded.locations['sample-meadow']).toEqual(sampleLocation);
    expect(expanded.packs['sample-expansion']?.dependencies).toEqual(['base']);
    expect(Object.isFrozen(expanded.locations['sample-meadow'])).toBe(true);
    expect(bundledContentRegistry.packs['sample-expansion']).toBeUndefined();
  });

  it('restores the exact base registry when the test pack is removed', () => {
    const restored = assembleBundledContentRegistry(baseModules());

    expect(restored).toStrictEqual(bundledContentRegistry);
  });
});

function withSampleExpansion(base: BundledContentModules): BundledContentModules {
  return {
    manifests: {
      ...base.manifests,
      [`${sampleDirectory}/pack.json`]: sampleManifest as PackManifestSource,
    },
    assetInventories: base.assetInventories,
    animals: base.animals,
    localizations: {
      ...base.localizations,
      [`${sampleDirectory}/locales/en.json`]: sampleEnglish,
      [`${sampleDirectory}/locales/hu.json`]: sampleHungarian,
    },
    locations: {
      ...base.locations,
      [`${sampleDirectory}/locations/sample-meadow.json`]: sampleLocation,
    },
    missions: base.missions,
    shelterAreas: base.shelterAreas,
  };
}

function baseModules(): BundledContentModules {
  const basePack = requireBasePack();
  const { records, ...manifest } = basePack;
  const directory = '../../content/base';
  return {
    manifests: { [`${directory}/pack.json`]: manifest },
    assetInventories: {
      [`${directory}/assets/manifest.json`]: { schemaVersion: 1, assets: records.assets },
    },
    animals: recordModules(`${directory}/${manifest.content.animals}`, records.animals),
    localizations: Object.fromEntries(
      Object.entries(records.localizations).map(([locale, document]) => [
        `${directory}/locales/${locale}.json`,
        document,
      ]),
    ),
    locations: recordModules(`${directory}/${manifest.content.locations}`, records.locations),
    missions: recordModules(`${directory}/${manifest.content.missions}`, records.missions),
    shelterAreas: recordModules(
      `${directory}/${manifest.content.shelterAreas}`,
      records.shelterAreas,
    ),
  };
}

function recordModules<Entry extends Readonly<{ id: string }>>(
  directory: string,
  records: readonly Entry[],
): Readonly<Record<string, Entry>> {
  return Object.fromEntries(records.map((record) => [`${directory}/${record.id}.json`, record]));
}

function requireBasePack(): ContentPackSource {
  const basePack = bundledContentRegistry.packs['base'];
  if (basePack === undefined) {
    throw new Error('The bundled base pack is required.');
  }
  return basePack;
}
