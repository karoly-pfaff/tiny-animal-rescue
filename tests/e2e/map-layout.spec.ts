import { expect, test } from '@playwright/test';

import { observeUnexpectedBrowserErrors } from './support/browser-errors';
import { mapFixtureUrl } from './support/fixture-url';
import { expectMapLayout } from './support/map-layout';

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
