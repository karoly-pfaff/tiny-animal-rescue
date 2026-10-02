import { env } from 'node:process';
import { resolve } from 'node:path';
import { build, preview } from 'vite';

import { resolvePreviewPort } from './preview-port';
import { createPreviewDiagnostics } from './preview-diagnostics';

export default async function startProductionPreview(): Promise<() => Promise<void>> {
  const diagnostics = createPreviewDiagnostics();
  const playerPort = resolvePreviewPort(env['TINY_RESCUE_PREVIEW_PORT']);
  const fixturePort = playerPort + 1;
  const fixtureRoot = resolve('tests/e2e/fixture-app');
  const fixtureOutput = resolve('build/e2e/wipe-clean');
  const server = await preview({
    configFile: false,
    customLogger: diagnostics.logger,
    build: { outDir: 'build/app' },
    preview: {
      host: '127.0.0.1',
      port: playerPort,
      strictPort: true,
    },
  });
  await build({
    configFile: false,
    customLogger: diagnostics.logger,
    root: fixtureRoot,
    build: { emptyOutDir: true, outDir: fixtureOutput },
  });
  const fixtureServer = await preview({
    configFile: false,
    customLogger: diagnostics.logger,
    root: fixtureRoot,
    build: { outDir: fixtureOutput },
    preview: { host: '127.0.0.1', port: fixturePort, strictPort: true },
  });

  return async () => {
    await Promise.all([server.close(), fixtureServer.close()]);
    diagnostics.assertClean();
  };
}
