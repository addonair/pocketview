import * as vscode from 'vscode';

/**
 * Thin wrapper around a VS Code output channel. Centralises logging so the rest
 * of the extension never writes to `console` directly and users get a single,
 * inspectable log.
 */
export class Logger {
  private readonly channel: vscode.OutputChannel;

  constructor(name = 'PocketView') {
    this.channel = vscode.window.createOutputChannel(name);
  }

  private write(level: string, message: string): void {
    const stamp = new Date().toISOString();
    this.channel.appendLine(`[${stamp}] [${level}] ${message}`);
  }

  info(message: string): void {
    this.write('info', message);
  }

  warn(message: string): void {
    this.write('warn', message);
  }

  error(message: string, err?: unknown): void {
    const detail = err instanceof Error ? `: ${err.message}` : err ? `: ${String(err)}` : '';
    this.write('error', message + detail);
  }

  dispose(): void {
    this.channel.dispose();
  }
}
