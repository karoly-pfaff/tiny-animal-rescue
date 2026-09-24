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
    expect(Object.keys(bundledContentRegistry.assets)).toHaveLength(9);
    expect(bundledContentRegistry.assets['start-background']?.objectKey).toBe(
      'images/start/welcome-garden.png',
    );
    expect(Object.isFrozen(bundledContentRegistry.assets['start-background'])).toBe(true);
    expect(bundledContentRegistry.animals['mimi-kitten']?.species).toBe('kitten');
    expect(bundledContentRegistry.locations['garden']?.nameKey).toBe('location.garden.name');
    expect(bundledContentRegistry.missions['garden-kitten-tree']?.type).toBe('rescue');
    expect(bundledContentRegistry.shelterAreas['indoor-room']?.capacity).toBe(4);
    expect(
      bundledContentRegistry.packs['base']?.records.localizations['en']?.[
        'animal.mimi-kitten.name'
      ],
    ).toBe('Mimi');
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
      assetInventories: {},
      animals: {},
      localizations: {
        '../../content/nested-pack/locales/en.json': { 'pack.nested-pack.title': 'Nested' },
        '../../content/nested-pack/locales/hu.json': { 'pack.nested-pack.title': 'Beágyazott' },
      },
      locations: {
        '../../content/nested-pack/records/locations/nested-garden.json': location,
      },
      missions: {},
      shelterAreas: {},
    });

    expect(registry.locations['nested-garden']).toEqual(location);
    expect(
      registry.packs['nested-pack']?.records.localizations['hu']?.['pack.nested-pack.title'],
    ).toBe('Beágyazott');
    expect(registry.packs['nested-pack']?.dependencies).toEqual([]);
  });
});
