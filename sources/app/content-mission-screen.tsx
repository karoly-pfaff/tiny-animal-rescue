import { useEffect, useMemo } from 'react';

import type { NarrationService } from '../audio/narration-service';
import { resolveContentAsset } from '../content/content-asset-resolver';
import { resolveContentText } from '../content/content-localization';
import type { ContentRegistry } from '../content/content-registry';
import { narrationCueForContentKey } from '../content/first-rescue-content';
import type { MissionRecord } from '../content/mission-contract';
import { getStrings, type Locale } from '../i18n/localization';
import { useHoldToActivate } from '../interactions/hold-to-activate';

const exitHoldDurationMs = 650;

type ContentMissionScreenProps = Readonly<{
  locale: Locale;
  mission: MissionRecord;
  narrationService: NarrationService;
  onExit: () => void;
  ownerPackId: string;
  registry: ContentRegistry;
}>;

export function ContentMissionScreen({
  locale,
  mission,
  narrationService,
  onExit,
  ownerPackId,
  registry,
}: ContentMissionScreenProps) {
  const presentation = useMemo(
    () => selectOpeningPresentation(registry, mission, { locale, ownerPackId }),
    [locale, mission, ownerPackId, registry],
  );
  const strings = getStrings(locale);
  const exit = useHoldToActivate(exitHoldDurationMs, onExit);
  useEffect(() => {
    narrationService.speak(presentation.prompt);
    return () => {
      narrationService.stop();
    };
  }, [narrationService, presentation.prompt]);

  return (
    <main className="game-shell" data-route="mission" data-mission-id={mission.id}>
      <section
        aria-describedby="mission-intro"
        aria-labelledby="mission-title"
        className="game-surface first-mission content-mission-entry"
      >
        {presentation.backgroundUrl === null ? null : (
          <img
            aria-hidden="true"
            alt=""
            className="scene-background"
            src={presentation.backgroundUrl}
          />
        )}
        <header className="mission-title-plaque">
          <h1 id="mission-title">{presentation.title}</h1>
        </header>
        <p className="visually-hidden" id="mission-intro">
          {presentation.intro}
        </p>
        <div aria-hidden="true" className="content-mission-subject-cue" />
        <button
          aria-label={strings.repeatPrompt}
          className="mission-repeat"
          onClick={() => {
            narrationService.stop();
            narrationService.speak(presentation.prompt);
          }}
          type="button"
        >
          <span className="mission-repeat-icon" aria-hidden="true" />
          <span>{strings.repeatPrompt}</span>
        </button>
        <button
          className="mission-back"
          data-holding={exit.holding}
          type="button"
          onClick={exit.activateAccessibly}
          onContextMenu={(event) => {
            event.preventDefault();
          }}
          onPointerCancel={exit.cancelPointer}
          onPointerDown={exit.begin}
          onPointerLeave={exit.cancelPointer}
          onPointerUp={exit.cancelPointer}
        >
          <span className="mission-back-icon" aria-hidden="true" />
          <span>{strings.holdToMap}</span>
        </button>
      </section>
    </main>
  );
}

function selectOpeningPresentation(
  registry: ContentRegistry,
  mission: MissionRecord,
  context: Readonly<{ locale: Locale; ownerPackId: string }>,
) {
  const resolveText = (key: string) =>
    resolveContentText(registry, context.locale, { key, ownerPackId: context.ownerPackId });
  const introKey = mission.localization.introKey;
  const intro = resolveText(introKey);
  return {
    backgroundUrl: resolveContentAsset(registry, context.ownerPackId, mission.scene.background),
    intro,
    prompt: {
      cue: narrationCueForContentKey(introKey),
      locale: context.locale,
      text: intro,
    },
    title: resolveText(mission.localization.titleKey),
  } as const;
}
