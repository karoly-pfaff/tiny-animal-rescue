import type { Locator, Page } from '@playwright/test';

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

type CancelPointerOptions = Readonly<{
  hasTouch: boolean;
  locator: Locator;
  page: Page;
}>;

export async function cancelPrimaryPointerOutside({
  hasTouch,
  locator,
  page,
}: CancelPointerOptions): Promise<void> {
  const box = await locator.boundingBox();
  if (box === null) {
    throw new Error('Pointer cancellation target must be measurable.');
  }
  const start = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  const outside = { x: box.x + box.width + 24, y: start.y };
  if (hasTouch) {
    await cancelTouchOutside(page, start, outside);
    return;
  }
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(outside.x, outside.y);
  await page.mouse.up();
}

type ClientPoint = Readonly<{ x: number; y: number }>;

async function cancelTouchOutside(
  page: Page,
  start: ClientPoint,
  outside: ClientPoint,
): Promise<void> {
  const session = await page.context().newCDPSession(page);
  await session.send('Input.dispatchTouchEvent', {
    touchPoints: [{ id: 19, ...start }],
    type: 'touchStart',
  });
  await session.send('Input.dispatchTouchEvent', {
    touchPoints: [{ id: 19, ...outside }],
    type: 'touchMove',
  });
  await session.send('Input.dispatchTouchEvent', { touchPoints: [], type: 'touchEnd' });
  await session.detach();
}
