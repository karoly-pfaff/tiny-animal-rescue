import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Locator } from '@playwright/test';

import { observeUnexpectedBrowserErrors } from './support/browser-errors';
import { completeFirstRescue } from './support/complete-first-rescue';
import { dragLadder } from './support/ladder-drag';
import { activateWithPrimaryPointer } from './support/pointer';
import { readPrimarySave, readRecoveryCount, writePrimarySave } from './support/save-game';

async function setAnimationTime(element: Locator, milliseconds: number): Promise<void> {
  await element.evaluate((animatedElement, nextTime) => {
    const animation = animatedElement.getAnimations()[0];
    if (animation === undefined) {
      throw new Error('Expected guidance animation is missing.');
    }
    animation.pause();
    animation.currentTime = nextTime;
  }, milliseconds);
}

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

test('@preview opens only the first Garden mission and protects mission exit', async ({
  page,
}, testInfo) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Magyar' }).click();
  await activateWithPrimaryPointer(
    page.getByRole('button', { name: 'Játék' }),
    Boolean(testInfo.project.use.hasTouch),
  );

  const gardenCall = page.getByRole('button', { name: 'Kerti mentés: Mimi' });
  await expect(gardenCall).toBeVisible();
  await expect(page.getByRole('button', { name: 'Menhely' })).toBeVisible();
  await expect(page.getByText(/Erdő|Tanya|Tó/u)).not.toBeVisible();
  await activateWithPrimaryPointer(gardenCall, Boolean(testInfo.project.use.hasTouch));
  await expect(page.getByRole('heading', { name: 'Mimi a fán' })).toBeVisible();

  const back = page.getByRole('button', { name: 'Tartsd nyomva a térképhez' });
  await back.click();
  await expect(page.getByRole('heading', { name: 'Mimi a fán' })).toBeVisible();
  await back.dispatchEvent('pointerdown', {
    isPrimary: true,
    pointerId: 1,
    pointerType: testInfo.project.use.hasTouch ? 'touch' : 'mouse',
  });
  await expect(page.getByRole('heading', { name: 'Mentési térkép' })).toBeVisible();
});

test('@preview returns an invalid ladder drop and snaps a valid drop exactly once', async ({
  page,
}, testInfo) => {
  const browserErrors = observeUnexpectedBrowserErrors(page);
  await page.goto('/');
  await page.getByRole('button', { name: 'Magyar' }).click();
  await page.getByRole('button', { name: 'Játék' }).click();
  await page.getByRole('button', { name: 'Kerti mentés: Mimi' }).click();
  const ladder = page.getByRole('button', { name: 'Tedd a létrát a fához' });
  const pointerType = testInfo.project.use.hasTouch ? 'touch' : 'mouse';

  await dragLadder({ destination: 'invalid', ladder, page, pointerType });
  await expect(ladder).toHaveAttribute('data-phase', 'idle');
  await dragLadder({ destination: 'target', ladder, page, pointerType });
  await expect(ladder).toHaveAttribute('data-phase', 'placed');
  await ladder.press('Enter');
  await expect(ladder).toHaveAttribute('data-phase', 'placed');
  expect(browserErrors).toEqual([]);
});

test('@preview demonstrates idle guidance under a normal-motion fake clock', async ({
  page,
}, testInfo) => {
  const browserErrors = observeUnexpectedBrowserErrors(page);
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.clock.install();
  await page.goto('/');
  await page.getByRole('button', { name: 'Magyar' }).click();
  await page.getByRole('button', { name: 'Játék' }).click();
  await page.getByRole('button', { name: 'Kerti mentés: Mimi' }).click({ force: true });
  const target = page.locator('.ladder-target');
  await expect(target).toHaveCSS('animation-name', 'none');
  await page.clock.fastForward(4_000);

  const ghost = page.locator('.drag-ghost-hand');
  await expect(ghost).toBeVisible();
  await expect(ghost).toHaveCSS('pointer-events', 'none');
  await expect(target).toHaveCSS('animation-name', 'target-breathe');
  await setAnimationTime(ghost, 700);
  const startBox = await ghost.boundingBox();
  await setAnimationTime(ghost, 1_800);
  const endBox = await ghost.boundingBox();
  if (startBox === null || endBox === null) {
    throw new Error('Guidance animation geometry is unavailable.');
  }
  expect(endBox.x).toBeGreaterThan(startBox.x + 20);

  const ladder = page.getByRole('button', { name: 'Tedd a létrát a fához' });
  await dragLadder({
    destination: 'target',
    ladder,
    page,
    pointerType: testInfo.project.use.hasTouch ? 'touch' : 'mouse',
  });
  await expect(ladder).toHaveAttribute('data-phase', 'placed');
  expect(browserErrors).toEqual([]);
});

test('@preview persists Mimi, replays idempotently, and shows her shelter reaction', async ({
  page,
}, testInfo) => {
  const browserErrors = observeUnexpectedBrowserErrors(page);
  const hasTouch = Boolean(testInfo.project.use.hasTouch);
  await page.goto('/');
  await page.getByRole('button', { name: 'Magyar' }).click();
  await activateWithPrimaryPointer(page.getByRole('button', { name: 'Játék' }), hasTouch);
  await completeFirstRescue(page, hasTouch, 'hu');
  await expect(page.getByRole('button', { name: 'Térkép' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Menhely' })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Mimi megmenekült!' })).toBeVisible();
  await activateWithPrimaryPointer(page.getByRole('button', { name: 'Menhely' }), hasTouch);
  await expect(page.getByRole('heading', { name: 'Belső szoba' })).toBeVisible();
  const shelterMimi = page.getByRole('button', { name: 'Simogasd meg Mimit' });
  await activateWithPrimaryPointer(shelterMimi, hasTouch);
  await expect(shelterMimi).toHaveClass(/is-happy/u);
  await activateWithPrimaryPointer(page.getByRole('button', { name: 'Térkép' }), hasTouch);
  await completeFirstRescue(page, hasTouch, 'hu');
  await expect
    .poll(async () => readPrimarySave(page))
    .toMatchObject({
      completedMissionIds: ['garden-kitten-tree'],
      schemaVersion: 1,
      unlockedResidentIds: ['mimi-kitten'],
      worldFlags: ['mimi-rescued'],
    });
  expect(browserErrors).toEqual([]);
});

test('@preview completes the English rescue and restores Mimi after reload', async ({
  page,
}, testInfo) => {
  const browserErrors = observeUnexpectedBrowserErrors(page);
  const hasTouch = Boolean(testInfo.project.use.hasTouch);
  await page.goto('/');
  await page.getByRole('button', { name: 'English' }).click();
  await activateWithPrimaryPointer(page.getByRole('button', { name: 'Play' }), hasTouch);
  await completeFirstRescue(page, hasTouch, 'en');

  await page.reload();
  await expect(page.getByRole('heading', { name: 'Mimi is rescued!' })).toBeVisible();
  await activateWithPrimaryPointer(page.getByRole('button', { name: 'Shelter' }), hasTouch);
  await expect(page.getByRole('heading', { name: 'Indoor Room' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Give Mimi a gentle pat' })).toBeVisible();
  expect(browserErrors).toEqual([]);
});

test('@preview recovers corrupt save data without crashing the child flow', async ({
  page,
}, testInfo) => {
  const browserErrors = observeUnexpectedBrowserErrors(page);
  await page.goto('/');
  await page.getByRole('button', { name: 'Magyar' }).click();
  await writePrimarySave(page, { damaged: true, schemaVersion: 1 });
  await page.goto('/#/map');
  await page.reload();

  await expect(page.getByRole('heading', { name: 'Mentési térkép' })).toBeVisible();
  await expect(page.getByRole('alert')).toContainText('korábbi mentés sérült');
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
  await expect.poll(async () => readRecoveryCount(page)).toBe(1);
  await expect
    .poll(async () => readPrimarySave(page))
    .toMatchObject({ schemaVersion: 1, unlockedResidentIds: ['mimi-kitten'] });
  expect(browserErrors).toEqual([]);
});
