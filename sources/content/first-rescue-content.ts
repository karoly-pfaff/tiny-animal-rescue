import { resolveContentAsset } from './content-asset-resolver';
import { resolveContentRecord, type ResolvedContentRecord } from './content-record-resolver';
import {
  animalRecords,
  locationRecords,
  shelterAreaRecords,
  type ContentRecordKind,
} from './content-record-kind';
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
  animalPackId: string;
  dragStep: InitialRescueMission['steps'][0];
  location: ContentPackSource['records']['locations'][number];
  locationPackId: string;
  mission: InitialRescueMission;
  packId: string;
  registry: ContentRegistry;
  shelterArea: ContentPackSource['records']['shelterAreas'][number];
  shelterAreaPackId: string;
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
    residentId: content.animal.id,
    worldFlags: content.mission.reward.worldFlags ?? [],
  };
}

export function firstRescueText(
  content: FirstRescueContent,
  locale: 'hu' | 'en',
  selection: string | Readonly<{ key: string; ownerPackId: string }>,
): string {
  const { key, ownerPackId } = normalizeTextSelection(content.packId, selection);
  const value = content.registry.packs[ownerPackId]?.records.localizations[locale]?.[key];
  if (value === undefined) {
    throw new Error(`The initial Rescue content is missing localized key ${key}.`);
  }
  return value;
}

function normalizeTextSelection(
  defaultPackId: string,
  selection: string | Readonly<{ key: string; ownerPackId: string }>,
): Readonly<{ key: string; ownerPackId: string }> {
  return typeof selection === 'string' ? { key: selection, ownerPackId: defaultPackId } : selection;
}

export function narrationCueForContentKey(key: string): string {
  return `voice.${key}`;
}

export function resolveFirstRescueAssets(content: FirstRescueContent) {
  const resolve = (ownerPackId: string, reference: string) =>
    resolveContentAsset(content.registry, ownerPackId, reference);
  return {
    ladder: resolve(content.packId, content.dragStep.sourceAsset),
    mapBackground: resolve(content.locationPackId, content.location.assets.mapBackground),
    missionAnimal: resolve(
      content.animalPackId,
      content.animal.assets.mission ?? content.animal.assets.portrait,
    ),
    missionBackground: resolve(content.packId, content.mission.scene.background),
    residentCelebration: resolve(content.animalPackId, content.animal.assets.happy),
    residentPortrait: resolve(content.animalPackId, content.animal.assets.portrait),
    residentShelter: resolve(content.animalPackId, content.animal.assets.idle),
    shelterBackground: resolve(content.shelterAreaPackId, content.shelterArea.assets.background),
  } as const;
}

function assembleFirstRescueContent(
  registry: ContentRegistry,
  packId: string,
  mission: InitialRescueMission,
): FirstRescueContent {
  const animalRecord = requiredResolvedRecord({
    registry,
    consumingPackId: packId,
    reference: mission.subjectAnimalId,
    kind: animalRecords,
    label: subjectAnimalLabel,
  });
  const locationRecord = requiredResolvedRecord({
    registry,
    consumingPackId: packId,
    reference: mission.locationId,
    kind: locationRecords,
    label: locationLabel,
  });
  const shelterAreaRecord = requiredResolvedRecord({
    registry,
    consumingPackId: animalRecord.ownerPackId,
    reference: animalRecord.record.shelterAreaId,
    kind: shelterAreaRecords,
    label: shelterAreaLabel,
  });
  const animal = requiredRecord(animalRecord.record, subjectAnimalLabel);
  const location = requiredRecord(locationRecord.record, locationLabel);
  const shelterArea = requiredRecord(shelterAreaRecord.record, shelterAreaLabel);
  const [dragStep, tapStep] = mission.steps;
  return {
    animal,
    animalPackId: animalRecord.ownerPackId,
    dragStep,
    location,
    locationPackId: locationRecord.ownerPackId,
    mission,
    packId,
    registry,
    shelterArea,
    shelterAreaPackId: shelterAreaRecord.ownerPackId,
    tapStep,
  };
}

function requiredResolvedRecord<Kind extends ContentRecordKind>(
  options: Readonly<{
    registry: ContentRegistry;
    consumingPackId: string;
    reference: string;
    kind: Kind;
    label: FirstRescueRecordLabel;
  }>,
): ResolvedContentRecord<Kind> {
  try {
    return resolveContentRecord(options);
  } catch (cause) {
    throw new Error(`The initial Rescue mission is missing its ${options.label}.`, { cause });
  }
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
