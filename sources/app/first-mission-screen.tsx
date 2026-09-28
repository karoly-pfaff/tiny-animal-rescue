import { useEffect, useRef, useState } from 'react';

import type { EffectService } from '../audio/effect-service';
import type { NarrationService } from '../audio/narration-service';
import {
  firstRescueText,
  type FirstRescueContent,
  resolveFirstRescueAssets,
} from '../content/first-rescue-content';
import { getStrings, type Locale } from '../i18n/localization';
import { DragToTarget } from '../interactions/drag-to-target';
import { contentDragStart, contentDragTarget } from '../interactions/content-drag-layout';
import { useHoldToActivate } from '../interactions/hold-to-activate';
import { LadderArt } from '../interactions/ladder-art';
import { FirstMissionArtwork, type MissionPhase } from './first-mission-artwork';
import { useFirstMissionGuidance } from './use-first-mission-guidance';

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
  const missionCopy = firstRescuePresentation(content, locale);
  const strings = getStrings(locale),
    rescue = useRescueCompletion({
      dragSuccessCue: content.dragStep.successCue,
      effectService,
      onCelebrate,
      onCommitReward,
      tapSuccessCue: content.tapStep.successCue,
    });
  const guidance = useFirstMissionGuidance({
    content,
    locale,
    narrationService,
    phase: rescue.phase,
  });
  const ladderUrl = resolveFirstRescueAssets(content).ladder;
  const exit = useHoldToActivate(exitHoldDurationMs, onExit);
  const unlockMimi = () => {
    guidance.complete();
    rescue.unlockMimi();
  };
  const finishRescue = () => {
    guidance.complete();
    rescue.finish();
  };

  return (
    <main className="game-shell" data-route="mission" data-mission-id={content.mission.id}>
      <section
        className="game-surface first-mission"
        aria-describedby="mission-intro"
        aria-labelledby="mission-title"
      >
        <FirstMissionArtwork
          content={content}
          guidance={guidance.presentation}
          helpMimiLabel={missionCopy.tapPrompt}
          onFinish={finishRescue}
          onGuidanceActivity={guidance.activity}
          onGuidanceWrongAction={guidance.wrongAction}
          phase={rescue.phase}
        />
        <header className="mission-title-plaque">
          <h1 id="mission-title">
            {firstRescueText(content, locale, content.mission.localization.titleKey)}
          </h1>
        </header>
        <p className="visually-hidden" id="mission-intro">
          {missionCopy.intro}
        </p>
        <DragToTarget
          accessibleLabel={missionCopy.dragPrompt}
          completionAnnouncement={strings.ladderPlaced}
          guidance={guidance.presentation}
          hideTargetWhenPlaced={ladderUrl !== null}
          onComplete={unlockMimi}
          onGuidanceActivity={guidance.activity}
          onGuidanceWrongAction={guidance.wrongAction}
          sourceId={content.dragStep.sourceId}
          sourceClassName="mission-ladder"
          sourceVisual={<LadderArt assetUrl={ladderUrl} />}
          start={contentDragStart(content.dragStep)}
          successCue={content.dragStep.successCue}
          target={contentDragTarget(content.dragStep, ladderUrl)}
          targetId={content.dragStep.targetId}
        />
        <button
          aria-label={strings.repeatPrompt}
          className="mission-repeat"
          disabled={rescue.phase === savingPhase}
          onClick={guidance.replay}
          type="button"
        >
          <span className="mission-repeat-icon" aria-hidden="true" />
          <span>{strings.repeatPrompt}</span>
        </button>
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

type RescueCompletionOptions = Readonly<{
  dragSuccessCue: FirstRescueContent['dragStep']['successCue'];
  effectService: EffectService;
  onCelebrate: () => void;
  onCommitReward: () => Promise<void>;
  tapSuccessCue: FirstRescueContent['tapStep']['successCue'];
}>;

function useRescueCompletion({
  dragSuccessCue,
  effectService,
  onCelebrate,
  onCommitReward,
  tapSuccessCue,
}: RescueCompletionOptions) {
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
    },
  } as const;
}

function firstRescuePresentation(content: FirstRescueContent, locale: Locale) {
  return {
    dragPrompt: firstRescueText(content, locale, content.dragStep.promptKey),
    intro: firstRescueText(content, locale, content.mission.localization.introKey),
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
