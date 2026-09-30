import type { CSSProperties, ReactNode, Ref } from 'react';

import type { EffectService } from '../audio/effect-service';
import type { MapLocationContent, MapShelterContent } from '../content/rescue-map-content';
import type { MapLandmarkPresentation } from '../content/world-content-contracts';
import { MapLandmarkIcon } from './map-landmark-icon';

type LandmarkStyle = CSSProperties & Readonly<Record<`--landmark-${string}`, string>>;

export function MapPaths() {
  return (
    <div className="map-paths" aria-hidden="true">
      <span className="map-path map-path-north-west" />
      <span className="map-path map-path-north-east" />
      <span className="map-path map-path-south-west" />
      <span className="map-path map-path-south-east" />
    </div>
  );
}

export function ShelterLandmark({
  content,
  effectService,
  label,
  onOpen,
}: Readonly<{
  content: MapShelterContent;
  effectService: EffectService;
  label: string;
  onOpen: () => void;
}>) {
  return (
    <LandmarkButton
      className="map-shelter-landmark"
      label={label}
      onOpen={() => {
        effectService.play(content.presentation.audioCue);
        onOpen();
      }}
      presentation={content.presentation}
    >
      <MapLandmarkIcon silhouette={content.presentation.silhouette} />
      <span className="map-landmark-label">{label}</span>
    </LandmarkButton>
  );
}

export function LocationLandmark({
  buttonRef,
  content,
  effectService,
  label,
  isActive,
  isExpanded,
  name,
  onOpen,
  portraitUrl,
}: Readonly<{
  buttonRef?: Ref<HTMLButtonElement>;
  content: MapLocationContent;
  effectService: EffectService;
  label: string;
  isActive: boolean;
  isExpanded: boolean;
  name: string;
  onOpen: (locationId: string) => void;
  portraitUrl: string | null | undefined;
}>) {
  return (
    <LandmarkButton
      ariaExpanded={isExpanded}
      className="map-location-landmark"
      dataActiveCall={isActive}
      dataLocationId={content.id}
      label={label}
      onOpen={() => {
        effectService.play(content.presentation.audioCue);
        onOpen(content.id);
      }}
      presentation={content.presentation}
      {...(buttonRef === undefined ? {} : { buttonRef })}
    >
      {portraitUrl === null || portraitUrl === undefined ? null : (
        <img aria-hidden="true" alt="" className="map-active-call-portrait" src={portraitUrl} />
      )}
      <MapLandmarkIcon silhouette={content.presentation.silhouette} />
      <span className="map-landmark-label">{name}</span>
    </LandmarkButton>
  );
}

function LandmarkButton({
  ariaExpanded,
  buttonRef,
  children,
  className,
  dataActiveCall,
  dataLocationId,
  label,
  onOpen,
  presentation,
}: Readonly<{
  ariaExpanded?: boolean;
  buttonRef?: Ref<HTMLButtonElement>;
  children: ReactNode;
  className: string;
  dataActiveCall?: boolean;
  dataLocationId?: string;
  label: string;
  onOpen: () => void;
  presentation: MapLandmarkPresentation;
}>) {
  return (
    <button
      aria-expanded={ariaExpanded}
      aria-label={label}
      className={`map-landmark ${className}`}
      data-active-call={dataActiveCall === true ? 'true' : undefined}
      data-location-id={dataLocationId}
      data-shape={presentation.shape}
      data-silhouette={presentation.silhouette}
      onClick={onOpen}
      ref={buttonRef}
      style={landmarkStyle(presentation)}
      type="button"
    >
      {children}
    </button>
  );
}

function landmarkStyle(presentation: MapLandmarkPresentation): LandmarkStyle {
  return {
    '--landmark-accent': presentation.accentColor,
    '--landmark-landscape-x': `${String(presentation.placement.landscape.x * 100)}%`,
    '--landmark-landscape-y': `${String(presentation.placement.landscape.y * 100)}%`,
    '--landmark-portrait-x': `${String(presentation.placement.portrait.x * 100)}%`,
    '--landmark-portrait-y': `${String(presentation.placement.portrait.y * 100)}%`,
  };
}
