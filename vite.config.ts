import { copyFile, mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

type LockedAsset = Readonly<{ objectKey: string }>;

function materializedAssetsPlugin() {
  const marker = process.env['VITE_MATERIALIZED_ASSETS'];
  if (marker !== undefined && marker !== 'true') {
    throw new Error('VITE_MATERIALIZED_ASSETS must be exactly true when it is defined.');
  }
  return {
    name: 'tiny-rescue-materialized-assets',
    apply: 'build' as const,
    async closeBundle() {
      if (marker !== 'true') return;
      const lock = JSON.parse(
        await readFile('content/base/assets/materialization-lock.json', 'utf8'),
      ) as Readonly<{ objects: readonly LockedAsset[] }>;
      for (const asset of lock.objects) {
        const source = path.join('content/base/assets', asset.objectKey);
        const destination = path.join('build/app/content/base/assets', asset.objectKey);
        await mkdir(path.dirname(destination), { recursive: true });
        await copyFile(source, destination);
      }
    },
  };
}

export default defineConfig({
  base: './',
  plugins: [react(), materializedAssetsPlugin()],
  build: {
    outDir: 'build/app',
    sourcemap: false,
  },
  preview: {
    host: '127.0.0.1',
  },
});
