import { diagnostic } from './content-validation-diagnostic.ts';
import type { AnimalRecord, ShelterAreaRecord } from './world-content-contracts.ts';

type ShelterAreaCapacity = Pick<ShelterAreaRecord, 'capacity' | 'id'>;

export function validateShelterPopulation(
  area: ShelterAreaCapacity,
  residents: readonly AnimalRecord[],
): readonly string[] {
  const capacityFindings =
    residents.length > area.capacity
      ? [
          diagnostic(
            `Shelter area ${area.id} has capacity ${String(area.capacity)} but ${String(residents.length)} residents.`,
          ),
        ]
      : [];
  return [...capacityFindings, ...validateShelterSlots(area, residents)];
}

function validateShelterSlots(
  area: ShelterAreaCapacity,
  residents: readonly AnimalRecord[],
): readonly string[] {
  const occupants = new Map<number, string>();
  return residents.flatMap((resident) => {
    const slot = resident.shelterSlot;
    if (slot === undefined) {
      return [];
    }
    const prior = occupants.get(slot);
    occupants.set(slot, resident.id);
    return [
      ...(slot < 1 || slot > area.capacity
        ? [
            diagnostic(
              `Resident ${resident.id} uses shelter slot ${String(slot)} outside ${area.id} capacity ${String(area.capacity)}.`,
            ),
          ]
        : []),
      ...(prior === undefined
        ? []
        : [
            diagnostic(
              `Residents ${prior} and ${resident.id} both use shelter slot ${String(slot)} in ${area.id}.`,
            ),
          ]),
    ];
  });
}
