import { expect, type Page } from '@playwright/test';

import { dragLadder } from './ladder-drag';
import { activateWithPrimaryPointer } from './pointer';

type RescueLocale = 'en' | 'hu';

type RescueInteraction = Readonly<{
  force?: boolean;
  hasTouch: boolean;
  locale: RescueLocale;
}>;

const labels = {
  en: {
    call: 'Mimi in the tree — Garden',
    celebration: 'Mimi is safe!',
    ladder: 'Move the ladder to the tree!',
    mimi: 'Tap Mimi!',
    mission: 'Garden rescue: Mimi',
  },
  hu: {
    call: 'Mimi a fán — Kert',
    celebration: 'Mimi biztonságban van!',
    ladder: 'Húzd a létrát a fához!',
    mimi: 'Koppints Mimire!',
    mission: 'Kerti mentés: Mimi',
  },
} as const;

export async function openFirstRescueCallSheet(
  page: Page,
  interaction: RescueInteraction,
): Promise<void> {
  const { force, hasTouch, locale } = interaction;
  await activateWithPrimaryPointer(
    page.getByRole('button', { name: labels[locale].mission }),
    hasTouch,
    force === undefined ? {} : { force },
  );
}

export async function activateFirstRescueCall(
  page: Page,
  interaction: RescueInteraction,
): Promise<void> {
  const { force, hasTouch, locale } = interaction;
  await activateWithPrimaryPointer(
    page.getByRole('button', { name: labels[locale].call }),
    hasTouch,
    force === undefined ? {} : { force },
  );
}

export async function openFirstRescueMission(
  page: Page,
  interaction: RescueInteraction,
): Promise<void> {
  await openFirstRescueCallSheet(page, interaction);
  await activateFirstRescueCall(page, interaction);
}

export async function completeFirstRescue(
  page: Page,
  hasTouch: boolean,
  locale: RescueLocale,
): Promise<void> {
  const localized = labels[locale];
  await openFirstRescueMission(page, { hasTouch, locale });
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
