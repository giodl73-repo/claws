/**
 * D4 deliverable — prove that `claws policy sim` shuts down cleanly on
 * SIGINT. Spawns the real claws binary as a child, kills with SIGINT,
 * asserts the port is released within 2s and no orphan listener remains.
 *
 * Skipped on Windows: SIGINT delivery to a detached child via
 * `child.kill('SIGINT')` is not supported by the Win32 job object we use.
 * The SIGTERM variant covers Windows; the SIGINT variant is the Unix
 * proof.
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { spawn, type ChildProcess } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { createConnection } from 'node:net';

import { MINIMAL_IR } from './ops-fixtures.js';

const CLAWS_BIN = resolve(__dirname, '..', '..', '..', 'packages', 'claws', 'bin', 'claws.js');

let tmp: string;
let child: ChildProcess | undefined;

beforeEach(async () => {
  tmp = await mkdtemp(join(tmpdir(), 'sim-sigint-'));
});

afterEach(async () => {
  if (child !== undefined && child.exitCode === null) {
    try {
      child.kill('SIGKILL');
    } catch {
      // already gone
    }
  }
  await rm(tmp, { recursive: true, force: true });
});

async function writeIr(): Promise<string> {
  const path = join(tmp, 'policy-ir.json');
  await writeFile(path, JSON.stringify(MINIMAL_IR), 'utf8');
  return path;
}

async function portAccepts(port: number): Promise<boolean> {
  return await new Promise<boolean>((resolvePromise) => {
    const sock = createConnection({ host: '127.0.0.1', port, timeout: 500 }, () => {
      sock.end();
      resolvePromise(true);
    });
    sock.on('error', () => resolvePromise(false));
    sock.on('timeout', () => {
      sock.destroy();
      resolvePromise(false);
    });
  });
}

async function readPortFromStdout(proc: ChildProcess, timeoutMs = 8000): Promise<number> {
  const deadline = Date.now() + timeoutMs;
  let buffer = '';
  proc.stdout!.on('data', (chunk: Buffer) => {
    buffer += chunk.toString('utf8');
  });
  while (Date.now() < deadline) {
    const match = /listening on http:\/\/127\.0\.0\.1:(\d+)/.exec(buffer);
    if (match !== null) return Number(match[1]);
    if (proc.exitCode !== null) {
      throw new Error(`child exited before announcing port; stdout=${buffer}`);
    }
    await delay(50);
  }
  throw new Error(`timed out waiting for port announcement; stdout=${buffer}`);
}

describe('claws policy sim — SIGINT shutdown', () => {
  const isWindows = process.platform === 'win32';
  it.skipIf(isWindows)('releases the port within 2s on SIGINT', async () => {
    const policyIr = await writeIr();
    child = spawn('node', [CLAWS_BIN, 'policy', 'sim', '--policy-ir', policyIr, '--port', '0'], {
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    const port = await readPortFromStdout(child);
    expect(await portAccepts(port)).toBe(true);

    const start = Date.now();
    child.kill('SIGINT');
    await new Promise<void>((resolvePromise) => child!.once('exit', () => resolvePromise()));
    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(2000);
    // Confirm no orphan listener.
    expect(await portAccepts(port)).toBe(false);
    expect(child.exitCode).toBe(0);
  });
});
