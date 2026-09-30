import type { CSSProperties, ReactNode } from 'react';

import type { EffectService } from '../audio/effect-service';
import { resolveContentText } from '../content/content-localization';
import type { ContentRegistry } from '../content/content-registry';
import {
  selectRescueMapContent,
  type MapLocationContent,
  type MapShelterContent,
} from '../content/rescue-map-content';
import type { MapLandmarkPresentation } from '../content/world-content-contracts';
import type { Locale } from '../i18n/localization';
import { getStrings } from '../i18n/localization';

type MapScreenProps = Readonly<{
  activeLocationId?: string;
  activePortraitUrl?: string | null;
  backgroundUrl?: string | null;
  effectService: EffectService;
  locale: Locale;
  onOpenLocation: (locationId: string) => void;
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
  locale,
  onOpenLocation,
  onOpenShelter,
  registry,
  visibleLocationIds,
}: MapScreenProps) {
  const strings = getStrings(locale);
  const map = selectRescueMapContent(registry, visibleLocationIds);

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
            onOpen={onOpenLocation}
            portraitUrl={location.id === activeLocationId ? activePortraitUrl : null}
          />
        ))}
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
      <LandmarkIcon silhouette={content.presentation.silhouette} />
      <span className="map-landmark-label">{label}</span>
    </LandmarkButton>
  );
}

function LocationLandmark({
  content,
  effectService,
  label,
  isActive,
  name,
  onOpen,
  portraitUrl,
}: Readonly<{
  content: MapLocationContent;
  effectService: EffectService;
  label: string;
  isActive: boolean;
  name: string;
  onOpen: (locationId: string) => void;
  portraitUrl: string | null | undefined;
}>) {
  return (
    <LandmarkButton
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
      <LandmarkIcon silhouette={content.presentation.silhouette} />
      <span className="map-landmark-label">{name}</span>
    </LandmarkButton>
  );
}

function LandmarkButton({
  children,
  className,
  dataActiveCall,
  dataLocationId,
  label,
  onOpen,
  presentation,
}: Readonly<{
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

function LandmarkIcon({
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

function landmarkStyle(presentation: MapLandmarkPresentation): LandmarkStyle {
  return {
    '--landmark-accent': presentation.accentColor,
    '--landmark-landscape-x': `${String(presentation.placement.landscape.x * 100)}%`,
    '--landmark-landscape-y': `${String(presentation.placement.landscape.y * 100)}%`,
    '--landmark-portrait-x': `${String(presentation.placement.portrait.x * 100)}%`,
    '--landmark-portrait-y': `${String(presentation.placement.portrait.y * 100)}%`,
  };
}
