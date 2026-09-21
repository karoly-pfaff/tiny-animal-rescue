export type NormalizedPoint = Readonly<{ x: number; y: number }>;

export type NormalizedTarget = Readonly<{
  center: NormalizedPoint;
  height: number;
  width: number;
}>;

type SurfaceBounds = Readonly<{
  height: number;
  left: number;
  top: number;
  width: number;
}>;

export function clientPointToNormalized(
  clientPoint: NormalizedPoint,
  bounds: SurfaceBounds,
  pointerOffsetPx: number,
): NormalizedPoint {
  if (bounds.width <= 0 || bounds.height <= 0) {
    return { x: 0, y: 0 };
  }
  return {
    x: clampUnit((clientPoint.x - bounds.left) / bounds.width),
    y: clampUnit((clientPoint.y - bounds.top - pointerOffsetPx) / bounds.height),
  };
}

export function isInsideTarget(point: NormalizedPoint, target: NormalizedTarget): boolean {
  const halfWidth = target.width / 2;
  const halfHeight = target.height / 2;
  const edgeTolerance = 1e-9;
  return (
    point.x >= target.center.x - halfWidth - edgeTolerance &&
    point.x <= target.center.x + halfWidth + edgeTolerance &&
    point.y >= target.center.y - halfHeight - edgeTolerance &&
    point.y <= target.center.y + halfHeight + edgeTolerance
  );
}

export function toPercent(value: number): string {
  return `${String(value * 100)}%`;
}

function clampUnit(value: number): number {
  return Math.min(1, Math.max(0, value));
}
