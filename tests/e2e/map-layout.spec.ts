import type { Locator } from '@playwright/test';

import { observeUnexpectedBrowserErrors } from './support/browser-errors';
import { mapFixtureUrl } from './support/fixture-url';
import { expect, test } from './support/muted-test';
import {
  expectMapInteractionLayout,
  expectMapLayout,
  expectMissionCallLayout,
} from './support/map-layout';

const allMissionIds = [
  'garden-kitten-tree',
  'forest-hedgehog-branches',
  'farm-chick-find-mother',
  'garden-puppy-tangled-leash',
  'forest-bird-nest',
  'pond-turtle-find-water',
  'farm-lamb-fence',
  'garden-frog-too-dry',
  'forest-squirrel-lost-acorns',
  'pond-duckling-reeds',
  'forest-fawn-stuck-twig',
  'pond-fish-small-puddle',
  'farm-piglet-mud-wash',
  'pond-clear-litter',
  'garden-mimi-find-ball',
  'forest-suni-picnic',
] as const;

const seededStates = [
  {
    availableMissionIds: ['garden-kitten-tree'],
    callCount: 1,
    completedMissionIds: [],
    featuredLocationId: 'garden',
    landmarkCount: 2,
    locationLabel: 'Garden rescue: Mimi',
    regionName: 'Garden',
    seed: 'new-save',
    visibleLocationIds: ['garden'],
  },
  {
    availableMissionIds: [
      'garden-kitten-tree',
      'forest-hedgehog-branches',
      'farm-chick-find-mother',
      'garden-mimi-find-ball',
    ],
    callCount: 1,
    completedMissionIds: ['garden-kitten-tree'],
    featuredLocationId: 'forest',
    landmarkCount: 4,
    locationLabel: 'Forest rescues',
    regionName: 'Forest',
    seed: 'post-tutorial',
    visibleLocationIds: ['farm', 'forest', 'garden'],
  },
  {
    availableMissionIds: [
      'garden-kitten-tree',
      'forest-hedgehog-branches',
      'farm-chick-find-mother',
      'garden-puppy-tangled-leash',
      'pond-turtle-find-water',
      'garden-mimi-find-ball',
      'forest-suni-picnic',
    ],
    callCount: 1,
    completedMissionIds: [
      'garden-kitten-tree',
      'forest-hedgehog-branches',
      'farm-chick-find-mother',
    ],
    featuredLocationId: 'garden',
    landmarkCount: 5,
    locationLabel: 'Pond rescues',
    regionName: 'Pond',
    seed: 'three-rescue',
    visibleLocationIds: ['farm', 'forest', 'garden', 'pond'],
  },
  {
    availableMissionIds: allMissionIds,
    callCount: 5,
    completedMissionIds: allMissionIds,
    featuredLocationId: null,
    landmarkCount: 5,
    locationLabel: 'Forest rescues',
    regionName: 'Forest',
    seed: 'all-complete',
    visibleLocationIds: ['farm', 'forest', 'garden', 'pond'],
  },
] as const;

for (const locale of ['hu', 'en'] as const) {
  test(`lays out every ${locale.toUpperCase()} map landmark without overlap`, async ({ page }) => {
    const browserErrors = observeUnexpectedBrowserErrors(page);
    await page.goto(mapFixtureUrl(locale));

    await expect(page.locator('.map-landmark')).toHaveCount(5);
    await expectMapLayout(page);
    await page
      .getByRole('button', { name: locale === 'hu' ? 'Erdei mentések' : 'Forest rescues' })
      .click();
    await expect(page.locator('.map-fixture')).toHaveAttribute(
      'data-selected-location-id',
      'forest',
    );
    await expect(page.locator('.map-fixture')).toHaveAttribute(
      'data-last-cue',
      'effects.ambience.forest',
    );
    expect(browserErrors).toEqual([]);
  });
}

for (const state of seededStates) {
  test(`derives and navigates the ${state.seed} map state`, async ({ page }) => {
    const browserErrors = observeUnexpectedBrowserErrors(page);
    await page.goto(mapFixtureUrl('en', state.seed));
    const fixture = page.locator('.map-fixture');

    await expect(page.locator('.map-landmark')).toHaveCount(state.landmarkCount);
    await expect(fixture).toHaveAttribute(
      'data-visible-location-ids',
      state.visibleLocationIds.join(','),
    );
    await expect(fixture).toHaveAttribute(
      'data-available-mission-ids',
      state.availableMissionIds.join(','),
    );
    await expect(fixture).toHaveAttribute(
      'data-completed-mission-ids',
      state.completedMissionIds.join(','),
    );
    const featuredLocation = page.locator('.map-location-landmark[data-active-call="true"]');
    if (state.featuredLocationId === null) {
      await expect(featuredLocation).toHaveCount(0);
    } else {
      await expect(featuredLocation).toHaveAttribute('data-location-id', state.featuredLocationId);
    }
    await expectMapLayout(page);
    await page.getByRole('button', { name: state.locationLabel }).click();
    const sheet = page.getByRole('region', { name: state.regionName });
    await expect(sheet).toBeVisible();
    await expect(sheet.locator('.mission-call-card')).toHaveCount(state.callCount);
    if (state.seed === 'all-complete') {
      await expect(sheet.locator('.mission-call-card[data-completed="true"]')).toHaveCount(
        state.callCount,
      );
    }
    await expectLoadedPortraits(sheet.locator('.mission-call-portrait'), state.callCount);
    await expectMissionCallLayout(page);
    await expectMapInteractionLayout(page);
    expect(browserErrors).toEqual([]);
  });
}

test('@preview keeps every all-complete call target separate across supported sizes', async ({
  page,
}) => {
  const browserErrors = observeUnexpectedBrowserErrors(page);
  await page.goto(mapFixtureUrl('en', 'all-complete'));
  const locations = [
    ['Garden rescue: Mimi', 'Garden', 4, 0],
    ['Forest rescues', 'Forest', 5, 0],
    ['Farm rescues', 'Farm', 3, 1],
    ['Pond rescues', 'Pond', 4, 1],
  ] as const;

  for (const [label, region, callCount, worldCallCount] of locations) {
    await page.getByRole('button', { name: label }).click();
    const sheet = page.getByRole('region', { name: region });
    await expect(sheet.getByRole('button')).toHaveCount(callCount + 1);
    await expectLoadedPortraits(sheet.locator('.mission-call-portrait'), callCount);
    await expect(sheet.locator('img[src$="/fixture-assets/world-subject.png"]')).toHaveCount(
      worldCallCount,
    );
    await expect(sheet.locator('img[src$="/fixture-assets/resident-subject.png"]')).toHaveCount(
      callCount - worldCallCount,
    );
    await expectMissionCallLayout(page);
    await expectMapInteractionLayout(page);
    await sheet.getByRole('button', { name: 'Map' }).click();
  }
  expect(browserErrors).toEqual([]);
});

async function expectLoadedPortraits(portraits: Locator, count: number): Promise<void> {
  await expect(portraits).toHaveCount(count);
  await expect
    .poll(() =>
      portraits.evaluateAll((images) =>
        images.every(
          (image) => image instanceof HTMLImageElement && image.complete && image.naturalWidth > 0,
        ),
      ),
    )
    .toBe(true);
}
