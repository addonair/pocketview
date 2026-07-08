import { describe, it, expect, afterEach } from 'vitest';
import * as http from 'node:http';
import { PreviewProxy, injectRouteScript } from '../../src/extension/services/PreviewProxy';

const fakeLog = { info: () => undefined, warn: () => undefined, error: () => undefined };

describe('injectRouteScript', () => {
  it('injects the reporter right after <head>', () => {
    const out = injectRouteScript('<html><head><title>x</title></head><body></body></html>');
    expect(out).toMatch(/<head><script>/);
    expect(out).toContain('pocketViewRoute');
  });

  it('handles attributes on <head> and documents without one', () => {
    expect(injectRouteScript('<head lang="en"><title>x</title></head>')).toMatch(
      /<head lang="en"><script>/,
    );
    expect(injectRouteScript('<div>bare</div>')).toMatch(/^<script>/);
  });
});

describe('PreviewProxy (real sockets)', () => {
  let upstream: http.Server | undefined;
  let proxy: PreviewProxy | undefined;

  afterEach(async () => {
    proxy?.dispose();
    if (upstream) await new Promise<void>((r) => upstream!.close(() => r()));
    upstream = undefined;
  });

  const startUpstream = (): Promise<number> =>
    new Promise((resolve) => {
      upstream = http.createServer((req, res) => {
        if (req.url === '/data.json') {
          res.setHeader('content-type', 'application/json');
          res.end('{"ok":true}');
        } else {
          res.setHeader('content-type', 'text/html; charset=utf-8');
          res.end('<html><head><title>app</title></head><body>page</body></html>');
        }
      });
      upstream.listen(0, '127.0.0.1', () => {
        const addr = upstream!.address();
        resolve(typeof addr === 'object' && addr ? addr.port : 0);
      });
    });

  it('injects the route reporter into HTML and passes other content through untouched', async () => {
    const port = await startUpstream();
    proxy = new PreviewProxy(fakeLog as never);
    const proxyUrl = await proxy.ensure(`http://localhost:${port}`, true);
    expect(proxyUrl).toMatch(/^http:\/\/127\.0\.0\.1:\d+$/);

    const html = await (await fetch(`${proxyUrl}/`)).text();
    expect(html).toContain('pocketViewRoute');
    expect(html).toContain('<body>page</body>');

    const json = await (await fetch(`${proxyUrl}/data.json`)).text();
    expect(json).toBe('{"ok":true}');
  });

  it('returns the original URL when tracking is disabled', async () => {
    const port = await startUpstream();
    proxy = new PreviewProxy(fakeLog as never);
    const url = `http://localhost:${port}`;
    expect(await proxy.ensure(url, false)).toBe(url);
  });

  it('reuses the same proxy for the same target', async () => {
    const port = await startUpstream();
    proxy = new PreviewProxy(fakeLog as never);
    const first = await proxy.ensure(`http://localhost:${port}`, true);
    const second = await proxy.ensure(`http://localhost:${port}`, true);
    expect(second).toBe(first);
  });
});
