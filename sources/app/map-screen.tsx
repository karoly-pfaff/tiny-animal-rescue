import { resolveGardenMapBackground, resolveMimiCanonical } from '../content/first-rescue-assets';
import type { Locale } from '../i18n/localization';
import { getStrings } from '../i18n/localization';

type MapScreenProps = Readonly<{
  locale: Locale;
  onOpenGardenMission: () => void;
  onOpenShelter: () => void;
}>;

export function MapScreen({ locale, onOpenGardenMission, onOpenShelter }: MapScreenProps) {
  const strings = getStrings(locale);
  const backgroundUrl = resolveGardenMapBackground();
  const mimiUrl = resolveMimiCanonical();

  return (
    <main className="game-shell" data-route="map">
      <section className="game-surface map-screen" aria-labelledby="map-title">
        {backgroundUrl === null ? null : (
          <img className="scene-background" src={backgroundUrl} alt="" aria-hidden="true" />
        )}
        <header className="map-title-plaque">
          <h1 id="map-title">{strings.screenTitles['screen.map.title']}</h1>
        </header>
        <button
          className="shelter-marker"
          type="button"
          aria-label={strings.shelter}
          onClick={onOpenShelter}
        >
          <span className="shelter-icon" aria-hidden="true" />
          <span>{strings.shelter}</span>
        </button>
        <button
          className="garden-mission-marker"
          type="button"
          aria-label={strings.gardenMissionLabel}
          onClick={onOpenGardenMission}
        >
          <span className="garden-marker-icon" aria-hidden="true">
            <span className="tree-crown" />
            <span className="tree-trunk" />
            {mimiUrl === null ? (
              <span className="kitten-portrait" />
            ) : (
              <img className="kitten-portrait kitten-portrait-art" src={mimiUrl} alt="" />
            )}
          </span>
          <span>{strings.garden}</span>
        </button>
      </section>
    </main>
  );
}
