import { resolveGardenMissionBackground, resolveMimiMission } from '../content/first-rescue-assets';

export type MissionPhase = 'ladder' | 'mimi' | 'saving';

type FirstMissionArtworkProps = Readonly<{
  helpMimiLabel: string;
  onFinish: () => void;
  phase: MissionPhase;
}>;

export function FirstMissionArtwork({ helpMimiLabel, onFinish, phase }: FirstMissionArtworkProps) {
  const backgroundUrl = resolveGardenMissionBackground();
  const mimiUrl = resolveMimiMission();
  return (
    <>
      {backgroundUrl === null ? null : (
        <img className="scene-background" src={backgroundUrl} alt="" aria-hidden="true" />
      )}
      <div className={backgroundUrl === null ? 'mission-tree' : 'mission-production-layer'}>
        <FallbackTree visible={backgroundUrl === null} />
        <MissionKitten
          helpMimiLabel={helpMimiLabel}
          mimiUrl={mimiUrl}
          onFinish={onFinish}
          phase={phase}
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

type MissionKittenProps = FirstMissionArtworkProps & Readonly<{ mimiUrl: string | null }>;

function MissionKitten({ helpMimiLabel, mimiUrl, onFinish, phase }: MissionKittenProps) {
  const hasProductionArt = mimiUrl !== null;
  if (phase === 'ladder') {
    return (
      <span
        className={`mission-kitten${hasProductionArt ? ' mission-kitten-production' : ''}`}
        aria-hidden="true"
      >
        <KittenImage mimiUrl={mimiUrl} />
      </span>
    );
  }
  return (
    <button
      aria-label={helpMimiLabel}
      className={`mission-kitten mission-kitten-action${hasProductionArt ? ' mission-kitten-production' : ''}${phase === 'saving' ? ' is-rescuing' : ''}`}
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
