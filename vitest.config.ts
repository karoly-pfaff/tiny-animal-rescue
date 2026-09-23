import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: false,
    setupFiles: ['./tests/setup-tests.ts'],
    include: ['tests/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['tests/e2e/**'],
    passWithNoTests: false,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary', 'html'],
      reportsDirectory: 'build/reports/coverage',
      include: ['sources/**/*.{ts,tsx}'],
      thresholds: {
        branches: 85,
        functions: 90,
        lines: 90,
        statements: 90,
        'sources/app/routes.ts': {
          branches: 100,
          functions: 100,
          lines: 100,
          statements: 100,
        },
        'sources/content/content-registry.ts': {
          branches: 100,
          functions: 100,
          lines: 100,
          statements: 100,
        },
        'sources/content/pack-dependency-order.ts': {
          branches: 100,
          functions: 100,
          lines: 100,
          statements: 100,
        },
        'sources/persistence/save-game-schema.ts': {
          branches: 100,
          functions: 100,
          lines: 100,
          statements: 100,
        },
      },
    },
  },
});
