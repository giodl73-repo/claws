/**
 * L0 unit tests for `claws cache clear`.
 *
 * Asserts:
 *   1. --yes skips prompt; default preserves counters (S01-F05, S01-F07)
 *   2. empty cache invocation without --yes does NOT prompt, exits 0 (S02-F09, S02-F03)
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { CompilationCache, resolveCacheDir } from '@bic/claws-sdk/compiler/cache';
import { runCacheClear } from '#src/commands/cache/clear.js';

describe('claws cache clear (unit)', () => {
  let workspaceRoot: string;

  beforeEach(() => {
    workspaceRoot = mkdtempSync(join(tmpdir(), 'claws-cli-clear-'));
  });

  afterEach(() => {
    rmSync(workspaceRoot, { recursive: true, force: true });
  });

  it('--yes skips prompt; default preserves hit/miss counters', async () => {
    const cacheDir = resolveCacheDir(workspaceRoot);
    const seed = new CompilationCache({ cacheDir, maxSize: 4096 });
    await seed.set('k', 'v');
    await seed.get('k');        // hit
    await seed.get('miss-key'); // miss
    await seed.flush();

    let promptCalls = 0;
    const out: string[] = [];
    const err: string[] = [];
    const code = await runCacheClear(
      workspaceRoot,
      { yes: true, resetCounters: false },
      {
        writeStdout: (l) => out.push(l),
        writeStderr: (l) => err.push(l),
        promptYesNo: async () => {
          promptCalls += 1;
          return true;
        },
        isTTY: () => true,
      },
    );
    expect(code).toBe(0);
    expect(promptCalls).toBe(0);
    expect(err).toEqual([]);
    expect(out[0]).toMatch(/^cleared 1 entries/);

    // Counters preserved: fresh stats reading shows hits=1, misses=1.
    const check = new CompilationCache({ cacheDir, maxSize: 0 });
    const stats = await check.stats();
    expect(stats.entryCount).toBe(0);
    expect(stats.hits).toBe(1);
    expect(stats.misses).toBe(1);
  });

  it('empty cache without --yes does NOT prompt; exits 0 (AC-13)', async () => {
    let promptCalls = 0;
    const out: string[] = [];
    const err: string[] = [];
    const code = await runCacheClear(
      workspaceRoot,
      { yes: false, resetCounters: false },
      {
        writeStdout: (l) => out.push(l),
        writeStderr: (l) => err.push(l),
        promptYesNo: async () => {
          promptCalls += 1;
          return true;
        },
        isTTY: () => true, // interactive, but cache is empty → prompt MUST be skipped.
      },
    );
    expect(code).toBe(0);
    expect(promptCalls).toBe(0);
    expect(out[0]).toBe('cleared 0 entries (0 remaining)');
  });

  it('interactive TTY decline aborts with exit 0 and no clear', async () => {
    const cacheDir = resolveCacheDir(workspaceRoot);
    const seed = new CompilationCache({ cacheDir, maxSize: 4096 });
    await seed.set('k', 'v');
    await seed.flush();

    const err: string[] = [];
    const code = await runCacheClear(
      workspaceRoot,
      { yes: false, resetCounters: false },
      {
        writeStdout: () => {},
        writeStderr: (l) => err.push(l),
        promptYesNo: async () => false,
        isTTY: () => true,
      },
    );
    expect(code).toBe(0);
    expect(err[0]).toContain('aborted');

    const check = new CompilationCache({ cacheDir, maxSize: 0 });
    const stats = await check.stats();
    expect(stats.entryCount).toBe(1);
  });

  it('default deps route to console.log/console.error and stdin TTY check', async () => {
    // Exercise the runtime defaults: no `deps` arg, non-TTY stdin so the
    // prompt is skipped without touching the default readline prompt.
    const cacheDir = resolveCacheDir(workspaceRoot);
    const seed = new CompilationCache({ cacheDir, maxSize: 1024 });
    await seed.set('k', 'v');
    await seed.flush();

    const logs: string[] = [];
    const errs: string[] = [];
    const origLog = console.log;
    const origErr = console.error;
    const origIsTTY = process.stdin.isTTY;
    console.log = (...a: unknown[]) => logs.push(a.map(String).join(' '));
    console.error = (...a: unknown[]) => errs.push(a.map(String).join(' '));
    (process.stdin as unknown as { isTTY: boolean | undefined }).isTTY = false;

    try {
      const code = await runCacheClear(workspaceRoot, { yes: false, resetCounters: false });
      expect(code).toBe(0);
      expect(logs[0]).toMatch(/^cleared 1 entries/);
    } finally {
      console.log = origLog;
      console.error = origErr;
      (process.stdin as unknown as { isTTY: boolean | undefined }).isTTY = origIsTTY;
    }
  });

  it('--reset-counters zeros hit/miss counters (AC-7)', async () => {
    const cacheDir = resolveCacheDir(workspaceRoot);
    const seed = new CompilationCache({ cacheDir, maxSize: 4096 });
    await seed.set('k', 'v');
    await seed.get('k');
    await seed.get('miss');
    await seed.flush();

    const code = await runCacheClear(
      workspaceRoot,
      { yes: true, resetCounters: true },
      {
        writeStdout: () => {},
        writeStderr: () => {},
        promptYesNo: async () => true,
        isTTY: () => false,
      },
    );
    expect(code).toBe(0);

    const check = new CompilationCache({ cacheDir, maxSize: 0 });
    const stats = await check.stats();
    expect(stats.hits).toBe(0);
    expect(stats.misses).toBe(0);
  });
});
