import {
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  useEffect,
  useRef,
  useState,
} from 'react';

import { capturePointer, isPrimaryActivationPointer, releasePointer } from './pointer-capture';

type HoldToActivate = Readonly<{
  activateAccessibly: (event: ReactMouseEvent<HTMLButtonElement>) => void;
  begin: (event: ReactPointerEvent<HTMLButtonElement>) => void;
  cancelPointer: (event: ReactPointerEvent<HTMLButtonElement>) => void;
  holding: boolean;
}>;

export function useHoldToActivate(durationMs: number, onActivate: () => void): HoldToActivate {
  const [holding, setHolding] = useState(false);
  const activePointerId = useRef<number | null>(null);
  const timer = useRef<number | null>(null);

  function cancel(): void {
    if (timer.current !== null) {
      window.clearTimeout(timer.current);
      timer.current = null;
    }
    activePointerId.current = null;
    setHolding(false);
  }

  function begin(event: ReactPointerEvent<HTMLButtonElement>): void {
    if (!isPrimaryActivationPointer(event) || activePointerId.current !== null) {
      return;
    }
    activePointerId.current = event.pointerId;
    capturePointer(event.currentTarget, event.pointerId);
    setHolding(true);
    timer.current = window.setTimeout(() => {
      timer.current = null;
      setHolding(false);
      onActivate();
    }, durationMs);
  }

  function cancelPointer(event: ReactPointerEvent<HTMLButtonElement>): void {
    if (activePointerId.current !== event.pointerId) {
      return;
    }
    releasePointer(event.currentTarget, event.pointerId);
    cancel();
  }

  function activateAccessibly(event: ReactMouseEvent<HTMLButtonElement>): void {
    event.preventDefault();
    if (event.detail !== 0) {
      return;
    }
    cancel();
    onActivate();
  }

  useEffect(() => cancel, []);
  return { activateAccessibly, begin, cancelPointer, holding };
}
