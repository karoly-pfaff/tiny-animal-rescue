import { resolveGardenMapBackground } from '../content/first-rescue-assets';
import type { Locale } from '../i18n/localization';
import { getStrings } from '../i18n/localization';

type MapScreenProps = Readonly<{
  locale: Locale;
  onOpenGardenMission: () => void;
}>;

export function MapScreen({ locale, onOpenGardenMission }: MapScreenProps) {
  const strings = getStrings(locale);
  const backgroundUrl = resolveGardenMapBackground();

  return (
    <main className="game-shell" data-route="map">
      <section className="game-surface map-screen" aria-labelledby="map-title">
        {backgroundUrl === null ? null : (
          <img className="scene-background" src={backgroundUrl} alt="" aria-hidden="true" />
        )}
        <header className="map-title-plaque">
          <h1 id="map-title">{strings.screenTitles['screen.map.title']}</h1>
        </header>
        <div className="shelter-marker" role="img" aria-label={strings.shelter}>
          <span className="shelter-icon" aria-hidden="true" />
          <span>{strings.shelter}</span>
        </div>
        <button
          className="garden-mission-marker"
          type="button"
          aria-label={strings.gardenMissionLabel}
          onClick={onOpenGardenMission}
        >
          <span className="garden-marker-icon" aria-hidden="true">
            <span className="tree-crown" />
            <span className="tree-trunk" />
            <span className="kitten-portrait" />
          </span>
          <span>{strings.garden}</span>
        </button>
      </section>
    </main>
  );
}
