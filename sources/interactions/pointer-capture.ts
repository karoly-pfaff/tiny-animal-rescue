type PointerCaptureTarget = Partial<
  Pick<Element, 'hasPointerCapture' | 'releasePointerCapture' | 'setPointerCapture'>
>;

type ActivationPointer = Readonly<{
  button: number;
  isPrimary: boolean;
  pointerType: string;
}>;

export type CapturedPointer = Readonly<{
  pointerId: number;
  target: EventTarget;
}>;

export interface CapturedPointerState<T extends CapturedPointer = CapturedPointer> {
  current: T | null;
}

export function isPrimaryActivationPointer(event: ActivationPointer): boolean {
  const isSecondaryMouse = event.pointerType === 'mouse' && event.button !== 0;
  return event.isPrimary && !isSecondaryMouse;
}

export function capturePointer(target: EventTarget, pointerId: number): void {
  const captureTarget = target as PointerCaptureTarget;
  captureTarget.setPointerCapture?.(pointerId);
}

export function releasePointer(target: EventTarget, pointerId: number): void {
  const captureTarget = target as PointerCaptureTarget;
  if (captureTarget.hasPointerCapture?.(pointerId)) {
    captureTarget.releasePointerCapture?.(pointerId);
  }
}

export function releaseActivePointer(state: CapturedPointerState): void {
  const active = state.current;
  state.current = null;
  if (active !== null) {
    releasePointer(active.target, active.pointerId);
  }
}
