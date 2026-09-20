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
  await expect(page.locator('meta[name="viewport"]')).toHaveAttribute(
    'content',
    /viewport-fit=cover/,
  );
  await expect(page.getByRole('heading', { name: 'Kezdőképernyő' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Játék' })).toBeDisabled();
  await expect
    .poll(() => page.evaluate(() => document.fonts.check('800 32px "Baloo 2 Variable"', 'őűŐŰ')))
    .toBe(true);
  await expect(page.getByRole('heading', { name: 'Kezdőképernyő' })).toHaveCSS(
    'font-family',
    /Baloo 2 Variable/,
  );
  await expect(page.getByRole('button', { name: 'Játék' })).toHaveCSS(
    'font-family',
    /Baloo 2 Variable/,
  );

  await activateWithPrimaryPointer(
    page.locator('.design-surface'),
    Boolean(testInfo.project.use.hasTouch),
  );

  const accessibility = await new AxeBuilder({ page }).analyze();
  expect(accessibility.violations).toEqual([]);
  expect(browserErrors).toEqual([]);
});

test('@preview preserves the design surface and simulated safe areas', async ({ page }) => {
  await page.goto('/');
  const viewport = page.viewportSize();
  const surface = await page.locator('.design-surface').boundingBox();

  expect(viewport).not.toBeNull();
  expect(surface).not.toBeNull();
  if (viewport === null || surface === null) {
    throw new Error('The viewport and design surface must be measurable.');
  }

  expect(surface.width).toBeLessThanOrEqual(viewport.width);
  expect(surface.height).toBeLessThanOrEqual(viewport.height);
  if (viewport.width > viewport.height) {
    expect(surface.width / surface.height).toBeCloseTo(4 / 3, 4);
  } else {
    expect(surface.width).toBe(viewport.width);
    expect(surface.height).toBe(viewport.height);
  }

  await page.addStyleTag({
    content: `:root {
      --safe-area-top: 120px;
      --safe-area-right: 72px;
      --safe-area-bottom: 96px;
      --safe-area-left: 72px;
    }`,
  });

  const heading = await page.locator('.screen-heading').boundingBox();
  const action = await page.getByRole('button', { name: 'Játék' }).boundingBox();
  expect(heading).not.toBeNull();
  expect(action).not.toBeNull();
  if (heading === null || action === null) {
    throw new Error('Required controls must remain measurable inside the safe area.');
  }

  expect(heading.y).toBeGreaterThanOrEqual(120);
  expect(heading.x).toBeGreaterThanOrEqual(72);
  expect(action.y + action.height).toBeLessThanOrEqual(viewport.height - 96);
  if (viewport.width <= viewport.height) {
    expect(heading.x + heading.width).toBeLessThanOrEqual(viewport.width - 72);
  }
});
