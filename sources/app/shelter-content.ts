import { resolveContentAsset } from '../content/content-asset-resolver';
import { resolveContentText } from '../content/content-localization';
import { resolveOwnedRecord, type OwnedRecord } from '../content/content-record-linker';
import type { ContentPackSource, ContentRegistry } from '../content/content-registry';
import type { ShelterAreaRecord } from '../content/world-content-contracts';
import type { Locale } from '../i18n/localization';
import type { FirstRescueProgress } from './first-rescue-progress';
import { hasResident } from './first-rescue-progress';

type ShelterResidentPresentation = Readonly<{
  happyAssetUrl: string | null;
  happyText: string;
  id: string;
  idleAssetUrl: string | null;
  name: string;
  reactions: ContentRegistry['animals'][string]['shelterReactions'];
  shelterSlot: number;
  tapLabel: string;
}>;

export type ShelterAreaPresentation = Readonly<{
  backgroundUrl: string | null;
  id: string;
  name: string;
  residents: readonly ShelterResidentPresentation[];
}>;

type ShelterSelectionContext = Readonly<{
  contentPacks: ReadonlyMap<string, ContentPackSource>;
  locale: Locale;
  progress: FirstRescueProgress;
  registry: ContentRegistry;
  shelterAreas: ReadonlyMap<string, OwnedRecord<ShelterAreaRecord>>;
}>;

type ResidentAreaSelection = Readonly<{
  animalId: string;
  expected: OwnedRecord<ShelterAreaRecord>;
  shelterAreaReference: string;
}>;

type ShelterSlotAssignment = Readonly<{
  animal: ContentRegistry['animals'][string];
  shelterSlot: number;
}>;

export function selectShelterAreaPresentations(
  registry: ContentRegistry,
  locale: Locale,
  progress: FirstRescueProgress,
): readonly ShelterAreaPresentation[] {
  const context = createSelectionContext(registry, locale, progress);
  return Object.values(registry.shelterAreas)
    .sort(compareShelterAreas)
    .map((area) => {
      const ownerPackId = requiredOwner(registry.recordOwners.shelterAreas, area.id);
      const residents = selectResidents(context, { ownerPackId, record: area });
      return {
        backgroundUrl: resolveContentAsset(registry, ownerPackId, area.assets.background),
        id: area.id,
        name: resolveContentText(registry, locale, { key: area.nameKey, ownerPackId }),
        residents: requireWithinCapacity(area, residents),
      };
    });
}

function createSelectionContext(
  registry: ContentRegistry,
  locale: Locale,
  progress: FirstRescueProgress,
): ShelterSelectionContext {
  return {
    contentPacks: new Map(Object.entries(registry.packs)),
    locale,
    progress,
    registry,
    shelterAreas: new Map(
      Object.values(registry.shelterAreas).map((record) => [
        record.id,
        {
          ownerPackId: requiredOwner(registry.recordOwners.shelterAreas, record.id),
          record,
        },
      ]),
    ),
  };
}

function selectResidents(
  context: ShelterSelectionContext,
  shelterArea: OwnedRecord<ShelterAreaRecord>,
): readonly ShelterResidentPresentation[] {
  const assignedResidents = assignShelterSlots(
    Object.values(context.registry.animals).filter((animal) =>
      residentBelongsToArea(context, {
        animalId: animal.id,
        expected: shelterArea,
        shelterAreaReference: animal.shelterAreaId,
      }),
    ),
    shelterArea.record,
  );
  return assignedResidents
    .filter(({ animal }) => hasResident(context.progress, animal.id))
    .sort(compareShelterResidents)
    .map(({ animal, shelterSlot }) => {
      const ownerPackId = requiredOwner(context.registry.recordOwners.animals, animal.id);
      return {
        happyAssetUrl: resolveContentAsset(context.registry, ownerPackId, animal.assets.happy),
        happyText: resolveContentText(context.registry, context.locale, {
          key: animal.shelterLocalization.happyKey,
          ownerPackId,
        }),
        id: animal.id,
        idleAssetUrl: resolveContentAsset(context.registry, ownerPackId, animal.assets.idle),
        name: resolveContentText(context.registry, context.locale, {
          key: animal.nameKey,
          ownerPackId,
        }),
        reactions: animal.shelterReactions,
        shelterSlot,
        tapLabel: resolveContentText(context.registry, context.locale, {
          key: animal.shelterLocalization.tapLabelKey,
          ownerPackId,
        }),
      };
    });
}

function compareShelterResidents(
  left: ShelterSlotAssignment,
  right: ShelterSlotAssignment,
): number {
  return left.shelterSlot - right.shelterSlot || left.animal.id.localeCompare(right.animal.id);
}

function assignShelterSlots(
  residents: readonly ContentRegistry['animals'][string][],
  area: Pick<ShelterAreaRecord, 'capacity' | 'id'>,
): readonly ShelterSlotAssignment[] {
  requireResidentCapacity(residents, area);
  const reservedSlots = collectReservedSlots(residents, area);
  const availableSlots = Array.from({ length: area.capacity }, (_, index) => index + 1).filter(
    (slot) => !reservedSlots.has(slot),
  );
  const fallbackSlots = new Map(
    residents
      .filter(({ shelterSlot }) => shelterSlot === undefined)
      .sort(({ id: left }, { id: right }) => left.localeCompare(right))
      .map((resident, index) => [resident.id, requiredSlot(availableSlots, index, area.id)]),
  );
  return residents.map((animal) => ({
    animal,
    shelterSlot: animal.shelterSlot ?? requiredAssignedSlot(fallbackSlots, animal.id, area.id),
  }));
}

function requireResidentCapacity(
  residents: readonly ContentRegistry['animals'][string][],
  area: Pick<ShelterAreaRecord, 'capacity' | 'id'>,
): void {
  if (residents.length > area.capacity) {
    throw new Error(`Shelter area ${area.id} exceeds its declared capacity.`);
  }
}

function collectReservedSlots(
  residents: readonly ContentRegistry['animals'][string][],
  area: Pick<ShelterAreaRecord, 'capacity' | 'id'>,
): ReadonlySet<number> {
  const slots = new Set<number>();
  for (const resident of residents.filter(hasAuthoredSlot)) {
    requireValidAuthoredSlot(resident.shelterSlot, slots, area);
    slots.add(resident.shelterSlot);
  }
  return slots;
}

function hasAuthoredSlot(
  resident: ContentRegistry['animals'][string],
): resident is ContentRegistry['animals'][string] & Readonly<{ shelterSlot: number }> {
  return resident.shelterSlot !== undefined;
}

function requireValidAuthoredSlot(
  slot: number,
  reservedSlots: ReadonlySet<number>,
  area: Pick<ShelterAreaRecord, 'capacity' | 'id'>,
): void {
  if (slot < 1 || slot > area.capacity || reservedSlots.has(slot)) {
    throw new Error(`Shelter area ${area.id} has an invalid authored resident slot.`);
  }
}

function requiredSlot(slots: readonly number[], index: number, areaId: string): number {
  const slot = slots[index];
  if (slot === undefined) {
    throw new Error(`Shelter area ${areaId} has no free compatibility slot.`);
  }
  return slot;
}

function requiredAssignedSlot(
  slots: ReadonlyMap<string, number>,
  residentId: string,
  areaId: string,
): number {
  const slot = slots.get(residentId);
  if (slot === undefined) {
    throw new Error(`Resident ${residentId} has no normalized slot in ${areaId}.`);
  }
  return slot;
}

function residentBelongsToArea(
  context: ShelterSelectionContext,
  selection: ResidentAreaSelection,
): boolean {
  const declaringPackId = requiredOwner(context.registry.recordOwners.animals, selection.animalId);
  const actual = resolveOwnedRecord({
    contentPacks: context.contentPacks,
    declaringPackId,
    rawReference: selection.shelterAreaReference,
    records: context.shelterAreas,
  });
  return (
    actual?.ownerPackId === selection.expected.ownerPackId &&
    actual.record.id === selection.expected.record.id
  );
}

function requireWithinCapacity(
  area: ShelterAreaRecord,
  residents: readonly ShelterResidentPresentation[],
): readonly ShelterResidentPresentation[] {
  if (residents.length > area.capacity) {
    throw new Error(`Shelter area ${area.id} exceeds its declared capacity.`);
  }
  return residents;
}

function compareShelterAreas(
  left: ContentRegistry['shelterAreas'][string],
  right: ContentRegistry['shelterAreas'][string],
): number {
  return (
    (left.navigationOrder ?? Number.MAX_SAFE_INTEGER) -
      (right.navigationOrder ?? Number.MAX_SAFE_INTEGER) || left.id.localeCompare(right.id)
  );
}

function requiredOwner(owners: Readonly<Record<string, string>>, id: string): string {
  const owner = owners[id];
  if (owner === undefined) {
    throw new Error(`Shelter content ${id} has no declaring pack.`);
  }
  return owner;
}
