import { expect, test, type Page } from '@playwright/test';

import { observeUnexpectedBrowserErrors } from './support/browser-errors';
import { dragLadder } from './support/ladder-drag';

async function settleVisual(page: Page) {
  await page.evaluate(async () => document.fonts.ready);
}

test('@visual matches the reviewed first-run baseline', async ({ page }) => {
  const browserErrors = observeUnexpectedBrowserErrors(page);
  await page.goto('/');
  await expect(page.getByRole('dialog', { name: 'Válassz nyelvet' })).toBeVisible();
  await settleVisual(page);

  await expect(page).toHaveScreenshot('start-first-run.png', { fullPage: true });
  expect(browserErrors).toEqual([]);
});

test('@visual matches the reviewed Hungarian start baseline', async ({ page }) => {
  const browserErrors = observeUnexpectedBrowserErrors(page);
  await page.goto('/');
  await page.getByRole('button', { name: 'Magyar' }).click();
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await settleVisual(page);

  await expect(page).toHaveScreenshot('start-screen-hu.png', { fullPage: true });
  expect(browserErrors).toEqual([]);
});

test('@visual matches the reviewed English start baseline', async ({ page }) => {
  const browserErrors = observeUnexpectedBrowserErrors(page);
  await page.goto('/');
  await page.getByRole('button', { name: 'English' }).click();
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await settleVisual(page);

  await expect(page).toHaveScreenshot('start-screen-en.png', { fullPage: true });
  expect(browserErrors).toEqual([]);
});

test('@visual matches the reviewed first-rescue map baseline', async ({ page }) => {
  const browserErrors = observeUnexpectedBrowserErrors(page);
  await page.goto('/');
  await page.getByRole('button', { name: 'Magyar' }).click();
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await page.getByRole('button', { name: 'Játék' }).click();
  await expect(page.getByRole('heading', { name: 'Mentési térkép' })).toBeVisible();
  await settleVisual(page);

  await expect(page).toHaveScreenshot('map-first-rescue.png', { fullPage: true });
  expect(browserErrors).toEqual([]);
});

test('@visual matches the reviewed first-mission baseline', async ({ page }) => {
  const browserErrors = observeUnexpectedBrowserErrors(page);
  await page.goto('/');
  await page.getByRole('button', { name: 'Magyar' }).click();
  await page.getByRole('button', { name: 'Játék' }).click();
  await page.getByRole('button', { name: 'Kerti mentés: Mimi' }).click();
  await expect(page.getByRole('heading', { name: 'Mimi a fán' })).toBeVisible();
  await settleVisual(page);

  await expect(page).toHaveScreenshot('mission-first-step.png', { fullPage: true });
  expect(browserErrors).toEqual([]);
});

test('@visual shows the deterministic ladder guidance', async ({ page }) => {
  const browserErrors = observeUnexpectedBrowserErrors(page);
  await page.clock.install();
  await page.goto('/');
  await page.getByRole('button', { name: 'Magyar' }).click();
  await page.getByRole('button', { name: 'Játék' }).click();
  await page.getByRole('button', { name: 'Kerti mentés: Mimi' }).click();
  await page.clock.fastForward(4_000);
  await expect(page.locator('.drag-ghost-hand')).toBeVisible();
  await settleVisual(page);

  await expect(page).toHaveScreenshot('mission-ladder-hint.png', { fullPage: true });
  expect(browserErrors).toEqual([]);
});

test('@visual shows the ladder snapped to the tree', async ({ page }, testInfo) => {
  const browserErrors = observeUnexpectedBrowserErrors(page);
  await page.goto('/');
  await page.getByRole('button', { name: 'Magyar' }).click();
  await page.getByRole('button', { name: 'Játék' }).click();
  await page.getByRole('button', { name: 'Kerti mentés: Mimi' }).click();
  const ladder = page.getByRole('button', { name: 'Tedd a létrát a fához' });
  await dragLadder({
    destination: 'target',
    ladder,
    page,
    pointerType: testInfo.project.use.hasTouch ? 'touch' : 'mouse',
  });
  await expect(ladder).toHaveAttribute('data-phase', 'placed');
  await settleVisual(page);

  await expect(page).toHaveScreenshot('mission-ladder-placed.png', { fullPage: true });
  expect(browserErrors).toEqual([]);
});

test('@visual matches the reviewed English protected-exit state', async ({ page }) => {
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

  await expect(page).toHaveScreenshot('mission-protected-exit-en.png', { fullPage: true });
  expect(browserErrors).toEqual([]);
});

test('@visual matches the reviewed Mimi celebration', async ({ page }, testInfo) => {
  const browserErrors = observeUnexpectedBrowserErrors(page);
  await page.goto('/');
  await page.getByRole('button', { name: 'Magyar' }).click();
  await page.getByRole('button', { name: 'Játék' }).click();
  await page.getByRole('button', { name: 'Kerti mentés: Mimi' }).click();
  const ladder = page.getByRole('button', { name: 'Tedd a létrát a fához' });
  await dragLadder({
    destination: 'target',
    ladder,
    page,
    pointerType: testInfo.project.use.hasTouch ? 'touch' : 'mouse',
  });
  await page.getByRole('button', { name: 'Segíts Miminek lejönni' }).click();
  await expect(page.getByRole('heading', { name: 'Mimi megmenekült!' })).toBeVisible();
  await settleVisual(page);

  await expect(page).toHaveScreenshot('celebration-mimi.png', { fullPage: true });
  expect(browserErrors).toEqual([]);
});

test('@visual matches the reviewed Indoor Room with Mimi', async ({ page }, testInfo) => {
  const browserErrors = observeUnexpectedBrowserErrors(page);
  await page.goto('/');
  await page.getByRole('button', { name: 'Magyar' }).click();
  await page.getByRole('button', { name: 'Játék' }).click();
  await page.getByRole('button', { name: 'Kerti mentés: Mimi' }).click();
  const ladder = page.getByRole('button', { name: 'Tedd a létrát a fához' });
  await dragLadder({
    destination: 'target',
    ladder,
    page,
    pointerType: testInfo.project.use.hasTouch ? 'touch' : 'mouse',
  });
  await page.getByRole('button', { name: 'Segíts Miminek lejönni' }).click();
  await page.getByRole('button', { name: 'Menhely' }).click();
  await expect(page.getByRole('heading', { name: 'Belső szoba' })).toBeVisible();
  await settleVisual(page);

  await expect(page).toHaveScreenshot('shelter-indoor-mimi.png', { fullPage: true });
  expect(browserErrors).toEqual([]);
});
