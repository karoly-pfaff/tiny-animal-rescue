import { describe, expect, it } from 'vitest';

import type { ContentRegistry } from '../../sources/content/content-registry';
import {
  firstRescueReward,
  firstRescueText,
  selectFirstRescueContent,
  type FirstRescueContent,
} from '../../sources/content/first-rescue-content';
import type { DragStep, MissionRecord } from '../../sources/content/mission-contract';
import {
  testContentRegistry,
  testFirstRescueContent,
  testFirstRescueReward,
} from '../support/first-rescue-content';

describe('first Rescue content selection', () => {
  it('selects the prerequsite-free Rescue and derives its localized reward data', () => {
    expect(testFirstRescueContent.mission.id).toBe('garden-kitten-tree');
    expect(testFirstRescueContent.animal.id).toBe('mimi-kitten');
    expect(testFirstRescueContent.location.id).toBe('garden');
    expect(testFirstRescueContent.shelterArea.id).toBe('indoor-room');
    expect(firstRescueReward(testFirstRescueContent)).toEqual(testFirstRescueReward);
    expect(
      firstRescueText(
        testFirstRescueContent,
        'hu',
        testFirstRescueContent.mission.localization.titleKey,
      ),
    ).toBe('Mimi a fán');
  });

  it('fails when the registry has no initial Rescue mission', () => {
    const registry = registryWithoutInitialMission();

    expect(() => selectFirstRescueContent(registry)).toThrow(/exactly one initial Rescue mission/u);
  });

  it('rejects ambiguous initial mission declarations instead of using pack order', () => {
    const basePack = requiredBasePack();
    const otherPack = { ...basePack, id: 'other-pack' };
    const registry: ContentRegistry = {
      ...testContentRegistry,
      packOrder: ['base', 'other-pack'],
      packs: { base: basePack, 'other-pack': otherPack },
    };

    expect(() => selectFirstRescueContent(registry)).toThrow(/exactly one initial Rescue mission/u);
  });

  it.each([
    ['subject animal', { animals: {} }],
    ['location', { locations: {} }],
    ['shelter area', { shelterAreas: {} }],
  ] as const)('fails when the selected mission lacks its %s', (label, registryRecords) => {
    const registry: ContentRegistry = { ...testContentRegistry, ...registryRecords };

    expect(() => selectFirstRescueContent(registry)).toThrow(new RegExp(label, 'u'));
  });

  it('requires both supported first-rescue interaction steps', () => {
    const withoutDrag = missionWithSteps(
      testFirstRescueContent.mission.steps.filter(({ type }) => type !== 'drag'),
    );
    const withoutTap = missionWithSteps(
      testFirstRescueContent.mission.steps.filter(({ type }) => type !== 'tap'),
    );

    expect(() => selectFirstRescueContent(registryWithMission(withoutDrag))).toThrow(
      /unsupported shape/u,
    );
    expect(() => selectFirstRescueContent(registryWithMission(withoutTap))).toThrow(
      /unsupported shape/u,
    );
  });

  it('requires the selected drag source to be declared as content', () => {
    const mission = missionWithSteps(
      testFirstRescueContent.mission.steps.map((step) =>
        step.type === 'drag' ? withoutDragSource(step) : step,
      ),
    );

    expect(() => selectFirstRescueContent(registryWithMission(mission))).toThrow(
      /unsupported shape/u,
    );
  });

  it('rejects incomplete rewards and missing localized values', () => {
    const incompleteReward: FirstRescueContent = {
      ...testFirstRescueContent,
      mission: {
        ...testFirstRescueContent.mission,
        reward: { completeMission: true },
      },
    };
    const basePack = requiredBasePack();
    const missingText: FirstRescueContent = {
      ...testFirstRescueContent,
      registry: {
        ...testContentRegistry,
        packs: {
          base: {
            ...basePack,
            records: { ...basePack.records, localizations: { en: {}, hu: {} } },
          },
        },
      },
    };

    expect(() => firstRescueReward(incompleteReward)).toThrow(/no resident reward/u);
    expect(() => firstRescueText(missingText, 'en', 'missing.key')).toThrow(
      /missing localized key/u,
    );
  });
});

function missionWithSteps(steps: MissionRecord['steps']): MissionRecord {
  return { ...testFirstRescueContent.mission, steps };
}

function withoutDragSource(step: DragStep): DragStep {
  const copy = { ...step };
  delete copy.sourceAsset;
  return copy;
}

function registryWithMission(mission: MissionRecord): ContentRegistry {
  return registryWithRecords({ missions: [mission] }, { [mission.id]: mission });
}

function registryWithoutInitialMission(): ContentRegistry {
  const basePack = { ...requiredBasePack() };
  delete basePack.initialMissionId;
  return { ...testContentRegistry, packs: { base: basePack } };
}

function registryWithRecords(
  packRecords: Partial<ContentRegistry['packs'][string]['records']>,
  missions: ContentRegistry['missions'] = testContentRegistry.missions,
): ContentRegistry {
  const basePack = requiredBasePack();
  return {
    ...testContentRegistry,
    missions,
    packs: { base: { ...basePack, records: { ...basePack.records, ...packRecords } } },
  };
}

function requiredBasePack() {
  const pack = testContentRegistry.packs['base'];
  if (pack === undefined) {
    throw new Error('The base fixture pack is required.');
  }
  return pack;
}
