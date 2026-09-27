import type { Locator, Page } from '@playwright/test';

type DragDestination = 'invalid' | 'target';

type DragLadderOptions = Readonly<{
  destination: DragDestination;
  inspectWhileDragging?: (pointer: ClientPoint) => Promise<void>;
  ladder: Locator;
  page: Page;
  pointerType: 'mouse' | 'touch';
}>;

export type InterruptedDragEvidence = Readonly<{
  afterPrimary: InlinePosition;
  afterSecondary: InlinePosition;
}>;

export async function dragLadder({
  destination,
  inspectWhileDragging,
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
    await dragWithTouch({ end, inspectWhileDragging, page, start });
  } else {
    await dragWithMouse({ end, inspectWhileDragging, page, start });
  }
  if (destination === 'invalid') {
    await ladder.evaluate(async (element) => {
      await Promise.all(element.getAnimations().map(async (animation) => animation.finished));
    });
  }
}

export async function interruptLadderDrag({
  inspectAfterCancel,
  ladder,
  page,
  pointerType,
}: Pick<DragLadderOptions, 'ladder' | 'page' | 'pointerType'> &
  Readonly<{ inspectAfterCancel: () => Promise<void> }>): Promise<InterruptedDragEvidence> {
  const [surfaceBox, ladderBox] = await Promise.all([
    page.locator('.drag-interaction').boundingBox(),
    ladder.boundingBox(),
  ]);
  if (surfaceBox === null || ladderBox === null) {
    throw new Error('Ladder interruption geometry is unavailable.');
  }
  const start = {
    x: ladderBox.x + ladderBox.width / 2,
    y: ladderBox.y + ladderBox.height / 2,
  };
  const primary = {
    x: surfaceBox.x + surfaceBox.width * 0.08,
    y: surfaceBox.y + surfaceBox.height * 0.25,
  };
  const secondary = {
    x: surfaceBox.x + surfaceBox.width * 0.65,
    y: surfaceBox.y + surfaceBox.height * 0.68 + 48,
  };
  return pointerType === 'touch'
    ? interruptWithTouch({ inspectAfterCancel, ladder, page, primary, secondary, start })
    : interruptWithMouse({ inspectAfterCancel, ladder, page, primary, secondary, start });
}

type ClientPoint = Readonly<{ x: number; y: number }>;

type InlinePosition = Readonly<{ left: string; top: string }>;

type InterruptPathOptions = Readonly<{
  inspectAfterCancel: () => Promise<void>;
  ladder: Locator;
  page: Page;
  primary: ClientPoint;
  secondary: ClientPoint;
  start: ClientPoint;
}>;

type DragPathOptions = Readonly<{
  end: ClientPoint;
  inspectWhileDragging: ((pointer: ClientPoint) => Promise<void>) | undefined;
  page: Page;
  start: ClientPoint;
}>;

async function dragWithMouse({
  end,
  inspectWhileDragging,
  page,
  start,
}: DragPathOptions): Promise<void> {
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(end.x, end.y, { steps: 5 });
  await inspectWhileDragging?.(end);
  await page.mouse.up();
}

async function dragWithTouch({
  end,
  inspectWhileDragging,
  page,
  start,
}: DragPathOptions): Promise<void> {
  const session = await page.context().newCDPSession(page);
  const touchStart = [{ id: 17, x: start.x, y: start.y }];
  const touchEnd = [{ id: 17, x: end.x, y: end.y }];
  await session.send('Input.dispatchTouchEvent', { touchPoints: touchStart, type: 'touchStart' });
  await session.send('Input.dispatchTouchEvent', { touchPoints: touchEnd, type: 'touchMove' });
  await inspectWhileDragging?.(end);
  await session.send('Input.dispatchTouchEvent', { touchPoints: [], type: 'touchEnd' });
  await session.detach();
}

async function interruptWithMouse({
  inspectAfterCancel,
  ladder,
  page,
  primary,
  secondary,
  start,
}: InterruptPathOptions): Promise<InterruptedDragEvidence> {
  await ladder.evaluate((element) => {
    element.addEventListener(
      'pointerdown',
      (event) => {
        element.setAttribute('data-test-pointer-id', String((event as PointerEvent).pointerId));
      },
      { once: true },
    );
  });
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(primary.x, primary.y, { steps: 3 });
  const afterPrimary = await readInlinePosition(ladder);
  await ladder.dispatchEvent('pointerdown', {
    button: 0,
    clientX: start.x,
    clientY: start.y,
    isPrimary: false,
    pointerId: 99,
    pointerType: 'touch',
  });
  await ladder.dispatchEvent('pointermove', {
    clientX: secondary.x,
    clientY: secondary.y,
    isPrimary: false,
    pointerId: 99,
    pointerType: 'touch',
  });
  await ladder.dispatchEvent('pointerup', {
    clientX: secondary.x,
    clientY: secondary.y,
    isPrimary: false,
    pointerId: 99,
    pointerType: 'touch',
  });
  const afterSecondary = await readInlinePosition(ladder);
  const pointerId = Number(await ladder.getAttribute('data-test-pointer-id'));
  await ladder.dispatchEvent('pointercancel', { pointerId, pointerType: 'mouse' });
  await inspectAfterCancel();
  await page.mouse.up();
  await ladder.evaluate((element) => {
    element.removeAttribute('data-test-pointer-id');
  });
  return { afterPrimary, afterSecondary };
}

async function interruptWithTouch({
  inspectAfterCancel,
  ladder,
  page,
  primary,
  secondary,
  start,
}: InterruptPathOptions): Promise<InterruptedDragEvidence> {
  const session = await page.context().newCDPSession(page);
  const primaryStart = { id: 17, ...start };
  const primaryMoved = { id: 17, ...primary };
  const secondaryStart = { id: 18, ...start };
  const secondaryMoved = { id: 18, ...secondary };
  await session.send('Input.dispatchTouchEvent', {
    touchPoints: [primaryStart],
    type: 'touchStart',
  });
  await session.send('Input.dispatchTouchEvent', {
    touchPoints: [primaryMoved],
    type: 'touchMove',
  });
  const afterPrimary = await readInlinePosition(ladder);
  await session.send('Input.dispatchTouchEvent', {
    touchPoints: [primaryMoved, secondaryStart],
    type: 'touchStart',
  });
  await session.send('Input.dispatchTouchEvent', {
    touchPoints: [primaryMoved, secondaryMoved],
    type: 'touchMove',
  });
  const afterSecondary = await readInlinePosition(ladder);
  await session.send('Input.dispatchTouchEvent', { touchPoints: [], type: 'touchCancel' });
  await inspectAfterCancel();
  await session.detach();
  return { afterPrimary, afterSecondary };
}

async function readInlinePosition(ladder: Locator): Promise<InlinePosition> {
  return ladder.evaluate((element) => ({ left: element.style.left, top: element.style.top }));
}
