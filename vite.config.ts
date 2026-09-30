import { copyFile, mkdir, readFile, readdir } from 'node:fs/promises';
import path from 'node:path';

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

import {
  rewritePendingAssetReferences,
  type PendingAssetsByPack,
  type PendingAssetReference,
} from './scripts/lib/pending-asset-boundary.ts';

type LockedAsset = Readonly<{ objectKey: string }>;
type AssetManifest = Readonly<{
  assets: readonly (PendingAssetReference & Readonly<{ delivery?: string }>)[];
}>;

function pendingAssetBoundaryPlugin() {
  const pendingAssets = loadPendingAssets();
  return {
    name: 'tiny-rescue-pending-asset-boundary',
    enforce: 'pre' as const,
    apply: 'build' as const,
    async transform(source: string, id: string) {
      const packId = contentPackId(id);
      if (packId === undefined) return null;
      const pendingAssetsByPack = await pendingAssets;
      if ((pendingAssetsByPack[packId]?.length ?? 0) === 0) return null;
      const document = JSON.parse(source) as unknown;
      const rewritten = rewritePendingAssetReferences(document, packId, pendingAssetsByPack);
      const normalized = JSON.stringify(document);
      const output = JSON.stringify(rewritten);
      return output === normalized ? null : { code: output, map: null };
    },
  };
}

async function loadPendingAssets(): Promise<PendingAssetsByPack> {
  const directories = await readdir('content', { withFileTypes: true });
  const entries: Record<string, readonly PendingAssetReference[]> = {};
  for (const entry of directories.filter((candidate) => candidate.isDirectory())) {
    let manifest: AssetManifest;
    try {
      manifest = JSON.parse(
        await readFile(path.join('content', entry.name, 'assets/manifest.json'), 'utf8'),
      ) as AssetManifest;
    } catch (error) {
      if (error instanceof Error && 'code' in error && error.code === 'ENOENT') continue;
      throw error;
    }
    entries[entry.name] = manifest.assets
      .filter(({ delivery }) => delivery === 'r2-pending')
      .map(({ id, objectKey }) => ({ id, objectKey }));
  }
  return entries;
}

function contentPackId(id: string): string | undefined {
  return /\/content\/(?<packId>[a-z0-9-]+)\/.+\.json(?:\?.*)?$/u.exec(id.replaceAll('\\', '/'))
    ?.groups?.['packId'];
}

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
  plugins: [pendingAssetBoundaryPlugin(), react(), materializedAssetsPlugin()],
  build: {
    outDir: 'build/app',
    sourcemap: false,
  },
  preview: {
    host: '127.0.0.1',
  },
});
