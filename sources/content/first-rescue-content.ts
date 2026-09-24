import { resolveContentAsset } from './content-asset-resolver';
import type { ContentPackSource, ContentRegistry } from './content-registry';
import {
  isSupportedInitialRescueMission,
  type InitialRescueMission,
} from './initial-rescue-contract';

type FirstRescueRecordLabel = 'location' | 'shelter area' | 'subject animal';

const subjectAnimalLabel = 'subject animal' satisfies FirstRescueRecordLabel;
const locationLabel = 'location' satisfies FirstRescueRecordLabel;
const shelterAreaLabel = 'shelter area' satisfies FirstRescueRecordLabel;

export type RescueRewardDefinition = Readonly<{
  missionId: string;
  residentId: string;
  worldFlags: readonly string[];
}>;

export type FirstRescueContent = Readonly<{
  animal: ContentPackSource['records']['animals'][number];
  dragStep: InitialRescueMission['steps'][0];
  location: ContentPackSource['records']['locations'][number];
  mission: InitialRescueMission;
  packId: string;
  registry: ContentRegistry;
  shelterArea: ContentPackSource['records']['shelterAreas'][number];
  tapStep: InitialRescueMission['steps'][1];
}>;

export function selectFirstRescueContent(registry: ContentRegistry): FirstRescueContent {
  const packId = initialMissionPackId(registry);
  const pack = requiredContentPack(registry, packId);
  const mission = requiredInitialMission(pack);
  return assembleFirstRescueContent(registry, packId, mission);
}

function initialMissionPackId(registry: ContentRegistry): string {
  const declaringPacks = registry.packOrder.filter(
    (packId) => registry.packs[packId]?.initialMissionId !== undefined,
  );
  if (declaringPacks.length !== 1) {
    throw new Error('The content registry must declare exactly one initial Rescue mission.');
  }
  const packId = declaringPacks[0];
  if (packId === undefined) {
    throw new Error('The initial Rescue pack could not be selected.');
  }
  return packId;
}

function requiredContentPack(registry: ContentRegistry, packId: string): ContentPackSource {
  const pack = registry.packs[packId];
  if (pack === undefined) {
    throw new Error('The initial Rescue pack is missing from the registry.');
  }
  return pack;
}

function requiredInitialMission(pack: ContentPackSource): InitialRescueMission {
  const mission = pack.records.missions.find(({ id }) => id === pack.initialMissionId);
  if (mission === undefined || !isSupportedInitialRescueMission(mission)) {
    throw new Error('The declared initial Rescue mission is missing or has an unsupported shape.');
  }
  return mission;
}

export function firstRescueReward(content: FirstRescueContent): RescueRewardDefinition {
  const residentId = content.mission.reward.unlockResidentId;
  if (residentId === undefined) {
    throw new Error('The initial Rescue mission has no resident reward.');
  }
  return {
    missionId: content.mission.id,
    residentId,
    worldFlags: content.mission.reward.worldFlags ?? [],
  };
}

export function firstRescueText(
  content: FirstRescueContent,
  locale: 'hu' | 'en',
  key: string,
): string {
  const value = content.registry.packs[content.packId]?.records.localizations[locale]?.[key];
  if (value === undefined) {
    throw new Error(`The initial Rescue content is missing localized key ${key}.`);
  }
  return value;
}

export function narrationCueForContentKey(key: string): string {
  return `voice.${key}`;
}

export function resolveFirstRescueAssets(content: FirstRescueContent) {
  const resolve = (reference: string) =>
    resolveContentAsset(content.registry, content.packId, reference);
  return {
    ladder: resolve(content.dragStep.sourceAsset),
    mapBackground: resolve(content.location.assets.mapBackground),
    missionAnimal: resolve(content.animal.assets.mission ?? content.animal.assets.portrait),
    missionBackground: resolve(content.mission.scene.background),
    residentCelebration: resolve(content.animal.assets.happy),
    residentPortrait: resolve(content.animal.assets.portrait),
    residentShelter: resolve(content.animal.assets.idle),
    shelterBackground: resolve(content.shelterArea.assets.background),
  } as const;
}

function assembleFirstRescueContent(
  registry: ContentRegistry,
  packId: string,
  mission: InitialRescueMission,
): FirstRescueContent {
  const animal = requiredRecord(registry.animals[mission.subjectAnimalId], subjectAnimalLabel);
  const location = requiredRecord(registry.locations[mission.locationId], locationLabel);
  const shelterArea = requiredRecord(registry.shelterAreas[animal.shelterAreaId], shelterAreaLabel);
  const [dragStep, tapStep] = mission.steps;
  return { animal, dragStep, location, mission, packId, registry, shelterArea, tapStep };
}

function requiredRecord<RecordValue>(
  value: RecordValue | undefined,
  label: FirstRescueRecordLabel,
): RecordValue {
  if (value === undefined) {
    throw new Error(`The initial Rescue mission is missing its ${label}.`);
  }
  return value;
}
