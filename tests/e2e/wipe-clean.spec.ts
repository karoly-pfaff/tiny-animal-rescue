import { env } from 'node:process';
import { expect, test, type Page } from '@playwright/test';

import { observeUnexpectedBrowserErrors } from './support/browser-errors';
import { resolvePreviewPort } from './support/preview-port';

const fixturePort = resolvePreviewPort(env['TINY_RESCUE_PREVIEW_PORT']) + 1;
const fixtureUrl = `http://127.0.0.1:${String(fixturePort)}`;

type ClientPoint = Readonly<{ x: number; y: number }>;
type WipePathOptions = Readonly<{
  page: Page;
  points: readonly ClientPoint[];
  touch: boolean;
}>;

function createWipePath(box: Readonly<{ height: number; width: number; x: number; y: number }>) {
  const rows = [0.03, 0.14, 0.25, 0.36, 0.47, 0.58, 0.69, 0.8, 0.91, 0.97];
  return rows.map((row, index) => ({
    x: box.x + box.width * (index % 2 === 0 ? 0.04 : 0.96),
    y: box.y + box.height * row,
  }));
}

async function wipeWithMouse(page: Page, points: readonly ClientPoint[]): Promise<void> {
  const [start, ...rest] = points;
  if (start === undefined) {
    throw new Error('The wipe path must contain a start point.');
  }
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  for (const point of rest) {
    await page.mouse.move(point.x, point.y, { steps: 8 });
  }
  await page.mouse.up();
}

async function wipeWithTouch(page: Page, points: readonly ClientPoint[]): Promise<void> {
  const [start, ...rest] = points;
  if (start === undefined) {
    throw new Error('The wipe path must contain a start point.');
  }
  const session = await page.context().newCDPSession(page);
  await session.send('Input.dispatchTouchEvent', {
    touchPoints: [{ id: 17, ...start }],
    type: 'touchStart',
  });
  for (const point of rest) {
    await session.send('Input.dispatchTouchEvent', {
      touchPoints: [{ id: 17, ...point }],
      type: 'touchMove',
    });
  }
  await session.send('Input.dispatchTouchEvent', { touchPoints: [], type: 'touchEnd' });
  await session.detach();
}

async function followWipePath({ page, points, touch }: WipePathOptions): Promise<void> {
  if (touch) {
    await wipeWithTouch(page, points);
    return;
  }
  await wipeWithMouse(page, points);
}

test('@preview completes a broad wipe in the production build', async ({ page }, testInfo) => {
  const browserErrors = observeUnexpectedBrowserErrors(page);
  const touch = Boolean(testInfo.project.use.hasTouch);
  await page.goto(fixtureUrl);
  const surface = page.getByRole('button', { name: 'Wipe the surface clean' });
  const box = await surface.boundingBox();
  if (box === null) {
    throw new Error('The wipe surface must be measurable.');
  }

  if (touch) {
    expect(box.width / box.height).toBeLessThan(1);
  } else {
    expect(box.width / box.height).toBeGreaterThan(1);
  }
  await expect(surface).toHaveAttribute('data-complete', 'false');
  const backingStore = await surface.locator('canvas').evaluate((element) => {
    if (!(element instanceof HTMLCanvasElement)) {
      throw new Error('The wipe mask must be a canvas.');
    }
    return {
      height: element.height,
      ratio: window.devicePixelRatio,
      width: element.width,
    };
  });
  expect(backingStore.width).toBe(Math.round(box.width * backingStore.ratio));
  expect(backingStore.height).toBe(Math.round(box.height * backingStore.ratio));

  await followWipePath({ page, points: createWipePath(box), touch });

  await expect(surface).toHaveAttribute('data-complete', 'true');
  await expect(surface).toHaveAttribute('aria-pressed', 'true');
  const coverage = Number(await surface.getAttribute('data-progress'));
  expect(coverage).toBeGreaterThanOrEqual(0.7);
  expect(coverage).toBeLessThan(0.9);
  await surface.press('Enter');
  await expect(page.locator('main')).toHaveAttribute('data-completion-count', '1');
  expect(browserErrors).toEqual([]);
});
