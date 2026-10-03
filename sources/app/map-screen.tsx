import { useEffect, useRef, useState } from 'react';

import type { EffectService } from '../audio/effect-service';
import { resolveContentText } from '../content/content-localization';
import type { ContentRegistry } from '../content/content-registry';
import type { MissionCallContent } from '../content/mission-call-content';
import { selectRescueMapContent } from '../content/rescue-map-content';
import type { Locale } from '../i18n/localization';
import { getStrings } from '../i18n/localization';
import { LocationLandmark, MapPaths, ShelterLandmark } from './map-landmarks';
import { MissionCallSheet } from './mission-call-sheet';

type MapScreenProps = Readonly<{
  activeLocationId?: string;
  activePortraitUrl?: string | null;
  backgroundUrl?: string | null;
  effectService: EffectService;
  locale: Locale;
  featuredMissionId: string | null;
  initialOpenLocationId?: string;
  missionCalls: readonly MissionCallContent[];
  onInitialLocationRestored?: () => void;
  onOpenLocation: (locationId: string) => void;
  onOpenMission: (missionId: string) => void;
  onOpenShelter: () => void;
  registry: ContentRegistry;
  visibleLocationIds: readonly string[];
}>;

export function MapScreen({
  activeLocationId,
  activePortraitUrl,
  backgroundUrl,
  effectService,
  featuredMissionId,
  initialOpenLocationId,
  locale,
  missionCalls,
  onInitialLocationRestored,
  onOpenLocation,
  onOpenMission,
  onOpenShelter,
  registry,
  visibleLocationIds,
}: MapScreenProps) {
  const [openLocationId, setOpenLocationId] = useState<string | null>(
    initialOpenLocationId ?? null,
  );
  const restoredLocationButton = useRef<HTMLButtonElement>(null);
  const strings = getStrings(locale);
  const map = selectRescueMapContent(registry, visibleLocationIds);
  const openCalls = missionCalls.filter(({ locationId }) => locationId === openLocationId);

  useEffect(() => {
    if (initialOpenLocationId === undefined) {
      return;
    }
    restoredLocationButton.current?.focus();
    onInitialLocationRestored?.();
  }, [initialOpenLocationId, onInitialLocationRestored]);

  return (
    <main className="game-shell" data-route="map">
      <section
        aria-labelledby="map-title"
        className="game-surface map-screen"
        data-call-sheet-open={callSheetOpenAttribute(openCalls.length)}
      >
        {backgroundUrl === null || backgroundUrl === undefined ? null : (
          <img
            aria-hidden="true"
            alt=""
            className="scene-background map-scene-background"
            src={backgroundUrl}
          />
        )}
        <header className="map-title-plaque">
          <h1 id="map-title">{strings.screenTitles['screen.map.title']}</h1>
        </header>
        <div className="map-landmark-stage">
          <MapPaths />
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
              isExpanded={location.id === openLocationId && openCalls.length > 0}
              isActive={location.id === activeLocationId}
              isSelected={location.id === openLocationId}
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
                setOpenLocationId(locationId);
              }}
              portraitUrl={
                location.id === activeLocationId && openLocationId === null
                  ? activePortraitUrl
                  : null
              }
              {...(location.id === initialOpenLocationId
                ? { buttonRef: restoredLocationButton }
                : {})}
            />
          ))}
        </div>
        {openCalls.length === 0 ? null : (
          <MissionCallSheet
            calls={openCalls}
            closeLabel={strings.map}
            completedLabel={strings.completedReplay}
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

function callSheetOpenAttribute(callCount: number): string | undefined {
  return callCount === 0 ? undefined : String(true);
}
