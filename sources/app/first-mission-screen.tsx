import { useEffect, useRef, useState } from 'react';

import type { EffectService } from '../audio/effect-service';
import type { NarrationService } from '../audio/narration-service';
import {
  firstRescueText,
  narrationCueForContentKey,
  type FirstRescueContent,
  resolveFirstRescueAssets,
} from '../content/first-rescue-content';
import type { Locale } from '../i18n/localization';
import { getStrings } from '../i18n/localization';
import { DragToTarget } from '../interactions/drag-to-target';
import { useHoldToActivate } from '../interactions/hold-to-activate';
import { FirstMissionArtwork, type MissionPhase } from './first-mission-artwork';
import { ladderStart, missionTarget } from './first-mission-layout';

const exitHoldDurationMs = 650;

type FirstMissionScreenProps = Readonly<{
  content: FirstRescueContent;
  effectService: EffectService;
  locale: Locale;
  onCelebrate: () => void;
  onCommitReward: () => Promise<void>;
  onExit: () => void;
  narrationService: NarrationService;
}>;

const ladderPhase = 'ladder' satisfies MissionPhase;
const mimiPhase = 'mimi' satisfies MissionPhase;
const rescueMotionDurationMs = 650;
const savingPhase = 'saving' satisfies MissionPhase;

export function FirstMissionScreen({
  content,
  effectService,
  locale,
  onCelebrate,
  onCommitReward,
  onExit,
  narrationService,
}: FirstMissionScreenProps) {
  const presentation = firstRescuePresentation(content, locale);
  const strings = getStrings(locale),
    rescue = useRescueCompletion({
      dragSuccessCue: content.dragStep.successCue,
      effectService,
      helpMimiCue: presentation.tapCue,
      helpMimiText: presentation.tapPrompt,
      initialNarrationCue: presentation.dragCue,
      initialNarrationText: presentation.dragPrompt,
      locale,
      narrationService,
      onCelebrate,
      onCommitReward,
      tapSuccessCue: content.tapStep.successCue,
    });
  const ladderUrl = resolveFirstRescueAssets(content).ladder;
  const exit = useHoldToActivate(exitHoldDurationMs, onExit);

  return (
    <main className="game-shell" data-route="mission" data-mission-id={content.mission.id}>
      <section
        className="game-surface first-mission"
        aria-describedby="mission-intro"
        aria-labelledby="mission-title"
      >
        <FirstMissionArtwork
          content={content}
          helpMimiLabel={presentation.tapPrompt}
          hintDelayMs={content.tapStep.hint.delayMs}
          onFinish={rescue.finish}
          phase={rescue.phase}
        />
        <header className="mission-title-plaque">
          <h1 id="mission-title">
            {firstRescueText(content, locale, content.mission.localization.titleKey)}
          </h1>
        </header>
        <p className="visually-hidden" id="mission-intro">
          {presentation.intro}
        </p>
        <DragToTarget
          accessibleLabel={presentation.dragPrompt}
          assetUrl={ladderUrl}
          completionAnnouncement={strings.ladderPlaced}
          hintDelayMs={content.dragStep.hint.delayMs}
          onComplete={rescue.unlockMimi}
          sourceId={content.dragStep.sourceId}
          start={ladderStart}
          successCue={content.dragStep.successCue}
          target={missionTarget(ladderUrl, content.dragStep.snapTolerance)}
          targetId={content.dragStep.targetId}
        />
        <button
          className={`mission-back${exit.holding ? ' is-holding' : ''}`}
          disabled={rescue.phase === savingPhase}
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
        {rescue.saveFailed ? (
          <p className="mission-save-error" role="alert">
            {strings.rewardSaveError}
          </p>
        ) : null}
      </section>
    </main>
  );
}

type MissionEntryNarration = Readonly<{
  cue: string;
  text: string;
  locale: Locale;
  narrationService: NarrationService;
}>;

function useMissionEntryNarration({
  cue,
  text,
  locale,
  narrationService,
}: MissionEntryNarration): void {
  useEffect(() => {
    narrationService.speak({ cue, locale, text });
    return narrationService.stop;
  }, [cue, locale, narrationService, text]);
}

type RescueCompletionOptions = Readonly<{
  dragSuccessCue: FirstRescueContent['dragStep']['successCue'];
  effectService: EffectService;
  helpMimiCue: string;
  helpMimiText: string;
  initialNarrationCue: string;
  initialNarrationText: string;
  locale: Locale;
  narrationService: NarrationService;
  onCelebrate: () => void;
  onCommitReward: () => Promise<void>;
  tapSuccessCue: FirstRescueContent['tapStep']['successCue'];
}>;

function useRescueCompletion({
  dragSuccessCue,
  effectService,
  helpMimiCue,
  helpMimiText,
  initialNarrationCue,
  initialNarrationText,
  locale,
  narrationService,
  onCelebrate,
  onCommitReward,
  tapSuccessCue,
}: RescueCompletionOptions) {
  useMissionEntryNarration({
    cue: initialNarrationCue,
    locale,
    narrationService,
    text: initialNarrationText,
  });
  const [phase, setPhase] = useState<MissionPhase>(ladderPhase);
  const [saveFailed, setSaveFailed] = useState(false);
  const completionStarted = useRef(false);
  const lifecycle = useRef<RescueLifecycle>({
    active: true,
    cancelMotion: null,
  });

  useEffect(() => {
    const currentLifecycle = lifecycle.current;
    currentLifecycle.active = true;
    return () => {
      currentLifecycle.active = false;
      currentLifecycle.cancelMotion?.();
    };
  }, []);

  async function finishRescue(): Promise<void> {
    try {
      await Promise.all([onCommitReward(), waitForRescueMotion(lifecycle.current)]);
      if (lifecycle.current.active) {
        onCelebrate();
      }
    } catch {
      if (lifecycle.current.active) {
        completionStarted.current = false;
        setPhase(mimiPhase);
        setSaveFailed(true);
      }
    }
  }

  function finish(): void {
    if (phase !== mimiPhase || completionStarted.current) {
      return;
    }
    completionStarted.current = true;
    effectService.play(tapSuccessCue);
    setSaveFailed(false);
    setPhase(savingPhase);
    void finishRescue();
  }

  return {
    finish,
    phase,
    saveFailed,
    unlockMimi: () => {
      effectService.play(dragSuccessCue);
      setPhase(mimiPhase);
      narrationService.speak({ cue: helpMimiCue, locale, text: helpMimiText });
    },
  } as const;
}

function firstRescuePresentation(content: FirstRescueContent, locale: Locale) {
  return {
    dragCue: narrationCueForContentKey(content.dragStep.promptKey),
    dragPrompt: firstRescueText(content, locale, content.dragStep.promptKey),
    intro: firstRescueText(content, locale, content.mission.localization.introKey),
    tapCue: narrationCueForContentKey(content.tapStep.promptKey),
    tapPrompt: firstRescueText(content, locale, content.tapStep.promptKey),
  } as const;
}

interface RescueLifecycle {
  active: boolean;
  cancelMotion: (() => void) | null;
}

function waitForRescueMotion(lifecycle: RescueLifecycle): Promise<void> {
  return new Promise((resolve) => {
    const timer = window.setTimeout(() => {
      lifecycle.cancelMotion = null;
      resolve();
    }, rescueMotionDurationMs);
    lifecycle.cancelMotion = () => {
      window.clearTimeout(timer);
      lifecycle.cancelMotion = null;
      resolve();
    };
  });
}
