export type ContentRecordKind = 'animals' | 'locations' | 'missions' | 'shelterAreas';
export type ContentRecordLabel =
  'animal' | 'location' | 'mission' | 'prerequisite' | 'shelter area';

export const animalRecords = 'animals' satisfies ContentRecordKind;
export const locationRecords = 'locations' satisfies ContentRecordKind;
export const missionRecords = 'missions' satisfies ContentRecordKind;
export const shelterAreaRecords = 'shelterAreas' satisfies ContentRecordKind;

export const animalRecordLabel = 'animal' satisfies ContentRecordLabel;
export const locationRecordLabel = 'location' satisfies ContentRecordLabel;
export const prerequisiteRecordLabel = 'prerequisite' satisfies ContentRecordLabel;
export const shelterAreaRecordLabel = 'shelter area' satisfies ContentRecordLabel;
