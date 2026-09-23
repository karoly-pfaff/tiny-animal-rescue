import { resolveIndoorShelterBackground } from '../content/first-rescue-assets';
import { type FirstRescueProgress, hasMimiResident } from './first-rescue-progress';
import type { Locale } from '../i18n/localization';
import { getStrings } from '../i18n/localization';
import { ShelterResident } from './shelter-resident';

type ShelterScreenProps = Readonly<{
  locale: Locale;
  onMap: () => void;
  progress: FirstRescueProgress;
}>;

export function ShelterScreen({ locale, onMap, progress }: ShelterScreenProps) {
  const strings = getStrings(locale);
  const mimiUnlocked = hasMimiResident(progress);
  const backgroundUrl = resolveIndoorShelterBackground();

  return (
    <main className="game-shell" data-route="shelter">
      <section
        className={`game-surface indoor-shelter${backgroundUrl === null ? '' : ' has-production-background'}`}
        aria-labelledby="shelter-title"
      >
        {backgroundUrl === null ? null : (
          <img className="scene-background" src={backgroundUrl} alt="" aria-hidden="true" />
        )}
        <header className="shelter-title-plaque">
          <h1 id="shelter-title">{strings.indoorRoom}</h1>
        </header>
        {mimiUnlocked ? (
          <ShelterResident
            happyText={strings.mimiHappy}
            name={strings.mimiName}
            tapLabel={strings.mimiTapLabel}
          />
        ) : (
          <p className="shelter-empty">{strings.shelterEmpty}</p>
        )}
        <button className="shelter-map-action" type="button" onClick={onMap}>
          <span className="celebration-map-icon" aria-hidden="true" />
          <span>{strings.map}</span>
        </button>
      </section>
    </main>
  );
}
