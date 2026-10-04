import { useEffect, useRef, useState, type CSSProperties } from 'react';

import type { NarrationService } from '../audio/narration-service';
import type { ShelterReactionId } from '../content/world-content-contracts';
import type { Locale } from '../i18n/localization';

const reactionDurationMs = 900;

type ShelterResidentProps = Readonly<{
  happyAssetUrl: string | null;
  happyText: string;
  id: string;
  idleAssetUrl: string | null;
  locale: Locale;
  name: string;
  narrationService: NarrationService;
  reactions: readonly ShelterReactionId[];
  shelterSlot: number;
  tapLabel: string;
}>;

export function ShelterResident(props: ShelterResidentProps) {
  const [reaction, setReaction] = useState<ShelterReactionId | null>(null);
  const reactionCursor = useRef(0);
  const reactionTimer = useRef<number | null>(null);

  function react(): void {
    if (reactionTimer.current !== null) {
      window.clearTimeout(reactionTimer.current);
    }
    const nextReaction = requiredReaction(props.reactions, reactionCursor.current);
    reactionCursor.current = (reactionCursor.current + 1) % props.reactions.length;
    setReaction(nextReaction);
    props.narrationService.speak({
      cue: `voice.resident.${props.id}.name`,
      locale: props.locale,
      text: props.name,
    });
    reactionTimer.current = window.setTimeout(() => {
      reactionTimer.current = null;
      setReaction(null);
    }, reactionDurationMs);
  }

  useEffect(() => {
    return () => {
      if (reactionTimer.current !== null) {
        window.clearTimeout(reactionTimer.current);
      }
    };
  }, []);

  const assetUrl = activeAssetUrl(props, reaction);

  return (
    <>
      <button
        aria-label={props.tapLabel}
        className="shelter-resident"
        data-reaction={reaction}
        data-shelter-slot={props.shelterSlot}
        onClick={react}
        style={residentGridPosition(props.shelterSlot)}
        type="button"
      >
        <ResidentArtwork assetUrl={assetUrl} />
        <span>{props.name}</span>
      </button>
      <p className="visually-hidden" aria-live="polite">
        {activeReactionText(reaction, props.happyText)}
      </p>
    </>
  );
}

function ResidentArtwork({ assetUrl }: Readonly<{ assetUrl: string | null }>) {
  return assetUrl === null ? (
    <span className="shelter-resident-face" aria-hidden="true" />
  ) : (
    <img className="shelter-resident-art" src={assetUrl} alt="" aria-hidden="true" />
  );
}

function activeReactionText(reaction: ShelterReactionId | null, happyText: string): string {
  return reaction === null ? '' : happyText;
}

function activeAssetUrl(
  props: Pick<ShelterResidentProps, 'happyAssetUrl' | 'idleAssetUrl'>,
  reaction: ShelterReactionId | null,
): string | null {
  return reaction === null ? props.idleAssetUrl : props.happyAssetUrl;
}

function requiredReaction(
  reactions: readonly ShelterReactionId[],
  index: number,
): ShelterReactionId {
  const reaction = reactions[index];
  if (reaction === undefined) {
    throw new Error('A shelter resident requires at least one allowed reaction.');
  }
  return reaction;
}

function residentGridPosition(shelterSlot: number): CSSProperties {
  return {
    gridColumn: ((shelterSlot - 1) % 2) + 1,
    gridRow: Math.floor((shelterSlot - 1) / 2) + 1,
  };
}
