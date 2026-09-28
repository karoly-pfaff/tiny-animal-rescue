import type { PointerEvent as ReactPointerEvent } from 'react';

import type { NormalizedPoint } from './drag-geometry';

export type PointerSample = Readonly<{
  aspectRatio: number;
  point: NormalizedPoint;
}>;

export function sampleTracePointer(event: ReactPointerEvent<HTMLButtonElement>): PointerSample {
  const bounds = event.currentTarget.getBoundingClientRect();
  if (bounds.width <= 0 || bounds.height <= 0) {
    return { aspectRatio: 1, point: { x: 0, y: 0 } };
  }
  return {
    aspectRatio: bounds.width / bounds.height,
    point: {
      x: (event.clientX - bounds.left) / bounds.width,
      y: (event.clientY - bounds.top) / bounds.height,
    },
  };
}
