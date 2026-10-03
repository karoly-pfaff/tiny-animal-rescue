import { describe, expect, it } from 'vitest';

import { validateMapDeclarations } from '../../sources/content/content-map-validator';
import type { ContentPackSource } from '../../sources/content/content-registry';
import type {
  LocationRecord,
  MapLandmarkPresentation,
  ShelterAreaRecord,
} from '../../sources/content/world-content-contracts';
import { testContentRegistry } from '../support/first-rescue-content';

describe('map declaration validation', () => {
  it('accepts the distinct base map and the compatible omitted form', () => {
    const base = basePack();
    expect(validateMapDeclarations([base])).toEqual([]);
    expect(
      validateMapDeclarations([
        withRecords(base, {
          locations: base.records.locations.map(withoutLocationMapPresentation),
          shelterAreas: base.records.shelterAreas.map(withoutShelterMapPresentation),
        }),
      ]),
    ).toEqual([]);
  });

  it('requires exactly one labeled central Shelter once a map is declared', () => {
    const base = basePack();
    const withoutShelter = withRecords(base, {
      shelterAreas: base.records.shelterAreas.map(withoutShelterMapPresentation),
    });
    expect(validateMapDeclarations([withoutShelter]).join('\n')).toMatch(
      /exactly one central Shelter; found 0/u,
    );

    const unlabeledShelter = withRecords(base, {
      shelterAreas: base.records.shelterAreas.map(withoutMapLabel),
    });
    expect(validateMapDeclarations([unlabeledShelter]).join('\n')).toMatch(
      /must declare mapLabelKey/u,
    );
  });

  it('allows controlled primitive and color reuse through a distinct composite identity', () => {
    const base = basePack();
    const forest = base.records.locations.find(({ id }) => id === 'forest');
    const farm = base.records.locations.find(({ id }) => id === 'farm');
    if (forest?.mapPresentation === undefined || farm?.mapPresentation === undefined) {
      throw new Error('The Forest and Farm map presentation fixtures are required.');
    }
    const meadow: LocationRecord = {
      ...forest,
      id: 'meadow',
      nameKey: 'location.meadow.name',
      mapLabelKey: 'location.meadow.map-label',
      mapPresentation: {
        ...forest.mapPresentation,
        audioCue: 'effects.ambience.meadow',
        silhouette: farm.mapPresentation.silhouette,
      },
    };

    expect(
      validateMapDeclarations([
        withRecords(base, { locations: [...base.records.locations, meadow] }),
      ]),
    ).toEqual([]);
  });

  it('rejects duplicated composite visual identities and ambience cues', () => {
    const base = basePack();
    const forest = base.records.locations.find(({ id }) => id === 'forest');
    const forestPresentation = forest?.mapPresentation;
    if (forestPresentation === undefined) {
      throw new Error('The Forest map presentation fixture is required.');
    }
    const locations = base.records.locations.map((location) =>
      location.id === 'farm' ? withMapPresentation(location, forestPresentation) : location,
    );
    const findings = validateMapDeclarations([withRecords(base, { locations })]).join('\n');
    expect(findings).toMatch(/share audio cue/u);
    expect(findings).toMatch(/share shape and silhouette/u);
  });
});

function basePack(): ContentPackSource {
  const base = testContentRegistry.packs['base'];
  if (base === undefined) {
    throw new Error('The base content pack fixture is required.');
  }
  return base;
}

function withRecords(
  pack: ContentPackSource,
  records: Partial<ContentPackSource['records']>,
): ContentPackSource {
  return { ...pack, records: { ...pack.records, ...records } };
}

function withoutLocationMapPresentation(location: LocationRecord): LocationRecord {
  const result = { ...location };
  delete result.mapPresentation;
  return result;
}

function withoutShelterMapPresentation(area: ShelterAreaRecord): ShelterAreaRecord {
  const result = { ...area };
  delete result.mapPresentation;
  return result;
}

function withoutMapLabel(area: ShelterAreaRecord): ShelterAreaRecord {
  const result = { ...area };
  delete result.mapLabelKey;
  return result;
}

function withMapPresentation(
  location: LocationRecord,
  mapPresentation: MapLandmarkPresentation,
): LocationRecord {
  return { ...location, mapPresentation };
}
