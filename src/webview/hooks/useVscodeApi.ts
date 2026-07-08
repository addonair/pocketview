import { useEffect, useMemo } from 'react';
import type { HostToWebview, WebviewToHost } from '@shared/protocol';

/** The subset of the VS Code webview API we use. */
interface VsCodeApi {
  postMessage(message: WebviewToHost): void;
  getState<T>(): T | undefined;
  setState<T>(state: T): void;
}

declare global {
  interface Window {
    acquireVsCodeApi?: () => VsCodeApi;
  }
}

// `acquireVsCodeApi` may only be called once per webview, so cache the result.
let cached: VsCodeApi | undefined;
function getApi(): VsCodeApi {
  if (!cached) {
    cached = window.acquireVsCodeApi
      ? window.acquireVsCodeApi()
      : {
          // Fallback for tests / standalone rendering.
          postMessage: () => undefined,
          getState: () => undefined,
          setState: () => undefined,
        };
  }
  return cached;
}

/**
 * Provides a typed `post` function and subscribes to messages from the host.
 * The `onMessage` handler is invoked for every {@link HostToWebview} message.
 */
export function useVscodeApi(onMessage: (message: HostToWebview) => void): {
  post: (message: WebviewToHost) => void;
} {
  const api = useMemo(getApi, []);

  useEffect(() => {
    const listener = (event: MessageEvent<HostToWebview>) => onMessage(event.data);
    window.addEventListener('message', listener);
    return () => window.removeEventListener('message', listener);
  }, [onMessage]);

  return useMemo(() => ({ post: (message: WebviewToHost) => api.postMessage(message) }), [api]);
}
