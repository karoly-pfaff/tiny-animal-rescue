import { describe, expect, it } from 'vitest';

import { createPreviewDiagnostics } from '../e2e/support/preview-diagnostics';

describe('preview diagnostics', () => {
  it('accepts a clean preview lifecycle', () => {
    const diagnostics = createPreviewDiagnostics();

    expect(() => {
      diagnostics.assertClean();
    }).not.toThrow();
  });

  it.each([
    [
      'warning',
      (diagnostics: ReturnType<typeof createPreviewDiagnostics>) => {
        diagnostics.logger.warn('careful');
      },
    ],
    [
      'error',
      (diagnostics: ReturnType<typeof createPreviewDiagnostics>) => {
        diagnostics.logger.error('broken');
      },
    ],
  ])('fails after a Vite %s', (_level, report) => {
    const diagnostics = createPreviewDiagnostics();

    report(diagnostics);

    expect(() => {
      diagnostics.assertClean();
    }).toThrow(/Production preview emitted diagnostics/);
  });

  it('deduplicates warnings reported through warnOnce', () => {
    const diagnostics = createPreviewDiagnostics();

    diagnostics.logger.warnOnce('careful');
    diagnostics.logger.warnOnce('careful');

    expect(() => {
      diagnostics.assertClean();
    }).toThrow('warning: careful');
  });
});
