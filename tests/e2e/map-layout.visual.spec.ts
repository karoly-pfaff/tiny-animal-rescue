import { observeUnexpectedBrowserErrors } from './support/browser-errors';
import { mapFixtureUrl } from './support/fixture-url';
import { expectMapLayout } from './support/map-layout';
import { expect, test } from './support/muted-test';

const visualStates = [
  ['new-save', { en: 'Garden rescue: Mimi', hu: 'Kerti mentés: Mimi' }],
  ['post-tutorial', { en: 'Forest rescues', hu: 'Erdei mentések' }],
  ['three-rescue', { en: 'Pond rescues', hu: 'Tavi mentések' }],
  ['all-complete', { en: 'Forest rescues', hu: 'Erdei mentések' }],
] as const;

// The Windows required-quality job owns these fixture-only fallback baselines. The Linux media job
// still exercises every state and layout below; assembled player journeys separately verify the
// materialized artwork against the reviewed media-complete visual signatures.
const captureFallbackSnapshots = process.env['VITE_MATERIALIZED_ASSETS'] !== 'true';

test('@visual presents every map landmark in Hungarian and English', async ({ page }) => {
  const browserErrors = observeUnexpectedBrowserErrors(page);
  await page.emulateMedia({ reducedMotion: 'reduce' });

  for (const locale of ['hu', 'en'] as const) {
    await page.goto(mapFixtureUrl(locale));
    await page.evaluate(async () => document.fonts.ready);
    await expectMapLayout(page);
    if (captureFallbackSnapshots) {
      await expect(page).toHaveScreenshot(`map-all-landmarks-${locale}.png`, { fullPage: true });
    }
  }

  expect(browserErrors).toEqual([]);
});

for (const [seed, locationLabels] of visualStates) {
  for (const locale of ['hu', 'en'] as const) {
    test(`@visual presents the reviewed ${seed} progression state in ${locale.toUpperCase()}`, async ({
      page,
    }) => {
      const browserErrors = observeUnexpectedBrowserErrors(page);
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.goto(mapFixtureUrl(locale, seed));
      const selectedLocation = page.getByRole('button', { name: locationLabels[locale] });
      await selectedLocation.click();
      await page.evaluate(async () => document.fonts.ready);

      await expect(selectedLocation).toHaveAttribute('aria-pressed', 'true');
      await expect(selectedLocation).toHaveAttribute('data-selected-location', 'true');
      if (captureFallbackSnapshots) {
        await expect(page).toHaveScreenshot(`map-state-${seed}-${locale}.png`, { fullPage: true });
      }
      expect(browserErrors).toEqual([]);
    });
  }
}
