import * as vscode from 'vscode';
import type {
  HostToWebview,
  PreviewConfig,
  ServerStatus,
  WebviewToHost,
  ZoomLevel,
} from '@shared/protocol';
import type { Orientation } from '@shared/devices/types';
import { resolveDevice, getDeviceById } from '@shared/devices/registry';
import { PreviewPanel } from './PreviewPanel';
import { ServerDetector } from '../services/ServerDetector';
import { ScreenshotService, resolveCaptureUrl } from '../services/ScreenshotService';
import { PreviewProxy } from '../services/PreviewProxy';
import { StateStore } from '../services/StateStore';
import { FileWatcher } from '../watchers/FileWatcher';
import { StatusBarManager } from '../statusbar/StatusBarManager';
import type { Logger } from '../utils/logger';

/** Read the current extension settings into a {@link PreviewConfig}. */
function readConfig(): PreviewConfig {
  const cfg = vscode.workspace.getConfiguration('pocketView');
  const zoomRaw = cfg.get<string>('defaultZoom', 'fit');
  const zoom: ZoomLevel = zoomRaw === 'fit' ? 'fit' : (Number(zoomRaw) as ZoomLevel);
  return {
    defaultDevice: cfg.get<string>('defaultDevice', 'iphone-15-pro'),
    defaultZoom: zoom,
    autoRefresh: cfg.get<boolean>('autoRefresh', true),
    defaultOrientation: cfg.get<Orientation>('defaultOrientation', 'portrait'),
    includeFrameInScreenshot: cfg.get<boolean>('screenshot.includeFrame', false),
  };
}

/**
 * Central coordinator: owns the long-lived services and connects them to the
 * webview panel. Commands call the public methods here; the panel forwards
 * webview messages to {@link handleMessage}.
 */
export class PreviewController {
  private readonly detector: ServerDetector;
  private readonly screenshots: ScreenshotService;
  private readonly watcher: FileWatcher;
  private readonly proxy: PreviewProxy;
  private panel: PreviewPanel | undefined;

  /** Device id last reported by the webview, used for command-driven captures. */
  private lastDeviceId: string;
  private lastOrientation: Orientation;
  private pendingScreenshotDevice: string | undefined;
  /** Latest status enriched with the proxy previewUrl (what the iframe loads). */
  private enrichedStatus: ServerStatus | undefined;
  /** Route the user is currently on inside the app (from the proxy reporter). */
  private currentRoute: string | undefined;

  constructor(
    private readonly ctx: vscode.ExtensionContext,
    private readonly store: StateStore,
    private readonly statusBar: StatusBarManager,
    private readonly log: Logger,
  ) {
    this.detector = new ServerDetector(store, log);
    this.screenshots = new ScreenshotService(log);
    this.watcher = new FileWatcher(() => this.handleFileChange(), log);
    this.proxy = new PreviewProxy(log);

    const ui = store.getUiState();
    this.lastDeviceId = ui.deviceId;
    this.lastOrientation = ui.orientation;

    ctx.subscriptions.push(
      this.detector.onDidChangeStatus((status) => void this.onStatusChanged(status)),
      this.detector,
      this.watcher,
      this.proxy,
      { dispose: () => void this.screenshots.dispose() },
      vscode.workspace.onDidChangeConfiguration((e) => {
        if (e.affectsConfiguration('pocketView')) this.onConfigChanged();
      }),
    );
  }

  /** Open (or focus) the preview panel and kick off detection + watching. */
  async show(): Promise<void> {
    if (this.panel) {
      this.panel.reveal();
      return;
    }
    const panel = PreviewPanel.createOrShow(this.ctx.extensionUri);
    this.panel = panel;

    panel.onMessage((msg) => this.handleMessage(msg));
    panel.onDidDispose(() => {
      this.panel = undefined;
      this.watcher.stop();
    });

    this.watcher.start();
    // Detection runs in the background; results are pushed via onStatusChanged.
    void this.detector.detect();
  }

  private async onStatusChanged(status: ServerStatus): Promise<void> {
    let previewUrl = status.url ?? undefined;
    if (status.state === 'connected' && status.url) {
      const tracking = vscode.workspace
        .getConfiguration('pocketView')
        .get<boolean>('routeTracking', true);
      previewUrl = await this.proxy.ensure(status.url, tracking);
    } else {
      this.proxy.stop();
    }
    this.currentRoute = undefined; // route belongs to the previous server
    this.enrichedStatus = { ...status, previewUrl };

    this.statusBar.update(status);
    // Surface the resolved URL in the tab title so a mismatch is obvious.
    const host =
      status.state === 'connected' && status.url ? status.url.replace(/^https?:\/\//, '') : null;
    this.panel?.setTitle(host ? `PocketView — ${host}` : 'PocketView');
    this.panel?.post({ type: 'serverStatus', status: this.enrichedStatus });
  }

  private onConfigChanged(): void {
    this.statusBar.applyVisibility();
    this.panel?.post({ type: 'applyConfig', config: readConfig() });
  }

  private handleFileChange(): void {
    if (!this.panel) return;
    const config = readConfig();
    const status = this.detector.getStatus();
    this.panel.post({ type: 'fileChanged', at: Date.now() });
    // Defer to the dev server's own HMR when available; otherwise reload.
    if (config.autoRefresh && !status.hmr) {
      this.panel.post({ type: 'reload', url: status.url });
    }
  }

  private async handleMessage(msg: WebviewToHost): Promise<void> {
    switch (msg.type) {
      case 'ready':
        this.sendInit();
        break;
      case 'reconnect':
        await this.detector.detect();
        break;
      case 'connectUrl':
        await this.connectToUrl(msg.url || undefined);
        break;
      case 'openInBrowser':
        await this.openInBrowser();
        break;
      case 'captureScreenshot':
        await this.captureScreenshot(msg.deviceId, msg.orientation);
        break;
      case 'compositeScreenshot':
        await this.saveComposite(msg.pngBase64);
        break;
      case 'persistState':
        this.lastDeviceId = msg.state.deviceId;
        this.lastOrientation = msg.state.orientation;
        await this.store.setUiState(msg.state);
        break;
      case 'routeChanged':
        this.currentRoute = msg.route;
        break;
      case 'setContext':
        await vscode.commands.executeCommand(
          'setContext',
          'pocketView.panelFocused',
          msg.focused,
        );
        break;
      case 'log':
        this.log[msg.level](`[webview] ${msg.message}`);
        break;
    }
  }

  private sendInit(): void {
    if (!this.panel) return;
    const init: HostToWebview = {
      type: 'init',
      config: readConfig(),
      state: this.store.getUiState(),
      status: this.enrichedStatus ?? this.detector.getStatus(),
    };
    this.panel.post(init);
  }

  // --- Command-facing operations -------------------------------------------

  refresh(): void {
    const status = this.detector.getStatus();
    this.panel?.post({ type: 'reload', url: status.url });
  }

  rotate(): void {
    this.panel?.post({ type: 'rotate' });
  }

  cycleDevice(direction: 1 | -1): void {
    this.panel?.post({ type: 'nextDevice', direction });
  }

  toggleFullscreen(): void {
    this.panel?.post({ type: 'toggleFullscreen' });
  }

  requestScreenshot(): void {
    // Ask the webview to report its current device/orientation and begin capture.
    if (this.panel) {
      this.panel.post({ type: 'requestScreenshot' });
    } else {
      void this.captureScreenshot(this.lastDeviceId, this.lastOrientation);
    }
  }

  async connectToUrl(url?: string): Promise<void> {
    const value =
      url ??
      (await vscode.window.showInputBox({
        title: 'Connect to URL',
        prompt: 'Enter the dev server URL to preview',
        placeHolder: 'http://localhost:3000',
        value: this.detector.getStatus().url ?? 'http://localhost:',
      }));
    if (!value) return;
    try {
      await this.detector.connectTo(value);
    } catch (err) {
      void vscode.window.showErrorMessage(
        err instanceof Error ? err.message : 'Could not connect to that URL.',
      );
    }
  }

  private async openInBrowser(): Promise<void> {
    const url = this.detector.getStatus().url;
    if (!url) {
      void vscode.window.showWarningMessage('No dev server is connected yet.');
      return;
    }
    await vscode.env.openExternal(vscode.Uri.parse(url));
  }

  /**
   * Ask which page to capture, prefilled with the route the user is currently
   * on (reported live by the proxy's route tracker) — so the default is simply
   * "what I'm looking at" and Enter confirms it. Falls back to the last
   * captured route when tracking is unavailable.
   */
  private async promptForCaptureUrl(baseUrl: string): Promise<string | undefined> {
    const current = this.currentRoute;
    const input = await vscode.window.showInputBox({
      title: 'Capture Screenshot',
      prompt: current
        ? 'Press Enter to capture the page you are viewing, or type another route.'
        : 'Which page should be captured? (e.g. /login — the capture runs in a fresh session)',
      value: current ?? this.store.getLastShotPath() ?? '/',
      placeHolder: '/  ·  /login  ·  #/dashboard  ·  full http://… URL',
    });
    if (input === undefined) return undefined; // user cancelled
    const path = input.trim() || '/';
    await this.store.setLastShotPath(path);
    return resolveCaptureUrl(baseUrl, path);
  }

  private async captureScreenshot(deviceId: string, orientation: Orientation): Promise<void> {
    const url = this.detector.getStatus().url;
    if (!url) {
      void vscode.window.showWarningMessage('Connect to a dev server before taking a screenshot.');
      return;
    }
    const captureUrl = await this.promptForCaptureUrl(url);
    if (!captureUrl) return;
    const device = getDeviceById(deviceId) ?? resolveDevice(deviceId);
    const includeFrame = readConfig().includeFrameInScreenshot;

    try {
      await this.screenshots.captureToFile(
        { device, orientation, url: captureUrl },
        includeFrame
          ? async (screenPng) => {
              // Hand the raw capture to the webview to composite into the frame.
              this.pendingScreenshotDevice = device.id;
              this.panel?.post({
                type: 'screenshotResult',
                ok: true,
                message: 'composite',
                framePngBase64: screenPng,
              });
              return undefined; // saving happens once the composite returns
            }
          : undefined,
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Screenshot failed.';
      this.log.error('Screenshot failed', err);
      this.panel?.post({ type: 'screenshotResult', ok: false, message });
      void vscode.window.showErrorMessage(message);
    }
  }

  private async saveComposite(pngBase64: string): Promise<void> {
    const id = this.pendingScreenshotDevice ?? this.lastDeviceId;
    this.pendingScreenshotDevice = undefined;
    await this.screenshots.save(id, pngBase64);
  }
}
