import type { Orientation } from './devices/types';

/**
 * Typed message protocol between the extension host and the webview. Both sides
 * import these types so the message contract is checked at compile time.
 */

export type ConnectionState = 'searching' | 'connected' | 'disconnected';

export type ZoomLevel = 25 | 50 | 75 | 100 | 125 | 150 | 200 | 'fit';

/** Forced color-scheme applied to the previewed app ('system' = no override). */
export type ThemeMode = 'system' | 'light' | 'dark';

/** Text direction applied to the previewed app. */
export type TextDirection = 'ltr' | 'rtl';

/**
 * "System" simulation applied to the previewed app, injected into the iframe via
 * the preview proxy. Approximates a device's environment the way
 * device_preview's system settings do: forced color scheme, text scaling, and
 * text direction. Effective only for JS-driven theming (see PreviewProxy) — pure
 * CSS `@media (prefers-color-scheme)` rules cannot be emulated from inside the
 * page.
 */
export interface SystemSettings {
  theme: ThemeMode;
  /** Root font-size multiplier (1 = 100%). */
  textScale: number;
  direction: TextDirection;
}

export const DEFAULT_SYSTEM_SETTINGS: SystemSettings = {
  theme: 'system',
  textScale: 1,
  direction: 'ltr',
};

/** Configuration snapshot pushed from host settings to the webview. */
export interface PreviewConfig {
  defaultDevice: string;
  defaultZoom: ZoomLevel;
  autoRefresh: boolean;
  defaultOrientation: Orientation;
  includeFrameInScreenshot: boolean;
}

/** Persisted UI state the webview asks the host to remember. */
export interface PersistedState {
  deviceId: string;
  zoom: ZoomLevel;
  orientation: Orientation;
  favorites: string[];
  recents: string[];
  /** Whether the device bezel/chrome is drawn (false = frameless screen). */
  showFrame: boolean;
  /** Whether the safe-area guide overlay is shown. */
  showSafeArea: boolean;
  /** Simulated system environment applied to the previewed app. */
  system: SystemSettings;
}

/** Server status as understood by the webview status bar. */
export interface ServerStatus {
  state: ConnectionState;
  url: string | null;
  /** Whether the detected server appears to support HMR (Vite/Next/etc.). */
  hmr: boolean;
  /** Human-readable note on how this server was chosen (or why none was). */
  detail?: string;
  /**
   * URL the iframe should load — the route-tracking proxy when active,
   * otherwise the same as {@link url}.
   */
  previewUrl?: string;
}

/** Messages sent from the extension host to the webview. */
export type HostToWebview =
  | { type: 'init'; config: PreviewConfig; state: PersistedState; status: ServerStatus }
  | { type: 'serverStatus'; status: ServerStatus }
  | { type: 'applyConfig'; config: PreviewConfig }
  | { type: 'reload'; url: string | null }
  | { type: 'setDevice'; deviceId: string }
  | { type: 'nextDevice'; direction: 1 | -1 }
  | { type: 'rotate' }
  | { type: 'setZoom'; zoom: ZoomLevel }
  | { type: 'toggleFullscreen' }
  | { type: 'requestScreenshot' }
  | { type: 'screenshotResult'; ok: boolean; message: string; framePngBase64?: string }
  | { type: 'fileChanged'; at: number }
  | { type: 'error'; message: string };

/** Messages sent from the webview to the extension host. */
export type WebviewToHost =
  | { type: 'ready' }
  | { type: 'reconnect' }
  | { type: 'connectUrl'; url: string }
  | { type: 'openInBrowser' }
  | { type: 'captureScreenshot'; deviceId: string; orientation: Orientation }
  | { type: 'compositeScreenshot'; pngBase64: string }
  | { type: 'persistState'; state: PersistedState }
  | { type: 'routeChanged'; route: string }
  | { type: 'setContext'; focused: boolean }
  | { type: 'log'; level: 'info' | 'warn' | 'error'; message: string };
