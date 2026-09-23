import { useEffect, useRef, useState } from 'react';

import { resolveMimiShelter } from '../content/first-rescue-assets';

const reactionDurationMs = 900;

type ShelterResidentProps = Readonly<{
  happyText: string;
  name: string;
  tapLabel: string;
}>;

export function ShelterResident({ happyText, name, tapLabel }: ShelterResidentProps) {
  const [happy, setHappy] = useState(false);
  const reactionTimer = useRef<number | null>(null);
  const mimiUrl = resolveMimiShelter();

  function react(): void {
    if (reactionTimer.current !== null) {
      window.clearTimeout(reactionTimer.current);
    }
    setHappy(true);
    reactionTimer.current = window.setTimeout(() => {
      reactionTimer.current = null;
      setHappy(false);
    }, reactionDurationMs);
  }

  useEffect(() => {
    return () => {
      if (reactionTimer.current !== null) {
        window.clearTimeout(reactionTimer.current);
      }
    };
  }, []);

  return (
    <>
      <button
        aria-label={tapLabel}
        className={`shelter-mimi${happy ? ' is-happy' : ''}`}
        onClick={react}
        type="button"
      >
        {mimiUrl === null ? (
          <span className="shelter-mimi-face" aria-hidden="true" />
        ) : (
          <img className="shelter-mimi-art" src={mimiUrl} alt="" aria-hidden="true" />
        )}
        <span>{name}</span>
      </button>
      <p className="visually-hidden" aria-live="polite">
        {happy ? happyText : ''}
      </p>
    </>
  );
}
