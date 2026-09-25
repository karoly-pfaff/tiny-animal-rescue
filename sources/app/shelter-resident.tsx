import { useEffect, useRef, useState } from 'react';

const reactionDurationMs = 900;

type ShelterResidentProps = Readonly<{
  assetUrl: string | null;
  happyText: string;
  name: string;
  tapLabel: string;
}>;

export function ShelterResident({ assetUrl, happyText, name, tapLabel }: ShelterResidentProps) {
  const [happy, setHappy] = useState(false);
  const reactionTimer = useRef<number | null>(null);

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
        {assetUrl === null ? (
          <span className="shelter-mimi-face" aria-hidden="true" />
        ) : (
          <img className="shelter-mimi-art" src={assetUrl} alt="" aria-hidden="true" />
        )}
        <span>{name}</span>
      </button>
      <p className="visually-hidden" aria-live="polite">
        {happy ? happyText : ''}
      </p>
    </>
  );
}
