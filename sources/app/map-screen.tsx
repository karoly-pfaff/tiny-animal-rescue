import { useState, type CSSProperties, type ReactNode } from 'react';

import type { EffectService } from '../audio/effect-service';
import { resolveContentText } from '../content/content-localization';
import type { ContentRegistry } from '../content/content-registry';
import type { MissionCallContent } from '../content/mission-call-content';
import {
  selectRescueMapContent,
  type MapLocationContent,
  type MapShelterContent,
} from '../content/rescue-map-content';
import type { MapLandmarkPresentation } from '../content/world-content-contracts';
import type { Locale } from '../i18n/localization';
import { getStrings } from '../i18n/localization';
import { MapLandmarkIcon } from './map-landmark-icon';
import { MissionCallSheet } from './mission-call-sheet';

type MapScreenProps = Readonly<{
  activeLocationId?: string;
  activePortraitUrl?: string | null;
  backgroundUrl?: string | null;
  effectService: EffectService;
  locale: Locale;
  featuredMissionId: string | null;
  missionCalls: readonly MissionCallContent[];
  onOpenLocation: (locationId: string) => void;
  onOpenMission: (missionId: string) => void;
  onOpenShelter: () => void;
  registry: ContentRegistry;
  visibleLocationIds: readonly string[];
}>;

type LandmarkStyle = CSSProperties & Readonly<Record<`--landmark-${string}`, string>>;

export function MapScreen({
  activeLocationId,
  activePortraitUrl,
  backgroundUrl,
  effectService,
  featuredMissionId,
  locale,
  missionCalls,
  onOpenLocation,
  onOpenMission,
  onOpenShelter,
  registry,
  visibleLocationIds,
}: MapScreenProps) {
  const [openLocationId, setOpenLocationId] = useState<string | null>(null);
  const strings = getStrings(locale);
  const map = selectRescueMapContent(registry, visibleLocationIds);
  const openCalls = missionCalls.filter(({ locationId }) => locationId === openLocationId);

  return (
    <main className="game-shell" data-route="map">
      <section className="game-surface map-screen" aria-labelledby="map-title">
        {backgroundUrl === null || backgroundUrl === undefined ? null : (
          <img
            aria-hidden="true"
            alt=""
            className="scene-background map-scene-background"
            src={backgroundUrl}
          />
        )}
        <MapPaths />
        <header className="map-title-plaque">
          <h1 id="map-title">{strings.screenTitles['screen.map.title']}</h1>
        </header>
        <ShelterLandmark
          content={map.shelter}
          effectService={effectService}
          label={resolveContentText(registry, locale, {
            key: map.shelter.labelKey,
            ownerPackId: map.shelter.ownerPackId,
          })}
          onOpen={onOpenShelter}
        />
        {map.locations.map((location) => (
          <LocationLandmark
            content={location}
            effectService={effectService}
            isExpanded={location.id === openLocationId}
            isActive={location.id === activeLocationId}
            key={`${location.ownerPackId}:${location.id}`}
            label={resolveContentText(registry, locale, {
              key: location.record.mapLabelKey,
              ownerPackId: location.ownerPackId,
            })}
            name={resolveContentText(registry, locale, {
              key: location.record.nameKey,
              ownerPackId: location.ownerPackId,
            })}
            onOpen={(locationId) => {
              onOpenLocation(locationId);
              if (missionCalls.some((call) => call.locationId === locationId)) {
                setOpenLocationId(locationId);
              }
            }}
            portraitUrl={
              location.id === activeLocationId && openLocationId === null ? activePortraitUrl : null
            }
          />
        ))}
        {openCalls.length === 0 ? null : (
          <MissionCallSheet
            calls={openCalls}
            closeLabel={strings.map}
            featuredMissionId={featuredMissionId}
            onClose={() => {
              setOpenLocationId(null);
            }}
            onOpenMission={onOpenMission}
          />
        )}
      </section>
    </main>
  );
}

function MapPaths() {
  return (
    <div className="map-paths" aria-hidden="true">
      <span className="map-path map-path-north-west" />
      <span className="map-path map-path-north-east" />
      <span className="map-path map-path-south-west" />
      <span className="map-path map-path-south-east" />
    </div>
  );
}

function ShelterLandmark({
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

function LocationLandmark({
  content,
  effectService,
  label,
  isActive,
  isExpanded,
  name,
  onOpen,
  portraitUrl,
}: Readonly<{
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
  children,
  className,
  dataActiveCall,
  dataLocationId,
  label,
  onOpen,
  presentation,
}: Readonly<{
  ariaExpanded?: boolean;
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
