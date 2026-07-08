/**
 * Minimal `vscode` API mock for Vitest. Only the surface used by the units under
 * test is implemented. Tests set configuration values via {@link __setConfig}.
 */

let configStore: Record<string, unknown> = {};

/** Replace the mock configuration map (keys are "section.key"). */
export function __setConfig(map: Record<string, unknown>): void {
  configStore = map;
}

export class EventEmitter<T> {
  private listeners: Array<(e: T) => void> = [];
  event = (listener: (e: T) => void) => {
    this.listeners.push(listener);
    return { dispose: () => undefined };
  };
  fire(e: T): void {
    for (const l of this.listeners) l(e);
  }
  dispose(): void {
    this.listeners = [];
  }
}

export const workspace = {
  getConfiguration(section: string) {
    return {
      get<T>(key: string, defaultValue: T): T {
        const value = configStore[`${section}.${key}`];
        return value === undefined ? defaultValue : (value as T);
      },
    };
  },
  workspaceFolders: undefined as unknown,
};

/** Set the mock workspace folders from plain fs paths. */
export function __setWorkspaceFolders(fsPaths: string[] | undefined): void {
  workspace.workspaceFolders = fsPaths?.map((fsPath) => ({ uri: { fsPath } }));
}

export const window = {
  createOutputChannel() {
    return { appendLine: () => undefined, dispose: () => undefined };
  },
};
