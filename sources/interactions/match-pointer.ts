import {
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
  useEffect,
  useRef,
} from 'react';

import {
  capturePointer,
  type CapturedPointer,
  isPrimaryActivationPointer,
  releaseActivePointer,
} from './pointer-capture';

type ActiveMatchPointer = CapturedPointer & Readonly<{ itemKey: string }>;
export type MatchPointer = RefObject<ActiveMatchPointer | null>;

export function useMatchPointer(paused: boolean): MatchPointer {
  const activePointer = useRef<ActiveMatchPointer | null>(null);
  useEffect(() => {
    if (paused) {
      suspendMatchPointer(activePointer);
    }
  }, [paused]);
  return activePointer;
}

export function beginMatchPointer(
  event: ReactPointerEvent<HTMLButtonElement>,
  activePointer: MatchPointer,
  itemKey: string,
): void {
  if (activePointer.current !== null || !isPrimaryActivationPointer(event)) {
    return;
  }
  event.preventDefault();
  activePointer.current = {
    itemKey,
    pointerId: event.pointerId,
    target: event.currentTarget,
  };
  capturePointer(event.currentTarget, event.pointerId);
}

type FinishMatchPointerOptions = Readonly<{
  activePointer: MatchPointer;
  event: ReactPointerEvent<HTMLButtonElement>;
  itemKey: string;
  onAttempt: () => void;
}>;

export function finishMatchPointer({
  activePointer,
  event,
  itemKey,
  onAttempt,
}: FinishMatchPointerOptions): void {
  const active = activePointer.current;
  if (active?.pointerId !== event.pointerId || active.itemKey !== itemKey) {
    return;
  }
  const releasedInside = isReleaseInside(event);
  event.preventDefault();
  releaseActivePointer(activePointer);
  if (releasedInside) {
    onAttempt();
  }
}

export function cancelMatchPointer(
  event: ReactPointerEvent<HTMLButtonElement>,
  activePointer: MatchPointer,
): void {
  if (activePointer.current?.pointerId !== event.pointerId) {
    return;
  }
  releaseActivePointer(activePointer);
}

function suspendMatchPointer(activePointer: MatchPointer): void {
  releaseActivePointer(activePointer);
}

export function activateMatchAccessibly(
  event: ReactMouseEvent<HTMLButtonElement>,
  onAttempt: () => void,
): void {
  if (event.detail === 0) {
    onAttempt();
  }
}

function isReleaseInside(event: ReactPointerEvent<HTMLButtonElement>): boolean {
  const bounds = event.currentTarget.getBoundingClientRect();
  return (
    event.clientX >= bounds.left &&
    event.clientX <= bounds.right &&
    event.clientY >= bounds.top &&
    event.clientY <= bounds.bottom
  );
}
