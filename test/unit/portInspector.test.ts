import { describe, it, expect } from 'vitest';
import { spawn, type ChildProcess } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  parseNetstatTcp,
  parseLsofListen,
  commandLineMatchesWorkspace,
  findWorkspaceServers,
} from '../../src/extension/services/PortInspector';

describe('parseNetstatTcp', () => {
  it('extracts LISTENING ports with their pids', () => {
    const sample = [
      '',
      'Active Connections',
      '',
      '  Proto  Local Address          Foreign Address        State           PID',
      '  TCP    0.0.0.0:5173           0.0.0.0:0              LISTENING       111',
      '  TCP    127.0.0.1:5174         0.0.0.0:0              LISTENING       222',
      '  TCP    127.0.0.1:49731        127.0.0.1:5173         TIME_WAIT       0',
      '  TCP    192.168.1.4:52001      142.250.185.78:443     ESTABLISHED     333',
      '  TCP    [::]:5173              [::]:0                 LISTENING       111',
      '  TCP    [::1]:8080             [::]:0                 LISTENING       444',
      '  UDP    0.0.0.0:5353           *:*                                    555',
    ].join('\r\n');

    const rows = parseNetstatTcp(sample);
    expect(rows).toEqual([
      { port: 5173, pid: 111 },
      { port: 5174, pid: 222 },
      { port: 5173, pid: 111 },
      { port: 8080, pid: 444 },
    ]);
  });
});

describe('parseLsofListen', () => {
  it('extracts listening ports with their pids', () => {
    const sample = [
      'COMMAND   PID USER   FD   TYPE             DEVICE SIZE/OFF NODE NAME',
      'node    12345 dev   23u  IPv4 0x1234567890      0t0  TCP 127.0.0.1:5174 (LISTEN)',
      'node    67890 dev   24u  IPv6 0x0987654321      0t0  TCP *:3000 (LISTEN)',
    ].join('\n');

    const rows = parseLsofListen(sample);
    expect(rows).toEqual([
      { port: 5174, pid: 12345 },
      { port: 3000, pid: 67890 },
    ]);
  });
});

describe('commandLineMatchesWorkspace', () => {
  const root = 'E:\\projects\\kingdom-books';

  it('matches a dev server launched from the workspace node_modules', () => {
    const cmd = '"C:\\nodejs\\node.exe" "E:\\projects\\kingdom-books\\node_modules\\vite\\bin\\vite.js"';
    expect(commandLineMatchesWorkspace(cmd, [root], 'win32')).toBe(true);
  });

  it('is case- and separator-insensitive on Windows', () => {
    const cmd = 'node e:/PROJECTS/Kingdom-Books/node_modules/.bin/next dev';
    expect(commandLineMatchesWorkspace(cmd, [root], 'win32')).toBe(true);
  });

  it('rejects processes from unrelated folders', () => {
    const cmd = '"C:\\nodejs\\node.exe" "E:\\projects\\interview\\frontend\\node_modules\\vite\\bin\\vite.js"';
    expect(commandLineMatchesWorkspace(cmd, [root], 'win32')).toBe(false);
  });

  it('ignores empty roots and tolerates trailing slashes', () => {
    expect(commandLineMatchesWorkspace('node whatever', [''], 'win32')).toBe(false);
    const cmd = 'node E:\\projects\\kingdom-books\\server.js';
    expect(commandLineMatchesWorkspace(cmd, ['E:\\projects\\kingdom-books\\'], 'win32')).toBe(true);
  });

  it('matches a bare "node" executable whose project path is only in an argument, with .. segments', () => {
    // Observed on Windows 11: quoted args, double backslash, `..` traversal.
    const cmd = '"node"   "C:\\Users\\HP\\kingdom-books\\node_modules\\.bin\\\\..\\vite\\bin\\vite.js"';
    // VS Code often reports the workspace with a lowercase drive letter.
    expect(commandLineMatchesWorkspace(cmd, ['c:\\Users\\HP\\kingdom-books'], 'win32')).toBe(true);
  });

  it('matches forward-slash command lines and workspace paths containing spaces', () => {
    const cmd = '"C:/Users/HP/some project/node.exe" server.js';
    expect(commandLineMatchesWorkspace(cmd, ['C:\\Users\\HP\\some project'], 'win32')).toBe(true);
  });
});

// --- Real-process integration: reproduces the multi-dev-server bug -----------

const SERVER_JS = `
const http = require('http');
const s = http.createServer((req, res) => res.end('ok'));
s.listen(0, '127.0.0.1', () => console.log('PORT=' + s.address().port));
`;

/** Start a real node HTTP server from a script inside `dir`; resolves its port. */
function startServer(dir: string): Promise<{ proc: ChildProcess; port: number }> {
  const script = join(dir, 'server.js');
  writeFileSync(script, SERVER_JS);
  const proc = spawn(process.execPath, [script], { stdio: ['ignore', 'pipe', 'ignore'] });
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('test server did not start')), 10_000);
    let out = '';
    proc.stdout!.on('data', (chunk: Buffer) => {
      out += chunk.toString();
      const m = /PORT=(\d+)/.exec(out);
      if (m) {
        clearTimeout(timer);
        resolve({ proc, port: Number(m[1]) });
      }
    });
    proc.on('error', (err) => {
      clearTimeout(timer);
      reject(err);
    });
  });
}

describe('findWorkspaceServers (real processes)', () => {
  it(
    'returns only the server owned by the workspace, not the unrelated one',
    async () => {
      // Two live dev servers on this machine: one belongs to an unrelated
      // project, one to "the workspace". Ownership must tell them apart.
      const wsDir = mkdtempSync(join(tmpdir(), 'dp-workspace-'));
      const otherDir = mkdtempSync(join(tmpdir(), 'dp-other-'));
      const unrelated = await startServer(otherDir);
      const ours = await startServer(wsDir);
      try {
        const servers = await findWorkspaceServers([wsDir]);
        const ports = servers.map((s) => s.port);
        expect(ports).toContain(ours.port);
        expect(ports).not.toContain(unrelated.port);
      } finally {
        unrelated.proc.kill();
        ours.proc.kill();
        for (const dir of [wsDir, otherDir]) {
          try {
            rmSync(dir, { recursive: true, force: true });
          } catch {
            /* best effort: Windows may hold the file briefly after kill */
          }
        }
      }
    },
    40_000,
  );
});
