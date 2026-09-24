import type { NormalizedPoint, NormalizedTarget } from '../interactions/drag-geometry';

export const ladderStart = { x: 0.2, y: 0.72 } as const satisfies NormalizedPoint;

const productionLadderTarget = {
  center: { x: 0.65, y: 0.61 },
  height: 0.42,
  width: 0.24,
} as const satisfies NormalizedTarget;

const fallbackLadderTarget = {
  ...productionLadderTarget,
  center: { x: 0.65, y: 0.68 },
} as const satisfies NormalizedTarget;

const authoredSnapToleranceBaseline = 0.55;

export function missionTarget(assetUrl: string | null, snapTolerance: number): NormalizedTarget {
  const target = assetUrl === null ? fallbackLadderTarget : productionLadderTarget;
  const toleranceScale = snapTolerance / authoredSnapToleranceBaseline;
  return {
    ...target,
    height: target.height * toleranceScale,
    width: target.width * toleranceScale,
  };
}
