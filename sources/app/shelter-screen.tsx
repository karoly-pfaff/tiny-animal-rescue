import {
  firstRescueText,
  type FirstRescueContent,
  resolveFirstRescueAssets,
} from '../content/first-rescue-content';
import { type FirstRescueProgress, hasResident } from './first-rescue-progress';
import type { Locale } from '../i18n/localization';
import { getStrings } from '../i18n/localization';
import { ShelterResident } from './shelter-resident';

type ShelterScreenProps = Readonly<{
  content: FirstRescueContent;
  locale: Locale;
  onMap: () => void;
  progress: FirstRescueProgress;
}>;

export function ShelterScreen({ content, locale, onMap, progress }: ShelterScreenProps) {
  const strings = getStrings(locale);
  const residentUnlocked = hasResident(progress, content.animal.id);
  const assets = resolveFirstRescueAssets(content);
  const backgroundUrl = assets.shelterBackground;
  const residentName = firstRescueText(content, locale, content.animal.nameKey);
  const shelterName = firstRescueText(content, locale, content.shelterArea.nameKey);

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
          <h1 id="shelter-title">{shelterName}</h1>
        </header>
        {residentUnlocked ? (
          <ShelterResident
            assetUrl={assets.residentShelter}
            happyText={strings.mimiHappy}
            name={residentName}
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
