import { describe, expect, it } from 'vitest';

import type { ContentRegistry } from '../../sources/content/content-registry';
import { selectMissionCalls } from '../../sources/content/mission-call-content';
import {
  selectProgression,
  type ProgressionSelection,
} from '../../sources/content/progression-selectors';
import {
  testRegistryWithWorldMission,
  testWorldMission,
} from '../support/expanded-mission-content';
import { testContentRegistry } from '../support/first-rescue-content';

describe('mission call content', () => {
  it('localizes the available call and exposes its portrait and location cue', () => {
    const state = { completedMissionIds: [], unlockedResidentIds: [] };
    const calls = selectMissionCalls(
      testContentRegistry,
      selectProgression(testContentRegistry, state),
      { locale: 'en', state },
    );

    expect(calls.featuredMissionId).toBe('garden-kitten-tree');
    expect(calls.calls).toEqual([
      expect.objectContaining({
        completed: false,
        id: 'garden-kitten-tree',
        locationId: 'garden',
        locationName: 'Garden',
        portraitUrl: null,
        title: 'Mimi in the tree',
      }),
    ]);
    expect(calls.calls[0]?.locationPresentation).toMatchObject({
      shape: 'circle',
      silhouette: 'tree',
    });
    expect(Object.isFrozen(calls)).toBe(true);
    expect(Object.isFrozen(calls.calls)).toBe(true);
    expect(Object.isFrozen(calls.calls[0])).toBe(true);
  });

  it('features the next incomplete authored call without removing a replay', () => {
    const registry = testRegistryWithWorldMission();
    const state = {
      completedMissionIds: ['garden-kitten-tree'],
      unlockedResidentIds: ['mimi-kitten'],
    };
    const progression = {
      availableMissionIds: [testWorldMission.id, 'garden-kitten-tree'],
      missionsByLocation: {
        garden: [testWorldMission.id, 'garden-kitten-tree'],
      },
      visibleLocationIds: ['garden'],
    };

    expect(selectMissionCalls(registry, progression, { locale: 'hu', state })).toMatchObject({
      featuredMissionId: testWorldMission.id,
      calls: [
        { completed: true, id: 'garden-kitten-tree' },
        {
          completed: false,
          id: testWorldMission.id,
          portraitUrl: null,
          title: 'Vidd oda a létrát',
        },
      ],
    });
  });

  it('leaves all-complete calls unfeatured', () => {
    const state = {
      completedMissionIds: ['garden-kitten-tree'],
      unlockedResidentIds: ['mimi-kitten'],
    };
    const selection = selectMissionCalls(
      testContentRegistry,
      selectProgression(testContentRegistry, state),
      { locale: 'en', state },
    );

    expect(selection.featuredMissionId).toBeNull();
    expect(selection.calls[0]?.completed).toBe(true);
  });

  it('rejects unknown selected missions and locations without a map presentation', () => {
    expect(() =>
      selectMissionCalls(testContentRegistry, selectionWithMission('missing-mission'), {
        locale: 'en',
        state: { completedMissionIds: [], unlockedResidentIds: [] },
      }),
    ).toThrow(/unknown mission missing-mission/u);

    const withoutMission: ContentRegistry = {
      ...testContentRegistry,
      missions: {},
    };
    expect(() =>
      selectMissionCalls(withoutMission, selectionWithMission('garden-kitten-tree'), {
        locale: 'en',
        state: { completedMissionIds: [], unlockedResidentIds: [] },
      }),
    ).toThrow(/unknown mission garden-kitten-tree/u);

    const garden = testContentRegistry.locations['garden'];
    if (garden === undefined) {
      throw new Error('The bundled Garden location is required.');
    }
    const unpresentedGarden = { ...garden };
    delete unpresentedGarden.mapPresentation;
    const withoutPresentation: ContentRegistry = {
      ...testContentRegistry,
      locations: { ...testContentRegistry.locations, garden: unpresentedGarden },
    };
    expect(() =>
      selectMissionCalls(withoutPresentation, selectionWithMission('garden-kitten-tree'), {
        locale: 'en',
        state: { completedMissionIds: [], unlockedResidentIds: [] },
      }),
    ).toThrow(/has no presented map location/u);

    const withoutSubjectVisual = registryWithoutWorldCallSubject();
    expect(() =>
      selectMissionCalls(withoutSubjectVisual, selectionWithMission(testWorldMission.id), {
        locale: 'en',
        state: { completedMissionIds: [], unlockedResidentIds: [] },
      }),
    ).toThrow(/has no subject visual/u);
  });
});

function selectionWithMission(missionId: string): ProgressionSelection {
  return {
    availableMissionIds: [missionId],
    missionsByLocation: { garden: [missionId] },
    visibleLocationIds: ['garden'],
  };
}

function registryWithoutWorldCallSubject(): ContentRegistry {
  const registry = testRegistryWithWorldMission();
  const base = registry.packs['base'];
  if (base === undefined) {
    throw new Error('The bundled base pack is required.');
  }
  const mission = { ...testWorldMission };
  delete mission.callSubjectAsset;
  return {
    ...registry,
    missions: { ...registry.missions, [mission.id]: mission },
    packs: {
      ...registry.packs,
      base: {
        ...base,
        records: {
          ...base.records,
          missions: base.records.missions.map((candidate) =>
            candidate.id === mission.id ? mission : candidate,
          ),
        },
      },
    },
  };
}
