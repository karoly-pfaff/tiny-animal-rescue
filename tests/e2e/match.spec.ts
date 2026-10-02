import { expect, test } from '@playwright/test';

import { observeUnexpectedBrowserErrors } from './support/browser-errors';
import { interactionFixtureUrl } from './support/fixture-url';
import { activateWithPrimaryPointer, cancelPrimaryPointerOutside } from './support/pointer';

test('@preview matches three visually distinct pairs in any order', async ({ page }, testInfo) => {
  const browserErrors = observeUnexpectedBrowserErrors(page);
  const hasTouch = Boolean(testInfo.project.use.hasTouch);
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto(interactionFixtureUrl('match'));
  const roundSource = page.getByRole('button', { name: 'Round toy' });
  const roundTarget = page.getByRole('button', { name: 'Round basket' });
  const triangleSource = page.getByRole('button', { name: 'Triangle toy' });
  const triangleTarget = page.getByRole('button', { name: 'Triangle basket' });
  const squareSource = page.getByRole('button', { name: 'Square toy' });
  const squareTarget = page.getByRole('button', { name: 'Square basket' });

  await expect(page.locator('.fixture-match-cue-round')).toHaveCount(2);
  await expect(page.locator('.fixture-match-cue-triangle')).toHaveCount(2);
  await expect(page.locator('.fixture-match-cue-square')).toHaveCount(2);

  await cancelPrimaryPointerOutside({ hasTouch, locator: roundSource, page });
  await expect(roundSource).toHaveAttribute('aria-pressed', 'false');

  await activateWithPrimaryPointer(triangleTarget, hasTouch);
  await activateWithPrimaryPointer(triangleSource, hasTouch);
  await expect(triangleSource).toBeDisabled();
  await expect(triangleTarget).toBeDisabled();

  await activateWithPrimaryPointer(roundSource, hasTouch);
  const wrongVisual = squareTarget.locator('.match-item-visual');
  const beforeWrong = await wrongVisual.boundingBox();
  await activateWithPrimaryPointer(squareTarget, hasTouch);
  await expect(roundSource).toHaveAttribute('aria-pressed', 'true');
  await expect(squareTarget).toHaveAttribute('data-incorrect', 'true');
  await wrongVisual.evaluate((element) => {
    const animation = element.getAnimations()[0];
    if (animation === undefined) {
      throw new Error('Match wrong-action animation is missing.');
    }
    animation.pause();
    animation.currentTime = 98;
  });
  const duringWrong = await wrongVisual.boundingBox();
  expect(beforeWrong).not.toBeNull();
  expect(duringWrong).not.toBeNull();
  if (beforeWrong === null || duringWrong === null) {
    throw new Error('Match wrong-action geometry must remain measurable.');
  }
  expect(Math.abs(duringWrong.y - beforeWrong.y)).toBeLessThan(1);
  expect(Math.abs(duringWrong.x - beforeWrong.x)).toBeGreaterThan(2);
  expect(Math.abs(duringWrong.x - beforeWrong.x)).toBeLessThan(8);
  if (testInfo.project.name === 'chromium-1024x768') {
    await page.screenshot({ path: 'build/reports/playwright/match-wrong-action-1024x768.png' });
  }
  await activateWithPrimaryPointer(roundTarget, hasTouch);
  await expect(roundSource).toBeDisabled();

  await activateWithPrimaryPointer(squareTarget, hasTouch);
  await activateWithPrimaryPointer(squareSource, hasTouch);
  await expect(page.locator('.match-interaction')).toHaveAttribute('data-complete', 'true');
  await expect(page.locator('main')).toHaveAttribute('data-completion-count', '1');
  expect(browserErrors).toEqual([]);
});
