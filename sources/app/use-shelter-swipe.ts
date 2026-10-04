import { useRef, type PointerEvent, type PointerEventHandler, type RefObject } from 'react';

const swipeThreshold = 48;

type ShelterSwipe = Readonly<{
  onPointerCancel: PointerEventHandler<HTMLElement>;
  onPointerDown: PointerEventHandler<HTMLElement>;
  onPointerUp: PointerEventHandler<HTMLElement>;
}>;

type SwipeStart = Readonly<{ pointerId: number; x: number }>;
type SwipeCallbacks = Readonly<{ onNext: () => void; onPrevious: () => void }>;
export function useShelterSwipe(onPrevious: () => void, onNext: () => void): ShelterSwipe {
  const start = useRef<SwipeStart | null>(null);
  const callbacks = { onNext, onPrevious };
  return {
    onPointerCancel: (event) => {
      releasePointer(event.currentTarget, event.pointerId);
      start.current = null;
    },
    onPointerDown: (event) => {
      if (canStartSwipe(event)) {
        start.current = { pointerId: event.pointerId, x: event.clientX };
        capturePointer(event.currentTarget, event.pointerId, event.nativeEvent.isTrusted);
      }
    },
    onPointerUp: (event) => {
      completeSwipe(event, start, callbacks);
    },
  };
}

function canStartSwipe(event: PointerEvent<HTMLElement>): boolean {
  const supportedButton = event.pointerType !== 'mouse' || event.button === 0;
  return event.target === event.currentTarget && event.isPrimary && supportedButton;
}

function completeSwipe(
  event: PointerEvent<HTMLElement>,
  start: RefObject<SwipeStart | null>,
  callbacks: SwipeCallbacks,
): void {
  const started = start.current;
  start.current = null;
  releasePointer(event.currentTarget, event.pointerId);
  if (started?.pointerId !== event.pointerId) {
    return;
  }
  const distance = event.clientX - started.x;
  if (Math.abs(distance) < swipeThreshold) {
    return;
  }
  navigateForDistance(distance, callbacks);
}

function navigateForDistance(distance: number, callbacks: SwipeCallbacks): void {
  if (distance < 0) {
    callbacks.onNext();
  } else {
    callbacks.onPrevious();
  }
}

function capturePointer(element: HTMLElement, pointerId: number, trusted: boolean): void {
  if (!trusted) {
    return;
  }
  if (typeof element.setPointerCapture === 'function') {
    element.setPointerCapture(pointerId);
  }
}

function releasePointer(element: HTMLElement, pointerId: number): void {
  if (
    typeof element.hasPointerCapture === 'function' &&
    typeof element.releasePointerCapture === 'function' &&
    element.hasPointerCapture(pointerId)
  ) {
    element.releasePointerCapture(pointerId);
  }
}
