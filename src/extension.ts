import * as vscode from 'vscode';
import { PreviewController } from './extension/preview/PreviewController';
import { StateStore } from './extension/services/StateStore';
import { StatusBarManager } from './extension/statusbar/StatusBarManager';
import { registerCommands } from './extension/commands';
import { Logger } from './extension/utils/logger';
import { validateLibrary } from '@shared/devices/registry';
import type { ZoomLevel } from '@shared/protocol';

/**
 * Extension entry point. Wires together the logger, persistence, status bar,
 * preview controller, and commands, then registers everything for disposal.
 */
export function activate(context: vscode.ExtensionContext): void {
  const log = new Logger();
  log.info('PocketView activated.');

  const problems = validateLibrary();
  if (problems.length) log.warn(`Device library issues: ${problems.join('; ')}`);

  const store = new StateStore(context, () => {
    const cfg = vscode.workspace.getConfiguration('pocketView');
    const zoomRaw = cfg.get<string>('defaultZoom', 'fit');
    return {
      deviceId: cfg.get<string>('defaultDevice', 'iphone-15-pro'),
      zoom: zoomRaw === 'fit' ? 'fit' : (Number(zoomRaw) as Exclude<ZoomLevel, 'fit'>),
      orientation: cfg.get<'portrait' | 'landscape'>('defaultOrientation', 'portrait'),
    };
  });

  const statusBar = new StatusBarManager();
  statusBar.applyVisibility();

  const controller = new PreviewController(context, store, statusBar, log);

  context.subscriptions.push(log, statusBar, ...registerCommands(controller));
}

/** Deactivation is handled through registered disposables. */
export function deactivate(): void {
  /* no-op: resources are disposed via context.subscriptions */
}
