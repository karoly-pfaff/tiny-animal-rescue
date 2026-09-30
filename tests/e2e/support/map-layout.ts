import { expect, type Page } from '@playwright/test';

export async function expectMapLayout(page: Page): Promise<void> {
  const surface = await page.locator('.map-screen').boundingBox();
  expect(surface).not.toBeNull();
  if (surface === null) {
    return;
  }

  const boxes = await page.locator('.map-landmark').evaluateAll((elements) =>
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

  for (const box of boxes) {
    expect(box.width).toBeGreaterThanOrEqual(44);
    expect(box.height).toBeGreaterThanOrEqual(44);
    expect(box.left).toBeGreaterThanOrEqual(surface.x);
    expect(box.top).toBeGreaterThanOrEqual(surface.y);
    expect(box.right).toBeLessThanOrEqual(surface.x + surface.width);
    expect(box.bottom).toBeLessThanOrEqual(surface.y + surface.height);
  }

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
      expect(overlaps, `landmark ${String(leftIndex)} overlaps ${String(rightIndex)}`).toBe(false);
    }
  }
}
