import { useEffect, useState } from 'react';

import type { NarrationService } from '../audio/narration-service';
import type { FirstRescueContent } from '../content/first-rescue-content';
import { getStrings, type Locale } from '../i18n/localization';
import type { FirstRescueProgress } from './first-rescue-progress';
import { selectShelterAreaPresentations } from './shelter-content';
import { ShelterResident } from './shelter-resident';
import { useShelterSwipe } from './use-shelter-swipe';

type ShelterScreenProps = Readonly<{
  content: FirstRescueContent;
  locale: Locale;
  narrationService: NarrationService;
  onMap: () => void;
  progress: FirstRescueProgress;
}>;

export function ShelterScreen({
  content,
  locale,
  narrationService,
  onMap,
  progress,
}: ShelterScreenProps) {
  const strings = getStrings(locale);
  const areas = selectShelterAreaPresentations(content.registry, locale, progress);
  const [activeIndex, setActiveIndex] = useState(0);
  const activeArea = areas[activeIndex] ?? requiredFirstArea(areas);
  const move = (offset: number) => {
    narrationService.stop();
    setActiveIndex((current) => (current + offset + areas.length) % areas.length);
  };
  const swipe = useShelterSwipe(
    () => {
      move(-1);
    },
    () => {
      move(1);
    },
  );
  useEffect(
    () => () => {
      narrationService.stop();
    },
    [narrationService],
  );

  return (
    <main className="game-shell" data-route="shelter">
      <section
        className={`game-surface shelter-area shelter-area-${activeArea.id}${activeArea.backgroundUrl === null ? '' : ' has-production-background'}`}
        aria-labelledby="shelter-title"
        data-shelter-area-id={activeArea.id}
        {...swipe}
      >
        {activeArea.backgroundUrl === null ? null : (
          <img
            className="scene-background"
            src={activeArea.backgroundUrl}
            alt=""
            aria-hidden="true"
          />
        )}
        <header className="shelter-title-plaque">
          <h1 id="shelter-title">{activeArea.name}</h1>
        </header>
        <button
          aria-label={strings.previousShelterArea}
          className="shelter-area-arrow shelter-area-arrow-previous"
          onClick={() => {
            move(-1);
          }}
          type="button"
        >
          <span className="shelter-area-arrow-icon" aria-hidden="true" />
        </button>
        <button
          aria-label={strings.nextShelterArea}
          className="shelter-area-arrow shelter-area-arrow-next"
          onClick={() => {
            move(1);
          }}
          type="button"
        >
          <span className="shelter-area-arrow-icon" aria-hidden="true" />
        </button>
        <button
          aria-label={strings.repeatAreaName}
          className="shelter-area-repeat"
          onClick={() => {
            narrationService.speak({
              cue: `voice.shelter.${activeArea.id}.name`,
              locale,
              text: activeArea.name,
            });
          }}
          type="button"
        >
          <span className="mission-repeat-icon" aria-hidden="true" />
          <span className="visually-hidden">{strings.repeatAreaName}</span>
        </button>
        {activeArea.residents.length === 0 ? (
          <p className="shelter-empty">{strings.shelterEmpty}</p>
        ) : (
          <div className="shelter-residents">
            {activeArea.residents.map((resident) => (
              <ShelterResident
                key={resident.id}
                {...resident}
                locale={locale}
                narrationService={narrationService}
              />
            ))}
          </div>
        )}
        <button className="shelter-map-action" type="button" onClick={onMap}>
          <span className="celebration-map-icon" aria-hidden="true" />
          <span>{strings.map}</span>
        </button>
      </section>
    </main>
  );
}

function requiredFirstArea<Area>(areas: readonly Area[]): Area {
  const first = areas[0];
  if (first === undefined) {
    throw new Error('The shelter has no content-defined areas.');
  }
  return first;
}
