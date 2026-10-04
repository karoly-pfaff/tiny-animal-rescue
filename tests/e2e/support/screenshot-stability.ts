import { createHash } from 'node:crypto';

export function createScreenshotDigest(screenshot: Uint8Array): string {
  return createHash('sha256').update(screenshot).digest('hex');
}
