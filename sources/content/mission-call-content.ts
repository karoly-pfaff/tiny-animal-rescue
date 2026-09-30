import type { Locale } from '../i18n/localization';
import { resolveContentAsset } from './content-asset-resolver';
import { resolveContentText } from './content-localization';
import { animalRecords, locationRecords } from './content-record-kind';
import { resolveContentRecord } from './content-record-resolver';
import type { ContentRegistry } from './content-registry';
import {
  compareMissionCallOrder,
  type OwnedMission,
  type ProgressionSelection,
  type ProgressionState,
} from './progression-selectors';
import type { MapLandmarkPresentation } from './world-content-contracts';

export type MissionCallContent = Readonly<{
  completed: boolean;
  id: string;
  locationId: string;
  locationName: string;
  locationPresentation: MapLandmarkPresentation;
  portraitUrl: string | null;
  title: string;
}>;

export type MissionCallSelection = Readonly<{
  calls: readonly MissionCallContent[];
  featuredMissionId: string | null;
}>;

type MissionCallOptions = Readonly<{
  locale: Locale;
  state: ProgressionState;
}>;

export function selectMissionCalls(
  registry: ContentRegistry,
  progression: ProgressionSelection,
  options: MissionCallOptions,
): MissionCallSelection {
  const completed = new Set(options.state.completedMissionIds);
  const calls = progression.availableMissionIds
    .map((missionId) => requiredOwnedMission(registry, missionId))
    .sort((left, right) => compareMissionCallOrder(registry, left, right))
    .map((mission) => selectMissionCall(registry, mission, { completed, locale: options.locale }));
  const featuredMissionId = calls.find((call) => !call.completed)?.id ?? null;
  Object.freeze(calls);
  return Object.freeze({ calls, featuredMissionId });
}

function selectMissionCall(
  registry: ContentRegistry,
  mission: OwnedMission,
  context: Readonly<{ completed: ReadonlySet<string>; locale: Locale }>,
): MissionCallContent {
  const location = resolveContentRecord({
    registry,
    consumingPackId: mission.ownerPackId,
    kind: locationRecords,
    reference: mission.record.locationId,
  });
  const locationPresentation = location.record.mapPresentation;
  if (locationPresentation === undefined) {
    throw new Error(`Available mission ${mission.record.id} has no presented map location.`);
  }
  return Object.freeze({
    completed: context.completed.has(mission.record.id),
    id: mission.record.id,
    locationId: location.record.id,
    locationName: resolveContentText(registry, context.locale, {
      key: location.record.nameKey,
      ownerPackId: location.ownerPackId,
    }),
    locationPresentation,
    portraitUrl: selectSubjectPortrait(registry, {
      callSubjectAsset: mission.record.callSubjectAsset,
      missionOwnerPackId: mission.ownerPackId,
      subjectAnimalId: mission.record.subjectAnimalId,
    }),
    title: resolveContentText(registry, context.locale, {
      key: mission.record.localization.titleKey,
      ownerPackId: mission.ownerPackId,
    }),
  });
}

function requiredOwnedMission(registry: ContentRegistry, missionId: string): OwnedMission {
  const ownerPackId = registry.recordOwners.missions[missionId];
  const record = registry.missions[missionId];
  if (ownerPackId === undefined || record === undefined) {
    throw new Error(`Progression selected unknown mission ${missionId}.`);
  }
  return { ownerPackId, record };
}

function selectSubjectPortrait(
  registry: ContentRegistry,
  selection: Readonly<{
    callSubjectAsset: string | undefined;
    missionOwnerPackId: string;
    subjectAnimalId: string | undefined;
  }>,
): string | null {
  if (selection.subjectAnimalId !== undefined) {
    const animal = resolveContentRecord({
      registry,
      consumingPackId: selection.missionOwnerPackId,
      kind: animalRecords,
      reference: selection.subjectAnimalId,
    });
    return resolveContentAsset(registry, animal.ownerPackId, animal.record.assets.portrait);
  }
  if (selection.callSubjectAsset === undefined) {
    throw new Error(`Mission call in pack ${selection.missionOwnerPackId} has no subject visual.`);
  }
  return resolveContentAsset(registry, selection.missionOwnerPackId, selection.callSubjectAsset);
}
