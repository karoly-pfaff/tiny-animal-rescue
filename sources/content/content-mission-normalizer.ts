import {
  canonicalReferenceKey,
  type OwnedRecord,
  resolveOwnedRecord,
} from './content-record-linker.ts';
import type { ContentPackSource } from './content-registry.ts';
import type { MissionRecord } from './mission-contract.ts';
import type { AnimalRecord } from './world-content-contracts.ts';

type NormalizationOptions = Readonly<{
  animals: ReadonlyMap<string, OwnedRecord<AnimalRecord>>;
  missions: ReadonlyMap<string, OwnedRecord<MissionRecord>>;
  packs: ReadonlyMap<string, ContentPackSource>;
}>;

export function normalizeMissionsForGraph(
  options: NormalizationOptions,
): ReadonlyMap<string, MissionRecord> {
  return new Map(
    [...options.missions.values()].map(({ ownerPackId, record }) => {
      const common = { contentPacks: options.packs, declaringPackId: ownerPackId };
      const subjectAnimalId =
        record.subjectAnimalId === undefined
          ? undefined
          : canonicalReferenceKey({
              ...common,
              rawReference: record.subjectAnimalId,
              records: options.animals,
            });
      const prerequisites = record.prerequisites.map(({ completedMissionId }) => ({
        completedMissionId:
          resolveOwnedRecord({
            ...common,
            rawReference: completedMissionId,
            records: options.missions,
          })?.record.id ?? completedMissionId,
      }));
      const normalized = {
        ...record,
        prerequisites,
        ...(subjectAnimalId === undefined ? {} : { subjectAnimalId }),
      };
      return [record.id, normalized] as const;
    }),
  );
}
