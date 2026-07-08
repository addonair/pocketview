import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the HTTP probe so detection is deterministic and offline.
vi.mock('../../src/extension/utils/httpProbe', () => ({
  probe: vi.fn(),
}));

// Mock port-ownership lookup so tests control what "belongs to the workspace".
vi.mock('../../src/extension/services/PortInspector', () => ({
  findWorkspaceServers: vi.fn(),
}));

import { probe } from '../../src/extension/utils/httpProbe';
import { findWorkspaceServers } from '../../src/extension/services/PortInspector';
import { ServerDetector } from '../../src/extension/services/ServerDetector';
import { __setConfig, __setWorkspaceFolders } from '../mocks/vscode';

const probeMock = vi.mocked(probe);
const ownershipMock = vi.mocked(findWorkspaceServers);

/** A stand-in for StateStore that records the last saved server. */
function fakeStore() {
  let last: string | undefined;
  return {
    getLastServer: () => last,
    setLastServer: async (url: string) => {
      last = url;
    },
  };
}

const fakeLog = { info: () => undefined, warn: () => undefined, error: () => undefined };

describe('ServerDetector', () => {
  beforeEach(() => {
    probeMock.mockReset();
    ownershipMock.mockReset();
    // No workspace folders by default: detection falls back to port scanning.
    __setWorkspaceFolders(undefined);
    __setConfig({ 'pocketView.autoDetect': true });
  });

  it('connects to the first live port and remembers it', async () => {
    const store = fakeStore();
    // First candidate port fails, second succeeds.
    probeMock
      .mockResolvedValueOnce({ ok: false, hmr: false })
      .mockResolvedValue({ ok: true, hmr: true });

    const detector = new ServerDetector(store as never, fakeLog as never);
    const status = await detector.detect();

    expect(status.state).toBe('connected');
    expect(status.url).toMatch(/^http:\/\/localhost:\d+$/);
    expect(status.hmr).toBe(true);
    expect(store.getLastServer()).toBe(status.url);
    detector.dispose();
  });

  it('reports disconnected when nothing responds', async () => {
    __setConfig({ 'pocketView.autoDetect': true, 'pocketView.defaultURL': '' });
    probeMock.mockResolvedValue({ ok: false, hmr: false });

    const detector = new ServerDetector(fakeStore() as never, fakeLog as never);
    const status = await detector.detect();

    expect(status.state).toBe('disconnected');
    expect(status.url).toBeNull();
    detector.dispose();
  });

  it('emits status changes to subscribers', async () => {
    probeMock.mockResolvedValue({ ok: true, hmr: false });
    const detector = new ServerDetector(fakeStore() as never, fakeLog as never);
    const states: string[] = [];
    detector.onDidChangeStatus((s) => states.push(s.state));

    await detector.detect();
    expect(states).toContain('searching');
    expect(states).toContain('connected');
    detector.dispose();
  });

  it('connects to the workspace-owned server even when an unrelated one holds the default port', async () => {
    // The reported bug: unrelated project on 5173 (live), this workspace's Vite
    // hopped to 5174. Every port answers; only ownership tells them apart.
    __setWorkspaceFolders(['E:\\projects\\kingdom-books']);
    ownershipMock.mockResolvedValue([
      {
        port: 5174,
        pid: 4242,
        commandLine: 'node E:\\projects\\kingdom-books\\node_modules\\vite\\bin\\vite.js',
        startTime: 2_000,
      },
    ]);
    probeMock.mockResolvedValue({ ok: true, hmr: true });

    const store = fakeStore();
    const detector = new ServerDetector(store as never, fakeLog as never);
    const status = await detector.detect();

    expect(status.state).toBe('connected');
    expect(status.url).toBe('http://localhost:5174');
    expect(status.detail).toMatch(/workspace/i);
    expect(store.getLastServer()).toBe('http://localhost:5174');
    detector.dispose();
  });

  it('prefers the most recently started server when the workspace owns several', async () => {
    __setWorkspaceFolders(['E:\\projects\\kingdom-books']);
    ownershipMock.mockResolvedValue([
      { port: 5173, pid: 1, commandLine: 'node E:\\projects\\kingdom-books\\a.js', startTime: 1_000 },
      { port: 5174, pid: 2, commandLine: 'node E:\\projects\\kingdom-books\\b.js', startTime: 9_000 },
    ]);
    probeMock.mockResolvedValue({ ok: true, hmr: false });

    const detector = new ServerDetector(fakeStore() as never, fakeLog as never);
    const status = await detector.detect();

    expect(status.url).toBe('http://localhost:5174');
    detector.dispose();
  });

  it('refuses unrelated live servers when none belong to the workspace', async () => {
    __setWorkspaceFolders(['E:\\projects\\kingdom-books']);
    ownershipMock.mockResolvedValue([]); // ownership known: nothing is ours
    probeMock.mockResolvedValue({ ok: true, hmr: true }); // …but 5173 etc. answer

    const detector = new ServerDetector(fakeStore() as never, fakeLog as never);
    const status = await detector.detect();

    expect(status.state).toBe('disconnected');
    expect(status.url).toBeNull();
    expect(status.detail).toMatch(/refusing|Connect to URL/i);
    detector.dispose();
  });

  it('surfaces an inspection failure instead of "no server found"', async () => {
    __setWorkspaceFolders(['E:\\projects\\kingdom-books']);
    ownershipMock.mockRejectedValue(
      new Error('Could not inspect running processes (Win32_Process query): exit code 255'),
    );
    probeMock.mockResolvedValue({ ok: false, hmr: false }); // scan finds nothing either

    const detector = new ServerDetector(fakeStore() as never, fakeLog as never);
    const status = await detector.detect();

    expect(status.state).toBe('disconnected');
    expect(status.detail).toMatch(/could not inspect running processes/i);
    expect(status.detail).not.toMatch(/is it running\?/i);
    detector.dispose();
  });

  it('marks a port-scan connection as unverified when inspection failed', async () => {
    __setWorkspaceFolders(['E:\\projects\\kingdom-books']);
    ownershipMock.mockRejectedValue(
      new Error('Could not inspect running processes (netstat): spawn ENOENT'),
    );
    probeMock.mockResolvedValue({ ok: true, hmr: true });

    const detector = new ServerDetector(fakeStore() as never, fakeLog as never);
    const status = await detector.detect();

    expect(status.state).toBe('connected');
    expect(status.detail).toMatch(/could not inspect running processes/i);
    expect(status.detail).toMatch(/UNVERIFIED/);
    detector.dispose();
  });

  it('lets the pocketView.url setting override detection entirely', async () => {
    __setConfig({ 'pocketView.autoDetect': true, 'pocketView.url': 'http://localhost:4321' });
    probeMock.mockResolvedValue({ ok: true, hmr: false });

    const detector = new ServerDetector(fakeStore() as never, fakeLog as never);
    const status = await detector.detect();

    expect(status.state).toBe('connected');
    expect(status.url).toBe('http://localhost:4321');
    expect(ownershipMock).not.toHaveBeenCalled();
    detector.dispose();
  });
});
