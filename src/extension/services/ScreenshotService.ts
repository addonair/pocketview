import * as vscode from 'vscode';
import type { Browser, BrowserType } from 'playwright-core';
import type { Device, Orientation } from '@shared/devices/types';
import type { Logger } from '../utils/logger';

/** Browser channels to try, in order, so we reuse an already-installed browser. */
const CHANNELS = ['chrome', 'msedge', 'chrome-beta', 'msedge-beta'];

export interface CaptureOptions {
  device: Device;
  orientation: Orientation;
  url: string;
}

/**
 * Captures true app content by driving a headless Chromium-family browser via
 * Playwright. It reuses the user's installed Chrome/Edge (no download, no
 * visible window). The webview later composites the returned PNG into the CSS
 * device frame when a framed screenshot is requested.
 */
export class ScreenshotService {
  private browser: Browser | undefined;
  private launching: Promise<Browser> | undefined;

  constructor(private readonly log: Logger) {}

  /** Lazily import playwright-core so it never loads unless a screenshot is taken. */
  private async chromium(): Promise<BrowserType> {
    const mod = (await import('playwright-core')) as typeof import('playwright-core');
    return mod.chromium;
  }

  /** Reuse the running browser; concurrent callers share a single launch. */
  private launch(): Promise<Browser> {
    if (this.browser && this.browser.isConnected()) return Promise.resolve(this.browser);
    if (!this.launching) {
      this.launching = this.doLaunch().finally(() => {
        this.launching = undefined;
      });
    }
    return this.launching;
  }

  private async doLaunch(): Promise<Browser> {
    const chromium = await this.chromium();

    let lastError: unknown;
    for (const channel of CHANNELS) {
      try {
        this.browser = await chromium.launch({ headless: true, channel });
        this.log.info(`Launched headless browser via channel "${channel}".`);
        return this.browser;
      } catch (err) {
        lastError = err;
      }
    }
    // Final attempt: a Playwright-managed Chromium, if one happens to be present.
    try {
      this.browser = await chromium.launch({ headless: true });
      this.log.info('Launched headless bundled Chromium.');
      return this.browser;
    } catch (err) {
      lastError = err;
    }

    throw new Error(
      'Could not start a headless browser for screenshots. Install Google Chrome or ' +
        'Microsoft Edge (both run invisibly — no window opens).' +
        (lastError instanceof Error ? ` Details: ${lastError.message}` : ''),
    );
  }

  /**
   * Capture the app at the device's exact viewport, pixel ratio, and user agent.
   * Returns the screen-content PNG as a base64 string.
   */
  async capture(options: CaptureOptions): Promise<string> {
    const { device, orientation, url } = options;
    const browser = await this.launch();

    const landscape = orientation === 'landscape';
    const width = landscape ? device.viewport.height : device.viewport.width;
    const height = landscape ? device.viewport.width : device.viewport.height;

    const context = await browser.newContext({
      viewport: { width, height },
      deviceScaleFactor: device.pixelRatio,
      userAgent: device.userAgent,
      isMobile: device.category === 'phone' || device.category === 'foldable',
      hasTouch: device.touch,
    });
    try {
      const page = await context.newPage();
      await page.goto(url, { waitUntil: 'networkidle', timeout: 15000 }).catch(async () => {
        // networkidle can hang on apps with long-lived sockets (HMR); fall back.
        await page.goto(url, { waitUntil: 'load', timeout: 15000 });
      });
      const buffer = await page.screenshot({ type: 'png' });
      return buffer.toString('base64');
    } finally {
      await context.close();
    }
  }

  /**
   * Run a capture, prompting the user for a destination and writing the PNG.
   * The optional `framePngBase64` (a fully composited frame produced by the
   * webview) is written instead of the raw screen capture when provided.
   */
  async captureToFile(
    options: CaptureOptions,
    onScreenCaptured?: (pngBase64: string) => Promise<string | undefined>,
  ): Promise<void> {
    await vscode.window.withProgress(
      { location: vscode.ProgressLocation.Notification, title: 'Capturing device screenshot…' },
      async () => {
        const screenPng = await this.capture(options);
        const finalPng = onScreenCaptured ? await onScreenCaptured(screenPng) : screenPng;
        if (!finalPng) return; // caller will save later (frame composite path)

        await this.save(options.device.id, finalPng);
      },
    );
  }

  /** Prompt for a location and write a base64 PNG to disk. */
  async save(deviceId: string, pngBase64: string): Promise<void> {
    const defaultName = `${deviceId}-${Date.now()}.png`;
    const folders = vscode.workspace.workspaceFolders;
    const defaultUri = folders
      ? vscode.Uri.joinPath(folders[0].uri, defaultName)
      : vscode.Uri.file(defaultName);

    const target = await vscode.window.showSaveDialog({
      defaultUri,
      filters: { Images: ['png'] },
      saveLabel: 'Save Screenshot',
    });
    if (!target) return;

    await vscode.workspace.fs.writeFile(target, Buffer.from(pngBase64, 'base64'));
    const open = 'Open';
    const choice = await vscode.window.showInformationMessage(
      `Screenshot saved to ${target.fsPath}`,
      open,
    );
    if (choice === open) {
      await vscode.commands.executeCommand('vscode.open', target);
    }
  }

  async dispose(): Promise<void> {
    if (this.browser) {
      await this.browser.close().catch(() => undefined);
      this.browser = undefined;
    }
  }
}
