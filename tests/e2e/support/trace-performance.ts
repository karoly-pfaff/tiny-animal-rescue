import type { Locator, Page } from '@playwright/test';

export const traceTabletPerformanceBudget = {
  cpuThrottleRate: 4,
  maximumP95FrameIntervalMs: 50,
  maximumP95InputToPaintMs: 100,
  minimumInputSamples: 12,
} as const;

export type TracePerformanceEvidence = Readonly<{
  frameIntervalsMs: readonly number[];
  inputToPaintMs: readonly number[];
}>;

interface BrowserTracePerformanceState {
  element: Element;
  frameIntervalsMs: number[];
  frameRequestId: number;
  inputToPaintMs: number[];
  onPointerMove: EventListener;
  previousFrameAt: number;
}

declare global {
  interface Window {
    tinyRescueTracePerformance?: BrowserTracePerformanceState;
  }
}

type MeasureTracePerformanceOptions = Readonly<{
  page: Page;
  runJourney: () => Promise<void>;
  surface: Locator;
}>;

export async function measureTabletTracePerformance({
  page,
  runJourney,
  surface,
}: MeasureTracePerformanceOptions): Promise<TracePerformanceEvidence> {
  const session = await page.context().newCDPSession(page);
  await session.send('Emulation.setCPUThrottlingRate', {
    rate: traceTabletPerformanceBudget.cpuThrottleRate,
  });
  await startBrowserMeasurement(surface);
  try {
    await runJourney();
    return await finishBrowserMeasurement(page);
  } finally {
    await session.send('Emulation.setCPUThrottlingRate', { rate: 1 });
    await session.detach();
  }
}

export function percentile95(samples: readonly number[]): number {
  if (samples.length === 0) {
    throw new Error('Performance evidence requires at least one sample.');
  }
  const ordered = [...samples].sort((first, second) => first - second);
  const index = Math.ceil(ordered.length * 0.95) - 1;
  return ordered[index] ?? Number.POSITIVE_INFINITY;
}

async function startBrowserMeasurement(surface: Locator): Promise<void> {
  await surface.evaluate((element) => {
    const state: BrowserTracePerformanceState = {
      element,
      frameIntervalsMs: [],
      frameRequestId: 0,
      inputToPaintMs: [],
      onPointerMove: () => undefined,
      previousFrameAt: performance.now(),
    };
    state.onPointerMove = () => {
      const inputAt = performance.now();
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          state.inputToPaintMs.push(performance.now() - inputAt);
        });
      });
    };
    const measureFrame = (frameAt: number) => {
      state.frameIntervalsMs.push(frameAt - state.previousFrameAt);
      state.previousFrameAt = frameAt;
      state.frameRequestId = requestAnimationFrame(measureFrame);
    };
    element.addEventListener('pointermove', state.onPointerMove);
    state.frameRequestId = requestAnimationFrame(measureFrame);
    window.tinyRescueTracePerformance = state;
  });
}

async function finishBrowserMeasurement(page: Page): Promise<TracePerformanceEvidence> {
  return page.evaluate(async () => {
    const state = window.tinyRescueTracePerformance;
    if (state === undefined) {
      throw new Error('Trace performance measurement was not started.');
    }
    state.element.removeEventListener('pointermove', state.onPointerMove);
    cancelAnimationFrame(state.frameRequestId);
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          resolve();
        });
      });
    });
    delete window.tinyRescueTracePerformance;
    return {
      frameIntervalsMs: state.frameIntervalsMs,
      inputToPaintMs: state.inputToPaintMs,
    };
  });
}
