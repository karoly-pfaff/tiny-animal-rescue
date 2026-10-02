import { describe, expect, it } from 'vitest';

import {
  advanceTraceProgress,
  beginTraceProgress,
  completeTraceProgress,
  createTraceProgress,
  tracePathAtProgress,
  tracePointAtProgress,
  type TracePath,
} from '../../sources/interactions/trace-progress';

const straightPath = [
  { x: 0.1, y: 0.5 },
  { x: 0.9, y: 0.5 },
] satisfies TracePath;

const curvedPath = [
  { x: 0.1, y: 0.75 },
  { x: 0.35, y: 0.35 },
  { x: 0.65, y: 0.65 },
  { x: 0.9, y: 0.2 },
] satisfies TracePath;

function begin(path: TracePath = straightPath) {
  return beginTraceProgress({
    aspectRatio: 4 / 3,
    corridorWidth: 0.2,
    path,
    point: path[0] ?? { x: 0, y: 0 },
    state: createTraceProgress(),
  }).state;
}

describe('trace progress', () => {
  it('starts only at the current route marker and supports reacquisition', () => {
    const initial = createTraceProgress();
    const rejected = beginTraceProgress({
      aspectRatio: 1,
      corridorWidth: 0.2,
      path: straightPath,
      point: { x: 0.5, y: 0.1 },
      state: initial,
    });
    const accepted = beginTraceProgress({
      aspectRatio: 1,
      corridorWidth: 0.2,
      path: straightPath,
      point: { x: 0.1, y: 0.54 },
      state: initial,
    });
    const resumed = beginTraceProgress({
      aspectRatio: 1,
      corridorWidth: 0.2,
      path: straightPath,
      point: { x: 0.1, y: 0.5 },
      state: accepted.state,
    });

    expect(rejected).toEqual({ accepted: false, state: initial });
    expect(accepted).toEqual({
      accepted: true,
      state: { hasStarted: true, isComplete: false, progress: 0 },
    });
    expect(resumed).toEqual({ accepted: true, state: accepted.state });
  });

  it('preserves partial progress through deviations and completes after re-entry', () => {
    const started = begin();
    const partial = advanceTraceProgress({
      aspectRatio: 1,
      corridorWidth: 0.2,
      from: { x: 0.1, y: 0.5 },
      path: straightPath,
      state: started,
      to: { x: 0.5, y: 0.5 },
    });
    const deviated = advanceTraceProgress({
      aspectRatio: 1,
      corridorWidth: 0.2,
      from: { x: 0.5, y: 0.1 },
      path: straightPath,
      state: partial,
      to: { x: 0.65, y: 0.1 },
    });
    const resumePoint = tracePointAtProgress(straightPath, partial.progress);
    const completed = advanceTraceProgress({
      aspectRatio: 1,
      corridorWidth: 0.2,
      from: resumePoint,
      path: straightPath,
      state: partial,
      to: { x: 0.9, y: 0.5 },
    });

    expect(partial.progress).toBeGreaterThan(0);
    expect(partial.progress).toBeLessThan(1);
    expect(deviated).toBe(partial);
    expect(completed).toEqual({ hasStarted: true, isComplete: true, progress: 1 });
  });

  it('does not skip a curved corridor by drawing directly from start to end', () => {
    const started = begin(curvedPath);
    const attemptedShortcut = advanceTraceProgress({
      aspectRatio: 1,
      corridorWidth: 0.12,
      from: curvedPath[0] ?? { x: 0, y: 0 },
      path: curvedPath,
      state: started,
      to: curvedPath[curvedPath.length - 1] ?? { x: 1, y: 1 },
    });

    expect(attemptedShortcut.isComplete).toBe(false);
    expect(attemptedShortcut.progress).toBeLessThan(0.4);
  });

  it('maps the same broad physical corridor in landscape and portrait coordinates', () => {
    const horizontal = advanceTraceProgress({
      aspectRatio: 2,
      corridorWidth: 0.2,
      from: { x: 0.1, y: 0.5 },
      path: straightPath,
      state: begin(),
      to: { x: 0.9, y: 0.5 },
    });
    const verticalPath = [
      { x: 0.5, y: 0.1 },
      { x: 0.5, y: 0.9 },
    ] satisfies TracePath;
    const vertical = advanceTraceProgress({
      aspectRatio: 0.5,
      corridorWidth: 0.2,
      from: { x: 0.5, y: 0.1 },
      path: verticalPath,
      state: begin(verticalPath),
      to: { x: 0.5, y: 0.9 },
    });

    expect(horizontal).toEqual({ hasStarted: true, isComplete: true, progress: 1 });
    expect(vertical).toEqual(horizontal);
  });

  it('returns stable route points and prefixes at every boundary', () => {
    expect(tracePointAtProgress(straightPath, 0)).toEqual({ x: 0.1, y: 0.5 });
    expect(tracePointAtProgress(straightPath, 0.5)).toEqual({ x: 0.5, y: 0.5 });
    expect(tracePointAtProgress(straightPath, 1)).toEqual({ x: 0.9, y: 0.5 });
    expect(tracePathAtProgress(curvedPath, 0)).toEqual([curvedPath[0], curvedPath[0]]);
    expect(tracePathAtProgress(curvedPath, 0.5)).toHaveLength(3);
    expect(tracePathAtProgress(curvedPath, 1)).toEqual(curvedPath);
  });

  it('validates configuration and authored route coordinates', () => {
    const options = {
      corridorWidth: 0.2,
      path: straightPath,
      point: { x: 0.1, y: 0.5 },
      state: createTraceProgress(),
    } as const;
    expect(() => beginTraceProgress({ ...options, aspectRatio: 0 })).toThrow('aspect ratio');
    expect(() => beginTraceProgress({ ...options, aspectRatio: Number.NaN })).toThrow(
      'aspect ratio',
    );
    expect(() => beginTraceProgress({ ...options, aspectRatio: 1, corridorWidth: 0 })).toThrow(
      'corridor width',
    );
    expect(() => beginTraceProgress({ ...options, aspectRatio: 1, corridorWidth: 1.1 })).toThrow(
      'corridor width',
    );
    expect(() =>
      beginTraceProgress({ ...options, aspectRatio: 1, corridorWidth: Number.NaN }),
    ).toThrow('corridor width');
    expect(() => tracePointAtProgress([], 0)).toThrow('at least two');
    expect(() => tracePointAtProgress([{ x: 0, y: 0 }], 0)).toThrow('at least two');
    const sparsePath: { x: number; y: number }[] = [];
    sparsePath.length = 2;
    expect(() => tracePointAtProgress(sparsePath, 0)).toThrow('defined points');
    expect(() =>
      tracePointAtProgress(
        [
          { x: 0, y: 0 },
          { x: 0, y: 0 },
        ],
        0,
      ),
    ).toThrow('distinct');
    expect(() =>
      tracePointAtProgress(
        [
          { x: -0.1, y: 0 },
          { x: 1, y: 1 },
        ],
        0,
      ),
    ).toThrow('normalized');
    expect(() =>
      tracePointAtProgress(
        [
          { x: 0, y: 0 },
          { x: Number.NaN, y: 1 },
        ],
        0,
      ),
    ).toThrow('normalized');
    expect(() =>
      tracePointAtProgress(
        [
          { x: 0, y: 0 },
          { x: 1.1, y: 1 },
        ],
        0,
      ),
    ).toThrow('normalized');
    expect(() =>
      tracePointAtProgress(
        [
          { x: 0, y: -0.1 },
          { x: 1, y: 1 },
        ],
        0,
      ),
    ).toThrow('normalized');
    expect(() =>
      tracePointAtProgress(
        [
          { x: 0, y: 0 },
          { x: 1, y: 1.1 },
        ],
        0,
      ),
    ).toThrow('normalized');
    expect(() => tracePointAtProgress(straightPath, -0.1)).toThrow('between zero and one');
    expect(() => tracePointAtProgress(straightPath, 1.1)).toThrow('between zero and one');
    expect(() => tracePathAtProgress(straightPath, Number.NaN)).toThrow('between zero and one');
  });

  it('keeps inactive and completed states idempotent', () => {
    const initial = createTraceProgress();
    const inactive = advanceTraceProgress({
      aspectRatio: 1,
      corridorWidth: 0.2,
      from: { x: 0.1, y: 0.5 },
      path: straightPath,
      state: initial,
      to: { x: 0.9, y: 0.5 },
    });
    const complete = completeTraceProgress(initial);
    const completedBegin = beginTraceProgress({
      aspectRatio: 1,
      corridorWidth: 0.2,
      path: straightPath,
      point: { x: 0.1, y: 0.5 },
      state: complete,
    });
    const completedAgain = completeTraceProgress(complete);
    const completedAdvance = advanceTraceProgress({
      aspectRatio: 1,
      corridorWidth: 0.2,
      from: { x: 0.1, y: 0.5 },
      path: straightPath,
      state: complete,
      to: { x: 0.9, y: 0.5 },
    });

    expect(inactive).toBe(initial);
    expect(completedBegin).toEqual({ accepted: false, state: complete });
    expect(completedAgain).toBe(complete);
    expect(completedAdvance).toBe(complete);
  });
});
