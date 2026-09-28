import type { Page } from '@playwright/test';

export async function settleVisual(page: Page): Promise<void> {
  await page.evaluate(async () => {
    const fontRequests = Array.from(document.querySelectorAll<HTMLElement>('body *'))
      .filter((element) => element.textContent.trim())
      .map((element) => {
        const style = getComputedStyle(element);
        const font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
        return document.fonts.load(font, element.textContent);
      });
    const imageRequests = Array.from(document.images, async (image) => {
      if (!image.complete) {
        await new Promise<void>((resolve, reject) => {
          image.addEventListener(
            'load',
            () => {
              resolve();
            },
            { once: true },
          );
          image.addEventListener(
            'error',
            () => {
              reject(new Error(`Failed to load ${image.src}.`));
            },
            { once: true },
          );
        });
      }
      if (image.naturalWidth === 0) {
        throw new Error(`Visual evidence image has no decoded pixels: ${image.src}.`);
      }
      await image.decode();
    });

    await Promise.all([...fontRequests, ...imageRequests]);
    await document.fonts.ready;
  });
}
