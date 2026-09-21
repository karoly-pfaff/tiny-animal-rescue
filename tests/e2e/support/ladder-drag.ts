import type { Locator, Page } from '@playwright/test';

type DragDestination = 'invalid' | 'target';

type DragLadderOptions = Readonly<{
  destination: DragDestination;
  ladder: Locator;
  page: Page;
  pointerType: 'mouse' | 'touch';
}>;

export async function dragLadder({
  destination,
  ladder,
  page,
  pointerType,
}: DragLadderOptions): Promise<void> {
  const [surfaceBox, ladderBox] = await Promise.all([
    page.locator('.drag-interaction').boundingBox(),
    ladder.boundingBox(),
  ]);
  if (surfaceBox === null || ladderBox === null) {
    throw new Error('Ladder drag geometry is unavailable.');
  }
  const start = {
    x: ladderBox.x + ladderBox.width / 2,
    y: ladderBox.y + ladderBox.height / 2,
  };
  const end =
    destination === 'target'
      ? {
          x: surfaceBox.x + surfaceBox.width * 0.65,
          y: surfaceBox.y + surfaceBox.height * 0.68 + 48,
        }
      : {
          x: surfaceBox.x + surfaceBox.width * 0.08,
          y: surfaceBox.y + surfaceBox.height * 0.25,
        };
  if (pointerType === 'touch') {
    await dragWithTouch(page, start, end);
  } else {
    await dragWithMouse(page, start, end);
  }
  if (destination === 'invalid') {
    await ladder.evaluate(async (element) => {
      await Promise.all(element.getAnimations().map(async (animation) => animation.finished));
    });
  }
}

type ClientPoint = Readonly<{ x: number; y: number }>;

async function dragWithMouse(page: Page, start: ClientPoint, end: ClientPoint): Promise<void> {
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(end.x, end.y, { steps: 5 });
  await page.mouse.up();
}

async function dragWithTouch(page: Page, start: ClientPoint, end: ClientPoint): Promise<void> {
  const session = await page.context().newCDPSession(page);
  const touchStart = [{ id: 17, x: start.x, y: start.y }];
  const touchEnd = [{ id: 17, x: end.x, y: end.y }];
  await session.send('Input.dispatchTouchEvent', { touchPoints: touchStart, type: 'touchStart' });
  await session.send('Input.dispatchTouchEvent', { touchPoints: touchEnd, type: 'touchMove' });
  await session.send('Input.dispatchTouchEvent', { touchPoints: [], type: 'touchEnd' });
  await session.detach();
}
