import { expect, test, type Page } from '@playwright/test';

import { observeUnexpectedBrowserErrors } from './support/browser-errors';

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
