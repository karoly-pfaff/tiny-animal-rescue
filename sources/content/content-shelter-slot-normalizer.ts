import { resolveOwnedRecord, type OwnedRecord } from './content-record-linker';
import type { ContentPackSource } from './content-registry';
import type {
  AnimalRecord,
  NormalizedAnimalRecord,
  ShelterAreaRecord,
} from './world-content-contracts';

export type ShelterSlotNormalizationContext = Readonly<{
  animalOwners: Readonly<Record<string, string>>;
  contentPacks: ReadonlyMap<string, ContentPackSource>;
  shelterAreaOwners: Readonly<Record<string, string>>;
  shelterAreas: Readonly<Record<string, ShelterAreaRecord>>;
}>;

type ShelterResidentGroup = Readonly<{
  area: OwnedRecord<ShelterAreaRecord>;
  residents: AnimalRecord[];
}>;

type ShelterGroupCollection = Readonly<{
  context: ShelterSlotNormalizationContext;
  groups: Map<string, ShelterResidentGroup>;
  ownedAreas: ReadonlyMap<string, OwnedRecord<ShelterAreaRecord>>;
}>;

type ShelterSlotAssignment = Readonly<{
  area: ShelterAreaRecord;
  assignedSlots: Map<string, number>;
  residents: readonly AnimalRecord[];
}>;

export function normalizeAnimalShelterSlots(
  animals: readonly AnimalRecord[],
  context: ShelterSlotNormalizationContext,
): readonly NormalizedAnimalRecord[] {
  const groups = collectShelterResidentGroups(animals, context);
  const assignedSlots = new Map<string, number>();
  for (const { area, residents } of groups.values()) {
    assignShelterGroupSlots(area.record, residents, assignedSlots);
  }
  return animals.map((animal) => ({
    ...animal,
    shelterSlot: requiredAssignedShelterSlot(assignedSlots, animal.id),
  }));
}

function collectShelterResidentGroups(
  animals: readonly AnimalRecord[],
  context: ShelterSlotNormalizationContext,
): ReadonlyMap<string, ShelterResidentGroup> {
  const groups = new Map<string, ShelterResidentGroup>();
  const collection = { context, groups, ownedAreas: indexOwnedShelterAreas(context) };
  for (const animal of animals) {
    addResidentToShelterGroup(collection, animal);
  }
  return groups;
}

function indexOwnedShelterAreas(
  context: ShelterSlotNormalizationContext,
): ReadonlyMap<string, OwnedRecord<ShelterAreaRecord>> {
  return new Map(
    Object.values(context.shelterAreas).map((area) => [
      area.id,
      {
        ownerPackId: requiredRecordOwner(context.shelterAreaOwners, area.id),
        record: area,
      },
    ]),
  );
}

function addResidentToShelterGroup(collection: ShelterGroupCollection, animal: AnimalRecord): void {
  const area = resolveResidentShelterArea(animal, collection.ownedAreas, collection.context);
  const key = `${area.ownerPackId}:${area.record.id}`;
  const group = collection.groups.get(key) ?? { area, residents: [] };
  group.residents.push(animal);
  collection.groups.set(key, group);
}

function resolveResidentShelterArea(
  animal: AnimalRecord,
  ownedAreas: ReadonlyMap<string, OwnedRecord<ShelterAreaRecord>>,
  context: ShelterSlotNormalizationContext,
): OwnedRecord<ShelterAreaRecord> {
  const area = resolveOwnedRecord({
    contentPacks: context.contentPacks,
    declaringPackId: requiredRecordOwner(context.animalOwners, animal.id),
    rawReference: animal.shelterAreaId,
    records: ownedAreas,
  });
  if (area === undefined) {
    throw new Error(`Animal ${animal.id} has no resolvable shelter area.`);
  }
  return area;
}

function assignShelterGroupSlots(
  area: ShelterAreaRecord,
  residents: readonly AnimalRecord[],
  assignedSlots: Map<string, number>,
): void {
  const assignment = { area, assignedSlots, residents };
  requireShelterCapacity(assignment);
  const reserved = assignAuthoredShelterSlots(assignment);
  assignCompatibilityShelterSlots(assignment, reserved);
}

function requireShelterCapacity(assignment: ShelterSlotAssignment): void {
  if (assignment.residents.length > assignment.area.capacity) {
    throw new Error(`Shelter area ${assignment.area.id} exceeds its declared capacity.`);
  }
}

function assignAuthoredShelterSlots(assignment: ShelterSlotAssignment): ReadonlySet<number> {
  const reserved = new Set<number>();
  for (const resident of assignment.residents.filter(hasAuthoredShelterSlot)) {
    requireValidAuthoredShelterSlot(assignment.area, resident.shelterSlot, reserved);
    reserved.add(resident.shelterSlot);
    assignment.assignedSlots.set(resident.id, resident.shelterSlot);
  }
  return reserved;
}

function requireValidAuthoredShelterSlot(
  area: ShelterAreaRecord,
  slot: number,
  reserved: ReadonlySet<number>,
): void {
  if (slot < 1 || slot > area.capacity || reserved.has(slot)) {
    throw new Error(`Shelter area ${area.id} has an invalid authored resident slot.`);
  }
}

function assignCompatibilityShelterSlots(
  assignment: ShelterSlotAssignment,
  reserved: ReadonlySet<number>,
): void {
  const available = Array.from(
    { length: assignment.area.capacity },
    (_, index) => index + 1,
  ).filter((slot) => !reserved.has(slot));
  for (const [index, resident] of assignment.residents
    .filter((candidate) => candidate.shelterSlot === undefined)
    .sort(({ id: left }, { id: right }) => left.localeCompare(right))
    .entries()) {
    const slot = available[index];
    if (slot === undefined) {
      throw new Error(`Shelter area ${assignment.area.id} has no free compatibility slot.`);
    }
    assignment.assignedSlots.set(resident.id, slot);
  }
}

function hasAuthoredShelterSlot(
  animal: AnimalRecord,
): animal is AnimalRecord & Readonly<{ shelterSlot: number }> {
  return animal.shelterSlot !== undefined;
}

function requiredAssignedShelterSlot(
  assignedSlots: ReadonlyMap<string, number>,
  animalId: string,
): number {
  const slot = assignedSlots.get(animalId);
  if (slot === undefined) {
    throw new Error(`Animal ${animalId} has no normalized shelter slot.`);
  }
  return slot;
}

function requiredRecordOwner(owners: Readonly<Record<string, string>>, id: string): string {
  const owner = owners[id];
  if (owner === undefined) {
    throw new Error(`Content ${id} has no declaring pack.`);
  }
  return owner;
}
