import { useMemo } from 'react';

import type { NarrationService } from '../audio/narration-service';
import {
  firstRescueText,
  narrationCueForContentKey,
  type FirstRescueContent,
} from '../content/first-rescue-content';
import { createGuidanceLadderConfig } from '../engine/guidance-ladder-state';
import { useGuidanceLadder } from '../engine/use-guidance-ladder';
import type { Locale } from '../i18n/localization';
import type { MissionPhase } from './first-mission-artwork';

type FirstMissionGuidanceOptions = Readonly<{
  content: FirstRescueContent;
  locale: Locale;
  narrationService: NarrationService;
  phase: MissionPhase;
}>;

export function useFirstMissionGuidance({
  content,
  locale,
  narrationService,
  phase,
}: FirstMissionGuidanceOptions) {
  const isLadderPhase = phase === 'ladder';
  const hintDelayMs = isLadderPhase ? content.dragStep.hint.delayMs : content.tapStep.hint.delayMs;
  const promptKey = isLadderPhase ? content.dragStep.promptKey : content.tapStep.promptKey;
  const promptText = firstRescueText(content, locale, promptKey);
  const config = useMemo(
    () =>
      createGuidanceLadderConfig({
        demonstrationAfterMs: hintDelayMs,
        escalatedToleranceScale: 1.35,
        escalationAfterMs: hintDelayMs + 4_000,
        pulseAfterMs: hintDelayMs,
        wrongAttemptsBeforeEscalation: 2,
      }),
    [hintDelayMs],
  );
  const prompt = useMemo(
    () => ({
      cue: narrationCueForContentKey(promptKey),
      locale,
      text: promptText,
    }),
    [locale, promptKey, promptText],
  );
  return useGuidanceLadder({
    active: phase !== 'saving',
    config,
    narrationService,
    prompt,
  });
}
