import type { ContentRegistry } from './content-registry';
import type {
  LocationRecord,
  MapLandmarkPresentation,
  ShelterAreaRecord,
} from './world-content-contracts';

export type MapLocationContent = Readonly<{
  id: string;
  ownerPackId: string;
  presentation: MapLandmarkPresentation;
  record: LocationRecord;
}>;

export type MapShelterContent = Readonly<{
  id: string;
  labelKey: string;
  ownerPackId: string;
  presentation: MapLandmarkPresentation;
  record: ShelterAreaRecord;
}>;

export type RescueMapContent = Readonly<{
  locations: readonly MapLocationContent[];
  shelter: MapShelterContent;
}>;

export function selectRescueMapContent(
  registry: ContentRegistry,
  visibleLocationIds: readonly string[],
): RescueMapContent {
  const visible = new Set(visibleLocationIds);
  const locations = registry.packOrder.flatMap((packId) => {
    const pack = registry.packs[packId];
    return (
      pack?.records.locations.flatMap((record) => {
        const presentation = record.mapPresentation;
        return presentation === undefined || !visible.has(record.id)
          ? []
          : [{ id: record.id, ownerPackId: packId, presentation, record }];
      }) ?? []
    );
  });
  const shelters = registry.packOrder.flatMap((packId) => {
    const pack = registry.packs[packId];
    return (
      pack?.records.shelterAreas.flatMap((record) => {
        const { mapLabelKey: labelKey, mapPresentation: presentation } = record;
        return presentation === undefined || labelKey === undefined
          ? []
          : [{ id: record.id, labelKey, ownerPackId: packId, presentation, record }];
      }) ?? []
    );
  });
  const shelter = shelters[0];
  if (shelters.length !== 1 || shelter === undefined) {
    throw new Error('The rescue map requires exactly one content-declared central Shelter.');
  }
  return { locations, shelter };
}
