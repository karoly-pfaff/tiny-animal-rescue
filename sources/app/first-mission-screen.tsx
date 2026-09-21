import {
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  useEffect,
  useRef,
  useState,
} from 'react';

import type { Locale } from '../i18n/localization';
import { getStrings } from '../i18n/localization';

const exitHoldDurationMs = 650;

type FirstMissionScreenProps = Readonly<{
  locale: Locale;
  onExit: () => void;
}>;

export function FirstMissionScreen({ locale, onExit }: FirstMissionScreenProps) {
  const [holdingExit, setHoldingExit] = useState(false);
  const activePointerId = useRef<number | null>(null);
  const exitTimer = useRef<number | null>(null);
  const strings = getStrings(locale);

  function cancelExit(): void {
    if (exitTimer.current !== null) {
      window.clearTimeout(exitTimer.current);
      exitTimer.current = null;
    }
    activePointerId.current = null;
    setHoldingExit(false);
  }

  function beginExit(event: ReactPointerEvent<HTMLButtonElement>): void {
    if (!canBeginExit(event, activePointerId.current)) {
      return;
    }
    activePointerId.current = event.pointerId;
    capturePointer(event.currentTarget, event.pointerId);
    setHoldingExit(true);
    exitTimer.current = window.setTimeout(() => {
      exitTimer.current = null;
      setHoldingExit(false);
      onExit();
    }, exitHoldDurationMs);
  }

  function cancelPointerExit(event: ReactPointerEvent<HTMLButtonElement>): void {
    if (activePointerId.current !== event.pointerId) {
      return;
    }
    releasePointer(event.currentTarget, event.pointerId);
    cancelExit();
  }

  function activateAccessibleExit(event: ReactMouseEvent<HTMLButtonElement>): void {
    event.preventDefault();
    if (event.detail === 0) {
      cancelExit();
      onExit();
    }
  }

  useEffect(() => cancelExit, []);

  return (
    <main className="game-shell" data-route="mission" data-mission-id="garden-kitten-tree">
      <section className="game-surface first-mission" aria-labelledby="mission-title">
        <div className="mission-tree" aria-hidden="true">
          <span className="mission-tree-crown" />
          <span className="mission-tree-trunk" />
          <span className="mission-kitten" />
        </div>
        <header className="mission-title-plaque">
          <h1 id="mission-title">{strings.firstMissionTitle}</h1>
        </header>
        <button
          className={`mission-back${holdingExit ? ' is-holding' : ''}`}
          type="button"
          onClick={activateAccessibleExit}
          onContextMenu={(event) => {
            event.preventDefault();
          }}
          onPointerCancel={cancelPointerExit}
          onPointerDown={beginExit}
          onPointerLeave={cancelPointerExit}
          onPointerUp={cancelPointerExit}
        >
          <span className="mission-back-icon" aria-hidden="true" />
          <span>{strings.holdToMap}</span>
        </button>
      </section>
    </main>
  );
}

function canBeginExit(
  event: ReactPointerEvent<HTMLButtonElement>,
  activePointer: number | null,
): boolean {
  const isSecondaryMouse = event.pointerType === 'mouse' && event.button !== 0;
  return event.isPrimary && !isSecondaryMouse && activePointer === null;
}

type PointerCaptureTarget = Partial<
  Pick<Element, 'hasPointerCapture' | 'releasePointerCapture' | 'setPointerCapture'>
>;

function capturePointer(target: EventTarget, pointerId: number): void {
  const captureTarget = target as PointerCaptureTarget;
  captureTarget.setPointerCapture?.(pointerId);
}

function releasePointer(target: EventTarget, pointerId: number): void {
  const captureTarget = target as PointerCaptureTarget;
  if (captureTarget.hasPointerCapture?.(pointerId)) {
    captureTarget.releasePointerCapture?.(pointerId);
  }
}
