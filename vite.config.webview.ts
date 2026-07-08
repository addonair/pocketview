import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';

/**
 * Build config for the React webview bundle.
 *
 * Produces predictable asset names (no hashes) so the extension host can
 * reference `webview.js` / `webview.css` when constructing the webview HTML.
 */
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@shared': resolve(__dirname, 'src/shared'),
    },
  },
  build: {
    target: 'es2020',
    outDir: 'dist/webview',
    emptyOutDir: true,
    sourcemap: true,
    // Emit one real webview.css instead of injecting styles from JS, so the
    // <link> in PreviewPanel resolves and styles apply before the script runs.
    cssCodeSplit: false,
    rollupOptions: {
      input: resolve(__dirname, 'src/webview/main.tsx'),
      output: {
        // IIFE so the bundle runs as a classic <script> (no type="module"),
        // matching how PreviewPanel injects it under the webview CSP.
        format: 'iife',
        inlineDynamicImports: true,
        entryFileNames: 'webview.js',
        assetFileNames: 'webview.[ext]',
      },
    },
  },
});
