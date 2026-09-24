import {
  firstRescueText,
  type FirstRescueContent,
  resolveFirstRescueAssets,
} from '../content/first-rescue-content';
import type { Locale } from '../i18n/localization';
import { getStrings } from '../i18n/localization';

type MapScreenProps = Readonly<{
  content: FirstRescueContent;
  locale: Locale;
  onOpenGardenMission: () => void;
  onOpenShelter: () => void;
}>;

export function MapScreen({ content, locale, onOpenGardenMission, onOpenShelter }: MapScreenProps) {
  const strings = getStrings(locale);
  const assets = resolveFirstRescueAssets(content);
  const locationName = firstRescueText(content, locale, content.location.nameKey);

  return (
    <main className="game-shell" data-route="map">
      <section className="game-surface map-screen" aria-labelledby="map-title">
        {assets.mapBackground === null ? null : (
          <img className="scene-background" src={assets.mapBackground} alt="" aria-hidden="true" />
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
            {assets.residentPortrait === null ? (
              <span className="kitten-portrait" />
            ) : (
              <img
                className="kitten-portrait kitten-portrait-art"
                src={assets.residentPortrait}
                alt=""
              />
            )}
          </span>
          <span>{locationName}</span>
        </button>
      </section>
    </main>
  );
}
