import * as vscode from 'vscode';
import { debounce, type Debounced } from '../utils/debounce';
import type { Logger } from '../utils/logger';

/** File extensions that trigger a preview refresh. */
const WATCH_GLOB = '**/*.{html,htm,css,scss,sass,less,js,jsx,mjs,cjs,ts,tsx,vue,svelte,astro}';

const DEBOUNCE_MS = 250;

/**
 * Watches workspace source files and invokes a callback (debounced) when they
 * change. The caller decides whether to force an iframe reload or defer to the
 * dev server's own HMR.
 */
export class FileWatcher {
  private watcher: vscode.FileSystemWatcher | undefined;
  private readonly fire: Debounced<[]>;

  constructor(
    onChange: () => void,
    private readonly log: Logger,
  ) {
    this.fire = debounce(onChange, DEBOUNCE_MS);
  }

  /** Begin watching. Safe to call repeatedly; restarts the underlying watcher. */
  start(): void {
    this.stop();
    this.watcher = vscode.workspace.createFileSystemWatcher(WATCH_GLOB);
    this.watcher.onDidChange(() => this.fire());
    this.watcher.onDidCreate(() => this.fire());
    this.watcher.onDidDelete(() => this.fire());
    this.log.info('File watcher started.');
  }

  stop(): void {
    this.watcher?.dispose();
    this.watcher = undefined;
  }

  dispose(): void {
    this.fire.cancel();
    this.stop();
  }
}
