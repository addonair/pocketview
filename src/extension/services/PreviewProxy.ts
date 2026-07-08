import * as http from 'node:http';
import * as net from 'node:net';
import type { Duplex } from 'node:stream';
import type { Logger } from '../utils/logger';

/**
 * Route reporter injected into the app's HTML. Runs inside the preview iframe
 * (the app's own origin, via the proxy) and posts the current route to the
 * webview parent whenever it changes — SPA pushState/replaceState, back/forward,
 * and hash navigation included. The interval is a safety net for frameworks
 * that navigate without touching history APIs.
 */
const ROUTE_SCRIPT =
  '<script>(function(){var l=null;function r(){try{var h=location.pathname+location.search+location.hash;' +
  'if(h!==l){l=h;parent.postMessage({pocketViewRoute:h},"*");}}catch(e){}}' +
  'var p=history.pushState;history.pushState=function(){var v=p.apply(this,arguments);r();return v};' +
  'var q=history.replaceState;history.replaceState=function(){var v=q.apply(this,arguments);r();return v};' +
  'addEventListener("popstate",r);addEventListener("hashchange",r);setInterval(r,800);r();})();</script>';

/** Insert the route reporter right after <head …> (or prepend when headless). */
export function injectRouteScript(html: string): string {
  const at = html.search(/<head[^>]*>/i);
  if (at !== -1) {
    const end = html.indexOf('>', at) + 1;
    return html.slice(0, end) + ROUTE_SCRIPT + html.slice(end);
  }
  return ROUTE_SCRIPT + html;
}

/**
 * Local reverse proxy the preview iframe loads instead of the dev server
 * directly. It forwards everything (including WebSocket upgrades, so Vite/Next
 * HMR keeps working) and injects {@link ROUTE_SCRIPT} into HTML responses so
 * PocketView always knows which page the user is on. If the proxy cannot
 * start, callers fall back to loading the dev server directly — the preview
 * still works, only route tracking is lost.
 */
export class PreviewProxy {
  private server: http.Server | undefined;
  private target: URL | undefined;
  private url: string | undefined;

  constructor(private readonly log: Logger) {}

  /** Start (or reuse) a proxy for the target; returns the URL to load. */
  async ensure(targetUrl: string, enabled: boolean): Promise<string> {
    if (!enabled) {
      this.stop();
      return targetUrl;
    }
    let target: URL;
    try {
      target = new URL(targetUrl);
    } catch {
      return targetUrl;
    }
    // Only plain-http local servers are proxied; anything else loads directly.
    if (target.protocol !== 'http:') {
      this.stop();
      return targetUrl;
    }
    if (this.server && this.url && this.target?.href === target.href) return this.url;

    this.stop();
    this.target = target;
    try {
      this.url = await this.listen(target);
      this.log.info(`Route tracking proxy ${this.url} → ${targetUrl}`);
      return this.url;
    } catch (err) {
      this.log.warn(
        `Route tracking proxy failed to start (${err instanceof Error ? err.message : err}); loading the dev server directly.`,
      );
      this.stop();
      return targetUrl;
    }
  }

  private listen(target: URL): Promise<string> {
    return new Promise((resolve, reject) => {
      const server = http.createServer((req, res) => this.forward(target, req, res));
      server.on('upgrade', (req, socket, head) => this.forwardUpgrade(target, req, socket, head));
      server.on('error', reject);
      server.listen(0, '127.0.0.1', () => {
        const addr = server.address();
        if (addr && typeof addr === 'object') resolve(`http://127.0.0.1:${addr.port}`);
        else reject(new Error('proxy could not determine its port'));
      });
      this.server = server;
    });
  }

  private forward(target: URL, req: http.IncomingMessage, res: http.ServerResponse): void {
    const headers: http.IncomingHttpHeaders = {
      ...req.headers,
      host: target.host,
      // Ask for uncompressed bodies so HTML can be modified in place.
      'accept-encoding': 'identity',
    };
    const upstream = http.request(
      {
        hostname: target.hostname,
        port: Number(target.port) || 80,
        path: req.url,
        method: req.method,
        headers,
      },
      (ures) => {
        const outHeaders = { ...ures.headers };
        // Keep redirects inside the proxy so the tracked session stays here.
        const loc = outHeaders.location;
        if (typeof loc === 'string' && this.url && loc.startsWith(target.origin)) {
          outHeaders.location = this.url + loc.slice(target.origin.length);
        }
        const type = String(ures.headers['content-type'] ?? '');
        if (type.includes('text/html')) {
          const chunks: Buffer[] = [];
          ures.on('data', (c: Buffer) => chunks.push(c));
          ures.on('end', () => {
            const body = Buffer.from(
              injectRouteScript(Buffer.concat(chunks).toString('utf8')),
              'utf8',
            );
            delete outHeaders['transfer-encoding'];
            outHeaders['content-length'] = String(body.byteLength);
            res.writeHead(ures.statusCode ?? 200, outHeaders);
            res.end(body);
          });
        } else {
          res.writeHead(ures.statusCode ?? 200, outHeaders);
          ures.pipe(res);
        }
      },
    );
    upstream.on('error', () => {
      if (!res.headersSent) res.writeHead(502, { 'content-type': 'text/plain' });
      res.end('PocketView proxy: the dev server did not respond.');
    });
    req.pipe(upstream);
  }

  /** Pipe WebSocket upgrades (Vite/Next HMR) straight through to the target. */
  private forwardUpgrade(
    target: URL,
    req: http.IncomingMessage,
    socket: Duplex,
    head: Buffer,
  ): void {
    const upstream = net.connect(Number(target.port) || 80, target.hostname, () => {
      const lines = [`${req.method} ${req.url} HTTP/1.1`];
      for (let i = 0; i < req.rawHeaders.length; i += 2) {
        const key = req.rawHeaders[i];
        const value = key.toLowerCase() === 'host' ? target.host : req.rawHeaders[i + 1];
        lines.push(`${key}: ${value}`);
      }
      upstream.write(lines.join('\r\n') + '\r\n\r\n');
      if (head.length > 0) upstream.write(head);
      upstream.pipe(socket);
      socket.pipe(upstream);
    });
    const abort = () => {
      socket.destroy();
      upstream.destroy();
    };
    upstream.on('error', abort);
    socket.on('error', abort);
  }

  stop(): void {
    this.server?.close();
    this.server = undefined;
    this.target = undefined;
    this.url = undefined;
  }

  dispose(): void {
    this.stop();
  }
}
