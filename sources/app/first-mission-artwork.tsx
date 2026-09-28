import { type FirstRescueContent, resolveFirstRescueAssets } from '../content/first-rescue-content';
import type { GuidancePresentation } from '../engine/guidance-ladder-state';
import { TapRemove, type TapRemoveTarget } from '../interactions/tap-remove';

export type MissionPhase = 'ladder' | 'mimi' | 'saving';

type FirstMissionArtworkProps = Readonly<{
  content: FirstRescueContent;
  guidance: GuidancePresentation;
  helpMimiLabel: string;
  onFinish: () => void;
  onGuidanceActivity: () => void;
  onGuidanceWrongAction: () => void;
  paused?: boolean;
  phase: MissionPhase;
}>;

export function FirstMissionArtwork({
  content,
  guidance,
  helpMimiLabel,
  onFinish,
  onGuidanceActivity,
  onGuidanceWrongAction,
  paused = false,
  phase,
}: FirstMissionArtworkProps) {
  const assets = resolveFirstRescueAssets(content);
  const backgroundUrl = assets.missionBackground;
  const mimiUrl = assets.missionAnimal;
  return (
    <>
      {backgroundUrl === null ? null : (
        <img className="scene-background" src={backgroundUrl} alt="" aria-hidden="true" />
      )}
      <div className={backgroundUrl === null ? 'mission-tree' : 'mission-production-layer'}>
        <FallbackTree visible={backgroundUrl === null} />
        <MissionKitten
          guidance={guidance}
          helpMimiLabel={helpMimiLabel}
          mimiUrl={mimiUrl}
          onFinish={onFinish}
          onGuidanceActivity={onGuidanceActivity}
          onGuidanceWrongAction={onGuidanceWrongAction}
          paused={paused}
          phase={phase}
          stepId={content.tapStep.id}
          successCue={content.tapStep.successCue}
          targetIds={content.tapStep.targetIds}
        />
      </div>
    </>
  );
}

function FallbackTree({ visible }: Readonly<{ visible: boolean }>) {
  if (!visible) {
    return null;
  }
  return (
    <>
      <span className="mission-tree-crown" aria-hidden="true" />
      <span className="mission-tree-trunk" aria-hidden="true" />
    </>
  );
}

type MissionKittenProps = Omit<FirstMissionArtworkProps, 'content'> &
  Readonly<{
    mimiUrl: string | null;
    stepId: string;
    successCue: string;
    targetIds: readonly string[];
  }>;

function MissionKitten({
  guidance,
  helpMimiLabel,
  mimiUrl,
  onFinish,
  onGuidanceActivity,
  onGuidanceWrongAction,
  paused = false,
  phase,
  stepId,
  successCue,
  targetIds,
}: MissionKittenProps) {
  const hasProductionArt = mimiUrl !== null;
  if (phase === 'ladder') {
    return (
      <span
        className={`mission-kitten${hasProductionArt ? ' mission-kitten-production' : ''}`}
        data-step-id={stepId}
        data-guidance="false"
        data-success-cue={successCue}
        data-target-ids={targetIds.join(' ')}
        aria-hidden="true"
      >
        <KittenImage mimiUrl={mimiUrl} />
      </span>
    );
  }
  if (phase === 'saving') {
    return <MissionKittenRescue hasProductionArt={hasProductionArt} mimiUrl={mimiUrl} />;
  }
  return (
    <MissionKittenAction
      guidance={guidance}
      hasProductionArt={hasProductionArt}
      helpMimiLabel={helpMimiLabel}
      mimiUrl={mimiUrl}
      onFinish={onFinish}
      onGuidanceActivity={onGuidanceActivity}
      onGuidanceWrongAction={onGuidanceWrongAction}
      paused={paused}
      stepId={stepId}
      successCue={successCue}
      targetIds={targetIds}
    />
  );
}

type MissionKittenActionProps = Readonly<{
  guidance: GuidancePresentation;
  hasProductionArt: boolean;
  helpMimiLabel: string;
  mimiUrl: string | null;
  onFinish: () => void;
  onGuidanceActivity: () => void;
  onGuidanceWrongAction: () => void;
  paused: boolean;
  stepId: string;
  successCue: string;
  targetIds: readonly string[];
}>;

function MissionKittenAction({
  guidance,
  hasProductionArt,
  helpMimiLabel,
  mimiUrl,
  onFinish,
  onGuidanceActivity,
  onGuidanceWrongAction,
  paused,
  stepId,
  successCue,
  targetIds,
}: MissionKittenActionProps) {
  const target = createKittenTapTarget({
    accessibleLabel: helpMimiLabel,
    hasProductionArt,
    mimiUrl,
    stepId,
    successCue,
    targetId: requiredTapTargetId(targetIds),
    targetIds,
  });
  return (
    <TapRemove
      guidance={guidance}
      onComplete={onFinish}
      onGuidanceActivity={onGuidanceActivity}
      onGuidanceWrongAction={onGuidanceWrongAction}
      paused={paused}
      targets={[target]}
    />
  );
}

function MissionKittenRescue({
  hasProductionArt,
  mimiUrl,
}: Readonly<{ hasProductionArt: boolean; mimiUrl: string | null }>) {
  return (
    <span
      aria-hidden="true"
      className={`mission-kitten mission-kitten-rescue${hasProductionArt ? ' mission-kitten-production' : ''}`}
      data-phase="saving"
    >
      <KittenImage mimiUrl={mimiUrl} />
    </span>
  );
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
      <span
        className={`mission-kitten-tap-visual${options.hasProductionArt ? ' mission-kitten-production' : ''}`}
      >
        <KittenImage mimiUrl={options.mimiUrl} />
      </span>
    ),
    visualScale: 0.72,
    width: options.hasProductionArt ? 0.3 : 0.24,
  };
}

function requiredTapTargetId(targetIds: readonly string[]): string {
  const targetId = targetIds[0];
  if (targetId === undefined) {
    throw new Error('The initial Rescue tap step requires at least one target.');
  }
  return targetId;
}

function KittenImage({ mimiUrl }: Readonly<{ mimiUrl: string | null }>) {
  if (mimiUrl === null) {
    return null;
  }
  return <img src={mimiUrl} alt="" aria-hidden="true" />;
}
