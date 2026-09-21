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
  await expect(page.getByRole('dialog', { name: 'Válassz nyelvet' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Játék' })).toBeDisabled();
  await page.getByRole('button', { name: 'Magyar' }).click();
  await expect(page.getByRole('heading', { name: 'Kis Állatmentők' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Játék' })).toBeEnabled();
  await expect
    .poll(() => page.evaluate(() => document.fonts.check('800 32px "Baloo 2 Variable"', 'őűŐŰ')))
    .toBe(true);
  await expect(page.getByRole('heading', { name: 'Kis Állatmentők' })).toHaveCSS(
    'font-family',
    /Baloo 2 Variable/,
  );
  await expect(page.getByRole('button', { name: 'Játék' })).toHaveCSS(
    'font-family',
    /Baloo 2 Variable/,
  );

  await activateWithPrimaryPointer(
    page.getByRole('button', { name: 'Játék' }),
    Boolean(testInfo.project.use.hasTouch),
  );
  await expect(page.getByRole('heading', { name: 'Mentési térkép' })).toBeVisible();

  const accessibility = await new AxeBuilder({ page }).analyze();
  expect(accessibility.violations).toEqual([]);
  expect(browserErrors).toEqual([]);
});

test('@preview preserves the design surface and simulated safe areas', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Magyar' }).click();
  const viewport = page.viewportSize();
  const surface = await page.locator('.game-surface').boundingBox();

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

  const heading = await page.locator('.title-plaque').boundingBox();
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

test('@preview supports English first-run setup and child navigation', async ({
  page,
}, testInfo) => {
  const browserErrors = observeUnexpectedBrowserErrors(page);
  await page.goto('/');

  await page.getByRole('button', { name: 'English' }).click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page).toHaveTitle('Tiny Rescue');
  await page.reload();
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await activateWithPrimaryPointer(
    page.getByRole('button', { name: 'Play' }),
    Boolean(testInfo.project.use.hasTouch),
  );

  await expect(page.getByRole('heading', { name: 'Rescue map' })).toBeVisible();
  expect(browserErrors).toEqual([]);
});

test('@preview does not let a deep link bypass first-run setup', async ({ page }) => {
  await page.goto('/#/map');

  await expect(page.getByRole('dialog', { name: 'Válassz nyelvet' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Mentési térkép' })).not.toBeVisible();
});
