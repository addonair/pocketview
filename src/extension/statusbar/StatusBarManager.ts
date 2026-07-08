import * as vscode from 'vscode';
import type { ServerStatus } from '@shared/protocol';

/**
 * Manages the "📱 PocketView" status bar button. Its tooltip reflects the
 * current connection status; clicking it opens the preview panel.
 */
export class StatusBarManager {
  private readonly item: vscode.StatusBarItem;

  constructor() {
    this.item = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
    this.item.command = 'pocketView.showPreview';
    this.item.name = 'PocketView';
    this.update({ state: 'disconnected', url: null, hmr: false });
  }

  /** Show or hide the item based on the `showStatusBar` setting. */
  applyVisibility(): void {
    const visible = vscode.workspace
      .getConfiguration('pocketView')
      .get<boolean>('showStatusBar', true);
    if (visible) this.item.show();
    else this.item.hide();
  }

  update(status: ServerStatus): void {
    const detail = status.detail ? `\n${status.detail}` : '';
    switch (status.state) {
      case 'connected':
        this.item.text = '$(device-mobile) PocketView';
        this.item.tooltip = `PocketView — Connected: ${status.url}${detail}`;
        this.item.backgroundColor = undefined;
        break;
      case 'searching':
        this.item.text = '$(sync~spin) PocketView';
        this.item.tooltip = 'PocketView — Searching for a dev server…';
        this.item.backgroundColor = undefined;
        break;
      case 'disconnected':
      default:
        this.item.text = '$(device-mobile) PocketView';
        this.item.tooltip = `PocketView — No dev server detected (click to open)${detail}`;
        this.item.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
        break;
    }
    this.applyVisibility();
  }

  dispose(): void {
    this.item.dispose();
  }
}
