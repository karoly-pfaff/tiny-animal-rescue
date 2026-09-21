import { useEffect, useRef, useState } from 'react';

import { type FirstRescueProgress, hasMimiResident } from './first-rescue-progress';
import type { Locale } from '../i18n/localization';
import { getStrings } from '../i18n/localization';

type ShelterScreenProps = Readonly<{
  locale: Locale;
  onMap: () => void;
  progress: FirstRescueProgress;
}>;

const reactionDurationMs = 900;

export function ShelterScreen({ locale, onMap, progress }: ShelterScreenProps) {
  const [mimiHappy, setMimiHappy] = useState(false);
  const reactionTimer = useRef<number | null>(null);
  const strings = getStrings(locale);
  const mimiUnlocked = hasMimiResident(progress);

  function reactToMimi(): void {
    if (reactionTimer.current !== null) {
      window.clearTimeout(reactionTimer.current);
    }
    setMimiHappy(true);
    reactionTimer.current = window.setTimeout(() => {
      reactionTimer.current = null;
      setMimiHappy(false);
    }, reactionDurationMs);
  }

  useEffect(() => {
    return () => {
      if (reactionTimer.current !== null) {
        window.clearTimeout(reactionTimer.current);
      }
    };
  }, []);

  return (
    <main className="game-shell" data-route="shelter">
      <section className="game-surface indoor-shelter" aria-labelledby="shelter-title">
        <header className="shelter-title-plaque">
          <h1 id="shelter-title">{strings.indoorRoom}</h1>
        </header>
        {mimiUnlocked ? (
          <button
            aria-label={strings.mimiTapLabel}
            className={`shelter-mimi${mimiHappy ? ' is-happy' : ''}`}
            onClick={reactToMimi}
            type="button"
          >
            <span className="shelter-mimi-face" aria-hidden="true" />
            <span>{strings.mimiName}</span>
          </button>
        ) : (
          <p className="shelter-empty">{strings.shelterEmpty}</p>
        )}
        <p className="visually-hidden" aria-live="polite">
          {mimiHappy ? strings.mimiHappy : ''}
        </p>
        <button className="shelter-map-action" type="button" onClick={onMap}>
          <span className="celebration-map-icon" aria-hidden="true" />
          <span>{strings.map}</span>
        </button>
      </section>
    </main>
  );
}
