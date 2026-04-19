/**
 * L1 integration: two `cache clear` invocations racing on the same populated
 * dir both exit 0; neither throws on ENOENT mid-traversal (AC-10, S02-F02).
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { CompilationCache, resolveCacheDir } from '@bic/claws-sdk/compiler/cache';
import { runCacheClear } from '#src/commands/cache/clear.js';

describe('claws cache clear (concurrent, integration)', () => {
  let workspaceRoot: string;

  beforeEach(() => {
    workspaceRoot = mkdtempSync(join(tmpdir(), 'claws-cli-cc-clear-'));
  });

  afterEach(() => {
    rmSync(workspaceRoot, { recursive: true, force: true });
  });

  it('two concurrent --yes clears both exit 0', async () => {
    const cacheDir = resolveCacheDir(workspaceRoot);
    const seed = new CompilationCache({ cacheDir, maxSize: 4096 });
    for (let i = 0; i < 10; i += 1) {
      await seed.set(`k${i}`, `v${i}`.repeat(4));
    }
    await seed.flush();

    const run = (): Promise<number> =>
      runCacheClear(
        workspaceRoot,
        { yes: true, resetCounters: false },
        {
          writeStdout: () => {},
          writeStderr: () => {},
          promptYesNo: async () => true,
          isTTY: () => false,
        },
      );

    const [a, b] = await Promise.all([run(), run()]);
    expect(a).toBe(0);
    expect(b).toBe(0);

    // Final state: cache is empty.
    const check = new CompilationCache({ cacheDir, maxSize: 0 });
    const stats = await check.stats();
    expect(stats.entryCount).toBe(0);
  });
});
