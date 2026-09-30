import { assembleContentRegistry } from '../../sources/content/content-registry';
import type { MissionRecord } from '../../sources/content/mission-contract';
import type { ProgressionState } from '../../sources/content/progression-selectors';
import { v1ReleaseCatalog, type V1Mission } from '../../sources/content/v1-content-catalog';
import type { AnimalRecord } from '../../sources/content/world-content-contracts';
import type { AssetMetadata } from '../../sources/content/world-content-contracts';
import { testContentRegistry } from './first-rescue-content';

const progressionSeedNames = ['new-save', 'post-tutorial', 'three-rescue', 'all-complete'] as const;

export type ProgressionSeedName = (typeof progressionSeedNames)[number];

const allMissionIds = v1ReleaseCatalog.missions.map(({ id }) => id);
const allResidentIds = v1ReleaseCatalog.animals.map(([id]) => id);
const residentSubjectObjectKey = 'fixture-assets/resident-subject.png';
const worldSubjectObjectKey = 'fixture-assets/world-subject.png';

const fixtureSubjectAssets = [
  fixtureImageAsset('fixture-resident-subject', residentSubjectObjectKey),
  fixtureImageAsset('fixture-world-subject', worldSubjectObjectKey),
] as const;

export const progressionSeedStates: Readonly<Record<ProgressionSeedName, ProgressionState>> =
  Object.freeze({
    'all-complete': seedState(allMissionIds, allResidentIds),
    'new-save': seedState([], []),
    'post-tutorial': seedState(['garden-kitten-tree'], ['mimi-kitten']),
    'three-rescue': seedState(
      ['garden-kitten-tree', 'forest-hedgehog-branches', 'farm-chick-find-mother'],
      ['mimi-kitten', 'suni-hedgehog', 'pipi-chick'],
    ),
  });

const registry = createProgressionRegistry();

export function progressionFixtureRegistry() {
  return registry;
}

export function parseProgressionSeedName(value: string | null): ProgressionSeedName {
  return progressionSeedNames.includes(value as ProgressionSeedName)
    ? (value as ProgressionSeedName)
    : 'all-complete';
}

function createProgressionRegistry() {
  const base = testContentRegistry.packs['base'];
  const tutorial = testContentRegistry.missions['garden-kitten-tree'];
  const mimi = testContentRegistry.animals['mimi-kitten'];
  if (base === undefined || tutorial === undefined || mimi === undefined) {
    throw new Error('The progression fixture requires the bundled tutorial content.');
  }
  const animals = v1ReleaseCatalog.animals.map(([id, shelterAreaId, species]) =>
    animalFrom(mimi, { id, shelterAreaId, species }),
  );
  const missions = v1ReleaseCatalog.missions.map((mission, index) =>
    missionFrom(tutorial, mission, index),
  );
  const localizations = Object.fromEntries(
    Object.entries(base.records.localizations).map(([locale, document]) => [
      locale,
      {
        ...document,
        ...Object.fromEntries(
          v1ReleaseCatalog.missions.map((mission, index) => [
            missionTitleKey(mission.id),
            missionTitle(locale, mission, index),
          ]),
        ),
      },
    ]),
  );

  return assembleContentRegistry([
    {
      ...base,
      records: {
        ...base.records,
        animals,
        assets: [...base.records.assets, ...fixtureSubjectAssets],
        localizations,
        missions,
      },
    },
  ]);
}

function animalFrom(
  source: AnimalRecord,
  identity: Readonly<{ id: string; shelterAreaId: string; species: string }>,
): AnimalRecord {
  return {
    ...source,
    ...identity,
    assets: { ...source.assets, portrait: residentSubjectObjectKey },
  };
}

function missionFrom(source: MissionRecord, definition: V1Mission, index: number): MissionRecord {
  const sourceWithoutSubject = { ...source };
  Reflect.deleteProperty(sourceWithoutSubject, 'callSubjectAsset');
  Reflect.deleteProperty(sourceWithoutSubject, 'subjectAnimalId');
  const subjectAnimalId = definition.subjectAnimalId;
  const reward: MissionRecord['reward'] =
    definition.type === 'rescue'
      ? { completeMission: true, unlockResidentId: requiredSubjectAnimalId(definition) }
      : { completeMission: true };
  return {
    ...sourceWithoutSubject,
    id: definition.id,
    locationId: definition.locationId,
    mapCallOrder: index,
    prerequisites: prerequisiteIds(definition, index).map((completedMissionId) => ({
      completedMissionId,
    })),
    reward,
    type: definition.type,
    localization: { ...source.localization, titleKey: missionTitleKey(definition.id) },
    ...(subjectAnimalId === undefined ? {} : { subjectAnimalId }),
    ...(definition.type === 'world' ? { callSubjectAsset: worldSubjectObjectKey } : {}),
  };
}

function fixtureImageAsset(id: string, objectKey: string): AssetMetadata {
  return {
    id,
    category: 'image',
    objectKey,
    role: 'e2e-mission-call-subject',
    ownership: 'base',
    mediaType: 'image/png',
    classification: 'production-safe',
    delivery: 'r2-locked',
    qaStatus: 'approved',
    licenseStatus: 'approved',
    provenanceStatus: 'approved',
    promptRecord: 'tests/e2e/support/preview-server.ts',
    width: 16,
    height: 16,
    transparent: false,
  };
}

function requiredSubjectAnimalId(definition: V1Mission): string {
  if (definition.subjectAnimalId === undefined) {
    throw new Error(`Fixture Rescue ${definition.id} requires a subject animal.`);
  }
  return definition.subjectAnimalId;
}

function prerequisiteIds(definition: V1Mission, index: number): readonly string[] {
  if (index === 0) {
    return [];
  }
  if (index === 1 || index === 2) {
    return ['garden-kitten-tree'];
  }
  if (definition.id === 'pond-turtle-find-water') {
    return ['farm-chick-find-mother'];
  }
  if (definition.id === 'garden-mimi-find-ball') {
    return ['garden-kitten-tree'];
  }
  if (definition.id === 'forest-suni-picnic') {
    return ['forest-hedgehog-branches'];
  }
  const priorMission = v1ReleaseCatalog.missions[index - 1];
  return priorMission === undefined ? [] : [priorMission.id];
}

function missionTitleKey(missionId: string): string {
  return `fixture.mission.${missionId}.title`;
}

function missionTitle(locale: string, mission: V1Mission, index: number): string {
  const number = String(index + 1).padStart(2, '0');
  const type =
    locale === 'hu'
      ? { help: 'Segítség', rescue: 'Mentés', world: 'Gondoskodás' }[mission.type]
      : { help: 'Help', rescue: 'Rescue', world: 'Care' }[mission.type];
  return `${type} ${number}`;
}

function seedState(
  completedMissionIds: readonly string[],
  unlockedResidentIds: readonly string[],
): ProgressionState {
  return Object.freeze({
    completedMissionIds: Object.freeze([...completedMissionIds]),
    unlockedResidentIds: Object.freeze([...unlockedResidentIds]),
  });
}
