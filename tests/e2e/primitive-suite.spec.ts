import { expect, test, type Locator, type Page } from '@playwright/test';

import { tracePointAtProgress } from '../../sources/interactions/trace-progress';
import { fixtureTracePath } from './fixture-app/trace-fixture-path';
import { observeUnexpectedBrowserErrors } from './support/browser-errors';
import { interactionFixtureUrl } from './support/fixture-url';
import { activateWithPrimaryPointer, followPrimaryPointerPath } from './support/pointer';

const primitiveTypes = ['tap', 'drag', 'wipe', 'match', 'trace'] as const;
type PrimitiveType = (typeof primitiveTypes)[number];

test('@preview completes every contract-only primitive with mouse or touch input', async ({
  page,
}, testInfo) => {
  const browserErrors = observeUnexpectedBrowserErrors(page);
  const hasTouch = Boolean(testInfo.project.use.hasTouch);
  await page.clock.install();
  await page.goto(interactionFixtureUrl('suite'));
  const suite = page.locator('main');
  await expect(suite).toHaveAttribute('data-suite-id', 'primitive-demonstration-suite');

  for (const [index, type] of primitiveTypes.entries()) {
    await selectPrimitive(page, type);
    await completePrimitive(page, type, hasTouch);
    await expectCompletionCount(suite, index + 1);
  }
  expect(browserErrors).toEqual([]);
});

test('@preview handles wrong actions and cancellation for every primitive', async ({
  page,
}, testInfo) => {
  const browserErrors = observeUnexpectedBrowserErrors(page);
  const hasTouch = Boolean(testInfo.project.use.hasTouch);
  await page.clock.install();
  await page.goto(interactionFixtureUrl('suite'));

  for (const type of primitiveTypes) {
    await selectPrimitive(page, type);
    const region = demonstrationRegion(page, type);
    const irrelevant = page.getByRole('button', { name: 'Irrelevant scene object' });
    await activateWithPrimaryPointer(irrelevant, hasTouch);
    await activateWithPrimaryPointer(irrelevant, hasTouch);
    await expect(region).toHaveAttribute('data-guidance-stage', 'escalated');
    await page.getByRole('button', { name: 'Restart interaction' }).click();
    await cancelPrimitive(page, type, hasTouch);
    await expect(page.locator('main')).toHaveAttribute('data-completion-count', '0');
  }
  expect(browserErrors).toEqual([]);
});

test('@preview escalates trace guidance after repeated no-progress gestures', async ({
  page,
}, testInfo) => {
  const browserErrors = observeUnexpectedBrowserErrors(page);
  const hasTouch = Boolean(testInfo.project.use.hasTouch);
  await page.clock.install();
  await page.clock.pauseAt(new Date('2030-01-01T00:00:00Z'));
  await page.goto(interactionFixtureUrl('suite'));
  await selectPrimitive(page, 'trace');
  const region = demonstrationRegion(page, 'trace');
  const surface = page.getByRole('button', {
    name: 'Guide the turtle to the pond',
    exact: true,
  });
  const box = await requiredBox(surface, 'trace surface');
  const start = toClientPoint(tracePointAtProgress(fixtureTracePath, 0), box);

  for (let attempt = 0; attempt < 2; attempt += 1) {
    await followPrimaryPointerPath({ hasTouch, page, points: [start] });
  }

  await expect(surface).toHaveAttribute('data-progress', '0.0000');
  await expect(region).toHaveAttribute('data-guidance-stage', 'escalated');
  expect(browserErrors).toEqual([]);
});

test('@preview pauses and resumes guidance and narration for every primitive', async ({ page }) => {
  const browserErrors = observeUnexpectedBrowserErrors(page);
  await page.clock.install();
  await page.clock.pauseAt(new Date('2030-01-01T00:00:00Z'));
  await page.goto(interactionFixtureUrl('suite'));
  const suite = page.locator('main');
  let narrationFloor = 0;

  for (const type of primitiveTypes) {
    await selectPrimitive(page, type);
    const region = demonstrationRegion(page, type);
    await expect
      .poll(() => numericAttribute(suite, 'data-narration-count'))
      .toBeGreaterThan(narrationFloor);
    await page.clock.fastForward(500);
    const speakBeforePause = await numericAttribute(suite, 'data-narration-count');
    const stopBeforePause = await numericAttribute(suite, 'data-narration-stop-count');
    await page.getByRole('button', { name: 'Pause interaction' }).click();
    await expect(region).toHaveAttribute('data-paused', 'true');
    await expect(suite).toHaveAttribute('data-narration-stop-count', String(stopBeforePause + 1));
    await page.clock.fastForward(10_000);
    await expect(region).toHaveAttribute('data-guidance-stage', 'idle');

    await page.getByRole('button', { name: 'Resume interaction' }).click();
    await expect(region).toHaveAttribute('data-paused', 'false');
    await expect(suite).toHaveAttribute('data-narration-count', String(speakBeforePause + 1));
    expect(await region.getAttribute('data-guidance-stage')).toBe('idle');
    await page.clock.fastForward(1_000);
    expect(await region.getAttribute('data-guidance-stage')).toBe('idle');
    await page.clock.fastForward(600);
    await expect(region).toHaveAttribute('data-guidance-stage', 'pulse');
    narrationFloor = speakBeforePause + 1;
  }
  expect(browserErrors).toEqual([]);
});

test('@preview suspends every active primitive pointer across pause and fresh resume', async ({
  page,
}, testInfo) => {
  const browserErrors = observeUnexpectedBrowserErrors(page);
  const hasTouch = Boolean(testInfo.project.use.hasTouch);
  await page.goto(interactionFixtureUrl('suite'));
  const suite = page.locator('main');

  for (const [index, type] of primitiveTypes.entries()) {
    await selectPrimitive(page, type);
    const releasePointer = await beginHeldPrimitivePointer(page, type, hasTouch);
    await page.getByRole('button', { name: 'Pause interaction' }).evaluate((button) => {
      (button as HTMLButtonElement).click();
    });
    await expect(demonstrationRegion(page, type)).toHaveAttribute('data-paused', 'true');
    await releasePointer();
    await expectCompletionCount(suite, index);

    await page.getByRole('button', { name: 'Resume interaction' }).click();
    await completePrimitive(page, type, hasTouch);
    await expectCompletionCount(suite, index + 1);
  }
  expect(browserErrors).toEqual([]);
});

test('@preview replays every contract prompt without overlapping narration', async ({ page }) => {
  const browserErrors = observeUnexpectedBrowserErrors(page);
  await page.clock.install();
  await page.goto(interactionFixtureUrl('suite'));
  const suite = page.locator('main');

  for (const type of primitiveTypes) {
    await selectPrimitive(page, type);
    const region = demonstrationRegion(page, type);
    await page.clock.fastForward(2_000);
    await expect(region).toHaveAttribute('data-guidance-stage', 'pulse');
    const speakBeforeReplay = await numericAttribute(suite, 'data-narration-count');
    const stopBeforeReplay = await numericAttribute(suite, 'data-narration-stop-count');
    await page.getByRole('button', { name: 'Replay prompt' }).click();
    await expect(suite).toHaveAttribute('data-narration-count', String(speakBeforeReplay + 1));
    await expect(suite).toHaveAttribute('data-narration-stop-count', String(stopBeforeReplay + 1));
    await expect(region).toHaveAttribute('data-guidance-stage', 'idle');
  }
  expect(browserErrors).toEqual([]);
});

async function completePrimitive(
  page: Page,
  type: PrimitiveType,
  hasTouch: boolean,
): Promise<void> {
  switch (type) {
    case 'tap':
      await completeTap(page, hasTouch);
      return;
    case 'drag':
      await completeDrag(page, hasTouch);
      return;
    case 'wipe':
      await completeWipe(page, hasTouch);
      return;
    case 'match':
      await completeMatch(page, hasTouch);
      return;
    case 'trace':
      await completeTrace(page, hasTouch);
      return;
  }
}

async function completeTap(page: Page, hasTouch: boolean): Promise<void> {
  for (const index of [1, 2]) {
    await activateWithPrimaryPointer(
      page.getByRole('button', { name: `Tap the leaves in order: ${String(index)}` }),
      hasTouch,
    );
  }
}

async function completeDrag(page: Page, hasTouch: boolean): Promise<void> {
  const source = page.getByRole('button', { name: 'Move the basket to the bright spot' });
  const [sourceBox, targetBox] = await Promise.all([
    requiredBox(source, 'drag source'),
    requiredBox(page.locator('.ladder-target'), 'drag target'),
  ]);
  await followPrimaryPointerPath({
    hasTouch,
    page,
    points: [center(sourceBox), center(targetBox)],
  });
  await expect(source).toHaveCount(0);
}

async function completeWipe(page: Page, hasTouch: boolean): Promise<void> {
  const surface = page.getByRole('button', { name: 'Wipe the muddy surface clean' });
  const box = await requiredBox(surface, 'wipe surface');
  const rows = [0.04, 0.18, 0.32, 0.46, 0.6, 0.74, 0.88, 0.96];
  await followPrimaryPointerPath({
    hasTouch,
    page,
    points: rows.map((row, index) => ({
      x: box.x + box.width * (index % 2 === 0 ? 0.04 : 0.96),
      y: box.y + box.height * row,
    })),
  });
  await expect(surface).toHaveCount(0);
}

async function completeMatch(page: Page, hasTouch: boolean): Promise<void> {
  for (const shape of ['round', 'triangle', 'square']) {
    await activateWithPrimaryPointer(page.getByRole('button', { name: `${shape} toy` }), hasTouch);
    await activateWithPrimaryPointer(
      page.getByRole('button', { name: `${shape} basket` }),
      hasTouch,
    );
  }
}

async function completeTrace(page: Page, hasTouch: boolean): Promise<void> {
  const surface = page.getByRole('button', { name: 'Guide the turtle to the pond' });
  const box = await requiredBox(surface, 'trace surface');
  const fromProgress = Number(await surface.getAttribute('data-progress'));
  const intervalCount = Math.max(1, Math.ceil((1 - fromProgress) / 0.05));
  const points = Array.from({ length: intervalCount + 1 }, (_, index) => {
    const progress = fromProgress + ((1 - fromProgress) * index) / intervalCount;
    return toClientPoint(tracePointAtProgress(fixtureTracePath, progress), box);
  });
  await followPrimaryPointerPath({ hasTouch, page, points });
  await expect(surface).toHaveCount(0);
}

async function beginHeldPrimitivePointer(
  page: Page,
  type: PrimitiveType,
  hasTouch: boolean,
): Promise<() => Promise<void>> {
  if (type === 'tap') {
    const target = page.getByRole('button', { name: 'Tap the leaves in order: 1' });
    return holdPrimaryPointer(page, [center(await requiredBox(target, 'tap target'))], hasTouch);
  }
  if (type === 'drag') {
    const source = page.getByRole('button', { name: 'Move the basket to the bright spot' });
    const box = await requiredBox(source, 'drag source');
    const start = center(box);
    return holdPrimaryPointer(
      page,
      [start, { x: start.x + box.width, y: start.y - box.height }],
      hasTouch,
    );
  }
  if (type === 'wipe') {
    const surface = page.getByRole('button', { name: 'Wipe the muddy surface clean' });
    const box = await requiredBox(surface, 'wipe surface');
    return holdPrimaryPointer(
      page,
      [
        { x: box.x + box.width * 0.15, y: box.y + box.height * 0.2 },
        { x: box.x + box.width * 0.35, y: box.y + box.height * 0.2 },
      ],
      hasTouch,
    );
  }
  if (type === 'match') {
    const source = page.getByRole('button', { name: 'round toy' });
    return holdPrimaryPointer(page, [center(await requiredBox(source, 'match source'))], hasTouch);
  }
  const surface = page.getByRole('button', { name: 'Guide the turtle to the pond' });
  const box = await requiredBox(surface, 'trace surface');
  return holdPrimaryPointer(
    page,
    [0, 0.2].map((progress) =>
      toClientPoint(tracePointAtProgress(fixtureTracePath, progress), box),
    ),
    hasTouch,
  );
}

async function holdPrimaryPointer(
  page: Page,
  points: readonly Readonly<{ x: number; y: number }>[],
  hasTouch: boolean,
): Promise<() => Promise<void>> {
  const [start, ...rest] = points;
  if (start === undefined) {
    throw new Error('A held pointer path requires a start point.');
  }
  if (hasTouch) {
    const session = await page.context().newCDPSession(page);
    await session.send('Input.dispatchTouchEvent', {
      touchPoints: [{ id: 41, ...start }],
      type: 'touchStart',
    });
    for (const point of rest) {
      await session.send('Input.dispatchTouchEvent', {
        touchPoints: [{ id: 41, ...point }],
        type: 'touchMove',
      });
    }
    return async () => {
      await session.send('Input.dispatchTouchEvent', { touchPoints: [], type: 'touchEnd' });
      await session.detach();
    };
  }
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  for (const point of rest) {
    await page.mouse.move(point.x, point.y, { steps: 2 });
  }
  return async () => {
    await page.mouse.up();
  };
}

async function cancelPrimitive(page: Page, type: PrimitiveType, hasTouch: boolean): Promise<void> {
  const pointerType = hasTouch ? 'touch' : 'mouse';
  if (type === 'tap') {
    const target = page.getByRole('button', { name: 'Tap the leaves in order: 1' });
    await cancelPointer({
      locator: target,
      page,
      pointerType,
      points: [center(await requiredBox(target, 'tap target'))],
    });
    await expect(target).toBeVisible();
    return;
  }
  if (type === 'drag') {
    const source = page.getByRole('button', { name: 'Move the basket to the bright spot' });
    const box = await requiredBox(source, 'drag source');
    await cancelPointer({
      locator: source,
      page,
      pointerType,
      points: [center(box), { x: box.x + box.width * 1.5, y: box.y }],
    });
    await expect(source).toHaveAttribute('data-phase', 'idle');
    return;
  }
  if (type === 'wipe') {
    const surface = page.getByRole('button', { name: 'Wipe the muddy surface clean' });
    const box = await requiredBox(surface, 'wipe surface');
    await cancelPointer({
      locator: surface,
      page,
      pointerType,
      points: [
        { x: box.x + box.width * 0.2, y: box.y + box.height * 0.2 },
        { x: box.x + box.width * 0.35, y: box.y + box.height * 0.2 },
      ],
    });
    await expect(surface).toHaveAttribute('data-complete', 'false');
    return;
  }
  if (type === 'match') {
    const source = page.getByRole('button', { name: 'round toy' });
    await cancelPointer({
      locator: source,
      page,
      pointerType,
      points: [center(await requiredBox(source, 'match source'))],
    });
    await expect(source).toHaveAttribute('aria-pressed', 'false');
    return;
  }
  const surface = page.getByRole('button', { name: 'Guide the turtle to the pond' });
  const box = await requiredBox(surface, 'trace surface');
  await cancelPointer({
    locator: surface,
    page,
    pointerType,
    points: [0, 0.2].map((progress) =>
      toClientPoint(tracePointAtProgress(fixtureTracePath, progress), box),
    ),
  });
  await expect(surface).toHaveAttribute('data-complete', 'false');
}

type CancelPointerOptions = Readonly<{
  locator: Locator;
  page: Page;
  pointerType: 'mouse' | 'touch';
  points: readonly Readonly<{ x: number; y: number }>[];
}>;

async function cancelPointer({
  locator,
  page,
  points,
  pointerType,
}: CancelPointerOptions): Promise<void> {
  const [start, ...rest] = points;
  if (start === undefined) {
    throw new Error('Cancellation path requires a start point.');
  }
  const end = rest.at(-1) ?? start;
  if (pointerType === 'touch') {
    const session = await page.context().newCDPSession(page);
    await session.send('Input.dispatchTouchEvent', {
      touchPoints: [{ id: 31, ...start }],
      type: 'touchStart',
    });
    for (const point of rest) {
      await session.send('Input.dispatchTouchEvent', {
        touchPoints: [{ id: 31, ...point }],
        type: 'touchMove',
      });
    }
    await session.send('Input.dispatchTouchEvent', { touchPoints: [], type: 'touchCancel' });
    await session.detach();
    return;
  }
  await locator.evaluate((element) => {
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
  for (const point of rest) {
    await page.mouse.move(point.x, point.y, { steps: 2 });
  }
  const pointerId = Number(await locator.getAttribute('data-test-pointer-id'));
  await locator.dispatchEvent('pointercancel', {
    clientX: end.x,
    clientY: end.y,
    pointerId,
    pointerType: 'mouse',
  });
  await page.mouse.up();
  await locator.evaluate((element) => {
    element.removeAttribute('data-test-pointer-id');
  });
}

async function selectPrimitive(page: Page, type: PrimitiveType): Promise<void> {
  await page.getByRole('button', { exact: true, name: type }).click();
  await expect(demonstrationRegion(page, type)).toHaveAttribute(
    'data-step-id',
    expectedStepId(type),
  );
}

function demonstrationRegion(page: Page, type: PrimitiveType): Locator {
  return page.getByRole('region', { name: `${type} demonstration` });
}

function expectedStepId(type: PrimitiveType): string {
  if (type === 'tap') {
    return 'demonstrate-tap-remove';
  }
  if (type === 'drag') {
    return 'demonstrate-drag-to-target';
  }
  if (type === 'wipe') {
    return 'demonstrate-wipe-clean';
  }
  return `demonstrate-${type}`;
}

async function requiredBox(locator: Locator, name: string) {
  const box = await locator.boundingBox();
  if (box === null) {
    throw new Error(`Primitive suite ${name} must be measurable.`);
  }
  return box;
}

function center(box: Readonly<{ height: number; width: number; x: number; y: number }>) {
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

function toClientPoint(
  point: Readonly<{ x: number; y: number }>,
  box: Readonly<{ height: number; width: number; x: number; y: number }>,
) {
  return { x: box.x + point.x * box.width, y: box.y + point.y * box.height };
}

async function expectCompletionCount(suite: Locator, count: number): Promise<void> {
  await expect(suite).toHaveAttribute('data-completion-count', String(count));
}

async function numericAttribute(locator: Locator, name: string): Promise<number> {
  return Number(await locator.getAttribute(name));
}
