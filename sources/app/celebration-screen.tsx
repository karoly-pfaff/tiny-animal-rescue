import { useEffect } from 'react';

import { rescueSuccessNarrationCue, type NarrationService } from '../audio/narration-service';
import { getStrings, type Locale } from '../i18n/localization';

type CelebrationScreenProps = Readonly<{
  locale: Locale;
  narrationService: NarrationService;
  onMap: () => void;
  onShelter: () => void;
}>;

export function CelebrationScreen({
  locale,
  narrationService,
  onMap,
  onShelter,
}: CelebrationScreenProps) {
  const strings = getStrings(locale);

  useEffect(() => {
    narrationService.speak({
      cue: rescueSuccessNarrationCue,
      locale,
      text: strings.mimiCelebrationNarration,
    });
    return narrationService.stop;
  }, [locale, narrationService, strings.mimiCelebrationNarration]);

  return (
    <main className="game-shell" data-route="celebration">
      <section className="game-surface celebration-screen" aria-labelledby="celebration-title">
        <div className="celebration-rays" aria-hidden="true" />
        <div className="celebration-mimi" aria-hidden="true">
          <span className="celebration-mimi-tail" />
        </div>
        <header className="celebration-title-plaque">
          <h1 id="celebration-title">{strings.celebrationTitle}</h1>
          <p>{strings.mimiCelebrationNarration}</p>
        </header>
        <nav className="celebration-actions" aria-label={strings.celebrationChoices}>
          <button className="celebration-action map-action" type="button" onClick={onMap}>
            <span className="celebration-map-icon" aria-hidden="true" />
            <span>{strings.map}</span>
          </button>
          <button className="celebration-action shelter-action" type="button" onClick={onShelter}>
            <span className="celebration-shelter-icon" aria-hidden="true" />
            <span>{strings.shelter}</span>
          </button>
        </nav>
      </section>
    </main>
  );
}
