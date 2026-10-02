import { describe, expect, it } from 'vitest';

import {
  applyWipeStroke,
  completeWipeProgress,
  createWipeProgress,
  isWipeComplete,
  wipeCoverage,
} from '../../sources/interactions/wipe-progress';

describe('wipe progress', () => {
  it('validates grid, brush, and completion configuration', () => {
    expect(() => createWipeProgress(0, 4)).toThrow('positive integer');
    expect(() => createWipeProgress(2.5, 4)).toThrow('positive integer');
    expect(() => createWipeProgress(4, 0)).toThrow('positive integer');
    const state = createWipeProgress(4, 4);

    expect(() =>
      applyWipeStroke({
        aspectRatio: 1,
        brushRadius: 0,
        from: { x: 0, y: 0 },
        state,
        to: { x: 1, y: 1 },
      }),
    ).toThrow('greater than zero');
    expect(() =>
      applyWipeStroke({
        aspectRatio: 1,
        brushRadius: 1.1,
        from: { x: 0, y: 0 },
        state,
        to: { x: 1, y: 1 },
      }),
    ).toThrow('greater than zero');
    expect(() =>
      applyWipeStroke({
        aspectRatio: 1,
        brushRadius: Number.NaN,
        from: { x: 0, y: 0 },
        state,
        to: { x: 1, y: 1 },
      }),
    ).toThrow('greater than zero');
    expect(() =>
      applyWipeStroke({
        aspectRatio: 0,
        brushRadius: 0.1,
        from: { x: 0, y: 0 },
        state,
        to: { x: 1, y: 1 },
      }),
    ).toThrow('aspect ratio');
    expect(() =>
      applyWipeStroke({
        aspectRatio: Number.NaN,
        brushRadius: 0.1,
        from: { x: 0, y: 0 },
        state,
        to: { x: 1, y: 1 },
      }),
    ).toThrow('aspect ratio');
    expect(() => isWipeComplete(state, 0)).toThrow('greater than zero');
    expect(() => isWipeComplete(state, 1.1)).toThrow('greater than zero');
    expect(() => isWipeComplete(state, Number.NaN)).toThrow('greater than zero');
  });

  it('tracks broad deterministic strokes without double-counting cells', () => {
    const initial = createWipeProgress(20, 20);
    const narrow = applyWipeStroke({
      aspectRatio: 1,
      brushRadius: 0.04,
      from: { x: 0.1, y: 0.5 },
      state: initial,
      to: { x: 0.9, y: 0.5 },
    });
    const broad = applyWipeStroke({
      aspectRatio: 1,
      brushRadius: 0.12,
      from: { x: 0.1, y: 0.5 },
      state: initial,
      to: { x: 0.9, y: 0.5 },
    });
    const repeated = applyWipeStroke({
      aspectRatio: 1,
      brushRadius: 0.12,
      from: { x: 0.1, y: 0.5 },
      state: broad,
      to: { x: 0.9, y: 0.5 },
    });

    expect(wipeCoverage(initial)).toBe(0);
    expect(wipeCoverage(broad)).toBeGreaterThan(wipeCoverage(narrow));
    expect(repeated).toBe(broad);
    expect(repeated.coveredCount).toBe(broad.coveredCount);
  });

  it('clamps edge input and handles a stationary stroke', () => {
    const initial = createWipeProgress(8, 8);
    const wiped = applyWipeStroke({
      aspectRatio: 1,
      brushRadius: 0.2,
      from: { x: -2, y: 3 },
      state: initial,
      to: { x: -2, y: 3 },
    });

    expect(wiped.coveredCount).toBeGreaterThan(0);
    expect(wiped.coveredCount).toBeLessThan(wiped.covered.length);
  });

  it('uses the configured threshold and can complete the entire mask', () => {
    const initial = createWipeProgress(2, 2);
    const partial = applyWipeStroke({
      aspectRatio: 1,
      brushRadius: 0.1,
      from: { x: 0.25, y: 0.25 },
      state: initial,
      to: { x: 0.25, y: 0.25 },
    });
    const complete = completeWipeProgress(partial);

    expect(isWipeComplete(partial, 0.25)).toBe(true);
    expect(isWipeComplete(partial, 0.5)).toBe(false);
    expect(wipeCoverage(complete)).toBe(1);
    expect(isWipeComplete(complete, 1)).toBe(true);
  });

  it('matches physical brush coverage across landscape and portrait surfaces', () => {
    const landscape = applyWipeStroke({
      aspectRatio: 2,
      brushRadius: 0.1,
      from: { x: 0.2, y: 0.5 },
      state: createWipeProgress(40, 20),
      to: { x: 0.8, y: 0.5 },
    });
    const portrait = applyWipeStroke({
      aspectRatio: 0.5,
      brushRadius: 0.1,
      from: { x: 0.5, y: 0.2 },
      state: createWipeProgress(20, 40),
      to: { x: 0.5, y: 0.8 },
    });

    expect(wipeCoverage(landscape)).toBe(wipeCoverage(portrait));
  });
});
