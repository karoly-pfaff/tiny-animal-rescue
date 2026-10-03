import { describe, expect, it } from 'vitest';

import { median, optionalPercentile95, percentile95 } from '../e2e/support/trace-performance';

describe('trace performance evidence statistics', () => {
  it('uses the middle fixed measurement for an odd sample set', () => {
    expect(median([50.1, 33.4, 49.9])).toBe(49.9);
  });

  it('averages the middle pair for an even sample set', () => {
    expect(median([4, 1, 2, 3])).toBe(2.5);
  });

  it('keeps the nearest-rank p95 contract', () => {
    expect(percentile95(Array.from({ length: 20 }, (_, index) => index + 1))).toBe(19);
  });

  it('rejects empty evidence', () => {
    expect(() => median([])).toThrow('A median requires at least one sample.');
    expect(() => percentile95([])).toThrow('Performance evidence requires at least one sample.');
  });

  it('represents missing report evidence without throwing', () => {
    expect(optionalPercentile95([])).toBeNull();
    expect(optionalPercentile95([17, 34, 50])).toBe(50);
  });
});
