import { defineConfig } from 'vitest/config';
import { resolve } from 'node:path';

/**
 * Vitest config for unit and webview tests.
 *
 * Integration tests run under @vscode/test-electron (see test/integration) and
 * are excluded here.
 */
export default defineConfig({
  resolve: {
    alias: {
      '@shared': resolve(__dirname, 'src/shared'),
      vscode: resolve(__dirname, 'test/mocks/vscode.ts'),
    },
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['test/unit/**/*.test.ts', 'test/webview/**/*.test.tsx'],
    exclude: ['test/integration/**', 'node_modules/**'],
    setupFiles: ['test/setup.ts'],
    environmentMatchGlobs: [['test/webview/**', 'jsdom']],
  },
});
