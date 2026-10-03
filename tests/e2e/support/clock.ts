import type { Page } from '@playwright/test';

export async function pauseAppClockAfterRendering(page: Page): Promise<void> {
  const currentTime = await page.evaluate(() => Date.now());
  await page.clock.pauseAt(currentTime + 1_000);
}

export async function observeTimeoutArming(
  page: Page,
  delayMs: number,
  markerAttribute: `data-${string}`,
): Promise<void> {
  await page.evaluate(
    ({ delayMs: observedDelay, markerAttribute: marker }) => {
      const originalSetTimeout = window.setTimeout.bind(window);
      window.setTimeout = ((handler: TimerHandler, timeout?: number, ...arguments_: unknown[]) => {
        const timer = originalSetTimeout(handler, timeout, ...arguments_);
        if (timeout === observedDelay) {
          const previousCount = Number(document.documentElement.getAttribute(marker) ?? '0');
          document.documentElement.setAttribute(marker, String(previousCount + 1));
        }
        return timer;
      }) as typeof window.setTimeout;
    },
    { delayMs, markerAttribute },
  );
}
