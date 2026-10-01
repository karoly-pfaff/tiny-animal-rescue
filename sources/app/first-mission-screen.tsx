import type { EffectService } from '../audio/effect-service';
import type { NarrationService } from '../audio/narration-service';
import {
  firstRescueText,
  type FirstRescueContent,
  resolveFirstRescueAssets,
} from '../content/first-rescue-content';
import { getStrings, type Locale } from '../i18n/localization';
import { useMissionStepOrchestrator } from '../engine/use-mission-step-orchestrator';
import { useHoldToActivate } from '../interactions/hold-to-activate';
import type { MissionPhase } from './first-mission-artwork';
import { FirstMissionView } from './first-mission-view';
import { useFirstMissionGuidance } from './use-first-mission-guidance';
import { useRescueCompletion } from './use-rescue-completion';

const exitHoldDurationMs = 650;
type MissionStepType = FirstRescueContent['mission']['steps'][number]['type'];
const dragStepType = 'drag' satisfies MissionStepType;
const tapStepType = 'tap' satisfies MissionStepType;

type FirstMissionScreenProps = Readonly<{
  content: FirstRescueContent;
  effectService: EffectService;
  locale: Locale;
  initialCompletedStepIds: readonly string[];
  onCelebrate: () => void;
  onCommitReward: () => Promise<void>;
  onCommitStep: (stepId: string) => Promise<void>;
  onExit: () => void;
  narrationService: NarrationService;
}>;

const ladderPhase = 'ladder' satisfies MissionPhase;
const mimiPhase = 'mimi' satisfies MissionPhase;
const savingPhase = 'saving' satisfies MissionPhase;

export function FirstMissionScreen({
  content,
  effectService,
  initialCompletedStepIds,
  locale,
  onCelebrate,
  onCommitReward,
  onCommitStep,
  onExit,
  narrationService,
}: FirstMissionScreenProps) {
  const missionSteps = useMemo(
    () => resumableMissionSteps(content.mission.steps, initialCompletedStepIds),
    [content.mission.steps, initialCompletedStepIds],
  );
  const missionCopy = firstRescuePresentation(content, locale);
  const strings = getStrings(locale),
    rescue = useRescueCompletion({
      effectService,
      onCommitReward,
      tapSuccessCue: content.tapStep.successCue,
    });
  const mission = useMissionStepOrchestrator(missionSteps, onCelebrate),
    activeInteraction = mission.active,
    phase = missionPhase(activeInteraction?.step.type, rescue.finishing);
  const guidance = useFirstMissionGuidance({
    content,
    locale,
    narrationService,
    phase,
  });
  const ladderUrl = resolveFirstRescueAssets(content).ladder;
  const exit = useHoldToActivate(exitHoldDurationMs, onExit);
  const completeInteraction = () => {
    if (activeInteraction === null) {
      return;
    }
    switch (activeInteraction.step.type) {
      case dragStepType:
        rescue.checkpoint(
          () => onCommitStep(activeInteraction.step.id),
          () => {
            guidance.complete();
            effectService.play(activeInteraction.step.successCue);
            activeInteraction.complete();
          },
          mission.reset,
        );
        return;
      case tapStepType:
        guidance.complete();
        rescue.finish(activeInteraction.complete);
        return;
      default:
        return assertNever(activeInteraction.step);
    }
  };

  return (
    <FirstMissionView
      activeInteraction={activeInteraction}
      completeInteraction={completeInteraction}
      content={content}
      exit={exit}
      guidance={guidance}
      ladderUrl={ladderUrl}
      locale={locale}
      missionCopy={missionCopy}
      phase={phase}
      rescue={rescue}
      strings={strings}
    />
  );
}

function resumableMissionSteps<Step extends Readonly<{ id: string }>>(
  steps: readonly Step[],
  completedStepIds: readonly string[],
): readonly Step[] {
  const firstIncompleteIndex = steps.findIndex((step) => !completedStepIds.includes(step.id));
  return firstIncompleteIndex <= 0 ? steps : steps.slice(firstIncompleteIndex);
}

function assertNever(value: never): never {
  throw new Error(`Unsupported initial Rescue step: ${JSON.stringify(value)}`);
}

function missionPhase(
  activeStepType: FirstRescueContent['mission']['steps'][number]['type'] | undefined,
  saving: boolean,
): MissionPhase {
  if (saving) {
    return savingPhase;
  }
  return activeStepType === 'tap' ? mimiPhase : ladderPhase;
}

function firstRescuePresentation(content: FirstRescueContent, locale: Locale) {
  return {
    dragPrompt: firstRescueText(content, locale, content.dragStep.promptKey),
    intro: firstRescueText(content, locale, content.mission.localization.introKey),
    tapPrompt: firstRescueText(content, locale, content.tapStep.promptKey),
  } as const;
}
import { useMemo } from 'react';
