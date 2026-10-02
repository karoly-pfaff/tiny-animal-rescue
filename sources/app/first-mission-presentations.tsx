import { type FirstRescueContent, resolveFirstRescueAssets } from '../content/first-rescue-content';
import type { MissionStepPresentationBindings } from '../engine/mission-step-renderer';
import { LadderArt } from '../interactions/ladder-art';
import type { TapRemoveTarget } from '../interactions/tap-remove';
import { MissionKittenTapVisual } from './first-mission-artwork';

type MissionStepType = FirstRescueContent['mission']['steps'][number]['type'];
export const dragStepType = 'drag' satisfies MissionStepType;
export const tapStepType = 'tap' satisfies MissionStepType;

type FirstMissionPresentationOptions = Readonly<{
  content: FirstRescueContent;
  ladderUrl: string | null;
  missionCopy: Readonly<{ dragPrompt: string; tapPrompt: string }>;
  placedAnnouncement: string;
}>;

export function firstMissionPresentations({
  content,
  ladderUrl,
  missionCopy,
  placedAnnouncement,
}: FirstMissionPresentationOptions): MissionStepPresentationBindings {
  const mimiUrl = resolveFirstRescueAssets(content).missionAnimal;
  return {
    [content.dragStep.id]: {
      accessibleLabel: missionCopy.dragPrompt,
      completionAnnouncement: placedAnnouncement,
      hideTargetWhenPlaced: ladderUrl !== null,
      sourceAssetUrl: ladderUrl,
      sourceClassName: 'mission-ladder',
      sourceVisual: <LadderArt assetUrl={ladderUrl} />,
      type: dragStepType,
    },
    [content.tapStep.id]: {
      targets: [
        createKittenTapTarget({
          accessibleLabel: missionCopy.tapPrompt,
          hasProductionArt: mimiUrl !== null,
          mimiUrl,
          stepId: content.tapStep.id,
          successCue: content.tapStep.successCue,
          targetId: requiredTapTargetId(content.tapStep.targetIds),
          targetIds: content.tapStep.targetIds,
        }),
      ],
      type: tapStepType,
    },
  };
}

function requiredTapTargetId(targetIds: readonly string[]): string {
  const targetId = targetIds[0];
  if (targetId === undefined) {
    throw new Error('The initial Rescue tap step requires at least one target.');
  }
  return targetId;
}

function createKittenTapTarget(
  options: Readonly<{
    accessibleLabel: string;
    hasProductionArt: boolean;
    mimiUrl: string | null;
    stepId: string;
    successCue: string;
    targetId: string;
    targetIds: readonly string[];
  }>,
): TapRemoveTarget {
  return {
    accessibleLabel: options.accessibleLabel,
    center: options.hasProductionArt ? { x: 0.735, y: 0.22 } : { x: 0.65, y: 0.47 },
    dataAttributes: {
      'data-step-id': options.stepId,
      'data-success-cue': options.successCue,
      'data-target-ids': options.targetIds.join(' '),
    },
    height: options.hasProductionArt ? 0.38 : 0.28,
    id: options.targetId,
    visual: (
      <MissionKittenTapVisual
        hasProductionArt={options.hasProductionArt}
        mimiUrl={options.mimiUrl}
      />
    ),
    visualScale: 0.72,
    width: options.hasProductionArt ? 0.3 : 0.24,
  };
}
