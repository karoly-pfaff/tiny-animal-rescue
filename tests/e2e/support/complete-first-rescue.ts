import { expect, type Page } from '@playwright/test';

import { dragLadder } from './ladder-drag';
import { activateWithPrimaryPointer } from './pointer';

type RescueLocale = 'en' | 'hu';

const labels = {
  en: {
    celebration: 'Mimi is rescued!',
    ladder: 'Move the ladder to the tree',
    mimi: 'Help Mimi come down',
    mission: 'Garden rescue: Mimi',
  },
  hu: {
    celebration: 'Mimi megmenekült!',
    ladder: 'Tedd a létrát a fához',
    mimi: 'Segíts Miminek lejönni',
    mission: 'Kerti mentés: Mimi',
  },
} as const;

export async function completeFirstRescue(
  page: Page,
  hasTouch: boolean,
  locale: RescueLocale,
): Promise<void> {
  const localized = labels[locale];
  await activateWithPrimaryPointer(page.getByRole('button', { name: localized.mission }), hasTouch);
  const ladder = page.getByRole('button', { name: localized.ladder });
  await dragLadder({
    destination: 'target',
    ladder,
    page,
    pointerType: hasTouch ? 'touch' : 'mouse',
  });
  await activateWithPrimaryPointer(page.getByRole('button', { name: localized.mimi }), hasTouch);
  await expect(page.getByRole('heading', { name: localized.celebration })).toBeVisible();
}
