import {
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  useEffect,
  useRef,
  useState,
} from 'react';

import {
  helpMimiNarrationCue,
  placeLadderNarrationCue,
  type NarrationService,
} from '../audio/narration-service';
import { getFirstRescueNarrationText } from '../content/first-rescue-narration';
import type { Locale } from '../i18n/localization';
import { getStrings } from '../i18n/localization';
import { DragToTarget } from '../interactions/drag-to-target';
import {
  capturePointer,
  isPrimaryActivationPointer,
  releasePointer,
} from '../interactions/pointer-capture';

const exitHoldDurationMs = 650;
const ladderStart = { x: 0.2, y: 0.72 } as const;
const ladderTarget = {
  center: { x: 0.65, y: 0.68 },
  height: 0.42,
  width: 0.24,
} as const;

type FirstMissionScreenProps = Readonly<{
  locale: Locale;
  onCelebrate: () => void;
  onCommitReward: () => Promise<void>;
  onExit: () => void;
  narrationService: NarrationService;
}>;

type MissionPhase = 'ladder' | 'mimi' | 'saving';

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
  const [holdingExit, setHoldingExit] = useState(false);
  const activePointerId = useRef<number | null>(null);
  const exitTimer = useRef<number | null>(null);
  const strings = getStrings(locale),
    rescue = useRescueCompletion({
      helpMimiText: getFirstRescueNarrationText(helpMimiNarrationCue, locale),
      locale,
      narrationService,
      onCelebrate,
      onCommitReward,
    });

  function cancelExit(): void {
    if (exitTimer.current !== null) {
      window.clearTimeout(exitTimer.current);
      exitTimer.current = null;
    }
    activePointerId.current = null;
    setHoldingExit(false);
  }

  function beginExit(event: ReactPointerEvent<HTMLButtonElement>): void {
    if (!canBeginExit(event, activePointerId.current)) {
      return;
    }
    activePointerId.current = event.pointerId;
    capturePointer(event.currentTarget, event.pointerId);
    setHoldingExit(true);
    exitTimer.current = window.setTimeout(() => {
      exitTimer.current = null;
      setHoldingExit(false);
      onExit();
    }, exitHoldDurationMs);
  }

  function cancelPointerExit(event: ReactPointerEvent<HTMLButtonElement>): void {
    if (activePointerId.current !== event.pointerId) {
      return;
    }
    releasePointer(event.currentTarget, event.pointerId);
    cancelExit();
  }

  function activateAccessibleExit(event: ReactMouseEvent<HTMLButtonElement>): void {
    event.preventDefault();
    if (event.detail === 0) {
      cancelExit();
      onExit();
    }
  }

  useEffect(() => cancelExit, []);

  return (
    <main className="game-shell" data-route="mission" data-mission-id="garden-kitten-tree">
      <section className="game-surface first-mission" aria-labelledby="mission-title">
        <div className="mission-tree">
          <span className="mission-tree-crown" aria-hidden="true" />
          <span className="mission-tree-trunk" aria-hidden="true" />
          {rescue.phase === ladderPhase ? (
            <span className="mission-kitten" aria-hidden="true" />
          ) : (
            <button
              aria-label={strings.helpMimi}
              className={`mission-kitten mission-kitten-action${rescue.phase === savingPhase ? ' is-rescuing' : ''}`}
              disabled={rescue.phase === savingPhase}
              onClick={rescue.finish}
              onPointerUp={(event) => {
                if (event.isPrimary && event.pointerType === 'touch') {
                  rescue.finish();
                }
              }}
              type="button"
            />
          )}
        </div>
        <header className="mission-title-plaque">
          <h1 id="mission-title">{strings.firstMissionTitle}</h1>
        </header>
        <DragToTarget
          accessibleLabel={strings.ladderLabel}
          completionAnnouncement={strings.ladderPlaced}
          onComplete={rescue.unlockMimi}
          start={ladderStart}
          target={ladderTarget}
        />
        <button
          className={`mission-back${holdingExit ? ' is-holding' : ''}`}
          disabled={rescue.phase === savingPhase}
          type="button"
          onClick={activateAccessibleExit}
          onContextMenu={(event) => {
            event.preventDefault();
          }}
          onPointerCancel={cancelPointerExit}
          onPointerDown={beginExit}
          onPointerLeave={cancelPointerExit}
          onPointerUp={cancelPointerExit}
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

function canBeginExit(
  event: ReactPointerEvent<HTMLButtonElement>,
  activePointer: number | null,
): boolean {
  return isPrimaryActivationPointer(event) && activePointer === null;
}
