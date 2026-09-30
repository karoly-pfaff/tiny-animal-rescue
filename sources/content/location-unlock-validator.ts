import { missionRecordLabel } from './content-record-kind.ts';
import { type OwnedRecord, validateRecordReference } from './content-record-linker.ts';
import type { ContentPackSource } from './content-registry.ts';
import type { MissionRecord } from './mission-contract.ts';
import type { LocationRecord } from './world-content-contracts.ts';

type LocationUnlockValidationContext = Readonly<{
  locations: ReadonlyMap<string, OwnedRecord<LocationRecord>>;
  missions: ReadonlyMap<string, OwnedRecord<MissionRecord>>;
  packs: ReadonlyMap<string, ContentPackSource>;
}>;

export function validateLocationUnlockReferences(
  content: LocationUnlockValidationContext,
): readonly string[] {
  return [...content.locations.values()].flatMap(({ ownerPackId, record }) => {
    const requirement = record.unlockRequirement;
    if (requirement?.type !== 'mission-completed') {
      return [];
    }
    return validateRecordReference({
      consumerLabel: `Location ${record.id}`,
      contentPacks: content.packs,
      declaringPackId: ownerPackId,
      rawReference: requirement.missionId,
      recordLabel: missionRecordLabel,
      records: content.missions,
    });
  });
}
