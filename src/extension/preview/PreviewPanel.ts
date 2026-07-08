import * as vscode from 'vscode';
import { randomBytes } from 'node:crypto';
import type { HostToWebview, WebviewToHost } from '@shared/protocol';

/** Generate a cryptographically random nonce for the webview Content-Security-Policy. */
function nonce(): string {
  return randomBytes(24).toString('base64');
}

/**
 * Thin, single-instance wrapper around the VS Code {@link vscode.WebviewPanel}.
 * It owns the panel lifecycle, builds the CSP-locked HTML, and exposes a typed
 * message channel. All orchestration lives in {@link PreviewController}.
 */
export class PreviewPanel {
  static readonly viewType = 'pocketView.panel';
  private static instance: PreviewPanel | undefined;

  private readonly disposables: vscode.Disposable[] = [];
  private readonly incoming = new vscode.EventEmitter<WebviewToHost>();
  /** Fires for each message received from the webview. */
  readonly onMessage = this.incoming.event;

  private readonly onDisposeEmitter = new vscode.EventEmitter<void>();
  /** Fires once when the panel is closed. */
  readonly onDidDispose = this.onDisposeEmitter.event;

  private constructor(
    private readonly panel: vscode.WebviewPanel,
    private readonly extensionUri: vscode.Uri,
  ) {
    this.panel.webview.html = this.buildHtml();

    this.panel.webview.onDidReceiveMessage(
      (msg: WebviewToHost) => this.incoming.fire(msg),
      null,
      this.disposables,
    );

    this.panel.onDidChangeViewState(
      () => {
        void vscode.commands.executeCommand(
          'setContext',
          'pocketView.panelActive',
          this.panel.active,
        );
        void vscode.commands.executeCommand(
          'setContext',
          'pocketView.panelFocused',
          this.panel.active,
        );
      },
      null,
      this.disposables,
    );

    this.panel.onDidDispose(() => this.dispose(), null, this.disposables);
  }

  /** Create the panel if needed, otherwise reveal the existing one. */
  static createOrShow(extensionUri: vscode.Uri): PreviewPanel {
    const column = vscode.window.activeTextEditor?.viewColumn ?? vscode.ViewColumn.One;
    if (PreviewPanel.instance) {
      PreviewPanel.instance.panel.reveal(column);
      return PreviewPanel.instance;
    }

    const panel = vscode.window.createWebviewPanel(
      PreviewPanel.viewType,
      'PocketView',
      { viewColumn: vscode.ViewColumn.Beside, preserveFocus: false },
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [vscode.Uri.joinPath(extensionUri, 'dist', 'webview')],
      },
    );
    panel.iconPath = vscode.Uri.joinPath(extensionUri, 'media', 'icon.png');

    PreviewPanel.instance = new PreviewPanel(panel, extensionUri);
    void vscode.commands.executeCommand('setContext', 'pocketView.panelActive', true);
    return PreviewPanel.instance;
  }

  static get current(): PreviewPanel | undefined {
    return PreviewPanel.instance;
  }

  /** Send a typed message to the webview. */
  post(message: HostToWebview): void {
    void this.panel.webview.postMessage(message);
  }

  reveal(): void {
    this.panel.reveal();
  }

  /** Update the editor tab title (used to surface the resolved server URL). */
  setTitle(title: string): void {
    this.panel.title = title;
  }

  private buildHtml(): string {
    const webview = this.panel.webview;
    const dist = vscode.Uri.joinPath(this.extensionUri, 'dist', 'webview');
    const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(dist, 'webview.js'));
    const styleUri = webview.asWebviewUri(vscode.Uri.joinPath(dist, 'webview.css'));
    const n = nonce();
    const csp = [
      `default-src 'none'`,
      `img-src ${webview.cspSource} data: blob:`,
      `style-src ${webview.cspSource} 'unsafe-inline'`,
      `script-src 'nonce-${n}'`,
      `font-src ${webview.cspSource}`,
      `frame-src http://localhost:* http://127.0.0.1:* https: http:`,
      `connect-src ${webview.cspSource}`,
    ].join('; ');

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta http-equiv="Content-Security-Policy" content="${csp}" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <link href="${styleUri}" rel="stylesheet" />
  <title>PocketView</title>
</head>
<body>
  <div id="root" role="application" aria-label="PocketView"></div>
  <script nonce="${n}" src="${scriptUri}"></script>
</body>
</html>`;
  }

  private dispose(): void {
    PreviewPanel.instance = undefined;
    void vscode.commands.executeCommand('setContext', 'pocketView.panelActive', false);
    void vscode.commands.executeCommand('setContext', 'pocketView.panelFocused', false);
    this.onDisposeEmitter.fire();
    this.onDisposeEmitter.dispose();
    this.incoming.dispose();
    this.panel.dispose();
    while (this.disposables.length) this.disposables.pop()?.dispose();
  }
}
