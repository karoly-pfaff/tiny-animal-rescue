import { useEffect, useRef, useState } from 'react';

import {
  helpMimiNarrationCue,
  placeLadderNarrationCue,
  type NarrationService,
} from '../audio/narration-service';
import { getFirstRescueNarrationText } from '../content/first-rescue-narration';
import { resolveGardenMissionLadder } from '../content/first-rescue-assets';
import type { Locale } from '../i18n/localization';
import { getStrings } from '../i18n/localization';
import { DragToTarget } from '../interactions/drag-to-target';
import { useHoldToActivate } from '../interactions/hold-to-activate';
import { FirstMissionArtwork, type MissionPhase } from './first-mission-artwork';

const exitHoldDurationMs = 650;
const ladderStart = { x: 0.2, y: 0.72 } as const;
const productionLadderTarget = {
  center: { x: 0.65, y: 0.61 },
  height: 0.42,
  width: 0.24,
} as const;
const fallbackLadderTarget = {
  ...productionLadderTarget,
  center: { x: 0.65, y: 0.68 },
} as const;

type FirstMissionScreenProps = Readonly<{
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
  locale,
  onCelebrate,
  onCommitReward,
  onExit,
  narrationService,
}: FirstMissionScreenProps) {
  const strings = getStrings(locale),
    rescue = useRescueCompletion({
      helpMimiText: getFirstRescueNarrationText(helpMimiNarrationCue, locale),
      locale,
      narrationService,
      onCelebrate,
      onCommitReward,
    });
  const ladderUrl = resolveGardenMissionLadder();
  const exit = useHoldToActivate(exitHoldDurationMs, onExit);

  return (
    <main className="game-shell" data-route="mission" data-mission-id="garden-kitten-tree">
      <section className="game-surface first-mission" aria-labelledby="mission-title">
        <FirstMissionArtwork
          helpMimiLabel={strings.helpMimi}
          onFinish={rescue.finish}
          phase={rescue.phase}
        />
        <header className="mission-title-plaque">
          <h1 id="mission-title">{strings.firstMissionTitle}</h1>
        </header>
        <DragToTarget
          accessibleLabel={strings.ladderLabel}
          assetUrl={ladderUrl}
          completionAnnouncement={strings.ladderPlaced}
          onComplete={rescue.unlockMimi}
          start={ladderStart}
          target={ladderUrl === null ? fallbackLadderTarget : productionLadderTarget}
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

function useMissionEntryNarration(locale: Locale, narrationService: NarrationService): void {
  useEffect(() => {
    narrationService.speak({
      cue: placeLadderNarrationCue,
      locale,
      text: getFirstRescueNarrationText(placeLadderNarrationCue, locale),
    });
    return narrationService.stop;
  }, [locale, narrationService]);
}

type RescueCompletionOptions = Readonly<{
  helpMimiText: string;
  locale: Locale;
  narrationService: NarrationService;
  onCelebrate: () => void;
  onCommitReward: () => Promise<void>;
}>;

function useRescueCompletion({
  helpMimiText,
  locale,
  narrationService,
  onCelebrate,
  onCommitReward,
}: RescueCompletionOptions) {
  useMissionEntryNarration(locale, narrationService);
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
    setSaveFailed(false);
    setPhase(savingPhase);
    void finishRescue();
  }

  return {
    finish,
    phase,
    saveFailed,
    unlockMimi: () => {
      setPhase(mimiPhase);
      narrationService.speak({ cue: helpMimiNarrationCue, locale, text: helpMimiText });
    },
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
