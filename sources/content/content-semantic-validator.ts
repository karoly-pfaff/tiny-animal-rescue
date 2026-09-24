import { validateContentAssets } from './content-asset-validator.ts';
import type { ContentPackSource } from './content-registry';
import { diagnostic } from './content-validation-diagnostic.ts';
import type { MissionRecord } from './mission-contract';
import { validateMissionGraph } from './mission-graph-validator.ts';
import { validateV1Catalog } from './v1-content-catalog-validator.ts';

export { v1ReleaseCatalog } from './v1-content-catalog.ts';

export type SemanticValidationOptions = Readonly<{
  releaseCatalog?: 'v1';
}>;

type Animal = ContentPackSource['records']['animals'][number];
type Location = ContentPackSource['records']['locations'][number];
type ShelterArea = ContentPackSource['records']['shelterAreas'][number];

type SemanticIndex = Readonly<{
  animals: ReadonlyMap<string, Animal>;
  locations: ReadonlyMap<string, Location>;
  missions: ReadonlyMap<string, MissionRecord>;
  shelterAreas: ReadonlyMap<string, ShelterArea>;
}>;

type MissionValidationContext = Readonly<{
  content: SemanticIndex;
  residentRescues: Map<string, string>;
}>;

export function validateContentSemantics(
  packs: readonly ContentPackSource[],
  options: SemanticValidationOptions = {},
): readonly string[] {
  const content = createIndex(packs);
  const generalFindings = validateGeneralSemantics(content);
  const releaseFindings = options.releaseCatalog === 'v1' ? validateV1Catalog(packs) : [];
  const assetFindings = validateContentAssets(packs, {
    release: options.releaseCatalog === 'v1',
  });
  return Object.freeze([...generalFindings, ...assetFindings, ...releaseFindings]);
}

function createIndex(packs: readonly ContentPackSource[]): SemanticIndex {
  return {
    animals: index(packs.flatMap(({ records }) => records.animals)),
    locations: index(packs.flatMap(({ records }) => records.locations)),
    missions: index(packs.flatMap(({ records }) => records.missions)),
    shelterAreas: index(packs.flatMap(({ records }) => records.shelterAreas)),
  };
}

function index<Entry extends Readonly<{ id: string }>>(
  records: readonly Entry[],
): Map<string, Entry> {
  return new Map(records.map((record) => [record.id, record]));
}

function validateGeneralSemantics(content: SemanticIndex): readonly string[] {
  const residentRescues = new Map<string, string>();
  const missionContext = { content, residentRescues };
  return [
    ...validateAnimals(content),
    ...validateMissions(missionContext),
    ...validateShelterCapacity(content),
    ...validateMissionGraph(content.missions, residentRescues),
  ];
}

function validateAnimals(content: SemanticIndex): readonly string[] {
  return [...content.animals.values()].flatMap((animal) =>
    content.shelterAreas.has(animal.shelterAreaId)
      ? []
      : [
          diagnostic(
            `Animal ${animal.id} references missing shelter area ${animal.shelterAreaId}.`,
          ),
        ],
  );
}

function validateMissions(context: MissionValidationContext): readonly string[] {
  return [...context.content.missions.values()].flatMap((missionRecord) => [
    ...validateMissionReferences(missionRecord, context.content),
    ...validateMissionSteps(missionRecord),
    ...validateMissionReward(missionRecord, context.residentRescues),
  ]);
}

function validateMissionReferences(
  missionRecord: MissionRecord,
  content: SemanticIndex,
): readonly string[] {
  const findings: string[] = [];
  if (!content.locations.has(missionRecord.locationId)) {
    findings.push(
      diagnostic(
        `Mission ${missionRecord.id} references missing location ${missionRecord.locationId}.`,
      ),
    );
  }
  if (
    missionRecord.subjectAnimalId !== undefined &&
    !content.animals.has(missionRecord.subjectAnimalId)
  ) {
    findings.push(
      diagnostic(
        `Mission ${missionRecord.id} references missing animal ${missionRecord.subjectAnimalId}.`,
      ),
    );
  }
  findings.push(...validatePrerequisiteReferences(missionRecord, content.missions));
  return findings;
}

function validatePrerequisiteReferences(
  missionRecord: MissionRecord,
  missions: ReadonlyMap<string, MissionRecord>,
): readonly string[] {
  return missionRecord.prerequisites.flatMap(({ completedMissionId }) =>
    missions.has(completedMissionId)
      ? []
      : [
          diagnostic(
            `Mission ${missionRecord.id} references missing prerequisite ${completedMissionId}.`,
          ),
        ],
  );
}

function validateMissionSteps(missionRecord: MissionRecord): readonly string[] {
  return [...validateStepCount(missionRecord), ...validateUniqueStepIds(missionRecord)];
}

function validateStepCount(missionRecord: MissionRecord): readonly string[] {
  return hasApprovedStepCount(missionRecord)
    ? []
    : [
        diagnostic(
          `Mission ${missionRecord.id} must have 2–4 steps unless it is the approved single trace interaction.`,
        ),
      ];
}

function hasApprovedStepCount(missionRecord: MissionRecord): boolean {
  if (missionRecord.steps.length === 1) {
    return (
      missionRecord.id === 'pond-turtle-find-water' && missionRecord.steps[0]?.type === 'trace'
    );
  }
  return missionRecord.steps.length >= 2 && missionRecord.steps.length <= 4;
}

function validateUniqueStepIds(missionRecord: MissionRecord): readonly string[] {
  const seen = new Set<string>();
  return missionRecord.steps.flatMap((step) => {
    const duplicate = seen.has(step.id);
    seen.add(step.id);
    return duplicate ? [diagnostic(`Mission ${missionRecord.id} repeats step ID ${step.id}.`)] : [];
  });
}

function validateMissionReward(
  missionRecord: MissionRecord,
  residentRescues: Map<string, string>,
): readonly string[] {
  if (missionRecord.type === 'rescue') {
    return validateRescueReward(missionRecord, residentRescues);
  }
  return missionRecord.reward.unlockResidentId === undefined
    ? []
    : [diagnostic(`Mission ${missionRecord.id} must not unlock a resident.`)];
}

function validateRescueReward(
  missionRecord: MissionRecord,
  residentRescues: Map<string, string>,
): readonly string[] {
  const subjectId = missionRecord.subjectAnimalId;
  if (subjectId === undefined) {
    return [diagnostic(`Rescue mission ${missionRecord.id} must declare a subject animal.`)];
  }
  if (missionRecord.reward.unlockResidentId !== subjectId) {
    return [
      diagnostic(`Rescue mission ${missionRecord.id} must unlock exactly its subject resident.`),
    ];
  }
  const priorMission = residentRescues.get(subjectId);
  if (priorMission !== undefined) {
    return [
      diagnostic(
        `Resident ${subjectId} is unlocked by both ${priorMission} and ${missionRecord.id}.`,
      ),
    ];
  }
  residentRescues.set(subjectId, missionRecord.id);
  return [];
}

function validateShelterCapacity(content: SemanticIndex): readonly string[] {
  return [...content.shelterAreas.values()].flatMap((area) => {
    const residents = [...content.animals.values()].filter(
      ({ shelterAreaId }) => shelterAreaId === area.id,
    );
    return residents.length > area.capacity
      ? [
          diagnostic(
            `Shelter area ${area.id} has capacity ${String(area.capacity)} but ${String(residents.length)} residents.`,
          ),
        ]
      : [];
  });
}
