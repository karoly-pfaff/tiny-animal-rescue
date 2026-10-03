import type { Locator, Page } from '@playwright/test';

export type ClientPoint = Readonly<{ x: number; y: number }>;

export async function activateWithPrimaryPointer(
  locator: Locator,
  hasTouch: boolean,
  options: Readonly<{ force?: boolean }> = {},
): Promise<void> {
  if (hasTouch) {
    await locator.tap(options);
    return;
  }
  await locator.click(options);
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

type FollowPointerPathOptions = Readonly<{
  hasTouch: boolean;
  page: Page;
  points: readonly ClientPoint[];
}>;

export async function followPrimaryPointerPath({
  hasTouch,
  page,
  points,
}: FollowPointerPathOptions): Promise<void> {
  const [start, ...rest] = points;
  if (start === undefined) {
    throw new Error('A pointer path must contain a start point.');
  }
  if (hasTouch) {
    await followTouchPath(page, start, rest);
    return;
  }
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  for (const point of rest) {
    await page.mouse.move(point.x, point.y, { steps: 4 });
  }
  await page.mouse.up();
}

async function followTouchPath(
  page: Page,
  start: ClientPoint,
  rest: readonly ClientPoint[],
): Promise<void> {
  const session = await page.context().newCDPSession(page);
  await session.send('Input.dispatchTouchEvent', {
    touchPoints: [{ id: 17, ...start }],
    type: 'touchStart',
  });
  for (const point of rest) {
    await session.send('Input.dispatchTouchEvent', {
      touchPoints: [{ id: 17, ...point }],
      type: 'touchMove',
    });
  }
  await session.send('Input.dispatchTouchEvent', { touchPoints: [], type: 'touchEnd' });
  await session.detach();
}
