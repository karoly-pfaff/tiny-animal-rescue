import {
  animalRecords,
  locationRecords,
  missionRecords,
  type ContentRecordKind,
} from './content-record-kind';
import { resolveContentRecord, type ResolveContentRecordOptions } from './content-record-resolver';
import type { ContentRegistry } from './content-registry';
import type { MissionRecord } from './mission-contract';
import type { LocationRecord } from './world-content-contracts';

export type ProgressionState = Readonly<{
  completedMissionIds: readonly string[];
  unlockedResidentIds: readonly string[];
}>;

export type ProgressionSelection = Readonly<{
  availableMissionIds: readonly string[];
  missionsByLocation: Readonly<Record<string, readonly string[]>>;
  visibleLocationIds: readonly string[];
}>;

type OwnedRecord<RecordValue> = Readonly<{
  ownerPackId: string;
  record: RecordValue;
}>;

export type OwnedMission = OwnedRecord<MissionRecord>;

type ProgressionContext = Readonly<{
  completed: ReadonlySet<string>;
  completedRescueCount: number;
  registry: ContentRegistry;
  unlockedResidents: ReadonlySet<string>;
}>;

type MissionAvailabilityContext = ProgressionContext &
  Readonly<{ visibleLocationIds: ReadonlySet<string> }>;

export function selectProgression(
  registry: ContentRegistry,
  state: ProgressionState,
): ProgressionSelection {
  const context = createProgressionContext(registry, state);
  return buildSelection(context, ownedLocations(registry), ownedMissions(registry));
}

function createProgressionContext(
  registry: ContentRegistry,
  state: ProgressionState,
): ProgressionContext {
  const completed = new Set(state.completedMissionIds);
  return {
    completed,
    completedRescueCount: countCompletedRescues(registry, completed),
    registry,
    unlockedResidents: new Set(state.unlockedResidentIds),
  };
}

function buildSelection(
  context: ProgressionContext,
  locations: readonly OwnedRecord<LocationRecord>[],
  missions: readonly OwnedRecord<MissionRecord>[],
): ProgressionSelection {
  const completedLocationIds = completedMissionLocationIds(context, missions);
  const visibleLocationIds = locations
    .filter(
      (location) =>
        location.record.mapPresentation !== undefined &&
        (completedLocationIds.has(location.record.id) || locationIsVisible(context, location)),
    )
    .map(({ record }) => record.id);
  const availabilityContext = {
    ...context,
    visibleLocationIds: new Set(visibleLocationIds),
  };
  const availableMissions = missions.filter((mission) =>
    missionIsAvailable(availabilityContext, mission),
  );
  const availableMissionIds = availableMissions.map(({ record }) => record.id);
  const missionsByLocation = indexMissionsByLocation(
    context.registry,
    visibleLocationIds,
    availableMissions,
  );

  return freezeSelection({ availableMissionIds, missionsByLocation, visibleLocationIds });
}

function indexMissionsByLocation(
  registry: ContentRegistry,
  visibleLocationIds: readonly string[],
  missions: readonly OwnedRecord<MissionRecord>[],
): Readonly<Record<string, readonly string[]>> {
  return Object.fromEntries(
    visibleLocationIds.map((locationId) => [
      locationId,
      missions
        .filter((mission) => missionLocationId(registry, mission) === locationId)
        .map(({ record }) => record.id),
    ]),
  );
}

function missionLocationId(registry: ContentRegistry, mission: OwnedRecord<MissionRecord>): string {
  return resolveRecord(registry, {
    consumingPackId: mission.ownerPackId,
    kind: locationRecords,
    reference: mission.record.locationId,
  }).record.id;
}

function ownedLocations(registry: ContentRegistry): readonly OwnedRecord<LocationRecord>[] {
  return registry.packOrder.flatMap((ownerPackId) => {
    const pack = registry.packs[ownerPackId];
    return (pack?.records.locations ?? []).map((record) => ({ ownerPackId, record }));
  });
}

function ownedMissions(registry: ContentRegistry): readonly OwnedRecord<MissionRecord>[] {
  return registry.packOrder
    .flatMap((ownerPackId) => {
      const pack = registry.packs[ownerPackId];
      return (pack?.records.missions ?? []).map((record) => ({ ownerPackId, record }));
    })
    .sort((left, right) => compareMissionCallOrder(registry, left, right));
}

export function compareMissionCallOrder(
  registry: ContentRegistry,
  left: OwnedMission,
  right: OwnedMission,
): number {
  const packOrder =
    registry.packOrder.indexOf(left.ownerPackId) - registry.packOrder.indexOf(right.ownerPackId);
  if (packOrder !== 0) {
    return packOrder;
  }
  const authoredOrder =
    (left.record.mapCallOrder ?? Number.MAX_SAFE_INTEGER) -
    (right.record.mapCallOrder ?? Number.MAX_SAFE_INTEGER);
  return authoredOrder === 0 ? left.record.id.localeCompare(right.record.id) : authoredOrder;
}

function countCompletedRescues(registry: ContentRegistry, completed: ReadonlySet<string>): number {
  return ownedMissions(registry).filter(
    ({ record }) => completed.has(record.id) && record.type === 'rescue',
  ).length;
}

function completedMissionLocationIds(
  context: ProgressionContext,
  missions: readonly OwnedRecord<MissionRecord>[],
): ReadonlySet<string> {
  return new Set(
    missions
      .filter(({ record }) => context.completed.has(record.id))
      .map((mission) => missionLocationId(context.registry, mission)),
  );
}

function locationIsVisible(
  context: ProgressionContext,
  location: OwnedRecord<LocationRecord>,
): boolean {
  const requirement = location.record.unlockRequirement;
  if (requirement === undefined) {
    return true;
  }
  if (requirement.type === 'rescue-count') {
    return context.completedRescueCount >= requirement.minimum;
  }
  return context.completed.has(
    resolveRecord(context.registry, {
      consumingPackId: location.ownerPackId,
      kind: missionRecords,
      reference: requirement.missionId,
    }).record.id,
  );
}

function missionIsAvailable(
  context: MissionAvailabilityContext,
  mission: OwnedRecord<MissionRecord>,
): boolean {
  if (!context.visibleLocationIds.has(missionLocationId(context.registry, mission))) {
    return false;
  }
  if (context.completed.has(mission.record.id)) {
    return true;
  }
  const prerequisitesComplete = mission.record.prerequisites.every(({ completedMissionId }) =>
    context.completed.has(
      resolveRecord(context.registry, {
        consumingPackId: mission.ownerPackId,
        kind: missionRecords,
        reference: completedMissionId,
      }).record.id,
    ),
  );
  if (!prerequisitesComplete) {
    return false;
  }
  return mission.record.type !== 'help' || residentIsUnlocked(context, mission);
}

function residentIsUnlocked(
  context: ProgressionContext,
  mission: OwnedRecord<MissionRecord>,
): boolean {
  const subjectAnimalId = mission.record.subjectAnimalId;
  return (
    subjectAnimalId !== undefined &&
    context.unlockedResidents.has(
      resolveRecord(context.registry, {
        consumingPackId: mission.ownerPackId,
        kind: animalRecords,
        reference: subjectAnimalId,
      }).record.id,
    )
  );
}

function resolveRecord<Kind extends ContentRecordKind>(
  registry: ContentRegistry,
  options: Omit<ResolveContentRecordOptions<Kind>, 'registry'>,
) {
  return resolveContentRecord({ registry, ...options });
}

function freezeSelection(selection: ProgressionSelection): ProgressionSelection {
  for (const missionIds of Object.values(selection.missionsByLocation)) {
    Object.freeze(missionIds);
  }
  Object.freeze(selection.availableMissionIds);
  Object.freeze(selection.missionsByLocation);
  Object.freeze(selection.visibleLocationIds);
  return Object.freeze(selection);
}
