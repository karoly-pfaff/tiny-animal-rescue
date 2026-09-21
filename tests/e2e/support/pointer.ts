import type { Locator } from '@playwright/test';

export async function activateWithPrimaryPointer(
  locator: Locator,
  hasTouch: boolean,
): Promise<void> {
  if (hasTouch) {
    await locator.tap();
    return;
  }
  await locator.click();
}
