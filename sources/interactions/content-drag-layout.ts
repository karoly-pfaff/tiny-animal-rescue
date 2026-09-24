import type { DragStep } from '../content/mission-contract';
import type { NormalizedPoint, NormalizedTarget } from './drag-geometry';

const authoredSnapToleranceBaseline = 0.55;

export function contentDragStart(step: DragStep): NormalizedPoint {
  return step.sourcePosition;
}

export function contentDragTarget(step: DragStep, assetUrl: string | null): NormalizedTarget {
  const target = assetUrl === null ? step.fallbackTargetBounds : step.targetBounds;
  const toleranceScale = step.snapTolerance / authoredSnapToleranceBaseline;
  return {
    ...target,
    height: target.height * toleranceScale,
    width: target.width * toleranceScale,
  };
}
