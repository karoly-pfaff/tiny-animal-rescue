import { expect, test } from '@playwright/test';

import { observeUnexpectedBrowserErrors } from './support/browser-errors';

test('@visual matches the reviewed start-screen baseline', async ({ page }) => {
  const browserErrors = observeUnexpectedBrowserErrors(page);
  await page.goto('/');
  await page.evaluate(async () => {
    await document.fonts.ready;
  });
  await expect(page.getByRole('heading', { name: 'Kezdőképernyő' })).toBeVisible();

  await expect(page).toHaveScreenshot('start-screen.png', { fullPage: true });
  expect(browserErrors).toEqual([]);
});
