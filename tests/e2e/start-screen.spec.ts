import AxeBuilder from '@axe-core/playwright';
import type { Locator, Page } from '@playwright/test';

import { observeUnexpectedBrowserErrors } from './support/browser-errors';
import {
  activateFirstRescueCall,
  completeFirstRescue,
  openFirstRescueCallSheet,
  openFirstRescueMission,
} from './support/complete-first-rescue';
import { dragLadder, interruptLadderDrag } from './support/ladder-drag';
import { expect, test } from './support/muted-test';
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

async function openMimiTapStep(page: Page, hasTouch: boolean) {
  await page.goto('/');
  await page.getByRole('button', { name: 'Magyar' }).click();
  await activateWithPrimaryPointer(page.getByRole('button', { name: 'Játék' }), hasTouch);
  await openFirstRescueMission(page, { force: true, hasTouch, locale: 'hu' });
  await dragLadder({
    destination: 'target',
    ladder: page.getByRole('button', { name: 'Húzd a létrát a fához!' }),
    page,
    pointerType: hasTouch ? 'touch' : 'mouse',
  });
  return page.getByRole('button', { name: 'Koppints Mimire!' });
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
  await openFirstRescueCallSheet(page, {
    hasTouch: Boolean(testInfo.project.use.hasTouch),
    locale: 'hu',
  });
  await expect(page.getByRole('button', { name: 'Mimi a fán — Kert' })).toBeVisible();
  await activateFirstRescueCall(page, {
    hasTouch: Boolean(testInfo.project.use.hasTouch),
    locale: 'hu',
  });
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

test('@preview gives unlocked locations without calls persistent visual selection', async ({
  page,
}, testInfo) => {
  const browserErrors = observeUnexpectedBrowserErrors(page);
  const hasTouch = Boolean(testInfo.project.use.hasTouch);
  await page.goto('/');
  await writePrimarySave(page, {
    completedMissionIds: ['garden-kitten-tree'],
    locale: 'en',
    schemaVersion: 0,
    unlockedResidentIds: ['mimi-kitten'],
    worldFlags: ['mimi-rescued'],
  });
  await page.getByRole('button', { name: 'English' }).click();
  await expect(page.getByRole('button', { name: 'Play' })).toBeVisible();
  await page.goto('/#/map');

  const garden = page.getByRole('button', { name: 'Garden rescue: Mimi' });
  const forest = page.getByRole('button', { name: 'Forest rescues' });
  const farm = page.getByRole('button', { name: 'Farm rescues' });
  await activateWithPrimaryPointer(garden, hasTouch);
  await expect(page.getByRole('region', { name: 'Garden' })).toBeVisible();

  await activateWithPrimaryPointer(forest, hasTouch);
  await expect(page.getByRole('region', { name: 'Garden' })).toHaveCount(0);
  await expect(forest).toHaveAttribute('aria-pressed', 'true');
  await expect(forest).toHaveAttribute('data-selected-location', 'true');
  await expect(forest).toHaveCSS('box-shadow', /rgba?\(41, 62, 103/u);
  await expect(garden).toHaveAttribute('aria-pressed', 'false');

  await activateWithPrimaryPointer(farm, hasTouch);
  await expect(farm).toHaveAttribute('aria-pressed', 'true');
  await expect(forest).toHaveAttribute('aria-pressed', 'false');
  expect(browserErrors).toEqual([]);
});

test('@preview restores map focus after leaving a direct mission route', async ({
  page,
}, testInfo) => {
  const hasTouch = Boolean(testInfo.project.use.hasTouch);
  await page.goto('/');
  await page.getByRole('button', { name: 'Magyar' }).click();
  await page.goto('/#/mission/garden-kitten-tree');
  await expect(page.getByRole('heading', { name: 'Mimi a fán' })).toBeVisible();

  await page
    .getByRole('button', { name: 'Tartsd nyomva a térképhez' })
    .dispatchEvent('pointerdown', {
      isPrimary: true,
      pointerId: 1,
      pointerType: hasTouch ? 'touch' : 'mouse',
    });

  const garden = page.getByRole('button', { name: 'Kerti mentés: Mimi' });
  await expect(garden).toBeFocused();
  await expect(garden).toHaveAttribute('aria-expanded', 'true');
  await expect(page.getByRole('region', { name: 'Kert' })).toBeVisible();
});

test('@preview returns an invalid ladder drop and snaps a valid drop exactly once', async ({
  page,
}, testInfo) => {
  const browserErrors = observeUnexpectedBrowserErrors(page);
  await page.goto('/');
  await page.getByRole('button', { name: 'Magyar' }).click();
  await page.getByRole('button', { name: 'Játék' }).click();
  await openFirstRescueMission(page, {
    hasTouch: Boolean(testInfo.project.use.hasTouch),
    locale: 'hu',
  });
  const ladder = page.getByRole('button', { name: 'Húzd a létrát a fához!' });
  const pointerType = testInfo.project.use.hasTouch ? 'touch' : 'mouse';

  const interrupted = await interruptLadderDrag({
    inspectAfterCancel: async () => {
      await expect(ladder).toHaveAttribute('data-phase', 'idle');
      await expect(ladder).toHaveAttribute('style', /left: 20%; top: 72%/);
      await expect(page.getByRole('button', { name: 'Koppints Mimire!' })).toHaveCount(0);
    },
    ladder,
    page,
    pointerType,
  });
  expect(interrupted.afterSecondary).toEqual(interrupted.afterPrimary);
  await expect(ladder).toHaveAttribute('data-phase', 'idle');
  await expect(ladder).toHaveAttribute('style', /left: 20%; top: 72%/);
  await expect(page.getByRole('button', { name: 'Koppints Mimire!' })).toHaveCount(0);

  await dragLadder({
    destination: 'invalid',
    inspectWhileDragging: async (pointer) => {
      await expect(ladder).toHaveAttribute('data-phase', 'dragging');
      const [surfaceBox, ladderBox, inlineTop] = await Promise.all([
        page.locator('.drag-interaction').boundingBox(),
        ladder.boundingBox(),
        ladder.evaluate((element) => Number.parseFloat(element.style.top)),
      ]);
      if (surfaceBox === null || ladderBox === null) {
        throw new Error('Active drag geometry must remain measurable.');
      }
      const expectedTop = ((pointer.y - surfaceBox.y - 48) / surfaceBox.height) * 100;
      expect(inlineTop).toBeCloseTo(expectedTop, 3);
      expect(ladderBox.y + ladderBox.height / 2).toBeLessThan(pointer.y);
    },
    ladder,
    page,
    pointerType,
  });
  await expect(ladder).toHaveAttribute('data-phase', 'idle');
  await dragLadder({ destination: 'target', ladder, page, pointerType });
  await expect(ladder).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Koppints Mimire!' })).toBeVisible();
  expect(browserErrors).toEqual([]);
});

test('@preview activates Mimi through the forgiving tap hit area', async ({ page }, testInfo) => {
  const hasTouch = Boolean(testInfo.project.use.hasTouch);
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.clock.install();
  const mimi = await openMimiTapStep(page, hasTouch);
  await page.clock.fastForward(5_000);

  const targetBox = await mimi.boundingBox();
  const visualBox = await mimi.locator('.mission-kitten-tap-visual').boundingBox();
  if (targetBox === null || visualBox === null) {
    throw new Error('Mimi tap geometry must be measurable.');
  }
  expect(targetBox.width).toBeGreaterThan(visualBox.width);
  expect(targetBox.height).toBeGreaterThan(visualBox.height);
  await expect(mimi).toHaveAttribute('data-guidance', 'true');
  await expect(mimi.locator('.tap-remove-visual')).toHaveCSS('animation-name', 'tap-target-pulse');

  const outsideVisualPoint = { x: 4, y: targetBox.height / 2 };
  expect(targetBox.x + outsideVisualPoint.x).toBeLessThan(visualBox.x);
  if (hasTouch) {
    await mimi.tap({ position: outsideVisualPoint });
  } else {
    await mimi.click({ position: outsideVisualPoint });
  }
  await expect(mimi).toHaveCount(0);
  const rescueMotion = page.locator('.mission-kitten-rescue');
  await expect(rescueMotion).toBeVisible();
  await expect(rescueMotion).toHaveAttribute('data-phase', 'saving');
  await expect(rescueMotion).toHaveCSS('animation-name', 'mimi-rescued');
  await page.clock.fastForward(1);
  await expect(page.getByRole('button', { name: 'Segíts Miminek!' })).toHaveCount(0);
  await page.clock.fastForward(324);
  await expect(rescueMotion).toBeVisible();
  await expect(page.getByRole('button', { name: 'Segíts Miminek!' })).toHaveCount(0);
  await page.clock.fastForward(325);
  await expect(page.getByRole('button', { name: 'Segíts Miminek!' })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Mimi biztonságban van!' })).toBeVisible();
});

test('@preview substitutes static tap guidance under reduced motion', async ({
  page,
}, testInfo) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.clock.install();
  const mimi = await openMimiTapStep(page, Boolean(testInfo.project.use.hasTouch));
  await page.clock.fastForward(5_000);

  const visual = mimi.locator('.tap-remove-visual');
  await expect(mimi).toHaveAttribute('data-guidance', 'true');
  await expect(visual).toHaveCSS('animation-name', 'none');
  await expect(visual).toHaveCSS('outline-style', 'solid');
});

test('@preview @guidance-replay restarts idle guidance under a fake clock', async ({
  page,
}, testInfo) => {
  const browserErrors = observeUnexpectedBrowserErrors(page);
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.clock.install();
  await page.goto('/');
  await page.getByRole('button', { name: 'Magyar' }).click();
  await page.getByRole('button', { name: 'Játék' }).click();
  await openFirstRescueMission(page, {
    force: true,
    hasTouch: Boolean(testInfo.project.use.hasTouch),
    locale: 'hu',
  });
  const target = page.locator('.ladder-target');
  await expect(target).toHaveCSS('animation-name', 'none');
  await page.clock.fastForward(4_999);
  await page.getByRole('button', { name: 'Hallgasd újra' }).click();
  await page.clock.fastForward(1);
  await expect(page.locator('.drag-ghost-hand')).toHaveCount(0);
  await page.clock.fastForward(3_999);
  await expect(page.locator('.drag-ghost-hand')).toHaveCount(0);
  await page.clock.fastForward(1_100);

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

  const ladder = page.getByRole('button', { name: 'Húzd a létrát a fához!' });
  await dragLadder({
    destination: 'target',
    ladder,
    page,
    pointerType: testInfo.project.use.hasTouch ? 'touch' : 'mouse',
  });
  await expect(ladder).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Koppints Mimire!' })).toBeVisible();
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
  await activateWithPrimaryPointer(page.getByRole('button', { name: 'Térkép' }), hasTouch);
  const garden = page.getByRole('button', { name: 'Kerti mentés: Mimi' });
  const replayCall = page.getByRole('button', { name: 'Mimi a fán — Kert' });
  await expect(garden).toBeFocused();
  await expect(garden).toHaveAttribute('aria-expanded', 'true');
  await expect(replayCall).toHaveAttribute('data-completed', 'true');
  await expect(replayCall).toHaveAccessibleDescription('Kész, újrajátszható');
  await expect(replayCall.locator('.mission-call-complete-cue')).toBeVisible();
  await completeFirstRescue(page, hasTouch, 'hu');
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Mimi biztonságban van!' })).toBeVisible();
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

test('@preview resumes the first incomplete step after a browser reload', async ({
  page,
}, testInfo) => {
  const browserErrors = observeUnexpectedBrowserErrors(page);
  const hasTouch = Boolean(testInfo.project.use.hasTouch);
  const mimi = await openMimiTapStep(page, hasTouch);
  await expect(mimi).toBeVisible();
  await expect
    .poll(async () => readPrimarySave(page))
    .toMatchObject({
      currentMission: {
        completedStepIds: ['place-ladder'],
        missionId: 'garden-kitten-tree',
      },
    });

  await page.reload();
  await expect(page.getByRole('button', { name: 'Húzd a létrát a fához!' })).toHaveCount(0);
  await activateWithPrimaryPointer(
    page.getByRole('button', { name: 'Koppints Mimire!' }),
    hasTouch,
  );
  await expect(page.getByRole('heading', { name: 'Mimi biztonságban van!' })).toBeVisible();
  await expect
    .poll(async () => {
      const save = await readPrimarySave(page);
      return typeof save === 'object' && save !== null && 'currentMission' in save;
    })
    .toBe(false);
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
  await expect(page.getByRole('heading', { name: 'Mimi is safe!' })).toBeVisible();
  await activateWithPrimaryPointer(page.getByRole('button', { name: 'Shelter' }), hasTouch);
  await expect(page.getByRole('heading', { name: 'Indoor Room' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Give Mimi a gentle pat' })).toBeVisible();
  expect(browserErrors).toEqual([]);
});

test('@preview requires an explicit adult choice before recovering corrupt save data', async ({
  page,
}) => {
  const browserErrors = observeUnexpectedBrowserErrors(page);
  const corrupt = { damaged: true, schemaVersion: 1 };
  await page.goto('/');
  await page.getByRole('button', { name: 'Magyar' }).click();
  await writePrimarySave(page, corrupt);
  await page.goto('/#/map');
  await page.reload();

  await expect(page.getByRole('heading', { name: 'A mentés segítséget kér' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Mentési térkép' })).not.toBeVisible();
  await expect.poll(async () => readPrimarySave(page)).toEqual(corrupt);
  await expect.poll(async () => readRecoveryCount(page)).toBe(0);

  await page.getByRole('button', { name: 'Újra' }).click();
  await expect(page.getByRole('heading', { name: 'A mentés segítséget kér' })).toBeVisible();
  await page.getByRole('button', { name: 'Sérült mentés archiválása és új játék' }).click();

  await expect(page.getByRole('heading', { name: 'Mentési térkép' })).toBeVisible();
  await expect.poll(async () => readRecoveryCount(page)).toBe(1);
  await expect
    .poll(async () => readPrimarySave(page))
    .toMatchObject({
      completedMissionIds: [],
      schemaVersion: 1,
      unlockedResidentIds: [],
      worldFlags: [],
    });
  expect(browserErrors).toEqual([]);
});

test('@preview preserves a future save without destructive recovery', async ({ page }) => {
  const browserErrors = observeUnexpectedBrowserErrors(page);
  const future = { marker: 'future-data', schemaVersion: 2 };
  await page.goto('/');
  await page.getByRole('button', { name: 'English' }).click();
  await writePrimarySave(page, future);
  await page.goto('/#/map');
  await page.reload();

  await expect(page.getByRole('heading', { name: 'Newer save version' })).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Archive damaged save and start again' }),
  ).not.toBeVisible();
  await expect.poll(async () => readPrimarySave(page)).toEqual(future);
  await expect.poll(async () => readRecoveryCount(page)).toBe(0);
  expect(browserErrors).toEqual([]);
});
