import {
  DEFAULT_SYSTEM_SETTINGS,
  type PreviewConfig,
  type PersistedState,
  type ServerStatus,
  type SystemSettings,
  type ThemeMode,
  type TextDirection,
  type ZoomLevel,
} from '@shared/protocol';
import type { Orientation } from '@shared/devices/types';
import { DEVICES, resolveDevice } from '@shared/devices/registry';

/** Clamp helper for the text-scale slider. */
export const TEXT_SCALE_RANGE = { min: 0.85, max: 1.5, step: 0.05 } as const;

/** Complete webview UI state. */
export interface UiState {
  config: PreviewConfig;
  status: ServerStatus;
  deviceId: string;
  orientation: Orientation;
  zoom: ZoomLevel;
  favorites: string[];
  recents: string[];
  fullscreen: boolean;
  pickerOpen: boolean;
  /** Whether the system-settings panel is open. */
  settingsOpen: boolean;
  /** Whether the device bezel/chrome is drawn (false = frameless screen). */
  showFrame: boolean;
  /** Whether the safe-area guide overlay is shown. */
  showSafeArea: boolean;
  /** Simulated system environment applied to the previewed app. */
  system: SystemSettings;
  loading: boolean;
  error: string | null;
  lastRefresh: number | null;
  /** Route the user is on inside the app (from the proxy's route reporter). */
  route: string | null;
  /** Bumped to force an iframe reload without changing the URL. */
  reloadNonce: number;
}

export const initialState: UiState = {
  config: {
    defaultDevice: 'iphone-15-pro',
    defaultZoom: 'fit',
    autoRefresh: true,
    defaultOrientation: 'portrait',
    includeFrameInScreenshot: false,
  },
  status: { state: 'searching', url: null, hmr: false },
  deviceId: 'iphone-15-pro',
  orientation: 'portrait',
  zoom: 'fit',
  favorites: [],
  recents: [],
  fullscreen: false,
  pickerOpen: false,
  settingsOpen: false,
  showFrame: true,
  showSafeArea: false,
  system: DEFAULT_SYSTEM_SETTINGS,
  loading: false,
  error: null,
  lastRefresh: null,
  route: null,
  reloadNonce: 0,
};

export type Action =
  | { type: 'init'; config: PreviewConfig; state: PersistedState; status: ServerStatus }
  | { type: 'applyConfig'; config: PreviewConfig }
  | { type: 'status'; status: ServerStatus }
  | { type: 'selectDevice'; deviceId: string }
  | { type: 'cycleDevice'; direction: 1 | -1 }
  | { type: 'rotate' }
  | { type: 'setZoom'; zoom: ZoomLevel }
  | { type: 'toggleFullscreen' }
  | { type: 'setPicker'; open: boolean }
  | { type: 'setSettings'; open: boolean }
  | { type: 'toggleFrame' }
  | { type: 'toggleSafeArea' }
  | { type: 'setTheme'; theme: ThemeMode }
  | { type: 'setTextScale'; scale: number }
  | { type: 'setDirection'; direction: TextDirection }
  | { type: 'resetSystem' }
  | { type: 'toggleFavorite'; deviceId: string }
  | { type: 'setLoading'; loading: boolean }
  | { type: 'setError'; error: string | null }
  | { type: 'setRoute'; route: string }
  | { type: 'reload' }
  | { type: 'fileChanged'; at: number };

const MAX_RECENTS = 8;

/** Push a device id to the front of the recents list (deduped, capped). */
function pushRecent(recents: string[], deviceId: string): string[] {
  return [deviceId, ...recents.filter((id) => id !== deviceId)].slice(0, MAX_RECENTS);
}

/** Move to the next/previous device in the (name-sorted) library, wrapping. */
function cycle(current: string, direction: 1 | -1): string {
  const ids = DEVICES.map((d) => d.id);
  const idx = Math.max(0, ids.indexOf(current));
  const next = (idx + direction + ids.length) % ids.length;
  return ids[next];
}

export function reducer(state: UiState, action: Action): UiState {
  switch (action.type) {
    case 'init': {
      const device = resolveDevice(action.state.deviceId, action.config.defaultDevice);
      return {
        ...state,
        config: action.config,
        status: action.status,
        deviceId: device.id,
        orientation: action.state.orientation ?? action.config.defaultOrientation,
        zoom: action.state.zoom ?? action.config.defaultZoom,
        favorites: action.state.favorites ?? [],
        recents: action.state.recents ?? [],
        showFrame: action.state.showFrame ?? true,
        showSafeArea: action.state.showSafeArea ?? false,
        system: { ...DEFAULT_SYSTEM_SETTINGS, ...(action.state.system ?? {}) },
      };
    }
    case 'applyConfig':
      return { ...state, config: action.config };
    case 'status':
      return {
        ...state,
        status: action.status,
        error: null,
        // A different server means the tracked route no longer applies.
        route: action.status.url === state.status.url ? state.route : null,
      };
    case 'selectDevice': {
      const device = resolveDevice(action.deviceId);
      const orientation = device.orientations.includes(state.orientation)
        ? state.orientation
        : device.orientations[0];
      return {
        ...state,
        deviceId: device.id,
        orientation,
        recents: pushRecent(state.recents, device.id),
        pickerOpen: false,
      };
    }
    case 'cycleDevice': {
      const deviceId = cycle(state.deviceId, action.direction);
      return { ...state, deviceId, recents: pushRecent(state.recents, deviceId) };
    }
    case 'rotate': {
      const device = resolveDevice(state.deviceId);
      if (device.orientations.length < 2) return state;
      return {
        ...state,
        orientation: state.orientation === 'portrait' ? 'landscape' : 'portrait',
      };
    }
    case 'setZoom':
      return { ...state, zoom: action.zoom };
    case 'toggleFullscreen':
      return { ...state, fullscreen: !state.fullscreen };
    case 'setPicker':
      return { ...state, pickerOpen: action.open };
    case 'setSettings':
      return { ...state, settingsOpen: action.open };
    case 'toggleFrame':
      return { ...state, showFrame: !state.showFrame };
    case 'toggleSafeArea':
      return { ...state, showSafeArea: !state.showSafeArea };
    case 'setTheme':
      return { ...state, system: { ...state.system, theme: action.theme } };
    case 'setTextScale': {
      const scale = Math.min(
        TEXT_SCALE_RANGE.max,
        Math.max(TEXT_SCALE_RANGE.min, Math.round(action.scale * 100) / 100),
      );
      return { ...state, system: { ...state.system, textScale: scale } };
    }
    case 'setDirection':
      return { ...state, system: { ...state.system, direction: action.direction } };
    case 'resetSystem':
      return { ...state, system: DEFAULT_SYSTEM_SETTINGS };
    case 'toggleFavorite': {
      const has = state.favorites.includes(action.deviceId);
      return {
        ...state,
        favorites: has
          ? state.favorites.filter((id) => id !== action.deviceId)
          : [...state.favorites, action.deviceId],
      };
    }
    case 'setLoading':
      return { ...state, loading: action.loading };
    case 'setError':
      return { ...state, error: action.error, loading: false };
    case 'setRoute':
      return { ...state, route: action.route };
    case 'reload':
      return { ...state, reloadNonce: state.reloadNonce + 1, loading: true };
    case 'fileChanged':
      return { ...state, lastRefresh: action.at };
    default:
      return state;
  }
}
