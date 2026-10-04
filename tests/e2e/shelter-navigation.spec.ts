import type { Locator, Page, TestInfo } from '@playwright/test';

import { observeUnexpectedBrowserErrors } from './support/browser-errors';
import { writePrimarySave } from './support/save-game';
import { createScreenshotDigest } from './support/screenshot-stability';
import { expect, test } from './support/muted-test';

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

const baseResidentIdsByArea = {
  'indoor-room': ['mimi-kitten', 'morzsi-puppy', 'pipi-chick', 'csipi-bird'],
  'shelter-garden': ['suni-hedgehog', 'makk-squirrel', 'pamacs-lamb', 'rozi-fawn'],
  pondside: ['toto-turtle', 'kiki-duckling', 'breki-frog', 'habi-fish'],
} as const;

const shelterProofs = [
  localizedShelterProof('en', 'Next shelter area', {
    'indoor-room': ['Mimi', 'Biscuit', 'Pipi', 'Peep'],
    'shelter-garden': ['Prickle', 'Acorn', 'Floss', 'Rosie'],
    pondside: ['Toto', 'Kiki', 'Hoppy', 'Bubbles'],
  }),
  localizedShelterProof('hu', 'Következő menhelyterület', {
    'indoor-room': ['Mimi', 'Morzsi', 'Pipi', 'Csipi'],
    'shelter-garden': ['Süni', 'Makk', 'Pamacs', 'Rozi'],
    pondside: ['Totó', 'Kiki', 'Breki', 'Habi'],
  }),
] as const;

for (const proof of shelterProofs) {
  test(`@preview captures ${proof.locale} empty, partial, and complete shelter proof`, async ({
    page,
  }, testInfo) => {
    const browserErrors = observeUnexpectedBrowserErrors(page);

    await openShelter(page, proof.locale, []);
    await expect(page.locator('.shelter-resident')).toHaveCount(0);
    await attachShelterScreenshot(page, testInfo, `${proof.locale}-empty-indoor-room`);

    await openShelter(page, proof.locale, ['mimi-kitten', 'makk-squirrel', 'toto-turtle']);
    await expectResidentNames(page, [requiredProofResident(proof.areas['indoor-room'], 0).name]);
    await attachShelterScreenshot(page, testInfo, `${proof.locale}-partial-indoor-room`);
    await page.getByRole('button', { name: proof.nextAreaLabel }).click();
    await expectResidentNames(page, [requiredProofResident(proof.areas['shelter-garden'], 1).name]);
    await attachShelterScreenshot(page, testInfo, `${proof.locale}-partial-garden`);

    await openShelter(
      page,
      proof.locale,
      Object.values(proof.areas).flatMap((residents) => residents.map(({ id }) => id)),
    );
    for (const [areaId, residents] of Object.entries(proof.areas)) {
      await expect(page.locator('.shelter-area')).toHaveAttribute('data-shelter-area-id', areaId);
      await expectResidentNames(
        page,
        residents.map(({ name }) => name),
      );
      await expectResidentLabelsDisjoint(page);
      await attachShelterScreenshot(page, testInfo, `${proof.locale}-complete-${areaId}`);
      if (areaId !== 'pondside') {
        await page.getByRole('button', { name: proof.nextAreaLabel }).click();
      }
    }

    expect(browserErrors).toEqual([]);
  });

  test(`@visual reviews ${proof.locale} partial and complete Garden fallback states`, async ({
    page,
  }) => {
    const browserErrors = observeUnexpectedBrowserErrors(page);

    await openShelter(page, proof.locale, ['mimi-kitten', 'makk-squirrel', 'toto-turtle']);
    await page.getByRole('button', { name: proof.nextAreaLabel }).click();
    await waitForStableShelterFrame(page);
    await expect(page).toHaveScreenshot(`shelter-${proof.locale}-partial-garden.png`, {
      fullPage: true,
      maxDiffPixels: 300,
    });

    await openShelter(
      page,
      proof.locale,
      Object.values(proof.areas).flatMap((residents) => residents.map(({ id }) => id)),
    );
    await page.getByRole('button', { name: proof.nextAreaLabel }).click();
    await waitForStableShelterFrame(page);
    await expect(page).toHaveScreenshot(`shelter-${proof.locale}-complete-garden.png`, {
      fullPage: true,
      maxDiffPixels: 300,
    });

    expect(browserErrors).toEqual([]);
  });
}

async function openShelter(
  page: Page,
  locale: 'hu' | 'en',
  unlockedResidentIds: readonly string[],
): Promise<void> {
  await page.goto('/');
  await expect(page.locator('main[data-route="start"]')).toBeVisible();
  const localeChoice = page.getByRole('button', { name: locale === 'hu' ? 'Magyar' : 'English' });
  const readyStart = page.getByRole('button', { name: locale === 'hu' ? 'Játék' : 'Play' });
  await expect
    .poll(
      async () => {
        const localeChoiceVisible = await localeChoice.isVisible();
        const startReady = (await readyStart.count()) === 1 && (await readyStart.isEnabled());
        return localeChoiceVisible || startReady;
      },
      { message: 'Wait for locale bootstrap before preparing shelter test state.' },
    )
    .toBe(true);
  if (await localeChoice.isVisible()) {
    await localeChoice.click();
    await expect(localeChoice).toBeHidden();
    await expect(readyStart).toBeEnabled();
  }
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

async function attachShelterScreenshot(
  page: Page,
  testInfo: TestInfo,
  name: string,
): Promise<void> {
  await waitForStableShelterFrame(page);
  const screenshot = await captureStableShelterScreenshot(page);
  await testInfo.attach(name, {
    body: screenshot,
    contentType: 'image/png',
  });
}

async function captureStableShelterScreenshot(page: Page): Promise<Buffer> {
  let previous = await page.screenshot({ fullPage: true });
  for (let attempt = 0; attempt < 4; attempt += 1) {
    await waitForNextPaint(page);
    const current = await page.screenshot({ fullPage: true });
    if (createScreenshotDigest(current) === createScreenshotDigest(previous)) {
      return current;
    }
    previous = current;
  }
  throw new Error('The shelter surface did not reach two identical painted frames.');
}

async function waitForStableShelterFrame(page: Page): Promise<void> {
  await page.evaluate(async () => {
    await document.fonts.ready;
  });
  await waitForNextPaint(page);
  await expect(page.locator('.shelter-area-arrow-icon')).toHaveCount(2);
  await expect(page.locator('.shelter-area-repeat .mission-repeat-icon')).toBeVisible();
  const residentFace = page.locator('.shelter-resident-face').first();
  if (await residentFace.isVisible()) {
    await expect(residentFace).toHaveCSS('background-image', /radial-gradient/u);
  }
}

async function waitForNextPaint(page: Page): Promise<void> {
  await page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            resolve();
          });
        });
      }),
  );
}

async function expectResidentNames(page: Page, expectedNames: readonly string[]): Promise<void> {
  await expect(page.locator('.shelter-resident')).toHaveCount(expectedNames.length);
  await expect(page.locator('.shelter-resident > span:last-child')).toHaveText(expectedNames);
}

async function expectResidentLabelsDisjoint(page: Page): Promise<void> {
  const labels = await page.locator('.shelter-resident > span:last-child').all();
  const bounds = await Promise.all(labels.map(requiredBounds));
  for (const [index, label] of bounds.entries()) {
    for (const other of bounds.slice(index + 1)) {
      expect(overlaps(label, other)).toBe(false);
    }
  }
}

function localizedShelterProof(
  locale: 'hu' | 'en',
  nextAreaLabel: string,
  namesByArea: Readonly<Record<keyof typeof baseResidentIdsByArea, readonly string[]>>,
) {
  return {
    locale,
    nextAreaLabel,
    areas: {
      'indoor-room': localizedResidents('indoor-room', namesByArea['indoor-room']),
      'shelter-garden': localizedResidents('shelter-garden', namesByArea['shelter-garden']),
      pondside: localizedResidents('pondside', namesByArea.pondside),
    },
  };
}

function localizedResidents(
  areaId: keyof typeof baseResidentIdsByArea,
  names: readonly string[],
): readonly Readonly<{ id: string; name: string }>[] {
  return baseResidentIdsByArea[areaId].map((id, index) => ({
    id,
    name: requiredProofName(names, index, areaId),
  }));
}

function requiredProofName(names: readonly string[], index: number, areaId: string): string {
  const name = names[index];
  if (name === undefined) {
    throw new Error(`Missing localized shelter proof name ${String(index)} for ${areaId}.`);
  }
  return name;
}

function requiredProofResident(
  residents: readonly Readonly<{ id: string; name: string }>[],
  index: number,
): Readonly<{ id: string; name: string }> {
  const resident = residents[index];
  if (resident === undefined) {
    throw new Error(`Missing shelter proof resident ${String(index)}.`);
  }
  return resident;
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
