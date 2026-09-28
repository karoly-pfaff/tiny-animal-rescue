import type { NormalizedPoint } from './drag-geometry';

export type TraceSurfaceMetric = Readonly<{ xScale: number; yScale: number }>;

export function createTraceMetric(aspectRatio: number): TraceSurfaceMetric {
  if (!Number.isFinite(aspectRatio) || aspectRatio <= 0) {
    throw new Error('Trace surface aspect ratio must be finite and greater than zero.');
  }
  return aspectRatio >= 1
    ? { xScale: aspectRatio, yScale: 1 }
    : { xScale: 1, yScale: 1 / aspectRatio };
}

export function tracePointDistance(first: NormalizedPoint, second: NormalizedPoint): number {
  return Math.sqrt(squaredDistance(first, second));
}

export function squaredTraceMetricDistance(
  first: NormalizedPoint,
  second: NormalizedPoint,
  metric: TraceSurfaceMetric,
): number {
  return squaredDistance(toTraceMetricPoint(first, metric), toTraceMetricPoint(second, metric));
}

export function toTraceMetricPoint(
  point: NormalizedPoint,
  metric: TraceSurfaceMetric,
): NormalizedPoint {
  return { x: point.x * metric.xScale, y: point.y * metric.yScale };
}

export function squaredDistanceToTraceSegment(
  point: NormalizedPoint,
  from: NormalizedPoint,
  to: NormalizedPoint,
): number {
  const deltaX = to.x - from.x;
  const deltaY = to.y - from.y;
  const lengthSquared = deltaX * deltaX + deltaY * deltaY;
  const projection =
    lengthSquared === 0
      ? 0
      : ((point.x - from.x) * deltaX + (point.y - from.y) * deltaY) / lengthSquared;
  const amount = Math.min(1, Math.max(0, projection));
  return squaredDistance(point, { x: from.x + deltaX * amount, y: from.y + deltaY * amount });
}

function squaredDistance(first: NormalizedPoint, second: NormalizedPoint): number {
  const deltaX = first.x - second.x;
  const deltaY = first.y - second.y;
  return deltaX * deltaX + deltaY * deltaY;
}
