import { observeUnexpectedBrowserErrors } from './support/browser-errors';
import { interactionFixtureUrl } from './support/fixture-url';
import { expect, test } from './support/muted-test';
import { settleVisual } from './support/settle-visual';

const primitiveTypes = ['tap', 'drag', 'wipe', 'match', 'trace'] as const;
// The Windows required-quality job owns this engine-fixture baseline. The Linux media job still
// exercises every state below, but only the player journeys produce media-complete signatures.
const captureReviewedSnapshots = process.env['VITE_MATERIALIZED_ASSETS'] !== 'true';

test('@visual presents every contract-only primitive demonstration', async ({ page }) => {
  const browserErrors = observeUnexpectedBrowserErrors(page);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.clock.install();
  await page.clock.pauseAt(new Date('2030-01-01T00:00:00Z'));
  await page.goto(interactionFixtureUrl('suite'));

  for (const type of primitiveTypes) {
    await page.getByRole('button', { exact: true, name: type }).click();
    await expect(page.locator('.primitive-suite-surface')).toHaveAttribute(
      'data-step-id',
      expectedStepId(type),
    );
    await page.clock.fastForward(2_000);
    await expect(page.locator('.primitive-suite-surface')).toHaveAttribute(
      'data-guidance-stage',
      'pulse',
    );
    await settleVisual(page);
    await expectViewportContained(page);
    if (captureReviewedSnapshots) {
      await expect(page.locator('.primitive-suite-surface')).toHaveScreenshot(
        `primitive-suite-${type}-guidance.png`,
      );
    }
    await page.getByRole('button', { name: 'Pause interaction' }).click();
    await expect(page.locator('.primitive-suite-surface')).toHaveAttribute('data-paused', 'true');
    await expectViewportContained(page);
    if (captureReviewedSnapshots) {
      await expect(page.locator('.primitive-suite-surface')).toHaveScreenshot(
        `primitive-suite-${type}-paused.png`,
      );
    }
    await page.getByRole('button', { name: 'Resume interaction' }).click();
  }
  expect(browserErrors).toEqual([]);
});

async function expectViewportContained(page: import('@playwright/test').Page): Promise<void> {
  const viewport = page.viewportSize();
  if (viewport === null) {
    throw new Error('Primitive visual evidence requires a fixed viewport.');
  }
  const dimensions = await page.evaluate(() => ({
    height: document.documentElement.scrollHeight,
    width: document.documentElement.scrollWidth,
  }));
  expect(dimensions.height).toBeLessThanOrEqual(viewport.height);
  expect(dimensions.width).toBeLessThanOrEqual(viewport.width);

  for (const locator of [
    page.locator('.primitive-suite-header'),
    page.locator('.primitive-suite-surface'),
  ]) {
    const box = await locator.boundingBox();
    expect(box).not.toBeNull();
    if (box !== null) {
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.y).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width).toBeLessThanOrEqual(viewport.width);
      expect(box.y + box.height).toBeLessThanOrEqual(viewport.height);
    }
  }
}

function expectedStepId(type: (typeof primitiveTypes)[number]): string {
  if (type === 'tap') {
    return 'demonstrate-tap-remove';
  }
  if (type === 'drag') {
    return 'demonstrate-drag-to-target';
  }
  if (type === 'wipe') {
    return 'demonstrate-wipe-clean';
  }
  return `demonstrate-${type}`;
}
