import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

import { observeUnexpectedBrowserErrors } from './support/browser-errors';
import { activateWithPrimaryPointer } from './support/pointer';

test('@preview renders the localized start screen from production preview', async ({
  page,
}, testInfo) => {
  const browserErrors = observeUnexpectedBrowserErrors(page);
  await page.goto('/');

  await expect(page).toHaveTitle('Kis Állatmentők');
  await expect(page.locator('html')).toHaveAttribute('lang', 'hu');
  await expect(page.getByRole('heading', { name: 'Kezdőképernyő' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Játék' })).toBeDisabled();

  await activateWithPrimaryPointer(
    page.locator('.design-surface'),
    Boolean(testInfo.project.use.hasTouch),
  );

  const accessibility = await new AxeBuilder({ page }).analyze();
  expect(accessibility.violations).toEqual([]);
  expect(browserErrors).toEqual([]);
});
