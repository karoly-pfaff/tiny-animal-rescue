import type { Locator, Page } from '@playwright/test';

import { tracePointAtProgress } from '../../sources/interactions/trace-progress';
import { fixtureTracePath } from './fixture-app/trace-fixture-path';
import { observeUnexpectedBrowserErrors } from './support/browser-errors';
import { interactionFixtureUrl } from './support/fixture-url';
import { expect, test } from './support/muted-test';
import { followPrimaryPointerPath, type ClientPoint } from './support/pointer';
import {
  measureTabletTracePerformance,
  median,
  optionalPercentile95,
  percentile95,
  traceTabletPerformanceBudget,
  type TracePerformanceEvidence,
} from './support/trace-performance';

type SurfaceBox = Readonly<{ height: number; width: number; x: number; y: number }>;

function toClientPoint(point: Readonly<{ x: number; y: number }>, box: SurfaceBox): ClientPoint {
  return { x: box.x + point.x * box.width, y: box.y + point.y * box.height };
}

function tracePoints(box: SurfaceBox, fromProgress: number, toProgress: number): ClientPoint[] {
  const intervalCount = Math.max(1, Math.ceil((toProgress - fromProgress) / 0.025));
  return Array.from({ length: intervalCount + 1 }, (_, index) => {
    const amount = fromProgress + ((toProgress - fromProgress) * index) / intervalCount;
    return toClientPoint(tracePointAtProgress(fixtureTracePath, amount), box);
  });
}

type TraceJourneyOptions = Readonly<{
  box: SurfaceBox;
  hasTouch: boolean;
  page: Page;
  surface: Locator;
}>;

async function runTraceJourney({
  box,
  hasTouch,
  page,
  surface,
}: TraceJourneyOptions): Promise<void> {
  await followPrimaryPointerPath({ hasTouch, page, points: tracePoints(box, 0, 0.43) });
  const partialProgress = Number(await surface.getAttribute('data-progress'));
  expect(partialProgress).toBeGreaterThan(0.25);
  expect(partialProgress).toBeLessThan(0.6);
  await followPrimaryPointerPath({
    hasTouch,
    page,
    points: [toClientPoint({ x: 0.52, y: 0.06 }, box), toClientPoint({ x: 0.76, y: 0.06 }, box)],
  });
  expect(Number(await surface.getAttribute('data-progress'))).toBe(partialProgress);
  await followPrimaryPointerPath({
    hasTouch,
    page,
    points: tracePoints(box, partialProgress, 1),
  });
}

const tracePerformanceMeasurementCount = 3;

function assertPerformanceEvidence(evidence: readonly TracePerformanceEvidence[]): void {
  expect(evidence).toHaveLength(tracePerformanceMeasurementCount);
  for (const measurement of evidence) {
    expect(measurement.frameIntervalsMs.length).toBeGreaterThan(0);
    expect(measurement.inputToPaintMs.length).toBeGreaterThanOrEqual(
      traceTabletPerformanceBudget.minimumInputSamples,
    );
  }
  expect(
    median(evidence.map(({ frameIntervalsMs }) => percentile95(frameIntervalsMs))),
  ).toBeLessThanOrEqual(traceTabletPerformanceBudget.maximumP95FrameIntervalMs);
  expect(
    median(evidence.map(({ inputToPaintMs }) => percentile95(inputToPaintMs))),
  ).toBeLessThanOrEqual(traceTabletPerformanceBudget.maximumP95InputToPaintMs);
}

function performanceReport(evidence: readonly TracePerformanceEvidence[]) {
  const measurements = evidence.map(({ frameIntervalsMs, inputToPaintMs }) => ({
    frameSampleCount: frameIntervalsMs.length,
    inputSampleCount: inputToPaintMs.length,
    p95FrameIntervalMs: optionalPercentile95(frameIntervalsMs),
    p95InputToPaintMs: optionalPercentile95(inputToPaintMs),
  }));
  const framePercentiles = measurements.map(({ p95FrameIntervalMs }) => p95FrameIntervalMs);
  const inputPercentiles = measurements.map(({ p95InputToPaintMs }) => p95InputToPaintMs);
  const hasCompleteFrameEvidence = framePercentiles.every(
    (value): value is number => value !== null,
  );
  const hasCompleteInputEvidence = inputPercentiles.every(
    (value): value is number => value !== null,
  );
  return {
    budget: traceTabletPerformanceBudget,
    observed: {
      measurements,
      medianP95FrameIntervalMs: hasCompleteFrameEvidence ? median(framePercentiles) : null,
      medianP95InputToPaintMs: hasCompleteInputEvidence ? median(inputPercentiles) : null,
    },
    profile: 'chromium-touch-768x1024 with 4x CPU throttling',
  } as const;
}

test('@preview traces a forgiving scaled route in the production build', async ({
  page,
}, testInfo) => {
  const browserErrors = observeUnexpectedBrowserErrors(page);
  const hasTouch = Boolean(testInfo.project.use.hasTouch);
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto(interactionFixtureUrl('trace'));
  const surface = page.getByRole('button', { name: 'Guide the turtle to the pond' });
  const box = await surface.boundingBox();
  if (box === null) {
    throw new Error('The trace surface must be measurable.');
  }

  await expect(surface.locator('.trace-start')).toBeVisible();
  await expect(surface.locator('.trace-end')).toBeVisible();
  await expect(surface.locator('.trace-tracer')).toBeVisible();
  await expect(surface.locator('.trace-hint-dot')).toHaveCount(5);
  await expect(surface.locator('.trace-hint-dot').first()).toHaveCSS(
    'animation-name',
    'trace-hint-travel',
  );
  await page.screenshot({
    animations: 'disabled',
    path: `build/reports/playwright/trace-ready-${testInfo.project.name}.png`,
  });
  const backingStore = await surface.locator('canvas').evaluate((element) => {
    if (!(element instanceof HTMLCanvasElement)) {
      throw new Error('The trace route must render to a canvas.');
    }
    return {
      height: element.height,
      ratio: window.devicePixelRatio,
      width: element.width,
    };
  });
  expect(backingStore.width).toBe(Math.round(box.width * backingStore.ratio));
  expect(backingStore.height).toBe(Math.round(box.height * backingStore.ratio));

  if (testInfo.project.name === 'chromium-touch-768x1024') {
    const evidence: TracePerformanceEvidence[] = [];
    for (let measurement = 0; measurement < tracePerformanceMeasurementCount; measurement += 1) {
      if (measurement > 0) {
        await page.goto(interactionFixtureUrl('trace'));
      }
      const measurementSurface = page.getByRole('button', {
        name: 'Guide the turtle to the pond',
      });
      const measurementBox = await measurementSurface.boundingBox();
      if (measurementBox === null) {
        throw new Error('The trace surface must be measurable for every performance measurement.');
      }
      evidence.push(
        await measureTabletTracePerformance({
          page,
          runJourney: () =>
            runTraceJourney({
              box: measurementBox,
              hasTouch,
              page,
              surface: measurementSurface,
            }),
          surface: measurementSurface,
        }),
      );
    }
    const report = performanceReport(evidence);
    testInfo.annotations.push({
      description: JSON.stringify(report),
      type: 'trace-tablet-performance',
    });
    await testInfo.attach('trace-tablet-performance.json', {
      body: JSON.stringify(report, null, 2),
      contentType: 'application/json',
    });
    assertPerformanceEvidence(evidence);
  } else {
    await runTraceJourney({ box, hasTouch, page, surface });
  }

  await expect(surface).toHaveAttribute('data-complete', 'true');
  await expect(surface).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('main')).toHaveAttribute('data-completion-count', '1');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(surface.locator('.trace-hint-dot').last()).toHaveCSS('animation-name', 'none');
  if (testInfo.project.name === 'chromium-1024x768') {
    await page.screenshot({
      animations: 'disabled',
      path: 'build/reports/playwright/trace-complete-1024x768.png',
    });
  }
  expect(browserErrors).toEqual([]);
});
