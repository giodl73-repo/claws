import { spawn, execFile } from 'node:child_process';
import { rm } from 'node:fs/promises';
import { setTimeout as delay } from 'node:timers/promises';
import treeKillCb from 'tree-kill';

export type Label = string;

export interface TrackMeta {
  label: Label;
  parentOf?: number | undefined;
}

interface TrackEntry {
  pid: number;
  label: Label;
  parentOf?: number | undefined;
}

export interface Residual {
  pid: number;
  label: Label;
}

export interface LeakReport {
  residuals: Residual[];
}

export interface KillOptions {
  timeoutMs?: number;
  _now?: () => number;
  _isAlive?: (pid: number) => boolean;
  _taskkill?: (pid: number) => Promise<void>;
  _listDescendants?: (pid: number) => Promise<number[]>;
  _treeKill?: (pid: number, signal: NodeJS.Signals) => Promise<void>;
  _platform?: NodeJS.Platform;
}

export interface TeardownOptions {
  shutdownUrl?: string;
  shutdownMs?: number;
  sigtermMs?: number;
  killOpts?: KillOptions;
  _now?: () => number;
  _isAlive?: (pid: number) => boolean;
  _platform?: NodeJS.Platform;
  _sigterm?: (pid: number) => void;
  _fetch?: (url: string, init: { method: string; signal: AbortSignal }) => Promise<{ ok: boolean }>;
}

const DEFAULT_KILL_TIMEOUT_MS = 5_000;
const DEFAULT_SHUTDOWN_MS = 2_000;
const DEFAULT_SIGTERM_MS = 2_000;
const RMRF_MAX_ATTEMPTS = 3;
const RMRF_RETRY_DELAY_MS = 500;

const registry: Map<number, TrackEntry> = new Map();

export function trackPid(pid: number, meta: TrackMeta): void {
  if (!Number.isInteger(pid) || pid <= 0) {
    throw new Error(`trackPid: invalid pid ${pid}`);
  }
  registry.set(pid, { pid, label: meta.label, parentOf: meta.parentOf });
}

export function untrackPid(pid: number): void {
  registry.delete(pid);
}

export function _resetRegistryForTests(): void {
  registry.clear();
}

export function listTracked(): Residual[] {
  return Array.from(registry.values()).map((e) => ({ pid: e.pid, label: e.label }));
}

function isAliveDefault(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code === 'ESRCH') return false;
    if (code === 'EPERM') return true;
    return false;
  }
}

async function waitUntilGone(
  pid: number,
  timeoutMs: number,
  isAlive: (p: number) => boolean,
  now: () => number,
  pollMs = 50,
): Promise<boolean> {
  const deadline = now() + timeoutMs;
  while (now() < deadline) {
    if (!isAlive(pid)) return true;
    await delay(pollMs);
  }
  return !isAlive(pid);
}

function windowsTaskkillDefault(pid: number): Promise<void> {
  return new Promise((resolve) => {
    execFile(
      'taskkill',
      ['/F', '/T', '/PID', String(pid)],
      { windowsHide: true },
      () => resolve(),
    );
  });
}

function windowsListDescendantsDefault(rootPid: number): Promise<number[]> {
  return new Promise((resolve) => {
    execFile(
      'wmic',
      ['process', 'get', 'ProcessId,ParentProcessId', '/FORMAT:CSV'],
      { windowsHide: true, maxBuffer: 8 * 1024 * 1024 },
      (_err, stdout) => resolve(parseWmicDescendants(rootPid, stdout ?? '')),
    );
  });
}

export function parseWmicDescendants(rootPid: number, stdout: string): number[] {
  if (!stdout) return [];
  const childrenOf = new Map<number, number[]>();
  const lines = stdout.split(/\r?\n/);
  for (const line of lines) {
    const parts = line.split(',');
    if (parts.length < 3) continue;
    const ppid = Number(parts[parts.length - 2]);
    const pid = Number(parts[parts.length - 1]);
    if (!Number.isFinite(ppid) || !Number.isFinite(pid)) continue;
    const list = childrenOf.get(ppid) ?? [];
    list.push(pid);
    childrenOf.set(ppid, list);
  }
  const out: number[] = [];
  const stack = [rootPid];
  const seen = new Set<number>();
  while (stack.length) {
    const p = stack.pop()!;
    if (seen.has(p)) continue;
    seen.add(p);
    const kids = childrenOf.get(p);
    if (!kids) continue;
    for (const k of kids) {
      out.push(k);
      stack.push(k);
    }
  }
  return out;
}

function treeKillDefault(pid: number, signal: NodeJS.Signals): Promise<void> {
  return new Promise((resolve) => {
    treeKillCb(pid, signal, () => resolve());
  });
}

export async function killTreeWindows(
  pid: number,
  timeoutMs: number,
  taskkill: (p: number) => Promise<void>,
  listDescendants: (p: number) => Promise<number[]>,
  isAlive: (p: number) => boolean,
  now: () => number,
): Promise<void> {
  const deadline = now() + timeoutMs;
  await taskkill(pid);
  while (now() < deadline) {
    const descendants = await listDescendants(pid);
    const stragglers = descendants.filter((p) => isAlive(p));
    const rootAlive = isAlive(pid);
    if (stragglers.length === 0 && !rootAlive) return;
    for (const p of stragglers) await taskkill(p);
    if (rootAlive) await taskkill(pid);
    await delay(50);
  }
}

export async function killTreePosix(
  pid: number,
  timeoutMs: number,
  treeKill: (p: number, s: NodeJS.Signals) => Promise<void>,
  isAlive: (p: number) => boolean,
  now: () => number,
): Promise<void> {
  const splitMs = Math.max(50, Math.floor(timeoutMs / 2));
  await treeKill(pid, 'SIGTERM');
  if (await waitUntilGone(pid, splitMs, isAlive, now)) return;
  await treeKill(pid, 'SIGKILL');
  await waitUntilGone(pid, splitMs, isAlive, now);
}

export async function killTree(pid: number, opts: KillOptions = {}): Promise<void> {
  const timeoutMs = opts.timeoutMs ?? DEFAULT_KILL_TIMEOUT_MS;
  const platform = opts._platform ?? process.platform;
  const isAlive = opts._isAlive ?? isAliveDefault;
  const now = opts._now ?? Date.now;
  try {
    if (platform === 'win32') {
      await killTreeWindows(
        pid,
        timeoutMs,
        opts._taskkill ?? windowsTaskkillDefault,
        opts._listDescendants ?? windowsListDescendantsDefault,
        isAlive,
        now,
      );
    } else {
      await killTreePosix(pid, timeoutMs, opts._treeKill ?? treeKillDefault, isAlive, now);
    }
  } finally {
    registry.delete(pid);
  }
}

async function postShutdown(
  url: string,
  timeoutMs: number,
  fetchImpl: (u: string, i: { method: string; signal: AbortSignal }) => Promise<{ ok: boolean }>,
): Promise<boolean> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetchImpl(url, { method: 'POST', signal: ctrl.signal });
    return res.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

export async function teardownHttpProcess(
  pid: number,
  opts: TeardownOptions = {},
): Promise<void> {
  const shutdownMs = opts.shutdownMs ?? DEFAULT_SHUTDOWN_MS;
  const sigtermMs = opts.sigtermMs ?? DEFAULT_SIGTERM_MS;
  const platform = opts._platform ?? process.platform;
  const isAlive = opts._isAlive ?? isAliveDefault;
  const now = opts._now ?? Date.now;
  const fetchImpl = opts._fetch ?? ((u, i) => fetch(u, i) as Promise<{ ok: boolean }>);
  const sigterm = opts._sigterm ?? ((p: number) => process.kill(p, 'SIGTERM'));

  if (opts.shutdownUrl) {
    await postShutdown(opts.shutdownUrl, shutdownMs, fetchImpl);
    if (await waitUntilGone(pid, shutdownMs, isAlive, now)) {
      registry.delete(pid);
      return;
    }
  }
  if (platform !== 'win32' && isAlive(pid)) {
    try {
      sigterm(pid);
    } catch {
      // ignore
    }
    if (await waitUntilGone(pid, sigtermMs, isAlive, now)) {
      registry.delete(pid);
      return;
    }
  }
  await killTree(pid, opts.killOpts ?? {});
}

export interface RmrfOptions {
  _rmImpl?: (dir: string) => Promise<void>;
  _retryDelayMs?: number;
}

export async function rmrfWithRetry(dir: string, opts: RmrfOptions = {}): Promise<void> {
  const impl = opts._rmImpl ?? ((d: string) => rm(d, { recursive: true, force: true }));
  const retryMs = opts._retryDelayMs ?? RMRF_RETRY_DELAY_MS;
  let lastErr: unknown;
  for (let attempt = 1; attempt <= RMRF_MAX_ATTEMPTS; attempt++) {
    try {
      await impl(dir);
      return;
    } catch (err) {
      lastErr = err;
      if (attempt === RMRF_MAX_ATTEMPTS) break;
      await delay(retryMs);
    }
  }
  throw lastErr;
}

export function checkLeaks(_isAlive?: (p: number) => boolean): LeakReport {
  const isAlive = _isAlive ?? isAliveDefault;
  const residuals: Residual[] = [];
  for (const entry of registry.values()) {
    if (isAlive(entry.pid)) {
      residuals.push({ pid: entry.pid, label: entry.label });
    }
  }
  return { residuals };
}

export function _cleanupForTests(platform: NodeJS.Platform, isAlive: (p: number) => boolean): void {
  for (const entry of registry.values()) {
    if (!isAlive(entry.pid)) continue;
    if (platform === 'win32') {
      try {
        spawn('taskkill', ['/F', '/T', '/PID', String(entry.pid)], {
          windowsHide: true,
          detached: true,
          stdio: 'ignore',
        }).unref();
      } catch {
        // best-effort
      }
    } else {
      try {
        process.kill(entry.pid, 'SIGKILL');
      } catch {
        // best-effort
      }
    }
  }
}

let hooksInstalled = false;

export function _hookCleanup(): void {
  _cleanupForTests(process.platform, isAliveDefault);
}

export function _onSigint(
  cleanup: () => void = _hookCleanup,
  exit: (code: number) => void = (c) => process.exit(c),
): void {
  cleanup();
  exit(130);
}

function installProcessHooks(): void {
  if (hooksInstalled) return;
  hooksInstalled = true;
  process.on('exit', _hookCleanup);
  process.on('SIGINT', _onSigint);
}

installProcessHooks();
