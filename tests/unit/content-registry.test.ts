import { describe, expect, it } from 'vitest';

import {
  assembleContentRegistry,
  type ContentPackSource,
} from '../../sources/content/content-registry';
import { normalizePackManifest } from '../../sources/content/pack-contract';
import type { LocationRecord } from '../../sources/content/world-content-contracts';

describe('content registry assembly', () => {
  it('orders packs deterministically after their dependencies', () => {
    const registry = assembleContentRegistry([
      packSource('winter-rescue', ['base'], 'winter-garden'),
      packSource('base', [], 'garden'),
      packSource('bonus-help', ['base'], 'bonus-garden'),
    ]);

    expect(registry.packOrder).toEqual(['base', 'bonus-help', 'winter-rescue']);
  });

  it('rejects missing dependencies, cycles, and base dependencies clearly', () => {
    expect(() => assembleContentRegistry([packSource('winter-rescue', ['base'])])).toThrow(
      /depends on missing pack base/u,
    );
    expect(() =>
      assembleContentRegistry([
        packSource('winter-rescue', ['spring-help']),
        packSource('spring-help', ['winter-rescue']),
      ]),
    ).toThrow(/dependency cycle: \["[a-z-]+","[a-z-]+","[a-z-]+"\]/u);
    expect(() =>
      assembleContentRegistry([packSource('base', ['winter-rescue']), packSource('winter-rescue')]),
    ).toThrow(/base pack cannot depend/u);
  });

  it('rejects duplicate pack and global record IDs', () => {
    expect(() => assembleContentRegistry([packSource('base'), packSource('base')])).toThrow(
      /Duplicate pack ID: base/u,
    );
    expect(() =>
      assembleContentRegistry([
        packSource('base', [], 'shared-id'),
        packSource('winter-rescue', ['base'], 'shared-id'),
      ]),
    ).toThrow(/Duplicate global content ID shared-id/u);
  });

  it('accepts prototype-named pack IDs and resolves them as dependencies', () => {
    const registry = assembleContentRegistry([
      packSource('uses-constructor', ['constructor']),
      packSource('constructor'),
    ]);

    expect(registry.packOrder).toEqual(['constructor', 'uses-constructor']);
    expect(Object.hasOwn(registry.packs, 'constructor')).toBe(true);
  });

  it('returns an immutable detached registry', () => {
    const source = packSource('base', [], 'garden');
    const registry = assembleContentRegistry([source]);
    const location = registry.locations['garden'];

    expect(location).toBeDefined();
    expect(Object.isFrozen(registry)).toBe(true);
    expect(Object.isFrozen(registry.packs['base']?.records)).toBe(true);
    expect(Object.isFrozen(location?.assets)).toBe(true);
    expect(Reflect.set(location?.assets ?? {}, 'mapBackground', 'changed.png')).toBe(false);
    expect(registry.locations['garden']?.assets.mapBackground).toBe('images/map/garden.png');
  });
});

function packSource(
  id: string,
  dependencies: readonly string[] = [],
  locationId?: string,
): ContentPackSource {
  const manifest = normalizePackManifest({
    id,
    version: '0.1.0',
    contractVersion: 1,
    titleKey: `pack.${id}.title`,
    locales: ['hu', 'en'],
    dependencies,
    content: {
      animals: 'animals',
      locations: 'locations',
      missions: 'missions',
      shelterAreas: 'shelter-areas',
    },
  });
  return {
    ...manifest,
    records: {
      animals: [],
      assets: [],
      localizations: {},
      locations: locationId === undefined ? [] : [location(locationId)],
      missions: [],
      shelterAreas: [],
    },
  };
}

function location(id: string): LocationRecord {
  return {
    id,
    nameKey: `location.${id}.name`,
    mapLabelKey: `location.${id}.map-label`,
    assets: {
      mapBackground: `images/map/${id}.png`,
      missionBackground: `images/missions/${id}.png`,
    },
  };
}
