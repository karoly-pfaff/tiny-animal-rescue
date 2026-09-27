import { useEffect, useState } from 'react';

import { type FirstRescueContent, resolveFirstRescueAssets } from '../content/first-rescue-content';
import { TapRemove, type TapRemoveTarget } from '../interactions/tap-remove';

export type MissionPhase = 'ladder' | 'mimi' | 'saving';

type FirstMissionArtworkProps = Readonly<{
  content: FirstRescueContent;
  helpMimiLabel: string;
  hintDelayMs: number;
  onFinish: () => void;
  paused?: boolean;
  phase: MissionPhase;
}>;

export function FirstMissionArtwork({
  content,
  helpMimiLabel,
  hintDelayMs,
  onFinish,
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
          helpMimiLabel={helpMimiLabel}
          hintDelayMs={hintDelayMs}
          key={`${phase}:${String(hintDelayMs)}`}
          mimiUrl={mimiUrl}
          onFinish={onFinish}
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
    hintDelayMs: number;
    stepId: string;
    successCue: string;
    targetIds: readonly string[];
  }>;

function MissionKitten({
  helpMimiLabel,
  hintDelayMs,
  mimiUrl,
  onFinish,
  paused = false,
  phase,
  stepId,
  successCue,
  targetIds,
}: MissionKittenProps) {
  const hasProductionArt = mimiUrl !== null;
  const showGuidance = useTapGuidance(phase, hintDelayMs);
  if (phase === 'ladder') {
    return (
      <span
        className={`mission-kitten${hasProductionArt ? ' mission-kitten-production' : ''}`}
        data-step-id={stepId}
        data-guidance={showGuidance}
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
      hasProductionArt={hasProductionArt}
      helpMimiLabel={helpMimiLabel}
      mimiUrl={mimiUrl}
      onFinish={onFinish}
      showGuidance={showGuidance}
      paused={paused}
      stepId={stepId}
      successCue={successCue}
      targetIds={targetIds}
    />
  );
}

type MissionKittenActionProps = Readonly<{
  hasProductionArt: boolean;
  helpMimiLabel: string;
  mimiUrl: string | null;
  onFinish: () => void;
  showGuidance: boolean;
  paused: boolean;
  stepId: string;
  successCue: string;
  targetIds: readonly string[];
}>;

function MissionKittenAction({
  hasProductionArt,
  helpMimiLabel,
  mimiUrl,
  onFinish,
  showGuidance,
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
      isGuidanceActive={showGuidance}
      onComplete={onFinish}
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

function useTapGuidance(phase: MissionPhase, hintDelayMs: number): boolean {
  const [showGuidance, setShowGuidance] = useState(false);
  useEffect(() => {
    if (phase !== 'mimi') {
      return undefined;
    }
    const timer = window.setTimeout(() => {
      setShowGuidance(true);
    }, hintDelayMs);
    return () => {
      window.clearTimeout(timer);
    };
  }, [hintDelayMs, phase]);
  return showGuidance;
}

function KittenImage({ mimiUrl }: Readonly<{ mimiUrl: string | null }>) {
  if (mimiUrl === null) {
    return null;
  }
  return <img src={mimiUrl} alt="" aria-hidden="true" />;
}
