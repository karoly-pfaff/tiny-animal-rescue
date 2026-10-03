import { expect, type Page } from '@playwright/test';

type TargetBox = Readonly<{
  bottom: number;
  height: number;
  left: number;
  right: number;
  top: number;
  width: number;
}>;

export async function expectMapLayout(page: Page): Promise<void> {
  const surface = await page.locator('.map-screen').boundingBox();
  expect(surface).not.toBeNull();
  if (surface === null) {
    return;
  }

  const boxes = await targetBoxes(page, '.map-landmark');

  for (const box of boxes) {
    expectMinimumTargetSize(box);
    expect(box.left).toBeGreaterThanOrEqual(surface.x);
    expect(box.top).toBeGreaterThanOrEqual(surface.y);
    expect(box.right).toBeLessThanOrEqual(surface.x + surface.width);
    expect(box.bottom).toBeLessThanOrEqual(surface.y + surface.height);
  }

  expectNoOverlap(boxes, 'landmark');
}

export async function expectMissionCallLayout(page: Page): Promise<void> {
  const boxes = await targetBoxes(page, '.mission-call-close, .mission-call-card');
  expect(boxes.length).toBeGreaterThan(1);
  for (const box of boxes) {
    expectMinimumTargetSize(box);
  }
  expectNoOverlap(boxes, 'mission call target');
}

export async function expectMapInteractionLayout(page: Page): Promise<void> {
  const landmarkBoxes = await targetBoxes(page, '.map-landmark');
  const callTargetBoxes = await targetBoxes(page, '.mission-call-close, .mission-call-card');
  const sheetBoxes = await targetBoxes(page, '.mission-call-sheet');
  expect(sheetBoxes).toHaveLength(1);
  const boxes = [...landmarkBoxes, ...callTargetBoxes];
  for (const box of boxes) {
    expectMinimumTargetSize(box);
  }
  expectNoOverlap(boxes, 'map interaction target');
  expectNoCrossOverlap(landmarkBoxes, sheetBoxes, 'landmark and mission call sheet');
}

async function targetBoxes(page: Page, selector: string): Promise<readonly TargetBox[]> {
  return page.locator(selector).evaluateAll((elements) =>
    elements.map((element) => {
      const box = element.getBoundingClientRect();
      return {
        bottom: box.bottom,
        height: box.height,
        left: box.left,
        right: box.right,
        top: box.top,
        width: box.width,
      };
    }),
  );
}

function expectMinimumTargetSize(box: TargetBox): void {
  expect(box.width).toBeGreaterThanOrEqual(44);
  expect(box.height).toBeGreaterThanOrEqual(44);
}

function expectNoOverlap(boxes: readonly TargetBox[], label: string): void {
  for (let leftIndex = 0; leftIndex < boxes.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < boxes.length; rightIndex += 1) {
      const left = boxes[leftIndex];
      const right = boxes[rightIndex];
      if (left === undefined || right === undefined) {
        continue;
      }
      const overlaps =
        left.left < right.right &&
        left.right > right.left &&
        left.top < right.bottom &&
        left.bottom > right.top;
      expect(overlaps, `${label} ${String(leftIndex)} overlaps ${String(rightIndex)}`).toBe(false);
    }
  }
}

function expectNoCrossOverlap(
  leftBoxes: readonly TargetBox[],
  rightBoxes: readonly TargetBox[],
  label: string,
): void {
  for (const [leftIndex, left] of leftBoxes.entries()) {
    for (const [rightIndex, right] of rightBoxes.entries()) {
      const overlaps =
        left.left < right.right &&
        left.right > right.left &&
        left.top < right.bottom &&
        left.bottom > right.top;
      expect(overlaps, `${label} ${String(leftIndex)} overlaps ${String(rightIndex)}`).toBe(false);
    }
  }
}
