import { useEffect, useRef, useState } from 'react';

import type { EffectService } from '../audio/effect-service';
import type { FirstRescueContent } from '../content/first-rescue-content';

const rescueMotionDurationMs = 650;

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
  const [saving, setSaving] = useState(false);
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
        setSaving(false);
        setSaveFailed(true);
      }
    }
  }

  function finish(onComplete: () => void): void {
    if (saving || completionStarted.current) {
      return;
    }
    completionStarted.current = true;
    effectService.play(tapSuccessCue);
    setSaveFailed(false);
    setSaving(true);
    void finishRescue(onComplete);
  }

  return { finish, saveFailed, saving } as const;
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
