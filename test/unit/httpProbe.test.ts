import { describe, it, expect, afterEach } from 'vitest';
import * as http from 'node:http';
import { probe } from '../../src/extension/utils/httpProbe';

describe('httpProbe', () => {
  let server: http.Server | undefined;

  afterEach(async () => {
    if (server) {
      await new Promise<void>((r) => server!.close(() => r()));
      server = undefined;
    }
  });

  const listen = (handler: http.RequestListener): Promise<number> =>
    new Promise((resolve) => {
      server = http.createServer(handler);
      server.listen(0, '127.0.0.1', () => {
        const addr = server!.address();
        resolve(typeof addr === 'object' && addr ? addr.port : 0);
      });
    });

  it('detects a live server and infers HMR from a Vite signature', async () => {
    const port = await listen((_req, res) => {
      res.setHeader('content-type', 'text/html');
      res.end('<html><script type="module" src="/@vite/client"></script></html>');
    });
    const result = await probe('127.0.0.1', port);
    expect(result.ok).toBe(true);
    expect(result.hmr).toBe(true);
  });

  it('reports a plain server as live without HMR', async () => {
    const port = await listen((_req, res) => {
      res.end('<html><body>hello</body></html>');
    });
    const result = await probe('127.0.0.1', port);
    expect(result.ok).toBe(true);
    expect(result.hmr).toBe(false);
  });

  it('returns not-ok for a closed port', async () => {
    // Port 1 is privileged and not listening in test environments.
    const result = await probe('127.0.0.1', 1, 300);
    expect(result.ok).toBe(false);
  });
});
