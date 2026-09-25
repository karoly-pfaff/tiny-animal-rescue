import { createHash } from 'node:crypto';

import { expect, test, type Page, type TestInfo } from '@playwright/test';

import mediaCompleteDigests from '../fixtures/assets/media-complete-screenshot-digests.json' with { type: 'json' };
import { observeUnexpectedBrowserErrors } from './support/browser-errors';
import { dragLadder } from './support/ladder-drag';

async function settleVisual(page: Page) {
  await page.evaluate(async () => document.fonts.ready);
}

const mediaComplete = process.env['VITE_MATERIALIZED_ASSETS'] === 'true';
const reviewedMediaCompleteDigests: Readonly<Record<string, string>> = mediaCompleteDigests;
const expectedAssetsByScreenshot = {
  'celebration-mimi.png': [
    'images/missions/garden-kitten-tree/background.png',
    'images/residents/mimi/celebration.png',
  ],
  'map-first-rescue.png': ['images/map/garden-map.png', 'images/residents/mimi/canonical.png'],
  'mission-first-step.png': [
    'images/missions/garden-kitten-tree/background.png',
    'images/missions/garden-kitten-tree/ladder.png',
    'images/residents/mimi/mission.png',
  ],
  'mission-ladder-hint.png': [
    'images/missions/garden-kitten-tree/background.png',
    'images/missions/garden-kitten-tree/ladder.png',
    'images/residents/mimi/mission.png',
  ],
  'mission-ladder-placed.png': [
    'images/missions/garden-kitten-tree/background.png',
    'images/missions/garden-kitten-tree/ladder.png',
    'images/residents/mimi/mission.png',
  ],
  'mission-protected-exit-en.png': [
    'images/missions/garden-kitten-tree/background.png',
    'images/missions/garden-kitten-tree/ladder.png',
    'images/residents/mimi/mission.png',
  ],
  'shelter-indoor-mimi.png': [
    'images/residents/mimi/shelter-idle.png',
    'images/shelter/indoor-room.png',
  ],
  'start-first-run.png': ['images/start/welcome-garden.png'],
  'start-screen-en.png': ['images/start/welcome-garden.png'],
  'start-screen-hu.png': ['images/start/welcome-garden.png'],
} as const;

type ReviewedScreenshotName = keyof typeof expectedAssetsByScreenshot;

async function verifyReviewedVisual(page: Page, name: ReviewedScreenshotName, testInfo: TestInfo) {
  if (!mediaComplete) {
    await expect(page).toHaveScreenshot(name, { fullPage: true });
    return;
  }
  for (const objectKey of expectedAssetsByScreenshot[name]) {
    const image = page.locator(`img[src$="${objectKey}"]`);
    await expect(image).toHaveCount(1);
    await expect
      .poll(() =>
        image.evaluate(
          (element) =>
            element instanceof HTMLImageElement && element.complete && element.naturalWidth > 0,
        ),
      )
      .toBe(true);
  }
  const screenshot = await page.screenshot({
    animations: 'disabled',
    fullPage: true,
    path: testInfo.outputPath(`media-complete-${name}`),
  });
  const contractKey = `${name}::${testInfo.project.name}`;
  const expectedDigest = reviewedMediaCompleteDigests[contractKey];
  expect(
    expectedDigest,
    `Missing media-complete visual contract for ${contractKey}.`,
  ).toBeDefined();
  expect(createHash('sha256').update(screenshot).digest('hex')).toBe(expectedDigest);
}

test('@visual matches the reviewed first-run baseline', async ({ page }, testInfo) => {
  const browserErrors = observeUnexpectedBrowserErrors(page);
  await page.goto('/');
  await expect(page.getByRole('dialog', { name: 'Válassz nyelvet' })).toBeVisible();
  await settleVisual(page);

  await verifyReviewedVisual(page, 'start-first-run.png', testInfo);
  expect(browserErrors).toEqual([]);
});

test('@visual matches the reviewed Hungarian start baseline', async ({ page }, testInfo) => {
  const browserErrors = observeUnexpectedBrowserErrors(page);
  await page.goto('/');
  await page.getByRole('button', { name: 'Magyar' }).click();
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await settleVisual(page);

  await verifyReviewedVisual(page, 'start-screen-hu.png', testInfo);
  expect(browserErrors).toEqual([]);
});

test('@visual matches the reviewed English start baseline', async ({ page }, testInfo) => {
  const browserErrors = observeUnexpectedBrowserErrors(page);
  await page.goto('/');
  await page.getByRole('button', { name: 'English' }).click();
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await settleVisual(page);

  await verifyReviewedVisual(page, 'start-screen-en.png', testInfo);
  expect(browserErrors).toEqual([]);
});

test('@visual matches the reviewed first-rescue map baseline', async ({ page }, testInfo) => {
  const browserErrors = observeUnexpectedBrowserErrors(page);
  await page.goto('/');
  await page.getByRole('button', { name: 'Magyar' }).click();
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await page.getByRole('button', { name: 'Játék' }).click();
  await expect(page.getByRole('heading', { name: 'Mentési térkép' })).toBeVisible();
  await settleVisual(page);

  await verifyReviewedVisual(page, 'map-first-rescue.png', testInfo);
  expect(browserErrors).toEqual([]);
});

test('@visual matches the reviewed first-mission baseline', async ({ page }, testInfo) => {
  const browserErrors = observeUnexpectedBrowserErrors(page);
  await page.goto('/');
  await page.getByRole('button', { name: 'Magyar' }).click();
  await page.getByRole('button', { name: 'Játék' }).click();
  await page.getByRole('button', { name: 'Kerti mentés: Mimi' }).click();
  await expect(page.getByRole('heading', { name: 'Mimi a fán' })).toBeVisible();
  await settleVisual(page);

  await verifyReviewedVisual(page, 'mission-first-step.png', testInfo);
  expect(browserErrors).toEqual([]);
});

test('@visual shows the deterministic ladder guidance', async ({ page }, testInfo) => {
  const browserErrors = observeUnexpectedBrowserErrors(page);
  await page.clock.install();
  await page.goto('/');
  await page.getByRole('button', { name: 'Magyar' }).click();
  await page.getByRole('button', { name: 'Játék' }).click();
  await page.getByRole('button', { name: 'Kerti mentés: Mimi' }).click();
  await page.clock.fastForward(4_000);
  await expect(page.locator('.drag-ghost-hand')).toBeVisible();
  await settleVisual(page);

  await verifyReviewedVisual(page, 'mission-ladder-hint.png', testInfo);
  expect(browserErrors).toEqual([]);
});

test('@visual shows the ladder snapped to the tree', async ({ page }, testInfo) => {
  const browserErrors = observeUnexpectedBrowserErrors(page);
  await page.goto('/');
  await page.getByRole('button', { name: 'Magyar' }).click();
  await page.getByRole('button', { name: 'Játék' }).click();
  await page.getByRole('button', { name: 'Kerti mentés: Mimi' }).click();
  const ladder = page.getByRole('button', { name: 'Húzd a létrát a fához!' });
  await dragLadder({
    destination: 'target',
    ladder,
    page,
    pointerType: testInfo.project.use.hasTouch ? 'touch' : 'mouse',
  });
  await expect(ladder).toHaveAttribute('data-phase', 'placed');
  await settleVisual(page);

  await verifyReviewedVisual(page, 'mission-ladder-placed.png', testInfo);
  expect(browserErrors).toEqual([]);
});

test('@visual matches the reviewed English protected-exit state', async ({ page }, testInfo) => {
  const browserErrors = observeUnexpectedBrowserErrors(page);
  await page.goto('/');
  await page.getByRole('button', { name: 'English' }).click();
  await page.getByRole('button', { name: 'Play' }).click();
  await page.getByRole('button', { name: 'Garden rescue: Mimi' }).click();
  await expect(page.getByRole('heading', { name: 'Mimi in the tree' })).toBeVisible();
  await page.clock.install();
  await page
    .getByRole('button', { name: 'Hold to return to the map' })
    .dispatchEvent('pointerdown', {
      button: 0,
      isPrimary: true,
      pointerId: 1,
      pointerType: 'touch',
    });
  await page.addStyleTag({
    content:
      '.mission-back.is-holding::after { scale: 0.55 1 !important; transition: none !important; }',
  });
  await settleVisual(page);

  await verifyReviewedVisual(page, 'mission-protected-exit-en.png', testInfo);
  expect(browserErrors).toEqual([]);
});

test('@visual matches the reviewed Mimi celebration', async ({ page }, testInfo) => {
  const browserErrors = observeUnexpectedBrowserErrors(page);
  await page.goto('/');
  await page.getByRole('button', { name: 'Magyar' }).click();
  await page.getByRole('button', { name: 'Játék' }).click();
  await page.getByRole('button', { name: 'Kerti mentés: Mimi' }).click();
  const ladder = page.getByRole('button', { name: 'Húzd a létrát a fához!' });
  await dragLadder({
    destination: 'target',
    ladder,
    page,
    pointerType: testInfo.project.use.hasTouch ? 'touch' : 'mouse',
  });
  await page.getByRole('button', { name: 'Koppints Mimire!' }).click();
  await expect(page.getByRole('heading', { name: 'Mimi megmenekült!' })).toBeVisible();
  await settleVisual(page);

  await verifyReviewedVisual(page, 'celebration-mimi.png', testInfo);
  expect(browserErrors).toEqual([]);
});

test('@visual matches the reviewed Indoor Room with Mimi', async ({ page }, testInfo) => {
  const browserErrors = observeUnexpectedBrowserErrors(page);
  await page.goto('/');
  await page.getByRole('button', { name: 'Magyar' }).click();
  await page.getByRole('button', { name: 'Játék' }).click();
  await page.getByRole('button', { name: 'Kerti mentés: Mimi' }).click();
  const ladder = page.getByRole('button', { name: 'Húzd a létrát a fához!' });
  await dragLadder({
    destination: 'target',
    ladder,
    page,
    pointerType: testInfo.project.use.hasTouch ? 'touch' : 'mouse',
  });
  await page.getByRole('button', { name: 'Koppints Mimire!' }).click();
  await page.getByRole('button', { name: 'Menhely' }).click();
  await expect(page.getByRole('heading', { name: 'Belső szoba' })).toBeVisible();
  await settleVisual(page);

  await verifyReviewedVisual(page, 'shelter-indoor-mimi.png', testInfo);
  expect(browserErrors).toEqual([]);
});
