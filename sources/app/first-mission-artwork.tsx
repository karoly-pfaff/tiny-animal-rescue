import type { ReactNode } from 'react';

import { type FirstRescueContent, resolveFirstRescueAssets } from '../content/first-rescue-content';

export type MissionPhase = 'ladder' | 'mimi' | 'saving';

type FirstMissionArtworkProps = Readonly<{
  content: FirstRescueContent;
  interaction: ReactNode;
  phase: MissionPhase;
}>;

export function FirstMissionArtwork({ content, interaction, phase }: FirstMissionArtworkProps) {
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
        {phase === 'ladder' ? (
          <MissionKitten
            mimiUrl={mimiUrl}
            stepId={content.tapStep.id}
            successCue={content.tapStep.successCue}
            targetIds={content.tapStep.targetIds}
          />
        ) : null}
        {phase === 'saving' ? (
          <MissionKittenRescue hasProductionArt={mimiUrl !== null} mimiUrl={mimiUrl} />
        ) : null}
        {interaction}
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

type MissionKittenProps = Readonly<{
  mimiUrl: string | null;
  stepId: string;
  successCue: string;
  targetIds: readonly string[];
}>;

function MissionKitten({ mimiUrl, stepId, successCue, targetIds }: MissionKittenProps) {
  const hasProductionArt = mimiUrl !== null;
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

export function MissionKittenTapVisual({
  hasProductionArt,
  mimiUrl,
}: Readonly<{ hasProductionArt: boolean; mimiUrl: string | null }>) {
  return (
    <span
      className={`mission-kitten-tap-visual${hasProductionArt ? ' mission-kitten-production' : ''}`}
    >
      <KittenImage mimiUrl={mimiUrl} />
    </span>
  );
}

function KittenImage({ mimiUrl }: Readonly<{ mimiUrl: string | null }>) {
  if (mimiUrl === null) {
    return null;
  }
  return <img src={mimiUrl} alt="" aria-hidden="true" />;
}
