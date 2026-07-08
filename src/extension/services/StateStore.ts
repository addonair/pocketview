import * as vscode from 'vscode';
import { DEFAULT_SYSTEM_SETTINGS, type PersistedState, type ZoomLevel } from '@shared/protocol';
import type { Orientation } from '@shared/devices/types';

const KEY_UI = 'pocketView.ui';
const KEY_LAST_SERVER = 'pocketView.lastServer';
const KEY_LAST_SHOT_PATH = 'pocketView.lastShotPath';

/**
 * Persists UI state (selected device, zoom, orientation, favorites, recents) and
 * the last successful server URL. UI state lives in global state so preferences
 * follow the user; the last server lives in workspace state so it is scoped to
 * the project.
 */
export class StateStore {
  constructor(
    private readonly ctx: vscode.ExtensionContext,
    private readonly defaults: () => Pick<PersistedState, 'deviceId' | 'zoom' | 'orientation'>,
  ) {}

  getUiState(): PersistedState {
    const base = this.defaults();
    const stored = this.ctx.globalState.get<Partial<PersistedState>>(KEY_UI) ?? {};
    return {
      deviceId: stored.deviceId ?? base.deviceId,
      zoom: (stored.zoom as ZoomLevel) ?? base.zoom,
      orientation: (stored.orientation as Orientation) ?? base.orientation,
      favorites: stored.favorites ?? [],
      recents: stored.recents ?? [],
      showFrame: stored.showFrame ?? true,
      showSafeArea: stored.showSafeArea ?? false,
      system: { ...DEFAULT_SYSTEM_SETTINGS, ...(stored.system ?? {}) },
    };
  }

  async setUiState(state: PersistedState): Promise<void> {
    await this.ctx.globalState.update(KEY_UI, state);
  }

  getLastServer(): string | undefined {
    return this.ctx.workspaceState.get<string>(KEY_LAST_SERVER);
  }

  async setLastServer(url: string): Promise<void> {
    await this.ctx.workspaceState.update(KEY_LAST_SERVER, url);
  }

  /** Route/path last captured in a screenshot, per workspace. */
  getLastShotPath(): string | undefined {
    return this.ctx.workspaceState.get<string>(KEY_LAST_SHOT_PATH);
  }

  async setLastShotPath(path: string): Promise<void> {
    await this.ctx.workspaceState.update(KEY_LAST_SHOT_PATH, path);
  }
}
