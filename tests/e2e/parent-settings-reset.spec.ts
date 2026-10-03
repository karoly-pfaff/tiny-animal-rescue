import AxeBuilder from '@axe-core/playwright';
import type { Page } from '@playwright/test';

import { observeUnexpectedBrowserErrors } from './support/browser-errors';
import { expect, test } from './support/muted-test';
import { readPrimarySave, writePrimarySave } from './support/save-game';

const seededSave = {
  completedMissionIds: ['garden-kitten-tree'],
  createdAt: '2026-10-01T07:00:00.000Z',
  locale: 'en',
  schemaVersion: 1,
  settings: {
    effectsVolume: 0.2,
    musicVolume: 0.3,
    narrationVolume: 0.4,
    reducedMotion: true,
  },
  unlockedResidentIds: ['mimi-kitten'],
  updatedAt: '2026-10-01T07:00:00.000Z',
  worldFlags: ['mimi-rescued'],
} as const;

test('@preview resets progress and full state only through the adult confirmations', async ({
  page,
}, testInfo) => {
  await page.clock.install();
  const browserErrors = observeUnexpectedBrowserErrors(page);
  await page.goto('/');
  await page.getByRole('button', { name: 'English' }).click();
  await writePrimarySave(page, seededSave);
  await page.reload();
  await page.getByRole('button', { name: 'Parent settings' }).click();
  await expectNoAccessibilityViolations(page);

  const gate = page.getByRole('button', { name: 'Press and hold' });
  const pointerType = testInfo.project.use.hasTouch === true ? 'touch' : 'mouse';
  await gate.dispatchEvent('pointerdown', {
    button: 0,
    buttons: 1,
    isPrimary: true,
    pointerId: 1,
    pointerType,
  });
  await page.clock.runFor(900);
  await gate.dispatchEvent('pointerup', {
    button: 0,
    isPrimary: true,
    pointerId: 1,
    pointerType,
  });
  await page.clock.runFor(2000);
  await expect(page.getByRole('button', { name: /Start the game again/u })).toBeHidden();

  await gate.dispatchEvent('pointerdown', {
    button: 0,
    buttons: 1,
    isPrimary: true,
    pointerId: 2,
    pointerType,
  });
  await page.clock.runFor(900);
  await gate.dispatchEvent('pointercancel', {
    button: 0,
    isPrimary: true,
    pointerId: 2,
    pointerType,
  });
  await page.clock.runFor(2000);
  await expect(page.getByRole('button', { name: /Start the game again/u })).toBeHidden();

  await gate.dispatchEvent('pointerdown', {
    button: 0,
    buttons: 1,
    isPrimary: true,
    pointerId: 3,
    pointerType,
  });
  await page.clock.runFor(2000);

  await expectNoAccessibilityViolations(page);
  await page.getByRole('button', { name: /Start the game again/u }).click();
  await expect(page.getByRole('dialog', { name: 'Start the game again?' })).toBeVisible();
  await expectNoAccessibilityViolations(page);
  await page.getByRole('button', { name: 'Reset progress' }).click();
  await expect(page.getByRole('status')).toContainText('Settings stayed unchanged');
  await expect
    .poll(() => readPrimarySave(page))
    .toMatchObject({
      completedMissionIds: [],
      locale: 'en',
      settings: seededSave.settings,
      unlockedResidentIds: [],
      worldFlags: [],
    });

  await page.getByRole('button', { name: /^Reset everything/u }).click();
  await expect(page.getByRole('dialog', { name: 'Reset everything?' })).toBeVisible();
  await page.getByRole('dialog').getByRole('button', { name: 'Reset everything' }).click();

  await expect(page.getByRole('dialog', { name: 'Válassz nyelvet' })).toBeVisible();
  await expect
    .poll(() => readPrimarySave(page))
    .toMatchObject({
      completedMissionIds: [],
      locale: 'en',
      settings: {
        effectsVolume: 1,
        musicVolume: 0.7,
        narrationVolume: 1,
        reducedMotion: false,
      },
      unlockedResidentIds: [],
      worldFlags: [],
    });
  expect(browserErrors).toEqual([]);
});

async function expectNoAccessibilityViolations(page: Page): Promise<void> {
  const accessibility = await new AxeBuilder({ page }).analyze();
  expect(accessibility.violations).toEqual([]);
}
