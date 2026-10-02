import { readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from '@playwright/test';

const screenshotDirectory = 'build/reports/playwright/test-results';
const output = 'tests/fixtures/assets/media-complete-visual-signatures.json';
const width = 64;
const height = 48;
const reviewedScreenshotNames = [
  'celebration-mimi.png',
  'map-first-rescue.png',
  'mission-first-step.png',
  'mission-ladder-hint.png',
  'mission-ladder-placed.png',
  'mission-ladder-reduced-motion.png',
  'mission-mimi-reduced-motion.png',
  'mission-mimi-rescuing.png',
  'mission-protected-exit-en.png',
  'shelter-indoor-mimi.png',
  'start-first-run.png',
  'start-screen-en.png',
  'start-screen-hu.png',
];
const reviewedProjects = [
  'chromium-1024x768',
  'chromium-1280x800',
  'chromium-1366x1024',
  'chromium-touch-768x1024',
];
const expectedBulkContracts = reviewedScreenshotNames
  .flatMap((name) => reviewedProjects.map((project) => `${name}::${project}`))
  .sort();

function argument(name) {
  const index = process.argv.indexOf(name);
  const value = index === -1 ? undefined : process.argv[index + 1];
  return value === undefined || value.length === 0 ? undefined : value;
}

const suppliedScreenshot = argument('--screenshot');
const suppliedContract = argument('--contract');
if ((suppliedScreenshot === undefined) !== (suppliedContract === undefined)) {
  throw new Error('--screenshot and --contract must be supplied together.');
}
const signatures = JSON.parse(await readFile(output, 'utf8'));
const inputs =
  suppliedScreenshot === undefined
    ? (await filesWithin(screenshotDirectory))
        .filter(
          (file) => path.basename(file).startsWith('media-complete-') && file.endsWith('.png'),
        )
        .sort()
        .map((file) => {
          const project = /(?<project>chromium(?:-touch)?-\d+x\d+)$/u.exec(
            path.basename(path.dirname(file)),
          )?.groups?.project;
          if (project === undefined) {
            throw new Error(`Cannot derive the Playwright project from ${file}.`);
          }
          return {
            contract: `${path.basename(file).slice('media-complete-'.length)}::${project}`,
            file,
          };
        })
    : [{ contract: suppliedContract, file: suppliedScreenshot }];
if (inputs.length === 0) throw new Error('No reviewed media-complete screenshots were supplied.');
if (suppliedScreenshot === undefined) {
  const observedContracts = inputs.map(({ contract }) => contract).sort();
  if (
    observedContracts.length !== expectedBulkContracts.length ||
    JSON.stringify(observedContracts) !== JSON.stringify(expectedBulkContracts)
  ) {
    throw new Error(
      `Bulk signature generation requires the exact ${String(expectedBulkContracts.length)}-contract reviewed screenshot set.`,
    );
  }
}

const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  for (const input of inputs) {
    const base64 = (await readFile(input.file)).toString('base64');
    const rgb = await page.evaluate(
      async ({ base64: imageBase64, height: targetHeight, width: targetWidth }) => {
        const image = new globalThis.Image();
        image.src = `data:image/png;base64,${imageBase64}`;
        await image.decode();
        const canvas = globalThis.document.createElement('canvas');
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        const context = canvas.getContext('2d', { alpha: false });
        if (context === null) {
          throw new Error('Visual-signature canvas is unavailable.');
        }
        context.drawImage(image, 0, 0, targetWidth, targetHeight);
        const rgba = context.getImageData(0, 0, targetWidth, targetHeight).data;
        const pixels = new Uint8Array(targetWidth * targetHeight * 3);
        for (let source = 0, target = 0; source < rgba.length; source += 4) {
          pixels[target++] = rgba[source];
          pixels[target++] = rgba[source + 1];
          pixels[target++] = rgba[source + 2];
        }
        let binary = '';
        for (const value of pixels) {
          binary += String.fromCharCode(value);
        }
        return btoa(binary);
      },
      { base64, height, width },
    );
    signatures[input.contract] = { height, rgb, width };
  }
  await writeFile(output, `${JSON.stringify(signatures, null, 2)}\n`);
  console.log(`Wrote ${inputs.length} reviewed media-complete visual signature(s) to ${output}.`);
} finally {
  await browser.close();
}

async function filesWithin(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  return (
    await Promise.all(
      entries.map((entry) => {
        const target = path.join(directory, entry.name);
        return entry.isDirectory() ? filesWithin(target) : [target];
      }),
    )
  ).flat();
}
