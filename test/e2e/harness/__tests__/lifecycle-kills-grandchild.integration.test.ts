import { describe, it, expect, afterEach } from 'vitest';
import { spawn } from 'node:child_process';
import { mkdtemp, writeFile, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { trackPid, killTree, _resetRegistryForTests } from '../lifecycle.ts';

function isAlive(pid: number): boolean {
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

async function waitForFile(path: string, timeoutMs: number): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      await readFile(path, 'utf8');
      return true;
    } catch {
      // not ready yet
    }
    await delay(50);
  }
  return false;
}

async function readPidsFile(path: string): Promise<number[]> {
  const text = await readFile(path, 'utf8');
  return text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => Number(l))
    .filter((n) => Number.isFinite(n));
}

/**
 * Builds a node script that prints its own pid to `pidFile` (appended), then
 * spawns `depthRemaining - 1` further node children chained the same way.
 * Leaves are long sleepers.
 */
function chainScript(pidFile: string, depthRemaining: number, sleepMs: number): string {
  const pidFileJson = JSON.stringify(pidFile);
  return `
    const fs = require('node:fs');
    const cp = require('node:child_process');
    fs.appendFileSync(${pidFileJson}, process.pid + '\\n');
    const depth = ${depthRemaining};
    if (depth > 1) {
      const child = cp.spawn(process.execPath, ['-e', ${JSON.stringify('__SCRIPT__')}.replace('__DEPTH__', String(depth - 1))], { stdio: 'ignore', detached: false, windowsHide: true });
      if (child.pid !== undefined) {
        fs.appendFileSync(${pidFileJson}, child.pid + '\\n');
      }
    }
    setTimeout(() => {}, ${sleepMs});
  `;
}

/**
 * Simpler approach: the spawned script reads its own depth from argv and
 * chains into a new node process with argv[1] = depth-1. Use a shared script
 * file on disk to avoid quoting hell.
 */
async function writeChainScript(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'lifecycle-chain-'));
  const scriptPath = join(dir, 'chain.cjs');
  const script = `
'use strict';
const fs = require('node:fs');
const cp = require('node:child_process');
const pidFile = process.argv[2];
const depth = parseInt(process.argv[3], 10);
const sleepMs = parseInt(process.argv[4], 10);
fs.appendFileSync(pidFile, process.pid + '\\n');
if (depth > 1) {
  const child = cp.spawn(
    process.execPath,
    [__filename, pidFile, String(depth - 1), String(sleepMs)],
    { stdio: 'ignore', detached: false, windowsHide: true },
  );
  // stay alive until the child settles so parent is killed AFTER grandchildren spawn
}
setTimeout(() => {}, sleepMs);
`;
  await writeFile(scriptPath, script);
  return scriptPath;
}

async function spawnChain(depth: number, sleepMs: number): Promise<{ rootPid: number; pidFile: string; scriptPath: string }> {
  const scriptPath = await writeChainScript();
  const dir = await mkdtemp(join(tmpdir(), 'lifecycle-pids-'));
  const pidFile = join(dir, 'pids.txt');
  await writeFile(pidFile, '');
  const root = spawn(
    process.execPath,
    [scriptPath, pidFile, String(depth), String(sleepMs)],
    { stdio: 'ignore', detached: false, windowsHide: true },
  );
  if (root.pid === undefined) throw new Error('root spawn failed');
  return { rootPid: root.pid, pidFile, scriptPath };
}

async function waitUntilPidsFileHas(pidFile: string, count: number, timeoutMs: number): Promise<number[]> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const pids = await readPidsFile(pidFile);
      if (pids.length >= count) return pids;
    } catch {
      // not ready
    }
    await delay(100);
  }
  return readPidsFile(pidFile);
}

async function waitAllDead(pids: number[], timeoutMs: number): Promise<number[]> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const alive = pids.filter(isAlive);
    if (alive.length === 0) return [];
    await delay(100);
  }
  return pids.filter(isAlive);
}

describe('killTree reaps full process tree', () => {
  afterEach(() => _resetRegistryForTests());

  it('kills grandchild within 2s when parent is killed', async () => {
    void chainScript; // silence unused-helper warning without deleting intent
    const { rootPid, pidFile } = await spawnChain(2, 60_000);
    trackPid(rootPid, { label: 'chain-root-2' });
    const haveFile = await waitForFile(pidFile, 5_000);
    expect(haveFile).toBe(true);
    const pids = await waitUntilPidsFileHas(pidFile, 2, 5_000);
    expect(pids.length).toBeGreaterThanOrEqual(2);
    await killTree(rootPid, { timeoutMs: 5_000 });
    const stillAlive = await waitAllDead(pids, 2_000);
    expect(stillAlive).toEqual([]);
  }, 30_000);

  it('kills a 4-deep descendant chain when root is killed', async () => {
    const { rootPid, pidFile } = await spawnChain(4, 60_000);
    trackPid(rootPid, { label: 'chain-root-4' });
    const pids = await waitUntilPidsFileHas(pidFile, 4, 10_000);
    expect(pids.length).toBeGreaterThanOrEqual(4);
    await killTree(rootPid, { timeoutMs: 8_000 });
    const stillAlive = await waitAllDead(pids, 3_000);
    expect(stillAlive).toEqual([]);
  }, 45_000);
});
