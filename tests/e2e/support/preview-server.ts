import { env } from 'node:process';
import { preview } from 'vite';

import { resolvePreviewPort } from './preview-port';
import { createPreviewDiagnostics } from './preview-diagnostics';

export default async function startProductionPreview(): Promise<() => Promise<void>> {
  const diagnostics = createPreviewDiagnostics();
  const server = await preview({
    configFile: false,
    customLogger: diagnostics.logger,
    build: { outDir: 'build/app' },
    preview: {
      host: '127.0.0.1',
      port: resolvePreviewPort(env['TINY_RESCUE_PREVIEW_PORT']),
      strictPort: true,
    },
  });

  return async () => {
    await server.close();
    diagnostics.assertClean();
  };
}
