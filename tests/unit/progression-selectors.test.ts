import { describe, expect, it } from 'vitest';

import { assembleContentRegistry } from '../../sources/content/content-registry';
import type { MissionRecord } from '../../sources/content/mission-contract';
import { selectProgression } from '../../sources/content/progression-selectors';
import type { AnimalRecord } from '../../sources/content/world-content-contracts';
import { testContentRegistry } from '../support/first-rescue-content';

describe('progression selectors', () => {
  it('offers the tutorial and only Garden on a new save', () => {
    const selection = selectProgression(progressionRegistry(), {
      completedMissionIds: [],
      unlockedResidentIds: [],
    });

    expect(selection.visibleLocationIds).toEqual(['garden']);
    expect(selection.availableMissionIds).toEqual(['garden-kitten-tree']);
    expect(selection.missionsByLocation).toEqual({ garden: ['garden-kitten-tree'] });
  });

  it('keeps missions at compatible unpresented locations out of map progression', () => {
    const registry = progressionRegistry();
    const base = registry.packs['base'];
    const garden = base?.records.locations.find(({ id }) => id === 'garden');
    const tutorial = base?.records.missions.find(({ id }) => id === 'garden-kitten-tree');
    if (base === undefined || garden === undefined || tutorial === undefined) {
      throw new Error('The progression fixture requires the bundled Garden tutorial.');
    }
    const { mapPresentation: _mapPresentation, ...unpresentedGarden } = garden;
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
    const withoutResident = selectProgression(progressionRegistry(), {
      completedMissionIds: ['garden-kitten-tree'],
      unlockedResidentIds: [],
    });
    const withResident = selectProgression(progressionRegistry(), {
      completedMissionIds: ['garden-kitten-tree'],
      unlockedResidentIds: ['mimi-kitten'],
    });

    expect(withoutResident.visibleLocationIds).toEqual(['farm', 'forest', 'garden']);
    expect(withoutResident.availableMissionIds).toEqual([
      'garden-kitten-tree',
      'farm-lamb-fence',
      'forest-puppy-branch',
    ]);
    expect(withoutResident.availableMissionIds).not.toContain('garden-help-mimi');
    expect(withResident.availableMissionIds).toContain('garden-help-mimi');
  });

  it('reveals Pond only after three known Rescue completions', () => {
    const registry = progressionRegistry();
    const twoRescuesAndUnknown = selectProgression(registry, {
      completedMissionIds: ['garden-kitten-tree', 'farm-lamb-fence', 'unknown-rescue'],
      unlockedResidentIds: ['mimi-kitten', 'lili-lamb'],
    });
    const threeRescues = selectProgression(registry, {
      completedMissionIds: ['garden-kitten-tree', 'farm-lamb-fence', 'forest-puppy-branch'],
      unlockedResidentIds: ['mimi-kitten', 'lili-lamb', 'buksi-puppy'],
    });

    expect(twoRescuesAndUnknown.visibleLocationIds).not.toContain('pond');
    expect(threeRescues.visibleLocationIds).toContain('pond');
    expect(threeRescues.availableMissionIds).toContain('pond-duck-reeds');
  });

  it('keeps completed missions replayable even when their current gates are unmet', () => {
    const registry = progressionRegistry();
    const completedHelpWithoutResident = selectProgression(registry, {
      completedMissionIds: ['garden-help-mimi'],
      unlockedResidentIds: [],
    });

    expect(completedHelpWithoutResident.visibleLocationIds).toContain('garden');
    expect(completedHelpWithoutResident.availableMissionIds).toContain('garden-help-mimi');
  });

  it('returns the same immutable ordering for the same state', () => {
    const registry = progressionRegistry();
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
    const registry = progressionRegistry();
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
});

function progressionRegistry() {
  const base = testContentRegistry.packs['base'];
  const tutorial = testContentRegistry.missions['garden-kitten-tree'];
  const mimi = testContentRegistry.animals['mimi-kitten'];
  if (base === undefined || tutorial === undefined || mimi === undefined) {
    throw new Error('The progression fixture requires the bundled tutorial content.');
  }
  const farmAnimal = animalFrom(mimi, 'lili-lamb', 'lamb');
  const forestAnimal = animalFrom(mimi, 'buksi-puppy', 'puppy');
  const pondAnimal = animalFrom(mimi, 'pipi-duck', 'duck');
  const missions = [
    tutorial,
    missionFrom(tutorial, {
      id: 'farm-lamb-fence',
      locationId: 'farm',
      subjectAnimalId: farmAnimal.id,
      prerequisites: [{ completedMissionId: tutorial.id }],
    }),
    missionFrom(tutorial, {
      id: 'forest-puppy-branch',
      locationId: 'forest',
      subjectAnimalId: forestAnimal.id,
      prerequisites: [{ completedMissionId: tutorial.id }],
    }),
    missionFrom(tutorial, {
      id: 'pond-duck-reeds',
      locationId: 'pond',
      subjectAnimalId: pondAnimal.id,
      prerequisites: [
        { completedMissionId: 'farm-lamb-fence' },
        { completedMissionId: 'forest-puppy-branch' },
      ],
    }),
    missionFrom(tutorial, {
      id: 'garden-help-mimi',
      locationId: 'garden',
      subjectAnimalId: mimi.id,
      prerequisites: [{ completedMissionId: tutorial.id }],
      type: 'help',
    }),
  ];

  return assembleContentRegistry([
    {
      ...base,
      records: {
        ...base.records,
        animals: [...base.records.animals, farmAnimal, forestAnimal, pondAnimal],
        missions,
      },
    },
  ]);
}

function animalFrom(source: AnimalRecord, id: string, species: string): AnimalRecord {
  return {
    ...source,
    id,
    species,
    nameKey: `animal.${id}.name`,
    shelterLocalization: {
      happyKey: `animal.${id}.shelter.happy`,
      tapLabelKey: `animal.${id}.shelter.tap-label`,
    },
  };
}

type MissionOverrides = Pick<MissionRecord, 'id' | 'locationId' | 'prerequisites'> &
  Readonly<{ subjectAnimalId: string; type?: MissionRecord['type'] }>;

function missionFrom(source: MissionRecord, overrides: MissionOverrides): MissionRecord {
  const type = overrides.type ?? 'rescue';
  const reward =
    type === 'rescue'
      ? { completeMission: true as const, unlockResidentId: overrides.subjectAnimalId }
      : { completeMission: true as const };
  return {
    ...source,
    ...overrides,
    type,
    reward,
  };
}
