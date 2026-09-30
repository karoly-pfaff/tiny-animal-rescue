import { Buffer } from 'node:buffer';
import { env } from 'node:process';
import { resolve } from 'node:path';
import { build, preview, type Plugin } from 'vite';

import { resolvePreviewPort } from './preview-port';
import { createPreviewDiagnostics } from './preview-diagnostics';

const fixturePngs = new Map([
  [
    '/content/base/assets/fixture-assets/resident-subject.png',
    'iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAAySURBVDhPY/i4NuE/JZgBXYBUPGoADgM0zMyJEsNpACl4kBsA8jcuvxNlADF41ICE/wCU2fd7RaWgGAAAAABJRU5ErkJggg==',
  ],
  [
    '/content/base/assets/fixture-assets/world-subject.png',
    'iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAAySURBVDhPY4jbeuo/JZgBXYBUPGoADgM0zMyJEsNpACl4kBsA8jcuvxNlADF41IBT/wF7ANb/JnV8FwAAAABJRU5ErkJggg==',
  ],
]);

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
    define: { 'import.meta.env.VITE_MATERIALIZED_ASSETS': JSON.stringify('true') },
  });
  const fixtureServer = await preview({
    configFile: false,
    customLogger: diagnostics.logger,
    root: fixtureRoot,
    build: { outDir: fixtureOutput },
    plugins: [fixtureAssetPlugin()],
    preview: { host: '127.0.0.1', port: fixturePort, strictPort: true },
  });

  return async () => {
    await Promise.all([server.close(), fixtureServer.close()]);
    diagnostics.assertClean();
  };
}

function fixtureAssetPlugin(): Plugin {
  return {
    name: 'tiny-rescue-fixture-assets',
    configurePreviewServer(server) {
      server.middlewares.use((request, response, next) => {
        const png = request.url === undefined ? undefined : fixturePngs.get(request.url);
        if (png === undefined) {
          next();
          return;
        }
        response.statusCode = 200;
        response.setHeader('Content-Type', 'image/png');
        response.end(Buffer.from(png, 'base64'));
      });
    },
  };
}
