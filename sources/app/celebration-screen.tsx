import { useEffect } from 'react';

import type { NarrationService } from '../audio/narration-service';
import {
  firstRescueText,
  narrationCueForContentKey,
  type FirstRescueContent,
  resolveFirstRescueAssets,
} from '../content/first-rescue-content';
import { getStrings, type Locale } from '../i18n/localization';

type CelebrationScreenProps = Readonly<{
  content: FirstRescueContent;
  locale: Locale;
  narrationService: NarrationService;
  onMap: () => void;
  onShelter: () => void;
}>;

export function CelebrationScreen({
  content,
  locale,
  narrationService,
  onMap,
  onShelter,
}: CelebrationScreenProps) {
  const strings = getStrings(locale);
  const narrationText = firstRescueText(content, locale, content.mission.localization.successKey);
  const narrationCue = narrationCueForContentKey(content.mission.localization.successKey);
  const assets = resolveFirstRescueAssets(content);
  const backgroundUrl = assets.missionBackground;
  const mimiUrl = assets.residentCelebration;

  useEffect(() => {
    narrationService.speak({
      cue: narrationCue,
      locale,
      text: narrationText,
    });
    return narrationService.stop;
  }, [locale, narrationCue, narrationService, narrationText]);

  return (
    <main className="game-shell" data-route="celebration">
      <section className="game-surface celebration-screen" aria-labelledby="celebration-title">
        {backgroundUrl === null ? null : (
          <img className="scene-background" src={backgroundUrl} alt="" aria-hidden="true" />
        )}
        <div className="celebration-rays" aria-hidden="true" />
        <div
          className={`celebration-mimi${mimiUrl === null ? '' : ' celebration-mimi-production'}`}
          aria-hidden="true"
        >
          {mimiUrl === null ? (
            <span className="celebration-mimi-tail" />
          ) : (
            <img src={mimiUrl} alt="" />
          )}
        </div>
        <header className="celebration-title-plaque">
          <h1 id="celebration-title">{strings.celebrationTitle}</h1>
          <p>{narrationText}</p>
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
