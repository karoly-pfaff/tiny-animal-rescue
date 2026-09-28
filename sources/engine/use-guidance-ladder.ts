import { useCallback, useEffect, useRef, useState } from 'react';

import type { NarrationRequest, NarrationService } from '../audio/narration-service';
import {
  createGuidanceLadderController,
  type GuidanceClock,
  type GuidanceLadderController,
  type GuidanceVisibility,
} from './guidance-ladder-controller';
import {
  createGuidanceLadderState,
  guidancePresentation,
  type GuidanceLadderConfig,
  type GuidancePresentation,
} from './guidance-ladder-state';

type UseGuidanceLadderOptions = Readonly<{
  active: boolean;
  config: GuidanceLadderConfig;
  narrationService: NarrationService;
  prompt: NarrationRequest;
  reducedMotion?: boolean;
}>;

export type GuidanceLadderBinding = Readonly<{
  activity: () => void;
  complete: () => void;
  presentation: GuidancePresentation;
  replay: () => void;
  wrongAction: () => void;
}>;

export function useGuidanceLadder({
  active,
  config,
  narrationService,
  prompt,
  reducedMotion,
}: UseGuidanceLadderOptions): GuidanceLadderBinding {
  const usesReducedMotion = reducedMotion ?? prefersReducedMotion();
  const inactivePresentation = guidancePresentation(
    createGuidanceLadderState(),
    config,
    usesReducedMotion,
  );
  const [presentation, setPresentation] = useState(inactivePresentation);
  const controller = useRef<GuidanceLadderController | null>(null);

  useEffect(() => {
    if (!active) {
      controller.current = null;
      return undefined;
    }
    const nextController = createGuidanceLadderController({
      clock: browserGuidanceClock,
      config,
      narrationService,
      onPresentationChange: setPresentation,
      prompt,
      reducedMotion: usesReducedMotion,
      visibility: browserGuidanceVisibility,
    });
    controller.current = nextController;
    nextController.start();
    return () => {
      nextController.dispose();
      if (controller.current === nextController) {
        controller.current = null;
      }
    };
  }, [active, config, narrationService, prompt, usesReducedMotion]);

  return {
    activity: useCallback(() => controller.current?.activity(), []),
    complete: useCallback(() => controller.current?.complete(), []),
    presentation: active ? presentation : inactivePresentation,
    replay: useCallback(() => controller.current?.replay(), []),
    wrongAction: useCallback(() => controller.current?.wrongAction(), []),
  };
}

const browserGuidanceClock: GuidanceClock = {
  clearTimer: (timerId) => {
    window.clearTimeout(timerId);
  },
  now: () => performance.now(),
  setTimer: (callback, delayMs) => window.setTimeout(callback, delayMs),
};

const browserGuidanceVisibility: GuidanceVisibility = {
  isHidden: () => document.hidden,
  subscribe: (onChange) => {
    document.addEventListener('visibilitychange', onChange);
    return () => {
      document.removeEventListener('visibilitychange', onChange);
    };
  },
};

function prefersReducedMotion(): boolean {
  return (
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}
