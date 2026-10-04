import { useEffect, useRef, useState } from 'react';

import type { EffectService } from '../audio/effect-service';
import type { FirstRescueContent } from '../content/first-rescue-content';

const rescueMotionDurationMs = 650;
type PersistenceOperation = 0 | 1 | 2;
const idleOperation = 0 satisfies PersistenceOperation;
const checkpointOperation = 1 satisfies PersistenceOperation;
const rewardOperation = 2 satisfies PersistenceOperation;

type RescueCompletionOptions = Readonly<{
  effectService: EffectService;
  onCommitReward: () => Promise<void>;
  tapSuccessCue: FirstRescueContent['tapStep']['successCue'];
}>;

export function useRescueCompletion({
  effectService,
  onCommitReward,
  tapSuccessCue,
}: RescueCompletionOptions) {
  const [operation, setOperation] = useState<PersistenceOperation>(idleOperation);
  const [saveFailed, setSaveFailed] = useState(false);
  const completionStarted = useRef(false);
  const lifecycle = useRef<RescueLifecycle>({ active: true, cancelMotion: null });

  useEffect(() => {
    const currentLifecycle = lifecycle.current;
    currentLifecycle.active = true;
    return () => {
      currentLifecycle.active = false;
      currentLifecycle.cancelMotion?.();
    };
  }, []);

  async function finishRescue(onComplete: () => void): Promise<void> {
    try {
      await Promise.all([onCommitReward(), waitForRescueMotion(lifecycle.current)]);
      if (lifecycle.current.active) {
        onComplete();
      }
    } catch {
      if (lifecycle.current.active) {
        completionStarted.current = false;
        setOperation(idleOperation);
        setSaveFailed(true);
      }
    }
  }

  function finish(onComplete: () => void): void {
    if (operation !== idleOperation || completionStarted.current) {
      return;
    }
    completionStarted.current = true;
    effectService.play(tapSuccessCue);
    setSaveFailed(false);
    setOperation(rewardOperation);
    void finishRescue(onComplete);
  }

  async function persistCheckpoint(
    commit: () => Promise<void>,
    onComplete: () => void,
    onFailure: () => void,
  ): Promise<void> {
    try {
      await commit();
      if (lifecycle.current.active) {
        onComplete();
        completionStarted.current = false;
        setOperation(idleOperation);
      }
    } catch {
      restoreCheckpointAfterFailure(lifecycle.current.active, onFailure, () => {
        completionStarted.current = false;
        setOperation(idleOperation);
        setSaveFailed(true);
      });
    }
  }

  function checkpoint(
    commit: () => Promise<void>,
    onComplete: () => void,
    onFailure: () => void,
  ): void {
    if (operation !== idleOperation || completionStarted.current) {
      return;
    }
    completionStarted.current = true;
    setSaveFailed(false);
    setOperation(checkpointOperation);
    void persistCheckpoint(commit, onComplete, onFailure);
  }

  return {
    checkpoint,
    finish,
    finishing: operation === rewardOperation,
    saveFailed,
    saving: operation !== idleOperation,
  } as const;
}

interface RescueLifecycle {
  active: boolean;
  cancelMotion: (() => void) | null;
}

function restoreCheckpointAfterFailure(
  active: boolean,
  onFailure: () => void,
  restore: () => void,
): void {
  if (!active) {
    return;
  }
  onFailure();
  restore();
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
