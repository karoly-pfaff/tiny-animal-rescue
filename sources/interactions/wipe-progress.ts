import type { NormalizedPoint } from './drag-geometry';

export type WipeProgressState = Readonly<{
  columns: number;
  covered: Uint8Array;
  coveredCount: number;
  rows: number;
}>;

type WipeStrokeOptions = Readonly<{
  aspectRatio: number;
  brushRadius: number;
  from: NormalizedPoint;
  state: WipeProgressState;
  to: NormalizedPoint;
}>;

export function createWipeProgress(columns: number, rows: number): WipeProgressState {
  assertGridDimension(columns);
  assertGridDimension(rows);
  return { columns, covered: new Uint8Array(columns * rows), coveredCount: 0, rows };
}

export function applyWipeStroke({
  aspectRatio,
  brushRadius,
  from,
  state,
  to,
}: WipeStrokeOptions): WipeProgressState {
  const metric = createMetric(aspectRatio);
  assertBrushRadius(brushRadius);
  const start = clampPoint(from);
  const end = clampPoint(to);
  const nextCovered = state.covered.slice();
  const coveredCount = coverStrokeCells({ brushRadius, end, metric, nextCovered, start, state });
  return coveredCount === state.coveredCount
    ? state
    : { ...state, covered: nextCovered, coveredCount };
}

function assertBrushRadius(brushRadius: number): void {
  if (!Number.isFinite(brushRadius) || brushRadius <= 0 || brushRadius > 1) {
    throw new Error('Wipe brush radius must be greater than zero and at most one.');
  }
}

type CoverCellsOptions = Readonly<{
  brushRadius: number;
  end: NormalizedPoint;
  metric: SurfaceMetric;
  nextCovered: Uint8Array;
  start: NormalizedPoint;
  state: WipeProgressState;
}>;

type SurfaceMetric = Readonly<{ xScale: number; yScale: number }>;

function createMetric(aspectRatio: number): SurfaceMetric {
  if (!Number.isFinite(aspectRatio) || aspectRatio <= 0) {
    throw new Error('Wipe surface aspect ratio must be finite and greater than zero.');
  }
  return aspectRatio >= 1
    ? { xScale: aspectRatio, yScale: 1 }
    : { xScale: 1, yScale: 1 / aspectRatio };
}

function coverStrokeCells(options: CoverCellsOptions): number {
  const bounds = strokeGridBounds(options);
  let coveredCount = options.state.coveredCount;
  for (let row = bounds.minRow; row <= bounds.maxRow; row += 1) {
    coveredCount = coverStrokeRow({ bounds, coveredCount, options, row });
  }
  return coveredCount;
}

type CoverRowOptions = Readonly<{
  bounds: GridBounds;
  coveredCount: number;
  options: CoverCellsOptions;
  row: number;
}>;

function coverStrokeRow({ bounds, coveredCount, options, row }: CoverRowOptions): number {
  let nextCount = coveredCount;
  for (let column = bounds.minColumn; column <= bounds.maxColumn; column += 1) {
    nextCount += coverCell(options, column, row);
  }
  return nextCount;
}

function coverCell(options: CoverCellsOptions, column: number, row: number): number {
  const { nextCovered, state } = options;
  const index = row * state.columns + column;
  if (nextCovered[index] !== 0 || !isCellInsideStroke(options, column, row)) {
    return 0;
  }
  nextCovered[index] = 1;
  return 1;
}

function isCellInsideStroke(options: CoverCellsOptions, column: number, row: number): boolean {
  const { brushRadius, end, metric, start, state } = options;
  return (
    squaredDistanceToSegment(
      toMetricPoint(cellCenter(state, column, row), metric),
      toMetricPoint(start, metric),
      toMetricPoint(end, metric),
    ) <=
    brushRadius * brushRadius
  );
}

function toMetricPoint(point: NormalizedPoint, metric: SurfaceMetric): NormalizedPoint {
  return { x: point.x * metric.xScale, y: point.y * metric.yScale };
}

export function completeWipeProgress(state: WipeProgressState): WipeProgressState {
  const covered = new Uint8Array(state.covered.length);
  covered.fill(1);
  return { ...state, covered, coveredCount: covered.length };
}

export function wipeCoverage(state: WipeProgressState): number {
  return state.coveredCount / state.covered.length;
}

export function isWipeComplete(state: WipeProgressState, completionThreshold: number): boolean {
  if (
    !Number.isFinite(completionThreshold) ||
    completionThreshold <= 0 ||
    completionThreshold > 1
  ) {
    throw new Error('Wipe completion threshold must be greater than zero and at most one.');
  }
  return wipeCoverage(state) >= completionThreshold;
}

function assertGridDimension(value: number): void {
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error('Wipe grid dimensions must be positive integers.');
  }
}

function clampPoint(point: NormalizedPoint): NormalizedPoint {
  return { x: clampUnit(point.x), y: clampUnit(point.y) };
}

function clampUnit(value: number): number {
  return Math.min(1, Math.max(0, value));
}

type GridBounds = Readonly<{
  maxColumn: number;
  maxRow: number;
  minColumn: number;
  minRow: number;
}>;

function strokeGridBounds({
  brushRadius: radius,
  end: to,
  metric,
  start: from,
  state,
}: CoverCellsOptions): GridBounds {
  const xRadius = radius / metric.xScale;
  const yRadius = radius / metric.yScale;
  return {
    maxColumn: boundedCell(
      Math.ceil((Math.max(from.x, to.x) + xRadius) * state.columns),
      state.columns,
    ),
    maxRow: boundedCell(Math.ceil((Math.max(from.y, to.y) + yRadius) * state.rows), state.rows),
    minColumn: boundedCell(
      Math.floor((Math.min(from.x, to.x) - xRadius) * state.columns),
      state.columns,
    ),
    minRow: boundedCell(Math.floor((Math.min(from.y, to.y) - yRadius) * state.rows), state.rows),
  };
}

function boundedCell(value: number, cellCount: number): number {
  return Math.min(cellCount - 1, Math.max(0, value));
}

function cellCenter(state: WipeProgressState, column: number, row: number): NormalizedPoint {
  return { x: (column + 0.5) / state.columns, y: (row + 0.5) / state.rows };
}

function squaredDistanceToSegment(
  point: NormalizedPoint,
  from: NormalizedPoint,
  to: NormalizedPoint,
): number {
  const deltaX = to.x - from.x;
  const deltaY = to.y - from.y;
  const lengthSquared = deltaX * deltaX + deltaY * deltaY;
  if (lengthSquared === 0) {
    return squaredDistance(point, from);
  }
  const projection = ((point.x - from.x) * deltaX + (point.y - from.y) * deltaY) / lengthSquared;
  const amount = clampUnit(projection);
  return squaredDistance(point, { x: from.x + deltaX * amount, y: from.y + deltaY * amount });
}

function squaredDistance(first: NormalizedPoint, second: NormalizedPoint): number {
  const deltaX = first.x - second.x;
  const deltaY = first.y - second.y;
  return deltaX * deltaX + deltaY * deltaY;
}
