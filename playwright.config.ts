import { env } from 'node:process';
import { defineConfig, devices } from '@playwright/test';
import { resolvePreviewPort } from './tests/e2e/support/preview-port';

const previewPort = resolvePreviewPort(env['TINY_RESCUE_PREVIEW_PORT']);
const previewPortText = String(previewPort);
const baseURL = `http://127.0.0.1:${previewPortText}`;

export default defineConfig({
  testDir: './tests/e2e',
  globalSetup: './tests/e2e/support/preview-server.ts',
  outputDir: 'build/reports/playwright/test-results',
  snapshotPathTemplate: '{testDir}/{testFilePath}-snapshots/{arg}-{projectName}{ext}',
  fullyParallel: false,
  forbidOnly: true,
  retries: 0,
  workers: 1,
  reporter: [
    ['list'],
    ['html', { outputFolder: 'build/reports/playwright/html', open: 'never' }],
    ['junit', { outputFile: 'build/reports/playwright/results.xml' }],
  ],
  expect: {
    timeout: 5_000,
    toHaveScreenshot: {
      animations: 'disabled',
      caret: 'hide',
      maxDiffPixels: 0,
      scale: 'css',
    },
  },
  use: {
    baseURL,
    colorScheme: 'light',
    locale: 'hu-HU',
    reducedMotion: 'reduce',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium-1024x768',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1024, height: 768 } },
    },
    {
      name: 'chromium-touch-768x1024',
      use: {
        ...devices['Desktop Chrome'],
        hasTouch: true,
        isMobile: true,
        viewport: { width: 768, height: 1024 },
      },
    },
    {
      name: 'chromium-1280x800',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } },
    },
    {
      name: 'chromium-1366x1024',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1366, height: 1024 } },
    },
  ],
});
