import { expect, test as base } from '@playwright/test';

export { expect };

export const test = base.extend({
  page: async ({ page }, applyFixture) => {
    await page.addInitScript(() => {
      const BrowserSpeechSynthesisUtterance = globalThis.SpeechSynthesisUtterance;
      Object.defineProperty(globalThis, 'SpeechSynthesisUtterance', {
        configurable: true,
        value: class MutedSpeechSynthesisUtterance extends BrowserSpeechSynthesisUtterance {
          constructor(text?: string) {
            super(text);
            this.volume = 0;
          }
        },
      });
    });
    await applyFixture(page);
  },
});
