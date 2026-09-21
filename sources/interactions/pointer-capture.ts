type PointerCaptureTarget = Partial<
  Pick<Element, 'hasPointerCapture' | 'releasePointerCapture' | 'setPointerCapture'>
>;

type ActivationPointer = Readonly<{
  button: number;
  isPrimary: boolean;
  pointerType: string;
}>;

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
