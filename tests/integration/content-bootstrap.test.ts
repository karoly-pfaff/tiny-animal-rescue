import { describe, expect, it } from 'vitest';

import {
  assembleBundledContentRegistry,
  bundledContentRegistry,
} from '../../sources/content/bundled-content-registry';
import type { PackManifestSource } from '../../sources/content/pack-contract';
import type { LocationRecord } from '../../sources/content/world-content-contracts';

describe('bundled content bootstrap', () => {
  it('discovers, normalizes, and freezes the real base pack for runtime use', () => {
    expect(bundledContentRegistry.packOrder).toEqual(['base']);
    expect(bundledContentRegistry.packs['base']?.content).toEqual({
      animals: 'animals',
      missions: 'missions',
      locations: 'locations',
      shelterAreas: 'shelter-areas',
    });
    expect(Object.isFrozen(bundledContentRegistry)).toBe(true);
    expect(Object.isFrozen(bundledContentRegistry.packs['base'])).toBe(true);
  });

  it('loads records from the directories declared by each manifest', () => {
    const manifest = {
      id: 'nested-pack',
      version: '0.1.0',
      contractVersion: 1,
      titleKey: 'pack.nested-pack.title',
      locales: ['hu', 'en'],
      content: {
        animals: 'records/animals',
        missions: 'records/missions',
        locations: 'records/locations',
        shelterAreas: 'records/shelter-areas',
      },
    } as const satisfies PackManifestSource;
    const location = {
      id: 'nested-garden',
      nameKey: 'location.nested-garden.name',
      mapLabelKey: 'location.nested-garden.map-label',
      assets: {
        mapBackground: 'images/map/nested-garden.png',
        missionBackground: 'images/missions/nested-garden/background.png',
      },
    } as const satisfies LocationRecord;

    const registry = assembleBundledContentRegistry({
      manifests: { '../../content/nested-pack/pack.json': manifest },
      animals: {},
      locations: {
        '../../content/nested-pack/records/locations/nested-garden.json': location,
      },
      missions: {},
      shelterAreas: {},
    });

    expect(registry.locations['nested-garden']).toEqual(location);
    expect(registry.packs['nested-pack']?.dependencies).toEqual([]);
  });
});
