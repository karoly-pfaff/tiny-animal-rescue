import { expect, test, type Locator, type Page } from '@playwright/test';

import { observeUnexpectedBrowserErrors } from './support/browser-errors';
import { writePrimarySave } from './support/save-game';

type Bounds = NonNullable<Awaited<ReturnType<Locator['boundingBox']>>>;

test('@preview navigates all shelter areas by arrows and scene-only swipe', async ({
  page,
}, testInfo) => {
  const browserErrors = observeUnexpectedBrowserErrors(page);
  const lockedResidentRequests: string[] = [];
  page.on('request', (request) => {
    if (request.url().includes('/images/residents/')) {
      lockedResidentRequests.push(request.url());
    }
  });
  await openShelter(page, 'en', []);

  await expect(page.getByRole('heading', { name: 'Indoor Room' })).toBeVisible();
  await expect(page.locator('.shelter-resident')).toHaveCount(0);
  await page.getByRole('button', { name: 'Next shelter area' }).click();
  await expect(page.getByRole('heading', { name: 'Garden' })).toBeVisible();
  await expect(page.getByText('The first rescued animal will live here.')).toBeVisible();

  const garden = page.getByRole('region', { name: 'Garden' });
  await dispatchSwipe(garden, {
    endX: 400,
    hasTouch: Boolean(testInfo.project.use.hasTouch),
    startX: 500,
  });
  await expect(page.getByRole('heading', { name: 'Pondside' })).toBeVisible();

  const repeat = page.getByRole('button', { name: 'Hear area name' });
  await dispatchSwipe(repeat, {
    endX: 400,
    hasTouch: Boolean(testInfo.project.use.hasTouch),
    startX: 500,
  });
  await expect(page.getByRole('heading', { name: 'Pondside' })).toBeVisible();
  await repeat.click();
  await expect(page.getByRole('heading', { name: 'Pondside' })).toBeVisible();
  await page.getByRole('button', { name: 'Previous shelter area' }).click();
  await expect(page.getByRole('heading', { name: 'Garden' })).toBeVisible();
  expect(lockedResidentRequests).toEqual([]);
  expect(browserErrors).toEqual([]);
});

test('@preview keeps four shelter resident hit regions and controls disjoint', async ({ page }) => {
  const browserErrors = observeUnexpectedBrowserErrors(page);
  await openShelter(page, 'hu', ['mimi-kitten']);
  await expect(page.getByRole('button', { name: 'Simogasd meg Mimit' })).toBeVisible();

  await page.locator('.shelter-residents').evaluate((container) => {
    const resident = container.querySelector('.shelter-resident');
    if (!(resident instanceof HTMLElement)) {
      throw new Error('The geometry fixture requires one real resident.');
    }
    for (let index = 2; index <= 4; index += 1) {
      const clone = resident.cloneNode(true);
      if (!(clone instanceof HTMLElement)) {
        throw new Error('The resident clone must be an HTML element.');
      }
      clone.setAttribute('aria-label', `Geometry resident ${String(index)}`);
      clone.dataset['shelterSlot'] = String(index);
      clone.style.gridColumn = String(((index - 1) % 2) + 1);
      clone.style.gridRow = String(Math.floor((index - 1) / 2) + 1);
      container.append(clone);
    }
  });

  const residents = await page.locator('.shelter-resident').all();
  const residentBounds = await Promise.all(residents.map(requiredBounds));
  expect(residentBounds).toHaveLength(4);
  for (const [index, bounds] of residentBounds.entries()) {
    expect(bounds.width).toBeGreaterThanOrEqual(44);
    expect(bounds.height).toBeGreaterThanOrEqual(44);
    for (const other of residentBounds.slice(index + 1)) {
      expect(overlaps(bounds, other)).toBe(false);
    }
  }

  const controls = await Promise.all(
    [
      page.locator('.shelter-title-plaque'),
      page.getByRole('button', { name: 'Előző menhelyterület' }),
      page.getByRole('button', { name: 'Következő menhelyterület' }),
      page.getByRole('button', { name: 'Terület nevének meghallgatása' }),
      page.getByRole('button', { name: 'Térkép' }),
    ].map(requiredBounds),
  );
  for (const resident of residentBounds) {
    for (const control of controls) {
      expect(overlaps(resident, control)).toBe(false);
    }
  }
  for (const [index, control] of controls.entries()) {
    for (const other of controls.slice(index + 1)) {
      expect(overlaps(control, other)).toBe(false);
    }
  }
  expect(browserErrors).toEqual([]);
});

async function openShelter(
  page: Page,
  locale: 'hu' | 'en',
  unlockedResidentIds: readonly string[],
): Promise<void> {
  await page.goto('/');
  await page.getByRole('button', { name: locale === 'hu' ? 'Magyar' : 'English' }).click();
  const timestamp = '2026-10-01T00:00:00.000Z';
  await writePrimarySave(page, {
    completedMissionIds: unlockedResidentIds.length === 0 ? [] : ['garden-kitten-tree'],
    createdAt: timestamp,
    locale,
    schemaVersion: 1,
    settings: {
      effectsVolume: 1,
      musicVolume: 1,
      narrationVolume: 1,
      reducedMotion: false,
    },
    unlockedResidentIds,
    updatedAt: timestamp,
    worldFlags: unlockedResidentIds.length === 0 ? [] : ['mimi-rescued'],
  });
  await page.goto('/#/shelter');
  await page.reload();
}

async function dispatchSwipe(
  target: Locator,
  gesture: Readonly<{ endX: number; hasTouch: boolean; startX: number }>,
): Promise<void> {
  const pointerType = gesture.hasTouch ? 'touch' : 'mouse';
  await target.dispatchEvent('pointerdown', {
    button: 0,
    clientX: gesture.startX,
    isPrimary: true,
    pointerId: 7,
    pointerType,
  });
  await target.dispatchEvent('pointerup', {
    button: 0,
    clientX: gesture.endX,
    isPrimary: true,
    pointerId: 7,
    pointerType,
  });
}

async function requiredBounds(locator: Locator): Promise<Bounds> {
  const bounds = await locator.boundingBox();
  if (bounds === null) {
    throw new Error('Expected visible geometry is unavailable.');
  }
  return bounds;
}

function overlaps(left: Bounds, right: Bounds): boolean {
  return !(
    left.x + left.width <= right.x ||
    right.x + right.width <= left.x ||
    left.y + left.height <= right.y ||
    right.y + right.height <= left.y
  );
}
