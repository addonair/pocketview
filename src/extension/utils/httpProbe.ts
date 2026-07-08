import * as http from 'node:http';

/** Result of probing a single URL. */
export interface ProbeResult {
  ok: boolean;
  /** Whether the response looks like a live dev server with HMR support. */
  hmr: boolean;
  statusCode?: number;
}

/**
 * Probe a local HTTP endpoint with a short timeout. A response is considered a
 * live server when the status code is < 500. HMR is inferred from common dev
 * server signatures in the response headers or the first chunk of the body.
 */
export function probe(host: string, port: number, timeoutMs = 800): Promise<ProbeResult> {
  return new Promise((resolve) => {
    const req = http.get(
      { host, port, path: '/', timeout: timeoutMs, headers: { Accept: 'text/html' } },
      (res) => {
        const status = res.statusCode ?? 0;
        const server = String(res.headers['server'] ?? '').toLowerCase();
        const poweredBy = String(res.headers['x-powered-by'] ?? '').toLowerCase();
        let body = '';
        let hmr =
          server.includes('vite') ||
          poweredBy.includes('next') ||
          poweredBy.includes('express');

        res.on('data', (chunk: Buffer) => {
          if (body.length < 4096) body += chunk.toString('utf8');
        });
        res.on('end', () => {
          const lower = body.toLowerCase();
          if (
            lower.includes('/@vite/client') ||
            lower.includes('__next') ||
            lower.includes('webpack') ||
            lower.includes('hot-update') ||
            lower.includes('/_nuxt/')
          ) {
            hmr = true;
          }
          resolve({ ok: status > 0 && status < 500, hmr, statusCode: status });
        });
        res.resume();
      },
    );

    req.on('timeout', () => {
      req.destroy();
      resolve({ ok: false, hmr: false });
    });
    req.on('error', () => resolve({ ok: false, hmr: false }));
  });
}
