import type { PreviewConfig, PersistedState, ServerStatus, ZoomLevel } from '@shared/protocol';
import type { Orientation } from '@shared/devices/types';
import { DEVICES, resolveDevice } from '@shared/devices/registry';

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
  loading: boolean;
  error: string | null;
  lastRefresh: number | null;
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
  loading: false,
  error: null,
  lastRefresh: null,
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
  | { type: 'toggleFavorite'; deviceId: string }
  | { type: 'setLoading'; loading: boolean }
  | { type: 'setError'; error: string | null }
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
      };
    }
    case 'applyConfig':
      return { ...state, config: action.config };
    case 'status':
      return { ...state, status: action.status, error: null };
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
    case 'reload':
      return { ...state, reloadNonce: state.reloadNonce + 1, loading: true };
    case 'fileChanged':
      return { ...state, lastRefresh: action.at };
    default:
      return state;
  }
}
