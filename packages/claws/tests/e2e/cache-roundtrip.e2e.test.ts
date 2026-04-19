/**
 * L2 e2e: spawn the real `claws` subprocess and walk the S01 sequence
 * against a temp workspace.
 *
 * Skips gracefully when `dist/cli.js` has not been built so this file does
 * not block a watch-mode run; the accept-tier suite exercises the same
 * binary path under the full build gate.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtempSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CompilationCache, resolveCacheDir } from '@bic/claws-sdk/compiler/cache';

const execFileAsync = promisify(execFile);
const __dirname = dirname(fileURLToPath(import.meta.url));
const CLAWS_BIN = resolve(__dirname, '../../bin/claws.js');
const DIST_CLI = resolve(__dirname, '../../dist/cli.js');
const DIST_READY = existsSync(DIST_CLI);

async function claws(args: readonly string[], cwd: string): Promise<{
  stdout: string;
  stderr: string;
  exitCode: number;
}> {
  const env = { ...process.env, NO_COLOR: '1' };
  delete env['FORCE_COLOR'];
  try {
    const { stdout, stderr } = await execFileAsync('node', [CLAWS_BIN, ...args], {
      cwd,
      timeout: 30_000,
      env,
    });
    return { stdout, stderr, exitCode: 0 };
  } catch (err) {
    const e = err as { stdout?: string; stderr?: string; code?: number };
    return { stdout: e.stdout ?? '', stderr: e.stderr ?? '', exitCode: typeof e.code === 'number' ? e.code : 1 };
  }
}

describe('claws cache (e2e)', () => {
  let workspaceRoot: string;

  beforeEach(() => {
    workspaceRoot = mkdtempSync(join(tmpdir(), 'claws-cache-e2e-'));
  });

  afterEach(() => {
    rmSync(workspaceRoot, { recursive: true, force: true });
  });

  (DIST_READY ? it : it.skip)('S01 sequence via real subprocess', async () => {
    // Seed three entries via the SDK under the resolved cache dir so the
    // subprocess reads what the SDK wrote (AC-1 shared resolver).
    const cacheDir = resolveCacheDir(workspaceRoot);
    const seed = new CompilationCache({ cacheDir, maxSize: 4096 });
    await seed.set('k1', 'aaa');
    await new Promise((r) => setTimeout(r, 5));
    await seed.set('k2', 'bbbb');
    await new Promise((r) => setTimeout(r, 5));
    await seed.set('k3', 'ccccc');
    await seed.flush();

    // stats
    const stats = await claws(['cache', 'stats'], workspaceRoot);
    expect(stats.exitCode).toBe(0);
    const parsed = JSON.parse(stats.stdout) as { entryCount: number; sizeBytes: number };
    expect(parsed.entryCount).toBe(3);
    expect(parsed.sizeBytes).toBe(12);

    // list --json — ndjson (exactly 3 lines, each parseable)
    const list = await claws(['cache', 'list', '--json'], workspaceRoot);
    expect(list.exitCode).toBe(0);
    const lines = list.stdout.split('\n').filter((l) => l.length > 0);
    expect(lines).toHaveLength(3);
    for (const line of lines) {
      expect(() => JSON.parse(line)).not.toThrow();
    }
    // Concatenated stdout is not valid JSON (ndjson, not an array).
    expect(() => JSON.parse(list.stdout)).toThrow();

    // prune --older-than 1d — no-op exits 0
    const prune = await claws(['cache', 'prune', '--older-than', '1d'], workspaceRoot);
    expect(prune.exitCode).toBe(0);
    expect(prune.stdout.trim()).toBe('pruned 0 entries (0 bytes)');

    // clear --yes
    const clear = await claws(['cache', 'clear', '--yes'], workspaceRoot);
    expect(clear.exitCode).toBe(0);
    expect(clear.stdout.trim()).toMatch(/^cleared 3 entries/);

    // stats — empty
    const statsAfter = await claws(['cache', 'stats'], workspaceRoot);
    expect(statsAfter.exitCode).toBe(0);
    const parsedAfter = JSON.parse(statsAfter.stdout) as { entryCount: number };
    expect(parsedAfter.entryCount).toBe(0);
  });
});
