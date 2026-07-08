import * as vscode from 'vscode';
import type { ServerStatus } from '@shared/protocol';
import { probe } from '../utils/httpProbe';
import { findWorkspaceServers, type WorkspaceServer } from './PortInspector';
import type { Logger } from '../utils/logger';
import type { StateStore } from './StateStore';

/** Ports scanned by default, ordered by how common they are for dev servers. */
export const DEFAULT_PORTS = [5173, 3000, 3001, 4173, 8080, 8000, 4200, 5500];

const HOST = '127.0.0.1';

/**
 * Detects the dev server that belongs to the CURRENT workspace. Priority:
 *
 * 1. `pocketView.url` — explicit pin, always wins.
 * 2. Listening ports whose owning process runs from inside the workspace
 *    (matched via {@link findWorkspaceServers}); the most recently started one
 *    wins, which handles Vite hopping 5173 → 5174 when the default is taken.
 * 3. Explicitly configured `customPorts` / `defaultURL`.
 * 4. Blind port scanning is used ONLY when process ownership cannot be
 *    determined on this platform — never to silently pick another project's
 *    server over a "no server found" report.
 */
export class ServerDetector {
  private status: ServerStatus = { state: 'disconnected', url: null, hmr: false };
  private detecting = false;

  private readonly emitter = new vscode.EventEmitter<ServerStatus>();
  /** Fires whenever the connection status changes. */
  readonly onDidChangeStatus = this.emitter.event;

  constructor(
    private readonly store: StateStore,
    private readonly log: Logger,
  ) {}

  getStatus(): ServerStatus {
    return this.status;
  }

  private setStatus(next: ServerStatus): void {
    this.status = next;
    this.emitter.fire(next);
  }

  /** Fallback-scan ports: remembered server first, then extras, then defaults. */
  private candidatePorts(): number[] {
    const cfg = vscode.workspace.getConfiguration('pocketView');
    const custom = cfg.get<number[]>('customPorts', []);
    const remembered = this.rememberedPort();
    const ordered = [
      ...(remembered !== undefined ? [remembered] : []),
      ...custom,
      ...DEFAULT_PORTS,
    ];
    return Array.from(new Set(ordered.filter((p) => Number.isInteger(p) && p > 0 && p < 65536)));
  }

  private rememberedPort(): number | undefined {
    const cfg = vscode.workspace.getConfiguration('pocketView');
    if (!cfg.get<boolean>('rememberLastServer', true)) return undefined;
    const url = this.store.getLastServer();
    if (!url) return undefined;
    try {
      return Number(new URL(url).port) || 80;
    } catch {
      return undefined;
    }
  }

  /** Detect and connect to this workspace's dev server. */
  async detect(): Promise<ServerStatus> {
    const cfg = vscode.workspace.getConfiguration('pocketView');

    const pinned = cfg.get<string>('url', '').trim();
    if (pinned) {
      try {
        return await this.connectTo(pinned, 'Pinned by the pocketView.url setting.');
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        this.setStatus({ state: 'disconnected', url: null, hmr: false, detail: message });
        return this.status;
      }
    }

    if (!cfg.get<boolean>('autoDetect', true)) {
      const fallback = cfg.get<string>('defaultURL', '').trim();
      if (fallback) return this.connectTo(fallback, 'From the pocketView.defaultURL setting.');
      this.setStatus({ state: 'disconnected', url: null, hmr: false });
      return this.status;
    }

    if (this.detecting) return this.status;
    this.detecting = true;
    this.setStatus({ state: 'searching', url: null, hmr: false });

    try {
      const roots = (vscode.workspace.workspaceFolders ?? []).map((f) => f.uri.fsPath);

      let owned: WorkspaceServer[] | undefined;
      let inspectError: string | undefined;
      if (roots.length > 0) {
        try {
          owned = await findWorkspaceServers(roots, (line) => this.log.info(line));
        } catch (err) {
          inspectError = err instanceof Error ? err.message : String(err);
          this.log.warn(`${inspectError} — falling back to port scan.`);
        }
      }

      if (owned !== undefined) return await this.connectOwned(owned, cfg);
      return await this.connectByScan(cfg, inspectError);
    } finally {
      this.detecting = false;
    }
  }

  /** Connect using verified workspace-owned servers (never guesses). */
  private async connectOwned(
    owned: WorkspaceServer[],
    cfg: vscode.WorkspaceConfiguration,
  ): Promise<ServerStatus> {
    const live = await this.probeLive(owned.map((s) => s.port));
    if (live.length > 0) {
      const byPort = new Map(owned.map((s) => [s.port, s]));
      // Most recently started first: a port-hopped server (5173 taken → 5174)
      // is by definition newer than whichever process kept the default port.
      live.sort((a, b) => {
        const sa = byPort.get(a.port)?.startTime ?? 0;
        const sb = byPort.get(b.port)?.startTime ?? 0;
        return sb - sa || b.port - a.port;
      });
      const chosen = live[0];
      const url = `http://localhost:${chosen.port}`;
      await this.store.setLastServer(url);
      const extra =
        live.length > 1
          ? ` ${live.length} workspace servers found; picked the most recent (others: ${live
              .slice(1)
              .map((s) => `:${s.port}`)
              .join(', ')}).`
          : '';
      this.log.info(`Connected to ${url} — owned by this workspace (pid ${byPort.get(chosen.port)?.pid}).${extra}`);
      this.setStatus({
        state: 'connected',
        url,
        hmr: chosen.hmr,
        detail: `Verified: this server belongs to the current workspace.${extra}`,
      });
      return this.status;
    }

    // Ownership is known and nothing here belongs to this workspace. Only
    // explicit configuration may connect now — never a lucky port.
    const custom = cfg.get<number[]>('customPorts', []).filter((p) => Number.isInteger(p) && p > 0 && p < 65536);
    const customLive = await this.probeLive(custom);
    if (customLive.length > 0) {
      const chosen = customLive[0];
      const url = `http://localhost:${chosen.port}`;
      await this.store.setLastServer(url);
      this.log.info(`Connected to ${url} (from pocketView.customPorts).`);
      this.setStatus({
        state: 'connected',
        url,
        hmr: chosen.hmr,
        detail: 'From the pocketView.customPorts setting.',
      });
      return this.status;
    }

    const fallback = cfg.get<string>('defaultURL', '').trim();
    if (fallback) return this.connectTo(fallback, 'From the pocketView.defaultURL setting.');

    const strangers = await this.probeLive(DEFAULT_PORTS);
    const detail =
      strangers.length > 0
        ? `No dev server belonging to this workspace was found. ${strangers.length} unrelated server(s) are running (${strangers
            .map((s) => `:${s.port}`)
            .join(', ')}) — refusing to show another project. Use "Connect to URL…" or set pocketView.url.`
        : 'No dev server detected for this workspace — is it running?';
    this.log.info(detail);
    this.setStatus({ state: 'disconnected', url: null, hmr: false, detail });
    return this.status;
  }

  /**
   * Legacy port scan, used only when process ownership is unavailable. The
   * inspection error (when there is one) is surfaced instead of the misleading
   * "no server found for this workspace".
   */
  private async connectByScan(
    cfg: vscode.WorkspaceConfiguration,
    inspectError?: string,
  ): Promise<ServerStatus> {
    const why = inspectError
      ? `${inspectError} — `
      : 'Process ownership is unavailable here — ';
    const ports = this.candidatePorts();
    this.log.info(`Scanning ports: ${ports.join(', ')}`);
    const live = await this.probeLive(ports);
    if (live.length > 0) {
      const winner = live[0];
      const url = `http://localhost:${winner.port}`;
      await this.store.setLastServer(url);
      this.log.info(`Connected to ${url} (hmr=${winner.hmr})`);
      this.setStatus({
        state: 'connected',
        url,
        hmr: winner.hmr,
        detail: `${why}found by port scan, so this server is UNVERIFIED. Set pocketView.url to pin the right one.`,
      });
      return this.status;
    }

    const fallback = cfg.get<string>('defaultURL', '').trim();
    if (fallback) return this.connectTo(fallback, 'From the pocketView.defaultURL setting.');

    const detail = inspectError
      ? `${inspectError}. A port scan found nothing either — the server may still be running; use "Connect to URL…" or set pocketView.url.`
      : 'No dev server detected for this workspace — is it running?';
    this.log.info(detail);
    this.setStatus({ state: 'disconnected', url: null, hmr: false, detail });
    return this.status;
  }

  /**
   * Probe ports in bounded-concurrency batches; returns every live port in the
   * order given, so earlier (higher-priority) ports come first.
   */
  private async probeLive(ports: number[]): Promise<Array<{ port: number; hmr: boolean }>> {
    const CONCURRENCY = 8;
    const unique = Array.from(new Set(ports));
    const live: Array<{ port: number; hmr: boolean }> = [];
    for (let i = 0; i < unique.length; i += CONCURRENCY) {
      const batch = unique.slice(i, i + CONCURRENCY);
      const results = await Promise.all(batch.map((port) => probe(HOST, port)));
      for (let j = 0; j < batch.length; j++) {
        if (results[j].ok) live.push({ port: batch[j], hmr: results[j].hmr });
      }
    }
    return live;
  }

  /** Connect directly to a user-provided URL, verifying it is reachable. */
  async connectTo(rawUrl: string, detail?: string): Promise<ServerStatus> {
    let url: URL;
    try {
      url = new URL(rawUrl.includes('://') ? rawUrl : `http://${rawUrl}`);
    } catch {
      this.setStatus({ state: 'disconnected', url: null, hmr: false });
      throw new Error(`"${rawUrl}" is not a valid URL.`);
    }

    this.setStatus({ state: 'searching', url: url.origin, hmr: false });
    const port = Number(url.port) || (url.protocol === 'https:' ? 443 : 80);
    const result = await probe(url.hostname, port);
    const status: ServerStatus = {
      state: result.ok ? 'connected' : 'disconnected',
      url: url.href.replace(/\/$/, ''),
      hmr: result.hmr,
      detail: result.ok ? detail : `${url.origin} is not responding.`,
    };
    if (result.ok) await this.store.setLastServer(status.url as string);
    this.setStatus(status);
    return status;
  }

  dispose(): void {
    this.emitter.dispose();
  }
}
