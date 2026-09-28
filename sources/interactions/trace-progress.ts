import type { NormalizedPoint } from './drag-geometry';
import {
  createTraceMetric,
  squaredDistanceToTraceSegment,
  squaredTraceMetricDistance,
  toTraceMetricPoint,
  tracePointDistance,
} from './trace-geometry';

export type TracePath = readonly NormalizedPoint[];

export type TraceProgressState = Readonly<{
  hasStarted: boolean;
  isComplete: boolean;
  progress: number;
}>;

type TraceGeometryOptions = Readonly<{
  aspectRatio: number;
  corridorWidth: number;
  path: TracePath;
}>;

type BeginTraceOptions = TraceGeometryOptions &
  Readonly<{
    point: NormalizedPoint;
    state: TraceProgressState;
  }>;

type AdvanceTraceOptions = TraceGeometryOptions &
  Readonly<{
    from: NormalizedPoint;
    state: TraceProgressState;
    to: NormalizedPoint;
  }>;

export type BeginTraceResult = Readonly<{
  accepted: boolean;
  state: TraceProgressState;
}>;

type PathSegment = Readonly<{
  from: NormalizedPoint;
  length: number;
  startDistance: number;
  to: NormalizedPoint;
}>;
type PreparedPath = Readonly<{
  first: PathSegment;
  last: PathSegment;
  segments: readonly PathSegment[];
  totalLength: number;
}>;

const checkpointDivisor = 3;

export function createTraceProgress(): TraceProgressState {
  return { hasStarted: false, isComplete: false, progress: 0 };
}

export function beginTraceProgress(options: BeginTraceOptions): BeginTraceResult {
  const geometry = prepareGeometry(options);
  if (options.state.isComplete) {
    return { accepted: false, state: options.state };
  }
  const resumePoint = pointAtPreparedProgress(geometry.path, options.state.progress);
  const accepted =
    squaredTraceMetricDistance(resumePoint, options.point, geometry.metric) <=
    geometry.corridorRadius * geometry.corridorRadius;
  if (!accepted || options.state.hasStarted) {
    return { accepted, state: options.state };
  }
  return { accepted: true, state: { ...options.state, hasStarted: true } };
}

export function advanceTraceProgress(options: AdvanceTraceOptions): TraceProgressState {
  const geometry = prepareGeometry(options);
  if (!options.state.hasStarted || options.state.isComplete) {
    return options.state;
  }
  const nextProgress = findNextProgress(options, geometry);
  if (nextProgress === options.state.progress) {
    return options.state;
  }
  return progressedState(nextProgress);
}

export function completeTraceProgress(state: TraceProgressState): TraceProgressState {
  return state.isComplete ? state : { hasStarted: true, isComplete: true, progress: 1 };
}

export function tracePointAtProgress(path: TracePath, progress: number): NormalizedPoint {
  assertProgress(progress);
  return pointAtPreparedProgress(preparePath(path), progress);
}

export function tracePathAtProgress(path: TracePath, progress: number): readonly NormalizedPoint[] {
  assertProgress(progress);
  const prepared = preparePath(path);
  return collectPathToProgress(prepared, progress);
}

function collectPathToProgress(
  prepared: PreparedPath,
  progress: number,
): readonly NormalizedPoint[] {
  const targetDistance = prepared.totalLength * progress;
  const points: NormalizedPoint[] = [prepared.first.from];
  for (const segment of prepared.segments) {
    const segmentEnd = segment.startDistance + segment.length;
    if (targetDistance >= segmentEnd) {
      points.push(segment.to);
      continue;
    }
    points.push(pointAtPreparedProgress(prepared, progress));
    break;
  }
  return points;
}

function assertProgress(progress: number): void {
  if (!Number.isFinite(progress) || progress < 0 || progress > 1) {
    throw new Error('Trace progress must be finite and between zero and one.');
  }
}

function prepareGeometry(options: TraceGeometryOptions) {
  const metric = createTraceMetric(options.aspectRatio);
  assertCorridorWidth(options.corridorWidth);
  return {
    corridorRadius: options.corridorWidth / 2,
    metric,
    path: preparePath(options.path),
  } as const;
}

function preparePath(path: TracePath): PreparedPath {
  assertPathLength(path);
  const first = createPathSegment(path, 1, 0);
  return appendPathSegments(path, first);
}

function appendPathSegments(path: TracePath, first: PathSegment): PreparedPath {
  const segments: PathSegment[] = [first];
  let totalLength = first.length;
  let last = first;
  for (let index = 2; index < path.length; index += 1) {
    last = createPathSegment(path, index, totalLength);
    segments.push(last);
    totalLength += last.length;
  }
  return { first, last, segments, totalLength };
}

function createPathSegment(path: TracePath, index: number, startDistance: number): PathSegment {
  const from = requiredPathPoint(path, index - 1);
  const to = requiredPathPoint(path, index);
  const length = distinctSegmentLength(from, to);
  return { from, length, startDistance, to };
}

function assertPathLength(path: TracePath): void {
  if (path.length < 2) {
    throw new Error('Trace paths require at least two points.');
  }
}

function requiredPathPoint(path: TracePath, index: number): NormalizedPoint {
  const point = path[index];
  if (point === undefined) {
    throw new Error('Trace paths require defined points.');
  }
  assertUnitPoint(point);
  return point;
}

function distinctSegmentLength(from: NormalizedPoint, to: NormalizedPoint): number {
  const length = tracePointDistance(from, to);
  if (length === 0) {
    throw new Error('Trace path points must be distinct from their neighbors.');
  }
  return length;
}

function pointAtPreparedProgress(path: PreparedPath, progress: number): NormalizedPoint {
  const targetDistance = path.totalLength * progress;
  let segment = path.last;
  for (const candidate of [...path.segments].reverse()) {
    if (targetDistance <= candidate.startDistance + candidate.length) {
      segment = candidate;
    }
  }
  const amount = Math.min(
    1,
    Math.max(0, (targetDistance - segment.startDistance) / segment.length),
  );
  return {
    x: segment.from.x + (segment.to.x - segment.from.x) * amount,
    y: segment.from.y + (segment.to.y - segment.from.y) * amount,
  };
}

function isCheckpointReached(
  checkpoint: NormalizedPoint,
  options: AdvanceTraceOptions,
  geometry: ReturnType<typeof prepareGeometry>,
): boolean {
  const metricCheckpoint = toTraceMetricPoint(checkpoint, geometry.metric);
  return (
    squaredDistanceToTraceSegment(
      metricCheckpoint,
      toTraceMetricPoint(options.from, geometry.metric),
      toTraceMetricPoint(options.to, geometry.metric),
    ) <=
    geometry.corridorRadius * geometry.corridorRadius
  );
}

function findNextProgress(
  options: AdvanceTraceOptions,
  geometry: ReturnType<typeof prepareGeometry>,
): number {
  const progressStep =
    options.corridorWidth /
    Math.max(geometry.metric.xScale, geometry.metric.yScale) /
    geometry.path.totalLength /
    checkpointDivisor;
  let nextProgress = options.state.progress;
  while (nextProgress < 1) {
    const candidate = Math.min(1, nextProgress + progressStep);
    const checkpoint = pointAtPreparedProgress(geometry.path, candidate);
    if (!isCheckpointReached(checkpoint, options, geometry)) {
      break;
    }
    nextProgress = candidate;
  }
  return nextProgress;
}

function progressedState(progress: number): TraceProgressState {
  const isComplete = progress >= 1;
  return { hasStarted: true, isComplete, progress: isComplete ? 1 : progress };
}

function assertCorridorWidth(corridorWidth: number): void {
  if (!Number.isFinite(corridorWidth) || corridorWidth <= 0 || corridorWidth > 1) {
    throw new Error('Trace corridor width must be greater than zero and at most one.');
  }
}

function assertUnitPoint(point: NormalizedPoint): void {
  if (!isUnitCoordinate(point.x) || !isUnitCoordinate(point.y)) {
    throw new Error('Trace path points must be finite normalized coordinates.');
  }
}

function isUnitCoordinate(value: number): boolean {
  return Number.isFinite(value) && value >= 0 && value <= 1;
}
