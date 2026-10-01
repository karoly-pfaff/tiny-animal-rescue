import {
  animalRecordLabel,
  animalRecords,
  locationRecordLabel,
  locationRecords,
  missionRecords,
  prerequisiteRecordLabel,
  shelterAreaRecordLabel,
  shelterAreaRecords,
  type ContentRecordKind,
} from './content-record-kind.ts';
import {
  canonicalReferenceKey,
  type OwnedRecord,
  resolveOwnedRecord,
  validateRecordReference,
} from './content-record-linker.ts';
import type { ContentPackSource } from './content-registry.ts';
import { diagnostic } from './content-validation-diagnostic.ts';
import { normalizeMissionsForGraph } from './content-mission-normalizer.ts';
import type { MissionRecord } from './mission-contract.ts';
import { validateMissionGraph } from './mission-graph-validator.ts';

type Animal = ContentPackSource['records']['animals'][number];
type Location = ContentPackSource['records']['locations'][number];
type ShelterArea = ContentPackSource['records']['shelterAreas'][number];

type SemanticIndex = Readonly<{
  animals: ReadonlyMap<string, OwnedRecord<Animal>>;
  locations: ReadonlyMap<string, OwnedRecord<Location>>;
  missions: ReadonlyMap<string, OwnedRecord<MissionRecord>>;
  packs: ReadonlyMap<string, ContentPackSource>;
  shelterAreas: ReadonlyMap<string, OwnedRecord<ShelterArea>>;
}>;

type MissionValidationContext = Readonly<{
  content: SemanticIndex;
  residentRescues: Map<string, string>;
}>;

export function validateContentRelationships(
  packs: readonly ContentPackSource[],
): readonly string[] {
  const content = createIndex(packs);
  const residentRescues = new Map<string, string>();
  const missionContext = { content, residentRescues };
  return [
    ...validateAnimals(content),
    ...validateMissions(missionContext),
    ...validateShelterCapacity(content),
    ...validateMissionGraph(
      normalizeMissionsForGraph({
        animals: content.animals,
        missions: content.missions,
        packs: content.packs,
      }),
      residentRescues,
    ),
  ];
}

function createIndex(packs: readonly ContentPackSource[]): SemanticIndex {
  return {
    animals: indexOwned(packs, animalRecords),
    locations: indexOwned(packs, locationRecords),
    missions: indexOwned(packs, missionRecords),
    packs: new Map(packs.map((pack) => [pack.id, pack])),
    shelterAreas: indexOwned(packs, shelterAreaRecords),
  };
}

function indexOwned<Kind extends ContentRecordKind>(
  packs: readonly ContentPackSource[],
  kind: Kind,
): Map<string, OwnedRecord<ContentPackSource['records'][Kind][number]>> {
  return new Map(
    packs.flatMap((pack) =>
      pack.records[kind].map((record) => [record.id, { ownerPackId: pack.id, record }] as const),
    ),
  );
}

function validateAnimals(content: SemanticIndex): readonly string[] {
  return [...content.animals.values()].flatMap(({ ownerPackId, record }) =>
    validateRecordReference({
      consumerLabel: `Animal ${record.id}`,
      contentPacks: content.packs,
      declaringPackId: ownerPackId,
      rawReference: record.shelterAreaId,
      recordLabel: shelterAreaRecordLabel,
      records: content.shelterAreas,
    }),
  );
}

function validateMissions(context: MissionValidationContext): readonly string[] {
  return [...context.content.missions.values()].flatMap((mission) => [
    ...validateMissionReferences(mission, context.content),
    ...validateMissionSteps(mission.record),
    ...validateMissionReward(mission, context),
  ]);
}

function validateMissionReferences(
  mission: OwnedRecord<MissionRecord>,
  content: SemanticIndex,
): readonly string[] {
  const { ownerPackId, record } = mission;
  const common = {
    consumerLabel: `Mission ${record.id}`,
    contentPacks: content.packs,
    declaringPackId: ownerPackId,
  };
  return [
    ...validateRecordReference({
      ...common,
      rawReference: record.locationId,
      recordLabel: locationRecordLabel,
      records: content.locations,
    }),
    ...(record.subjectAnimalId === undefined
      ? []
      : validateRecordReference({
          ...common,
          rawReference: record.subjectAnimalId,
          recordLabel: animalRecordLabel,
          records: content.animals,
        })),
    ...record.prerequisites.flatMap(({ completedMissionId }) =>
      validateRecordReference({
        ...common,
        rawReference: completedMissionId,
        recordLabel: prerequisiteRecordLabel,
        records: content.missions,
      }),
    ),
  ];
}

function validateMissionSteps(mission: MissionRecord): readonly string[] {
  const countFinding = hasApprovedStepCount(mission)
    ? []
    : [
        diagnostic(
          `Mission ${mission.id} must have 2–4 steps unless it is the approved single trace interaction.`,
        ),
      ];
  return [...countFinding, ...validateUniqueStepIds(mission)];
}

function hasApprovedStepCount(mission: MissionRecord): boolean {
  if (mission.steps.length === 1) {
    return mission.id === 'pond-turtle-find-water' && mission.steps[0]?.type === 'trace';
  }
  return mission.steps.length >= 2 && mission.steps.length <= 4;
}

function validateUniqueStepIds(mission: MissionRecord): readonly string[] {
  const seen = new Set<string>();
  return mission.steps.flatMap((step) => {
    const duplicate = seen.has(step.id);
    seen.add(step.id);
    return duplicate ? [diagnostic(`Mission ${mission.id} repeats step ID ${step.id}.`)] : [];
  });
}

function validateMissionReward(
  mission: OwnedRecord<MissionRecord>,
  context: MissionValidationContext,
): readonly string[] {
  if (mission.record.type === 'rescue') {
    return validateRescueReward(mission, context);
  }
  return mission.record.reward.unlockResidentId === undefined
    ? []
    : [diagnostic(`Mission ${mission.record.id} must not unlock a resident.`)];
}

function validateRescueReward(
  mission: OwnedRecord<MissionRecord>,
  context: MissionValidationContext,
): readonly string[] {
  const subjectId = mission.record.subjectAnimalId;
  if (subjectId === undefined) {
    return [diagnostic(`Rescue mission ${mission.record.id} must declare a subject animal.`)];
  }
  const keys = rescueRewardKeys(mission, context.content);
  if (keys.subject === undefined || keys.reward !== keys.subject) {
    return [
      diagnostic(`Rescue mission ${mission.record.id} must unlock exactly its subject resident.`),
    ];
  }
  return registerResidentRescue(keys.subject, mission.record.id, context.residentRescues);
}

function rescueRewardKeys(
  mission: OwnedRecord<MissionRecord>,
  content: SemanticIndex,
): Readonly<{ reward: string | undefined; subject: string | undefined }> {
  const common = {
    contentPacks: content.packs,
    declaringPackId: mission.ownerPackId,
    records: content.animals,
  };
  const subject = canonicalReferenceKey({
    ...common,
    rawReference: mission.record.subjectAnimalId ?? '',
  });
  const rewardId = mission.record.reward.unlockResidentId;
  const reward =
    rewardId === undefined
      ? undefined
      : canonicalReferenceKey({ ...common, rawReference: rewardId });
  return { reward, subject };
}

function registerResidentRescue(
  residentKey: string,
  missionId: string,
  rescues: Map<string, string>,
): readonly string[] {
  const priorMission = rescues.get(residentKey);
  if (priorMission !== undefined) {
    return [
      diagnostic(`Resident ${residentKey} is unlocked by both ${priorMission} and ${missionId}.`),
    ];
  }
  rescues.set(residentKey, missionId);
  return [];
}

function validateShelterCapacity(content: SemanticIndex): readonly string[] {
  return [...content.shelterAreas.values()].flatMap((area) => {
    const residents = [...content.animals.values()].filter((animal) => {
      const owned = resolveOwnedRecord({
        contentPacks: content.packs,
        declaringPackId: animal.ownerPackId,
        rawReference: animal.record.shelterAreaId,
        records: content.shelterAreas,
      });
      return owned?.ownerPackId === area.ownerPackId && owned.record.id === area.record.id;
    });
    return residents.length > area.record.capacity
      ? [
          diagnostic(
            `Shelter area ${area.record.id} has capacity ${String(area.record.capacity)} but ${String(residents.length)} residents.`,
          ),
        ]
      : [];
  });
}
