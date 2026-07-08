import { defineConfig } from 'vite';
import { resolve } from 'node:path';

/**
 * Build config for the extension host bundle.
 *
 * The extension runs in VS Code's Node.js host, so we build in SSR (node) mode
 * to get proper Node resolution — node builtins stay as real `require` calls
 * rather than browser stubs — and emit a single CommonJS file. `vscode` and
 * `playwright-core` are kept external (provided at runtime / node_modules).
 */
export default defineConfig({
  resolve: {
    alias: {
      '@shared': resolve(__dirname, 'src/shared'),
    },
  },
  ssr: {
    target: 'node',
    noExternal: true,
  },
  build: {
    target: 'node18',
    outDir: 'dist',
    emptyOutDir: false,
    sourcemap: true,
    minify: false,
    ssr: true,
    rollupOptions: {
      input: resolve(__dirname, 'src/extension.ts'),
      external: ['vscode', 'playwright-core'],
      output: {
        format: 'cjs',
        entryFileNames: 'extension.js',
        exports: 'named',
      },
    },
  },
});
