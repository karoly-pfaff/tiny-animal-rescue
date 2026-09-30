import type { ContentRegistry } from '../../sources/content/content-registry';
import type { MissionRecord } from '../../sources/content/mission-contract';
import { testContentRegistry } from './first-rescue-content';

export const testWorldMission: MissionRecord = {
  id: 'garden-bring-ladder',
  type: 'world',
  callSubjectAsset: 'images/missions/garden-kitten-tree/ladder.png',
  locationId: 'garden',
  prerequisites: [],
  scene: {
    background: 'images/missions/garden-kitten-tree/background.png',
    designHeight: 768,
    designWidth: 1024,
  },
  steps: [
    {
      hint: { delayMs: 5000, type: 'pulse-after-delay' },
      id: 'pick-up',
      promptKey: 'mission.garden-bring-ladder.step.pick-up',
      successCue: 'effects.interaction.tap-remove',
      targetIds: ['ladder'],
      type: 'tap',
    },
    {
      hint: { delayMs: 5000, type: 'pulse-after-delay' },
      id: 'place',
      promptKey: 'mission.garden-bring-ladder.step.place',
      successCue: 'effects.progress.step-complete',
      targetIds: ['ladder-place'],
      type: 'tap',
    },
  ],
  reward: { completeMission: true },
  localization: {
    introKey: 'mission.garden-bring-ladder.intro',
    successKey: 'mission.garden-bring-ladder.success',
    titleKey: 'mission.garden-bring-ladder.title',
  },
  assets: { required: ['images/missions/garden-kitten-tree/background.png'] },
};

export function testRegistryWithWorldMission(): ContentRegistry {
  const base = testContentRegistry.packs['base'];
  if (base === undefined) {
    throw new Error('The bundled base pack is required.');
  }
  const localizations = Object.fromEntries(
    Object.entries(base.records.localizations).map(([locale, document]) => [
      locale,
      {
        ...document,
        'mission.garden-bring-ladder.intro':
          locale === 'hu'
            ? 'A létrára szükség van a kertben.'
            : 'The ladder is needed in the garden.',
        'mission.garden-bring-ladder.step.pick-up':
          locale === 'hu' ? 'Koppints a létrára!' : 'Tap the ladder!',
        'mission.garden-bring-ladder.step.place':
          locale === 'hu' ? 'Tedd a létrát a helyére!' : 'Put the ladder in place!',
        'mission.garden-bring-ladder.success':
          locale === 'hu' ? 'A létra a helyén van!' : 'The ladder is ready!',
        'mission.garden-bring-ladder.title':
          locale === 'hu' ? 'Vidd oda a létrát' : 'Bring the ladder',
      },
    ]),
  );
  const expandedBase = {
    ...base,
    records: {
      ...base.records,
      localizations,
      missions: [...base.records.missions, testWorldMission],
    },
  };
  return {
    ...testContentRegistry,
    missions: { ...testContentRegistry.missions, [testWorldMission.id]: testWorldMission },
    packs: { ...testContentRegistry.packs, base: expandedBase },
    recordOwners: {
      ...testContentRegistry.recordOwners,
      missions: {
        ...testContentRegistry.recordOwners.missions,
        [testWorldMission.id]: 'base',
      },
    },
  };
}
