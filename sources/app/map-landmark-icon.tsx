import type { MapLandmarkPresentation } from '../content/world-content-contracts';

export function MapLandmarkIcon({
  silhouette,
}: Readonly<{ silhouette: MapLandmarkPresentation['silhouette'] }>) {
  return (
    <span aria-hidden="true" className={`map-landmark-icon map-landmark-icon-${silhouette}`}>
      <span />
      <span />
      <span />
    </span>
  );
}
