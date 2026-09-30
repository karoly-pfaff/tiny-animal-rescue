import type { ContentPackSource } from './content-registry';
import { diagnostic } from './content-validation-diagnostic.ts';
import type { MapLandmarkPresentation } from './world-content-contracts';

type PresentedLandmark = Readonly<{
  id: string;
  presentation: MapLandmarkPresentation;
}>;

type MapIdentityLabel = 'audio cue' | 'shape and silhouette';

const audioCueLabel = 'audio cue' satisfies MapIdentityLabel;
const visualIdentityLabel = 'shape and silhouette' satisfies MapIdentityLabel;

export function validateMapDeclarations(packs: readonly ContentPackSource[]): readonly string[] {
  const locations = packs.flatMap((pack) =>
    pack.records.locations.flatMap((record) =>
      record.mapPresentation === undefined
        ? []
        : [{ id: `${pack.id}:${record.id}`, presentation: record.mapPresentation }],
    ),
  );
  const shelters = packs.flatMap((pack) =>
    pack.records.shelterAreas.flatMap((record) =>
      record.mapPresentation === undefined
        ? []
        : [{ id: `${pack.id}:${record.id}`, presentation: record.mapPresentation, record }],
    ),
  );
  if (locations.length === 0 && shelters.length === 0) {
    return [];
  }
  return [
    ...(shelters.length === 1
      ? []
      : [
          diagnostic(
            `The assembled rescue map must declare exactly one central Shelter; found ${String(shelters.length)}.`,
          ),
        ]),
    ...shelters.flatMap(({ id, record }) =>
      record.mapLabelKey === undefined
        ? [diagnostic(`Map Shelter ${id} must declare mapLabelKey.`)]
        : [],
    ),
    ...duplicateIdentityFindings([...locations, ...shelters]),
  ];
}

function duplicateIdentityFindings(landmarks: readonly PresentedLandmark[]): readonly string[] {
  return [
    ...duplicateValues(landmarks, audioCueLabel, ({ presentation }) => presentation.audioCue),
    ...duplicateValues(
      landmarks,
      visualIdentityLabel,
      ({ presentation }) => `${presentation.shape} + ${presentation.silhouette}`,
    ),
  ];
}

function duplicateValues(
  landmarks: readonly PresentedLandmark[],
  label: MapIdentityLabel,
  select: (landmark: PresentedLandmark) => string,
): readonly string[] {
  const owners = new Map<string, string>();
  return landmarks.flatMap((landmark) => {
    const value = select(landmark);
    const owner = owners.get(value);
    owners.set(value, landmark.id);
    return owner === undefined
      ? []
      : [
          diagnostic(
            `Map landmarks ${owner} and ${landmark.id} share ${label} ${value}; every landmark identity must be distinct.`,
          ),
        ];
  });
}
