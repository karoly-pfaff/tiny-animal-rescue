import { describe, expect, it } from 'vitest';

import { assembleContentRegistry } from '../../sources/content/content-registry';
import {
  compareMissionCallOrder,
  selectProgression,
} from '../../sources/content/progression-selectors';
import { progressionFixtureRegistry } from '../support/progression-content';

describe('progression selectors', () => {
  it('gives both World calls their owned subject asset without inheriting Mimi', () => {
    const registry = progressionFixtureRegistry();

    for (const missionId of ['farm-piglet-mud-wash', 'pond-clear-litter']) {
      expect(registry.missions[missionId]).toMatchObject({
        callSubjectAsset: 'fixture-assets/world-subject.png',
      });
      expect(registry.missions[missionId]?.subjectAnimalId).toBeUndefined();
    }
  });

  it('offers the tutorial and only Garden on a new save', () => {
    const selection = selectProgression(progressionFixtureRegistry(), {
      completedMissionIds: [],
      unlockedResidentIds: [],
    });

    expect(selection.visibleLocationIds).toEqual(['garden']);
    expect(selection.availableMissionIds).toEqual(['garden-kitten-tree']);
    expect(selection.missionsByLocation).toEqual({ garden: ['garden-kitten-tree'] });
  });

  it('keeps missions at compatible unpresented locations out of map progression', () => {
    const registry = progressionFixtureRegistry();
    const base = registry.packs['base'];
    const garden = base?.records.locations.find(({ id }) => id === 'garden');
    const tutorial = base?.records.missions.find(({ id }) => id === 'garden-kitten-tree');
    if (base === undefined || garden === undefined || tutorial === undefined) {
      throw new Error('The progression fixture requires the bundled Garden tutorial.');
    }
    const unpresentedGarden = { ...garden };
    Reflect.deleteProperty(unpresentedGarden, 'mapPresentation');
    const hiddenLocationId = 'hidden-grove';
    const hiddenMissionId = 'hidden-grove-rescue';
    const expandedRegistry = assembleContentRegistry([
      {
        ...base,
        records: {
          ...base.records,
          locations: [...base.records.locations, { ...unpresentedGarden, id: hiddenLocationId }],
          missions: [
            ...base.records.missions,
            {
              ...tutorial,
              id: hiddenMissionId,
              locationId: hiddenLocationId,
              prerequisites: [],
            },
          ],
        },
      },
    ]);

    const selection = selectProgression(expandedRegistry, {
      completedMissionIds: [hiddenMissionId],
      unlockedResidentIds: ['mimi-kitten'],
    });

    expect(selection.visibleLocationIds).not.toContain(hiddenLocationId);
    expect(selection.availableMissionIds).not.toContain(hiddenMissionId);
    expect(selection.missionsByLocation).not.toHaveProperty(hiddenLocationId);
  });

  it('reveals Forest and Farm after the tutorial while gating Help by its resident', () => {
    const withoutResident = selectProgression(progressionFixtureRegistry(), {
      completedMissionIds: ['garden-kitten-tree'],
      unlockedResidentIds: [],
    });
    const withResident = selectProgression(progressionFixtureRegistry(), {
      completedMissionIds: ['garden-kitten-tree'],
      unlockedResidentIds: ['mimi-kitten'],
    });

    expect(withoutResident.visibleLocationIds).toEqual(['farm', 'forest', 'garden']);
    expect(withoutResident.availableMissionIds).toEqual([
      'garden-kitten-tree',
      'forest-hedgehog-branches',
      'farm-chick-find-mother',
    ]);
    expect(withoutResident.availableMissionIds).not.toContain('garden-mimi-find-ball');
    expect(withResident.availableMissionIds).toContain('garden-mimi-find-ball');
  });

  it('reveals Pond only after three known Rescue completions', () => {
    const registry = progressionFixtureRegistry();
    const twoRescuesAndUnknown = selectProgression(registry, {
      completedMissionIds: ['garden-kitten-tree', 'forest-hedgehog-branches', 'unknown-rescue'],
      unlockedResidentIds: ['mimi-kitten', 'suni-hedgehog'],
    });
    const threeRescues = selectProgression(registry, {
      completedMissionIds: [
        'garden-kitten-tree',
        'forest-hedgehog-branches',
        'farm-chick-find-mother',
      ],
      unlockedResidentIds: ['mimi-kitten', 'suni-hedgehog', 'pipi-chick'],
    });

    expect(twoRescuesAndUnknown.visibleLocationIds).not.toContain('pond');
    expect(threeRescues.visibleLocationIds).toContain('pond');
    expect(threeRescues.availableMissionIds).toContain('pond-turtle-find-water');
  });

  it('keeps completed missions replayable even when their current gates are unmet', () => {
    const registry = progressionFixtureRegistry();
    const completedHelpWithoutResident = selectProgression(registry, {
      completedMissionIds: ['garden-mimi-find-ball'],
      unlockedResidentIds: [],
    });

    expect(completedHelpWithoutResident.visibleLocationIds).toContain('garden');
    expect(completedHelpWithoutResident.availableMissionIds).toContain('garden-mimi-find-ball');
  });

  it('returns the same immutable ordering for the same state', () => {
    const registry = progressionFixtureRegistry();
    const state = {
      completedMissionIds: ['garden-kitten-tree'],
      unlockedResidentIds: ['mimi-kitten'],
    };
    const first = selectProgression(registry, state);
    const second = selectProgression(registry, state);

    expect(first).toEqual(second);
    expect(first.visibleLocationIds).toEqual(['farm', 'forest', 'garden']);
    expect(Object.isFrozen(first)).toBe(true);
    expect(Object.isFrozen(first.availableMissionIds)).toBe(true);
    expect(Object.isFrozen(first.missionsByLocation['garden'])).toBe(true);
  });

  it('ignores a stale pack-order entry deterministically', () => {
    const registry = progressionFixtureRegistry();
    const withMissingPack = {
      ...registry,
      packOrder: ['missing-pack', ...registry.packOrder],
    };

    expect(
      selectProgression(withMissingPack, {
        completedMissionIds: [],
        unlockedResidentIds: [],
      }),
    ).toEqual(
      selectProgression(registry, {
        completedMissionIds: [],
        unlockedResidentIds: [],
      }),
    );
  });

  it('orders calls by pack, explicit priority, and the stable-ID omitted default', () => {
    const registry = progressionFixtureRegistry();
    const tutorial = registry.missions['garden-kitten-tree'];
    if (tutorial === undefined) {
      throw new Error('The progression fixture requires the bundled tutorial mission.');
    }
    const withoutOrder = { ...tutorial };
    Reflect.deleteProperty(withoutOrder, 'mapCallOrder');
    const withExpansionOrder = { ...registry, packOrder: ['base', 'expansion'] };

    expect(
      compareMissionCallOrder(
        withExpansionOrder,
        { ownerPackId: 'base', record: tutorial },
        { ownerPackId: 'expansion', record: tutorial },
      ),
    ).toBeLessThan(0);
    expect(
      compareMissionCallOrder(
        registry,
        { ownerPackId: 'base', record: tutorial },
        { ownerPackId: 'base', record: { ...tutorial, id: 'later', mapCallOrder: 1 } },
      ),
    ).toBeLessThan(0);
    expect(
      compareMissionCallOrder(
        registry,
        { ownerPackId: 'base', record: tutorial },
        { ownerPackId: 'base', record: withoutOrder },
      ),
    ).toBeLessThan(0);
    expect(
      compareMissionCallOrder(
        registry,
        { ownerPackId: 'base', record: { ...withoutOrder, id: 'z-call' } },
        { ownerPackId: 'base', record: { ...withoutOrder, id: 'a-call' } },
      ),
    ).toBeGreaterThan(0);
  });
});
