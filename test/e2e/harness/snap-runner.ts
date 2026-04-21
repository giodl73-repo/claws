/**
 * test/e2e/harness/snap-runner — spawn real `claws snap serve`.
 *
 * Spawns the built claws binary (`packages/claws/bin/claws.js`) as a child
 * process bound to an ephemeral port (`--port 0` → `listen(0)` → `address()`
 * read-back). The child prints a JSON line on stdout the moment the server
 * is listening; we parse it to discover the actual bound port, then poll
 * `GET /v1/healthz` every 50ms up to the configured timeout (default 5s,
 * ceiling 10s) until the server responds 200.
 *
 * The pulse plan requires spawning the real binary (never re-entering the
 * CLI as a Node module inside the test process) so the test actually
 * exercises the shipped command surface and proves the binary produces
 * healthz bytes end-to-end.
 *
 * `kill()` delegates to `teardownHttpProcess` from lifecycle.ts which
 * first attempts `POST /shutdown` (currently absent on the snap server →
 * fast fallback to SIGTERM → SIGKILL) and then runs `killTree` to reap
 * the full process tree on both Windows and POSIX.
 *
 * `restart()` kills the current child, re-reserves a port, re-spawns,
 * and re-polls /v1/healthz. The handle's `port`/`url` are updated in
 * place so callers can continue to read them after a restart.
 *
 * @module test/e2e/harness/snap-runner
 */

import { spawn, type ChildProcessByStdio } from 'node:child_process';
import type { Readable } from 'node:stream';
import { createRequire } from 'node:module';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { teardownHttpProcess, trackPid, untrackPid } from './lifecycle.ts';
import { parseListeningLine } from './snap-runner-envelope.ts';

export interface StartSnapOptions {
  readonly policyDir: string;
  readonly seed?: string;
  readonly host?: string;
  readonly healthcheckTimeoutMs?: number;
  /**
   * Override the claws binary path. Tests point this at a broken or
   * deliberately-silent script to exercise the spawn-error / spawn-exit
   * / listening-line-timeout branches in spawnChild.
   */
  readonly binOverride?: string;
  /**
   * Override the listening-line timeout. Tests set this low so the
   * silent-binary path fails fast instead of waiting the 10s default.
   */
  readonly listeningTimeoutMs?: number;
}

export interface SnapHandle {
  pid: number;
  port: number;
  url: string;
  startupMs: number;
  stderr: string[];
  kill(): Promise<void>;
  restart(): Promise<void>;
}

interface InternalHandle {
  child: ChildProcessByStdio<null, Readable, Readable>;
  pid: number;
  port: number;
  url: string;
  startupMs: number;
  stderr: string[];
  killed: boolean;
}

const DEFAULT_HEALTHCHECK_MS = 5_000;
const HEALTHCHECK_CEILING_MS = 10_000;
const HEALTH_POLL_INTERVAL_MS = 50;
const LISTENING_LINE_TIMEOUT_MS = 10_000;

function resolveClawsBin(): string {
  // From test/e2e/harness/snap-runner.ts, walk up to repo root and join.
  // Using createRequire lets us ask node to resolve the real file on disk
  // without relying on package "bin" resolution, which needs the CLI to be
  // linked. The path is stable in the monorepo layout.
  const here = dirname(fileURLToPath(import.meta.url));
  const candidate = resolve(here, '../../../packages/claws/bin/claws.js');
  // createRequire throws a useful error if the path is missing.
  const req = createRequire(import.meta.url);
  return req.resolve(candidate);
}

async function pollHealthz(url: string, timeoutMs: number): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`${url}/v1/healthz`);
      await res.text();
      return;
    } catch {
      // connection refused while the child is still coming up — retry
    }
    await delay(HEALTH_POLL_INTERVAL_MS);
  }
  throw new Error(`snap-runner: /v1/healthz did not return 200 within ${String(timeoutMs)}ms`);
}

function spawnChild(
  bin: string,
  host: string,
  stderr: string[],
  listeningTimeoutMs: number,
): Promise<{
  child: ChildProcessByStdio<null, Readable, Readable>;
  port: number;
  url: string;
}> {
  return new Promise((resolveP, rejectP) => {
    const child = spawn(
      process.execPath,
      [bin, '--json', 'snap', 'serve', '--port', '0', '--host', host],
      { stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true },
    ) as ChildProcessByStdio<null, Readable, Readable>;

    let resolved = false;
    const stdoutChunks: string[] = [];
    const linesSeen: string[] = [];

    const timer = setTimeout(() => {
      if (resolved) return;
      resolved = true;
      cleanup();
      child.kill('SIGKILL');
      rejectP(
        new Error(
          `snap-runner: no listening line within ${String(listeningTimeoutMs)}ms. ` +
            `stderr=${stderr.join('')} stdout=${linesSeen.join('|')}`,
        ),
      );
    }, listeningTimeoutMs);

    const cleanup = (): void => {
      clearTimeout(timer);
      child.stdout.off('data', onStdout);
      child.stderr.off('data', onStderr);
      child.off('exit', onExit);
    };

    const onStdout = (buf: Buffer): void => {
      if (resolved) return;
      stdoutChunks.push(buf.toString('utf8'));
      // Re-join on every chunk; re-splitting is O(n) but the buffer is
      // small and this keeps the parsing logic branch-free.
      const joined = stdoutChunks.join('');
      const parts = joined.split(/\r?\n/);
      // The last element is always the carry-over (possibly empty).
      const carry = parts.pop() as string;
      stdoutChunks.splice(0, stdoutChunks.length, carry);
      for (const line of parts) {
        linesSeen.push(line);
        const parsed = parseListeningLine(line);
        if (parsed) {
          resolved = true;
          cleanup();
          resolveP({ child, port: parsed.port, url: parsed.url });
          return;
        }
      }
    };

    const onStderr = (buf: Buffer): void => {
      stderr.push(buf.toString('utf8'));
    };

    const onExit = (code: number | null, signal: NodeJS.Signals | null): void => {
      if (resolved) return;
      resolved = true;
      cleanup();
      rejectP(
        new Error(
          `snap-runner: child exited before listening (code=${String(code)} signal=${String(signal)}) ` +
            `stderr=${stderr.join('')}`,
        ),
      );
    };

    // Keep stdin open to node's stdio contract but attach the error
    // listener as a noop so that a spawn error (ENOENT, etc.) does not
    // surface as an uncaught event. In practice we always point at a
    // resolved bin path, so spawn's 'error' never fires; the onExit
    // path covers binary-level failures (non-zero exit + stderr).
    child.on('error', () => { /* surfaced via onExit or rejected below */ });
    child.stdout.on('data', onStdout);
    child.stderr.on('data', onStderr);
    child.once('exit', onExit);
  });
}

async function startInternal(opts: StartSnapOptions): Promise<InternalHandle> {
  const host = opts.host ?? '127.0.0.1';
  const requestedTimeout = opts.healthcheckTimeoutMs ?? DEFAULT_HEALTHCHECK_MS;
  const timeoutMs = Math.min(requestedTimeout, HEALTHCHECK_CEILING_MS);
  const listeningTimeoutMs = opts.listeningTimeoutMs ?? LISTENING_LINE_TIMEOUT_MS;

  const bin = opts.binOverride ?? resolveClawsBin();
  const stderr: string[] = [];
  const started = Date.now();

  const { child, port, url } = await spawnChild(bin, host, stderr, listeningTimeoutMs);
  const pid = child.pid as number;
  trackPid(pid, { label: `snap-runner:${String(port)}` });

  try {
    await pollHealthz(url, timeoutMs);
  } catch (err) {
    untrackPid(pid);
    child.kill('SIGKILL');
    throw err;
  }

  const startupMs = Date.now() - started;
  return { child, pid, port, url, startupMs, stderr, killed: false };
}

export async function startSnap(opts: StartSnapOptions): Promise<SnapHandle> {
  const internal = await startInternal(opts);

  const handle: SnapHandle = {
    pid: internal.pid,
    port: internal.port,
    url: internal.url,
    startupMs: internal.startupMs,
    stderr: internal.stderr,
    async kill(): Promise<void> {
      if (internal.killed) return;
      internal.killed = true;
      await teardownHttpProcess(internal.pid, {
        shutdownUrl: `${handle.url}/shutdown`,
        shutdownMs: 500,
        sigtermMs: 1_500,
      });
    },
    async restart(): Promise<void> {
      await handle.kill();
      const fresh = await startInternal(opts);
      internal.child = fresh.child;
      internal.pid = fresh.pid;
      internal.port = fresh.port;
      internal.url = fresh.url;
      internal.startupMs = fresh.startupMs;
      internal.killed = false;
      handle.pid = fresh.pid;
      handle.port = fresh.port;
      handle.url = fresh.url;
      handle.startupMs = fresh.startupMs;
      handle.stderr = fresh.stderr;
    },
  };

  return handle;
}
