import type { ContentRegistry } from '../content/content-registry';
import { locationRecords } from '../content/content-record-kind';
import { resolveContentRecord } from '../content/content-record-resolver';
import type { MissionCallContent } from '../content/mission-call-content';
import type { MissionRecord } from '../content/mission-contract';

export function createMapReturnMemory() {
  let locationId: string | null = null;
  return Object.freeze({
    clear: () => {
      locationId = null;
    },
    read: () => locationId,
    remember: (nextLocationId: string) => {
      locationId = nextLocationId;
    },
  });
}

export function selectActiveMapPortrait(
  featuredCall: MissionCallContent | undefined,
  initialMissionId: string,
  fallbackPortrait: string | null,
): string | null {
  if (featuredCall === undefined) {
    return null;
  }
  if (featuredCall.portraitUrl !== null) {
    return featuredCall.portraitUrl;
  }
  return featuredCall.id === initialMissionId ? fallbackPortrait : null;
}

export function selectAvailableMission(
  registry: ContentRegistry,
  availableMissionIds: readonly string[],
  missionId: string,
) {
  if (!availableMissionIds.includes(missionId)) {
    return null;
  }
  const ownerPackId = registry.recordOwners.missions[missionId];
  const record = registry.missions[missionId];
  return ownerPackId === undefined || record === undefined ? null : { ownerPackId, record };
}

export function selectMissionMapLocationId(
  registry: ContentRegistry,
  mission: Readonly<{ ownerPackId: string; record: MissionRecord }>,
): string {
  return resolveContentRecord({
    consumingPackId: mission.ownerPackId,
    kind: locationRecords,
    reference: mission.record.locationId,
    registry,
  }).record.id;
}

export function navigateToMissionCall(
  missionId: string,
  options: Readonly<{
    calls: readonly MissionCallContent[];
    onMissionSelected?: (missionId: string, locationId: string) => void;
    onNavigate: (path: string) => void;
    path: string;
  }>,
): void {
  const locationId = options.calls.find(({ id }) => id === missionId)?.locationId;
  if (locationId === undefined) {
    return;
  }
  if (options.onMissionSelected === undefined) {
    options.onNavigate(options.path);
  } else {
    options.onMissionSelected(missionId, locationId);
  }
}
