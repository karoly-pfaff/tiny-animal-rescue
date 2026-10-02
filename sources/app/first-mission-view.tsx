import type { ReactNode } from 'react';

import { firstRescueText, type FirstRescueContent } from '../content/first-rescue-content';
import { MissionStepRenderer } from '../engine/mission-step-renderer';
import type { ActiveMissionInteraction } from '../engine/use-mission-step-orchestrator';
import type { getStrings, Locale } from '../i18n/localization';
import { contentDragTarget } from '../interactions/content-drag-layout';
import { createItemStyle, createTargetStyle } from '../interactions/drag-to-target-styles';
import type { useHoldToActivate } from '../interactions/hold-to-activate';
import { LadderArt } from '../interactions/ladder-art';
import { FirstMissionArtwork, type MissionPhase } from './first-mission-artwork';
import {
  dragStepType,
  firstMissionPresentations,
  tapStepType,
} from './first-mission-presentations';
import type { useFirstMissionGuidance } from './use-first-mission-guidance';
import type { useRescueCompletion } from './use-rescue-completion';

type FirstMissionViewProps = Readonly<{
  activeInteraction: ActiveMissionInteraction<
    FirstRescueContent['mission']['steps'][number]
  > | null;
  content: FirstRescueContent;
  exit: ReturnType<typeof useHoldToActivate>;
  completeInteraction: () => void;
  guidance: ReturnType<typeof useFirstMissionGuidance>;
  ladderUrl: string | null;
  locale: Locale;
  missionCopy: Readonly<{ dragPrompt: string; intro: string; tapPrompt: string }>;
  phase: MissionPhase;
  rescue: ReturnType<typeof useRescueCompletion>;
  strings: ReturnType<typeof getStrings>;
}>;

export function FirstMissionView({
  activeInteraction,
  content,
  exit,
  completeInteraction,
  guidance,
  ladderUrl,
  locale,
  missionCopy,
  phase,
  rescue,
  strings,
}: FirstMissionViewProps) {
  const presentations = firstMissionPresentations({
    content,
    ladderUrl,
    missionCopy,
    placedAnnouncement: strings.ladderPlaced,
  });
  const interaction = activeMissionInteraction({
    activeInteraction,
    completeInteraction,
    guidance,
    phase,
    presentations,
  });
  return (
    <main className="game-shell" data-route="mission" data-mission-id={content.mission.id}>
      <section
        className="game-surface first-mission"
        aria-disabled={missionIsPaused(activeInteraction)}
        aria-describedby="mission-intro"
        aria-labelledby="mission-title"
        data-active-step-id={activeMissionStepId(activeInteraction)}
        inert={missionIsPaused(activeInteraction)}
      >
        <FirstMissionArtwork
          content={content}
          interaction={interactionForType(activeInteraction, tapStepType, interaction)}
          phase={phase}
        />
        <header className="mission-title-plaque">
          <h1 id="mission-title">
            {firstRescueText(content, locale, content.mission.localization.titleKey)}
          </h1>
        </header>
        <p className="visually-hidden" id="mission-intro">
          {missionCopy.intro}
        </p>
        <VisiblePlacedMissionLadder ladderUrl={ladderUrl} phase={phase} step={content.dragStep} />
        {interactionForType(activeInteraction, dragStepType, interaction)}
        <button
          aria-label={strings.repeatPrompt}
          className="mission-repeat"
          disabled={rescue.saving}
          onClick={guidance.replay}
          type="button"
        >
          <span className="mission-repeat-icon" aria-hidden="true" />
          <span>{strings.repeatPrompt}</span>
        </button>
        <button
          className="mission-back"
          data-holding={exit.holding}
          disabled={rescue.saving}
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
        <MissionSaveError message={saveErrorMessage(rescue.saveFailed, strings.rewardSaveError)} />
      </section>
    </main>
  );
}

type ActiveMissionInteractionOptions = Readonly<{
  activeInteraction: FirstMissionViewProps['activeInteraction'];
  completeInteraction: FirstMissionViewProps['completeInteraction'];
  guidance: FirstMissionViewProps['guidance'];
  phase: MissionPhase;
  presentations: Parameters<typeof MissionStepRenderer>[0]['presentations'];
}>;

function activeMissionInteraction({
  activeInteraction,
  completeInteraction,
  guidance,
  phase,
  presentations,
}: ActiveMissionInteractionOptions): ReactNode {
  if (activeInteraction === null || phase === 'saving') {
    return null;
  }
  return (
    <MissionStepRenderer
      active={activeInteraction}
      guidance={guidance.presentation}
      key={`${activeInteraction.step.id}:${String(activeInteraction.revision)}`}
      onComplete={completeInteraction}
      onGuidanceActivity={guidance.activity}
      onGuidanceWrongAction={guidance.wrongAction}
      presentations={presentations}
    />
  );
}

function interactionForType(
  activeInteraction: FirstMissionViewProps['activeInteraction'],
  type: FirstRescueContent['mission']['steps'][number]['type'],
  interaction: ReactNode,
): ReactNode {
  return activeInteraction?.step.type === type ? interaction : null;
}

function VisiblePlacedMissionLadder({
  ladderUrl,
  phase,
  step,
}: Readonly<{
  ladderUrl: string | null;
  phase: MissionPhase;
  step: FirstRescueContent['dragStep'];
}>) {
  return phase === 'ladder' ? null : <PlacedMissionLadder ladderUrl={ladderUrl} step={step} />;
}

function PlacedMissionLadder({
  ladderUrl,
  step,
}: Readonly<{ ladderUrl: string | null; step: FirstRescueContent['dragStep'] }>) {
  const target = contentDragTarget(step, ladderUrl);
  return (
    <div
      aria-hidden="true"
      className="drag-interaction is-complete"
      data-guidance="false"
      data-hide-target-when-placed={ladderUrl !== null}
      data-interactive="false"
      data-phase="placed"
      data-success-cue={step.successCue}
    >
      <span
        className="ladder-target"
        data-target-id={step.targetId}
        style={createTargetStyle(target)}
      />
      <span
        className="drag-source mission-ladder"
        data-phase="placed"
        data-source-id={step.sourceId}
        style={createItemStyle(target.center)}
      >
        <LadderArt assetUrl={ladderUrl} />
      </span>
    </div>
  );
}

function MissionSaveError({ message }: Readonly<{ message: string | null }>) {
  return message === null ? null : (
    <p className="mission-save-error" role="alert">
      {message}
    </p>
  );
}

function missionIsPaused(active: FirstMissionViewProps['activeInteraction']): boolean {
  return active?.paused ?? false;
}

function activeMissionStepId(
  active: FirstMissionViewProps['activeInteraction'],
): string | undefined {
  return active?.step.id;
}

function saveErrorMessage(saveFailed: boolean, message: string): string | null {
  return saveFailed ? message : null;
}
