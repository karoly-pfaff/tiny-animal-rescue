import type { MissionRecord } from './mission-contract';
import {
  animalRecords,
  locationRecords,
  missionRecords,
  shelterAreaRecords,
  type ContentRecordKind,
} from './content-record-kind';
import { normalizeAnimalShelterSlots } from './content-shelter-slot-normalizer';
import { orderPacksByDependencies } from './pack-dependency-order';
import type { PackManifest } from './pack-contract';
import type {
  AnimalRecord,
  AssetMetadata,
  LocalizationDocument,
  LocationRecord,
  NormalizedAnimalRecord,
  ShelterAreaRecord,
} from './world-content-contracts';

type ContentPackRecords = Readonly<{
  animals: readonly AnimalRecord[];
  assets: readonly AssetMetadata[];
  localizations: Readonly<Record<string, LocalizationDocument>>;
  locations: readonly LocationRecord[];
  missions: readonly MissionRecord[];
  shelterAreas: readonly ShelterAreaRecord[];
}>;

type RegistryRecordKind = 'assets' | ContentRecordKind;
const assetRecords = 'assets' satisfies RegistryRecordKind;

type ContentRecordOwners = Readonly<Record<RegistryRecordKind, Readonly<Record<string, string>>>>;

export type ContentPackSource = PackManifest &
  Readonly<{
    records: ContentPackRecords;
  }>;

export type ContentRegistry = Readonly<{
  packOrder: readonly string[];
  packs: Readonly<Record<string, ContentPackSource>>;
  animals: Readonly<Record<string, NormalizedAnimalRecord>>;
  assets: Readonly<Record<string, AssetMetadata>>;
  locations: Readonly<Record<string, LocationRecord>>;
  missions: Readonly<Record<string, MissionRecord>>;
  recordOwners: ContentRecordOwners;
  shelterAreas: Readonly<Record<string, ShelterAreaRecord>>;
}>;

export function assembleContentRegistry(sources: readonly ContentPackSource[]): ContentRegistry {
  const orderedSources = orderPacksByDependencies(sources);
  const sourcesById = Object.fromEntries(sources.map((source) => [source.id, source]));
  rejectDuplicateGlobalIds(orderedSources);
  const recordOwners = {
    animals: indexOwners(orderedSources, animalRecords),
    assets: indexOwners(orderedSources, assetRecords),
    locations: indexOwners(orderedSources, locationRecords),
    missions: indexOwners(orderedSources, missionRecords),
    shelterAreas: indexOwners(orderedSources, shelterAreaRecords),
  };
  const shelterAreas = indexRecords(orderedSources.flatMap(({ records }) => records.shelterAreas));
  const animals = normalizeAnimalShelterSlots(
    orderedSources.flatMap(({ records }) => records.animals),
    {
      animalOwners: recordOwners.animals,
      contentPacks: new Map(Object.entries(sourcesById)),
      shelterAreaOwners: recordOwners.shelterAreas,
      shelterAreas,
    },
  );
  return freezeClone({
    packOrder: orderedSources.map(({ id }) => id),
    packs: sourcesById,
    animals: indexRecords(animals),
    assets: indexRecords(orderedSources.flatMap(({ records }) => records.assets)),
    locations: indexRecords(orderedSources.flatMap(({ records }) => records.locations)),
    missions: indexRecords(orderedSources.flatMap(({ records }) => records.missions)),
    recordOwners,
    shelterAreas,
  });
}

type IdentifiedRecord = Readonly<{ id: string }>;

function indexRecords<Entry extends IdentifiedRecord>(
  records: readonly Entry[],
): Readonly<Record<string, Entry>> {
  return Object.fromEntries(records.map((record) => [record.id, record]));
}

function indexOwners(
  sources: readonly ContentPackSource[],
  kind: RegistryRecordKind,
): Readonly<Record<string, string>> {
  return Object.fromEntries(
    sources.flatMap((source) => source.records[kind].map((record) => [record.id, source.id])),
  );
}

function rejectDuplicateGlobalIds(sources: readonly ContentPackSource[]): void {
  const owners = new Map<string, string>();
  for (const source of sources) {
    for (const record of allRecords(source.records)) {
      rejectDuplicateRecord(record, source.id, owners);
    }
  }
}

function allRecords(records: ContentPackRecords): readonly IdentifiedRecord[] {
  return [
    ...records.animals,
    ...records.assets,
    ...records.locations,
    ...records.missions,
    ...records.shelterAreas,
  ];
}

function rejectDuplicateRecord(
  record: IdentifiedRecord,
  packId: string,
  owners: Map<string, string>,
): void {
  const owner = owners.get(record.id);
  if (owner !== undefined) {
    throw new Error(`Duplicate global content ID ${record.id} in packs ${owner} and ${packId}.`);
  }
  owners.set(record.id, packId);
}

function freezeClone<Value>(value: Value): Value {
  const clone = structuredClone(value);
  freezeRecursively(clone);
  return clone;
}

function freezeRecursively(value: unknown): void {
  if (!isRecord(value)) {
    return;
  }
  for (const child of Object.values(value)) {
    freezeRecursively(child);
  }
  Object.freeze(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value instanceof Object;
}
