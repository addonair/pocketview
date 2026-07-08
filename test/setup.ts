import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';

// Reset the DOM between webview component tests. Guarded so the same setup file
// is harmless in the node environment used by pure unit tests.
afterEach(async () => {
  if (typeof document !== 'undefined') {
    const { cleanup } = await import('@testing-library/react');
    cleanup();
  }
});
