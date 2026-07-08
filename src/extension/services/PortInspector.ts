import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const exec = promisify(execFile);

/** A TCP port in LISTEN state and the process that owns it. */
export interface ListeningPort {
  port: number;
  pid: number;
}

/** A listening server whose owning process belongs to the workspace. */
export interface WorkspaceServer {
  port: number;
  pid: number;
  commandLine: string;
  /** Epoch ms the process started, when the platform reports it. */
  startTime?: number;
}

/** Sink for step-by-step detection diagnostics (goes to the output channel). */
export type DiagnosticLog = (line: string) => void;

/**
 * Thrown when the port/process enumeration itself failed (tool missing, access
 * denied, unparseable output). Callers must treat this differently from "the
 * inspection worked and found no workspace server".
 */
export class InspectionError extends Error {
  constructor(step: string, cause: unknown) {
    const reason = cause instanceof Error ? cause.message : String(cause);
    super(`Could not inspect running processes (${step}): ${reason}`);
    this.name = 'InspectionError';
  }
}

/** Dev-tooling listeners that never serve the app itself (node --inspect). */
const IGNORED_PORTS = new Set([9229, 9230, 9231]);

/** Most PIDs we are willing to look up in one process-details query. */
const MAX_PIDS = 256;

const EXEC_OPTS = { timeout: 15_000, windowsHide: true, maxBuffer: 8 * 1024 * 1024 };

/** Parse `netstat -ano -p tcp` output into LISTENING port/pid pairs. */
export function parseNetstatTcp(output: string): ListeningPort[] {
  const rows: ListeningPort[] = [];
  for (const line of output.split(/\r?\n/)) {
    const cols = line.trim().split(/\s+/);
    if (cols.length < 5 || cols[0].toUpperCase() !== 'TCP') continue;
    if (cols[3].toUpperCase() !== 'LISTENING') continue;
    const local = cols[1];
    const port = Number(local.slice(local.lastIndexOf(':') + 1));
    const pid = Number(cols[4]);
    if (Number.isInteger(port) && Number.isInteger(pid) && pid > 0) rows.push({ port, pid });
  }
  return rows;
}

/** Parse `lsof -nP -iTCP -sTCP:LISTEN` output into port/pid pairs. */
export function parseLsofListen(output: string): ListeningPort[] {
  const rows: ListeningPort[] = [];
  for (const line of output.split(/\r?\n/)) {
    const cols = line.trim().split(/\s+/);
    if (cols.length < 9) continue;
    const pid = Number(cols[1]);
    const name = cols[cols.length - 1] === '(LISTEN)' ? cols[cols.length - 2] : cols[cols.length - 1];
    const port = Number(name.slice(name.lastIndexOf(':') + 1));
    if (Number.isInteger(port) && Number.isInteger(pid) && pid > 0) rows.push({ port, pid });
  }
  return rows;
}

/**
 * Whether a process command line points inside one of the workspace roots.
 *
 * Dev servers are started from the project's own node_modules (npm run dev →
 * `node <workspace>/node_modules/vite/...`), so the workspace path shows up
 * somewhere in the command line — possibly only in an argument, with mixed
 * slashes, `..` segments, quotes, spaces, or a differently-cased drive letter
 * (VS Code often reports `c:\…` while the process shows `C:\…`). We therefore
 * substring-match the WHOLE normalized command line (never tokenize) with
 * separators unified and, on Windows, case folded.
 */
export function commandLineMatchesWorkspace(
  commandLine: string,
  roots: string[],
  platform: NodeJS.Platform = process.platform,
): boolean {
  const ci = platform === 'win32';
  const cmd = (ci ? commandLine.toLowerCase() : commandLine).replace(/\\/g, '/');
  return roots.some((root) => {
    const r = (ci ? root.toLowerCase() : root).replace(/\\/g, '/').replace(/\/+$/, '');
    return r.length > 0 && cmd.includes(r);
  });
}

interface ProcessDetails {
  commandLine: string;
  startTime?: number;
}

/** Parse the `\/Date(ms)\/` (PowerShell 5) or ISO (PowerShell 7) date formats. */
function parseWindowsDate(value: unknown): number | undefined {
  if (typeof value !== 'string') return undefined;
  const dotNet = /\/Date\((\d+)\)\//.exec(value);
  if (dotNet) return Number(dotNet[1]);
  const iso = Date.parse(value);
  return Number.isFinite(iso) ? iso : undefined;
}

/**
 * One batched CIM query for every PID (never the removed `wmic`, never one
 * shell per PID). The filter uses single quotes so no escaping is needed when
 * the script travels through the `-Command` argument.
 */
async function windowsProcessDetails(pids: number[]): Promise<Map<number, ProcessDetails>> {
  const filter = pids.map((p) => `ProcessId=${p}`).join(' OR ');
  const script =
    `Get-CimInstance Win32_Process -Filter '${filter}' | ` +
    `Select-Object ProcessId,CommandLine,CreationDate | ConvertTo-Json -Compress`;
  let stdout: string;
  try {
    ({ stdout } = await exec(
      'powershell.exe',
      ['-NoProfile', '-NonInteractive', '-Command', script],
      EXEC_OPTS,
    ));
  } catch (err) {
    throw new InspectionError('Win32_Process query', err);
  }
  if (!stdout.trim()) {
    throw new InspectionError('Win32_Process query', 'command produced no output');
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(stdout.trim());
  } catch (err) {
    throw new InspectionError('Win32_Process JSON parse', err);
  }
  const list = (Array.isArray(parsed) ? parsed : [parsed]) as Array<{
    ProcessId?: number;
    CommandLine?: string | null;
    CreationDate?: unknown;
  }>;
  const map = new Map<number, ProcessDetails>();
  for (const row of list) {
    if (typeof row?.ProcessId !== 'number' || !row.CommandLine) continue;
    map.set(row.ProcessId, {
      commandLine: row.CommandLine,
      startTime: parseWindowsDate(row.CreationDate),
    });
  }
  if (map.size === 0) {
    throw new InspectionError(
      'Win32_Process query',
      'no command lines were readable (insufficient permissions?)',
    );
  }
  return map;
}

/** Convert `ps -o etime` ([[dd-]hh:]mm:ss) into elapsed milliseconds. */
function parseEtimeMs(etime: string): number | undefined {
  const m = /^(?:(\d+)-)?(?:(\d+):)?(\d+):(\d+)$/.exec(etime.trim());
  if (!m) return undefined;
  const [, d, h, min, s] = m;
  return (
    ((Number(d ?? 0) * 24 + Number(h ?? 0)) * 60 + Number(min)) * 60 * 1000 + Number(s) * 1000
  );
}

async function unixProcessDetails(pids: number[]): Promise<Map<number, ProcessDetails>> {
  let stdout: string;
  try {
    ({ stdout } = await exec('ps', ['-p', pids.join(','), '-o', 'pid=,etime=,args='], EXEC_OPTS));
  } catch (err) {
    throw new InspectionError('ps query', err);
  }
  if (!stdout.trim()) throw new InspectionError('ps query', 'command produced no output');
  const map = new Map<number, ProcessDetails>();
  for (const line of stdout.split('\n')) {
    const m = /^\s*(\d+)\s+(\S+)\s+(.*)$/.exec(line);
    if (!m) continue;
    const elapsed = parseEtimeMs(m[2]);
    map.set(Number(m[1]), {
      commandLine: m[3],
      startTime: elapsed === undefined ? undefined : Date.now() - elapsed,
    });
  }
  if (map.size === 0) throw new InspectionError('ps query', 'output could not be parsed');
  return map;
}

async function listListeningPorts(): Promise<ListeningPort[]> {
  if (process.platform === 'win32') {
    let stdout: string;
    try {
      ({ stdout } = await exec('netstat', ['-ano', '-p', 'tcp'], EXEC_OPTS));
    } catch (err) {
      throw new InspectionError('netstat', err);
    }
    if (!stdout.trim()) throw new InspectionError('netstat', 'command produced no output');
    return parseNetstatTcp(stdout);
  }
  let stdout: string;
  try {
    ({ stdout } = await exec('lsof', ['-nP', '-iTCP', '-sTCP:LISTEN'], EXEC_OPTS));
  } catch (err) {
    // lsof exits 1 when there are no matches at all; treat that as "no ports".
    if (err && typeof err === 'object' && 'code' in err && err.code === 1) return [];
    throw new InspectionError('lsof', err);
  }
  return parseLsofListen(stdout);
}

const trim = (s: string, max = 220): string => (s.length > max ? `${s.slice(0, max)}…` : s);

/**
 * Find every listening TCP server owned by a process that belongs to one of
 * the given workspace roots. Throws {@link InspectionError} when the platform
 * tools themselves fail, so callers can distinguish "could not inspect" from
 * "inspected fine, nothing belongs to this workspace". Every port considered
 * is logged with the reason it was accepted or rejected.
 */
export async function findWorkspaceServers(
  roots: string[],
  log: DiagnosticLog = () => undefined,
): Promise<WorkspaceServer[]> {
  if (roots.length === 0) return [];
  log(`Inspecting listening ports for workspace root(s): ${roots.join(', ')}`);

  const all = await listListeningPorts();
  const listening = all.filter((l) => l.port >= 1024 && !IGNORED_PORTS.has(l.port));
  const skipped = all.length - listening.length;
  log(
    `Found ${all.length} listening TCP port(s)` +
      (skipped > 0 ? ` (${skipped} skipped: system ports < 1024 or node inspector ports)` : ''),
  );

  const pids = [...new Set(listening.map((l) => l.pid))].slice(0, MAX_PIDS);
  if (pids.length === 0) {
    log('No candidate ports to inspect.');
    return [];
  }

  const details =
    process.platform === 'win32'
      ? await windowsProcessDetails(pids)
      : await unixProcessDetails(pids);

  const seenPorts = new Set<number>();
  const servers: WorkspaceServer[] = [];
  for (const { port, pid } of listening) {
    if (seenPorts.has(port)) continue;
    seenPorts.add(port);
    const info = details.get(pid);
    if (!info) {
      log(`  :${port} pid=${pid} — rejected: command line unavailable (exited or access denied)`);
      continue;
    }
    if (!commandLineMatchesWorkspace(info.commandLine, roots)) {
      log(`  :${port} pid=${pid} — rejected: not in workspace. cmd=${trim(info.commandLine)}`);
      continue;
    }
    log(`  :${port} pid=${pid} — ACCEPTED (workspace match). cmd=${trim(info.commandLine)}`);
    servers.push({ port, pid, commandLine: info.commandLine, startTime: info.startTime });
  }
  log(`Workspace-owned server candidates: ${servers.map((s) => `:${s.port}`).join(', ') || 'none'}`);
  return servers;
}
