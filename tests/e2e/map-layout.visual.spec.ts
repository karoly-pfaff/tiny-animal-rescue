import { expect, test } from '@playwright/test';

import { observeUnexpectedBrowserErrors } from './support/browser-errors';
import { mapFixtureUrl } from './support/fixture-url';
import { expectMapLayout } from './support/map-layout';

test('@visual presents every map landmark in Hungarian and English', async ({ page }) => {
  const browserErrors = observeUnexpectedBrowserErrors(page);
  await page.emulateMedia({ reducedMotion: 'reduce' });

  for (const locale of ['hu', 'en'] as const) {
    await page.goto(mapFixtureUrl(locale));
    await page.evaluate(async () => document.fonts.ready);
    await expectMapLayout(page);
    await expect(page).toHaveScreenshot(`map-all-landmarks-${locale}.png`, { fullPage: true });
  }

  expect(browserErrors).toEqual([]);
});
