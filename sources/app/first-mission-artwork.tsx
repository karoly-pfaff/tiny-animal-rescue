import { useEffect, useState } from 'react';

import { type FirstRescueContent, resolveFirstRescueAssets } from '../content/first-rescue-content';

export type MissionPhase = 'ladder' | 'mimi' | 'saving';

type FirstMissionArtworkProps = Readonly<{
  content: FirstRescueContent;
  helpMimiLabel: string;
  hintDelayMs: number;
  onFinish: () => void;
  phase: MissionPhase;
}>;

export function FirstMissionArtwork({
  content,
  helpMimiLabel,
  hintDelayMs,
  onFinish,
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
  return (
    <MissionKittenAction
      hasProductionArt={hasProductionArt}
      helpMimiLabel={helpMimiLabel}
      mimiUrl={mimiUrl}
      onFinish={onFinish}
      phase={phase}
      showGuidance={showGuidance}
      stepId={stepId}
      successCue={successCue}
      targetIds={targetIds}
    />
  );
}

type MissionKittenActionProps = Omit<MissionKittenProps, 'hintDelayMs'> &
  Readonly<{ hasProductionArt: boolean; showGuidance: boolean }>;

function MissionKittenAction({
  hasProductionArt,
  helpMimiLabel,
  mimiUrl,
  onFinish,
  phase,
  showGuidance,
  stepId,
  successCue,
  targetIds,
}: MissionKittenActionProps) {
  return (
    <button
      aria-label={helpMimiLabel}
      className={`mission-kitten mission-kitten-action${hasProductionArt ? ' mission-kitten-production' : ''}${showGuidance ? ' is-guidance' : ''}${phase === 'saving' ? ' is-rescuing' : ''}`}
      data-guidance={showGuidance}
      data-step-id={stepId}
      data-success-cue={successCue}
      data-target-ids={targetIds.join(' ')}
      disabled={phase === 'saving'}
      onClick={onFinish}
      onPointerUp={(event) => {
        finishOnTouch(event, onFinish);
      }}
      type="button"
    >
      <KittenImage mimiUrl={mimiUrl} />
    </button>
  );
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

function finishOnTouch(
  event: Readonly<{ isPrimary: boolean; pointerType: string }>,
  onFinish: () => void,
): void {
  if (event.isPrimary && event.pointerType === 'touch') {
    onFinish();
  }
}
