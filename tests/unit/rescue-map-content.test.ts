import { describe, expect, it } from 'vitest';

import { resolveContentText } from '../../sources/content/content-localization';
import type { ContentRegistry } from '../../sources/content/content-registry';
import { selectRescueMapContent } from '../../sources/content/rescue-map-content';
import type { ShelterAreaRecord } from '../../sources/content/world-content-contracts';
import { testContentRegistry } from '../support/first-rescue-content';

describe('rescue map content selection', () => {
  it('selects only visible presented locations and resolves owner-localized text', () => {
    const map = selectRescueMapContent(testContentRegistry, ['pond', 'garden']);
    expect(map.locations.map(({ id }) => id)).toEqual(['garden', 'pond']);
    expect(map.shelter.id).toBe('indoor-room');
    expect(
      resolveContentText(testContentRegistry, 'hu', {
        key: map.shelter.labelKey,
        ownerPackId: map.shelter.ownerPackId,
      }),
    ).toBe('Menhely');
  });

  it('ignores absent pack-order entries and rejects a missing or unlabeled Shelter', () => {
    const withMissingPack: ContentRegistry = {
      ...testContentRegistry,
      packOrder: ['missing-pack', ...testContentRegistry.packOrder],
    };
    expect(selectRescueMapContent(withMissingPack, ['garden']).locations).toHaveLength(1);

    const base = testContentRegistry.packs['base'];
    if (base === undefined) {
      throw new Error('The base content pack fixture is required.');
    }
    const withoutShelter: ContentRegistry = {
      ...testContentRegistry,
      packs: {
        ...testContentRegistry.packs,
        base: {
          ...base,
          records: {
            ...base.records,
            shelterAreas: base.records.shelterAreas.map(withoutMapLabel),
          },
        },
      },
    };
    expect(() => selectRescueMapContent(withoutShelter, ['garden'])).toThrow(
      /exactly one content-declared central Shelter/u,
    );
  });

  it('reports a missing localized key with its owning pack', () => {
    expect(() =>
      resolveContentText(testContentRegistry, 'en', {
        key: 'location.missing.name',
        ownerPackId: 'base',
      }),
    ).toThrow(/Content pack base is missing localized key location.missing.name/u);
  });
});

function withoutMapLabel(area: ShelterAreaRecord): ShelterAreaRecord {
  const result = { ...area };
  delete result.mapLabelKey;
  return result;
}
