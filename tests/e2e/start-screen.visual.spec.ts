import { expect, test, type Locator, type Page, type TestInfo } from '@playwright/test';

import mediaCompleteSignatures from '../fixtures/assets/media-complete-visual-signatures.json' with { type: 'json' };
import { observeUnexpectedBrowserErrors } from './support/browser-errors';
import { dragLadder } from './support/ladder-drag';
import { settleVisual } from './support/settle-visual';

async function pauseVisualClock(page: Page): Promise<void> {
  const currentTime = await page.evaluate(() => Date.now());
  await page.clock.pauseAt(currentTime + 1_000);
}

async function freezeRescueAtEnd(element: Locator): Promise<void> {
  await element.evaluate((animatedElement) => {
    const animation = animatedElement.getAnimations()[0];
    if (animation === undefined) {
      throw new Error('Expected rescue animation is missing.');
    }
    animation.pause();
    animation.currentTime = 650;
    animation.commitStyles();
    animation.cancel();
  });
}

const mediaComplete = process.env['VITE_MATERIALIZED_ASSETS'] === 'true';
const firstMissionHintDelayMs = 5_000;
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
  'mission-ladder-reduced-motion.png': [
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
  'mission-mimi-reduced-motion.png': [
    'images/missions/garden-kitten-tree/background.png',
    'images/missions/garden-kitten-tree/ladder.png',
    'images/residents/mimi/mission.png',
  ],
  'mission-mimi-rescuing.png': [
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
type VisualSignature = Readonly<{ height: number; rgb: string; width: number }>;

const signatureWidth = 64;
const signatureHeight = 48;

async function visualSignature(page: Page, screenshot: Buffer) {
  return page.evaluate(
    async ({ base64, height, width }) => {
      const image = new Image();
      image.src = `data:image/png;base64,${base64}`;
      await image.decode();
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext('2d', { alpha: false });
      if (context === null) {
        throw new Error('Visual-signature canvas is unavailable.');
      }
      context.drawImage(image, 0, 0, width, height);
      const rgba = context.getImageData(0, 0, width, height).data;
      const rgb = new Uint8Array(width * height * 3);
      for (let source = 0, target = 0; source < rgba.length; source += 4) {
        rgb[target++] = rgba.at(source) ?? 0;
        rgb[target++] = rgba.at(source + 1) ?? 0;
        rgb[target++] = rgba.at(source + 2) ?? 0;
      }
      let binary = '';
      for (const value of rgb) {
        binary += String.fromCharCode(value);
      }
      return btoa(binary);
    },
    { base64: screenshot.toString('base64'), height: signatureHeight, width: signatureWidth },
  );
}

function verifyVisualSignature(
  actualBase64: string,
  expected: VisualSignature | undefined,
  contractKey: string,
) {
  if (expected === undefined) {
    throw new Error(`Missing media-complete visual signature for ${contractKey}.`);
  }
  expect(expected.width).toBe(signatureWidth);
  expect(expected.height).toBe(signatureHeight);
  const actual = Buffer.from(actualBase64, 'base64');
  const reviewed = Buffer.from(expected.rgb, 'base64');
  expect(actual.byteLength).toBe(reviewed.byteLength);
  let totalDifference = 0;
  let changedChannels = 0;
  for (let index = 0; index < actual.length; index += 1) {
    const difference = Math.abs((actual.at(index) ?? 0) - (reviewed.at(index) ?? 0));
    totalDifference += difference;
    if (difference > 6) {
      changedChannels += 1;
    }
  }
  expect(
    totalDifference / actual.length,
    `${contractKey} mean pixel-channel difference`,
  ).toBeLessThanOrEqual(1);
  expect(
    changedChannels / actual.length,
    `${contractKey} changed pixel-channel ratio`,
  ).toBeLessThanOrEqual(0.01);
}

async function verifyReviewedVisual(page: Page, name: ReviewedScreenshotName, testInfo: TestInfo) {
  if (mediaComplete) {
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
      await image.evaluate(async (element) => {
        if (!(element instanceof HTMLImageElement)) {
          throw new Error('Media-complete visual asset is not an image.');
        }
        await element.decode();
      });
    }
  }
  if (mediaComplete) {
    await page.addStyleTag({
      content: [
        '* { color: transparent !important; text-shadow: none !important; }',
        name === 'celebration-mimi.png'
          ? '.celebration-title-plaque, .celebration-actions { visibility: hidden !important; }'
          : '',
      ].join('\n'),
    });
    const screenshot = await page.screenshot({
      animations: 'disabled',
      caret: 'hide',
      fullPage: true,
      path: testInfo.outputPath(`media-complete-${name}`),
    });
    const contractKey = `${name}::${testInfo.project.name}`;
    verifyVisualSignature(
      await visualSignature(page, screenshot),
      (mediaCompleteSignatures as Readonly<Record<string, VisualSignature>>)[contractKey],
      contractKey,
    );
  } else {
    await expect(page).toHaveScreenshot(name, { fullPage: true });
  }
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
  await page.getByRole('button', { name: 'Kerti mentés: Mimi' }).click({ force: true });
  await expect(page.getByRole('heading', { name: 'Mimi a fán' })).toBeVisible();
  await settleVisual(page);

  await verifyReviewedVisual(page, 'mission-first-step.png', testInfo);
  expect(browserErrors).toEqual([]);
});

test('@visual shows the deterministic ladder guidance', async ({ page }, testInfo) => {
  const browserErrors = observeUnexpectedBrowserErrors(page);
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.clock.install();
  await page.goto('/');
  await page.evaluate((hintDelayMs) => {
    const originalSetTimeout = window.setTimeout.bind(window);
    window.setTimeout = ((handler: TimerHandler, timeout?: number, ...arguments_: unknown[]) => {
      const timer = originalSetTimeout(handler, timeout, ...arguments_);
      if (timeout === hintDelayMs) {
        document.documentElement.dataset['hintTimer'] = 'armed';
      }
      return timer;
    }) as typeof window.setTimeout;
  }, firstMissionHintDelayMs);
  await page.getByRole('button', { name: 'Magyar' }).click();
  await page.getByRole('button', { name: 'Játék' }).click();
  await page.getByRole('button', { name: 'Kerti mentés: Mimi' }).click({ force: true });
  await expect(page.getByRole('heading', { name: 'Mimi a fán' })).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('data-hint-timer', 'armed');
  await pauseVisualClock(page);
  await page.clock.fastForward(firstMissionHintDelayMs);
  await expect(page.locator('.drag-ghost-hand')).toBeVisible();
  await settleVisual(page);

  await verifyReviewedVisual(page, 'mission-ladder-hint.png', testInfo);
  expect(browserErrors).toEqual([]);
});

test('@visual shows clear reduced-motion guidance for both mission steps', async ({
  page,
}, testInfo) => {
  const browserErrors = observeUnexpectedBrowserErrors(page);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.clock.install();
  await page.goto('/');
  await page.evaluate((hintDelayMs) => {
    const originalSetTimeout = window.setTimeout.bind(window);
    window.setTimeout = ((handler: TimerHandler, timeout?: number, ...arguments_: unknown[]) => {
      const timer = originalSetTimeout(handler, timeout, ...arguments_);
      if (timeout === hintDelayMs) {
        document.documentElement.dataset['reducedMotionHintTimer'] = 'armed';
      }
      return timer;
    }) as typeof window.setTimeout;
  }, firstMissionHintDelayMs);
  await page.getByRole('button', { name: 'Magyar' }).click();
  await page.getByRole('button', { name: 'Játék' }).click();
  await page.getByRole('button', { name: 'Kerti mentés: Mimi' }).click({ force: true });
  const ladder = page.getByRole('button', { name: 'Húzd a létrát a fához!' });
  const dragInteraction = page.locator('.drag-interaction');

  await expect(page.locator('html')).toHaveAttribute('data-reduced-motion-hint-timer', 'armed');
  await pauseVisualClock(page);
  await page.clock.fastForward(firstMissionHintDelayMs);
  await expect(dragInteraction).toHaveAttribute('data-guidance', 'true');
  await expect(dragInteraction).toHaveAttribute('data-guidance-mode', 'static');
  await expect(page.locator('.drag-ghost-hand')).toHaveCount(0);
  await expect(page.locator('.ladder-target')).toHaveCSS('animation-name', 'none');
  await settleVisual(page);
  await verifyReviewedVisual(page, 'mission-ladder-reduced-motion.png', testInfo);

  await page.evaluate(() => {
    delete document.documentElement.dataset['reducedMotionHintTimer'];
  });
  await dragLadder({
    destination: 'target',
    ladder,
    page,
    pointerType: testInfo.project.use.hasTouch ? 'touch' : 'mouse',
  });
  const mimi = page.getByRole('button', { name: 'Koppints Mimire!' });
  await expect(page.locator('html')).toHaveAttribute('data-reduced-motion-hint-timer', 'armed');
  await page.clock.fastForward(firstMissionHintDelayMs);
  await expect(dragInteraction).toHaveAttribute('data-guidance', 'false');
  await expect(mimi).toHaveAttribute('data-guidance', 'true');
  await expect(mimi).toHaveAttribute('data-guidance-mode', 'static');
  await expect(page.locator('.drag-ghost-hand')).toHaveCount(0);
  await expect(mimi.locator('.tap-remove-visual')).toHaveCSS('animation-name', 'none');
  await settleVisual(page);
  await verifyReviewedVisual(page, 'mission-mimi-reduced-motion.png', testInfo);
  expect(browserErrors).toEqual([]);
});

test('@visual shows the ladder snapped to the tree', async ({ page }, testInfo) => {
  const browserErrors = observeUnexpectedBrowserErrors(page);
  await page.clock.install();
  await page.goto('/');
  await page.getByRole('button', { name: 'Magyar' }).click();
  await page.getByRole('button', { name: 'Játék' }).click();
  await page.getByRole('button', { name: 'Kerti mentés: Mimi' }).click();
  await pauseVisualClock(page);
  const ladder = page.getByRole('button', { name: 'Húzd a létrát a fához!' });
  await dragLadder({
    destination: 'target',
    ladder,
    page,
    pointerType: testInfo.project.use.hasTouch ? 'touch' : 'mouse',
  });
  await expect(ladder).toHaveCount(0);
  await expect(page.locator('.drag-interaction')).toHaveAttribute('data-phase', 'placed');
  await expect(page.locator('.drag-interaction')).toHaveAttribute('data-interactive', 'false');
  await settleVisual(page);

  await verifyReviewedVisual(page, 'mission-ladder-placed.png', testInfo);
  expect(browserErrors).toEqual([]);
});

test('@visual shows Mimi descending before celebration', async ({ page }, testInfo) => {
  const browserErrors = observeUnexpectedBrowserErrors(page);
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.clock.install();
  await page.goto('/');
  await page.getByRole('button', { name: 'Magyar' }).click();
  await page.getByRole('button', { name: 'Játék' }).click();
  await page.getByRole('button', { name: 'Kerti mentés: Mimi' }).click({ force: true });
  const ladder = page.getByRole('button', { name: 'Húzd a létrát a fához!' });
  await dragLadder({
    destination: 'target',
    ladder,
    page,
    pointerType: testInfo.project.use.hasTouch ? 'touch' : 'mouse',
  });
  await pauseVisualClock(page);
  await page.getByRole('button', { name: 'Koppints Mimire!' }).click();
  const rescueMotion = page.locator('.mission-kitten-rescue');
  await expect(rescueMotion).toBeVisible();
  await freezeRescueAtEnd(rescueMotion);
  await settleVisual(page);

  await verifyReviewedVisual(page, 'mission-mimi-rescuing.png', testInfo);
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
  await page.clock.pauseAt((await page.evaluate(() => Date.now())) + 1_000);
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
      ".mission-back[data-holding='true']::after { scale: 0.55 1 !important; transition: none !important; }",
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
  await expect(page.getByRole('heading', { name: 'Mimi biztonságban van!' })).toBeVisible();
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
