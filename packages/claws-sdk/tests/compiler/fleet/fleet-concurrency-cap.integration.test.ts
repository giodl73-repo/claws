/**
 * L1 integration — --max-concurrency caps in-flight compiles (fleet/S02
 * AC-09/13, S02-F08).
 *
 * 10-workspace fixture with N=3; assert peakAcquired ≤ 3 via the
 * instrumented semaphore counter, and all 10 succeed.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fleetCompile } from '#src/compiler/fleet/fleet-compile.js';
import { makeHealthyWorkspace } from './fleet-test-helpers.js';

describe('fleet compile: concurrency cap (integration)', () => {
  let root: string;

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'fleet-cap-'));
  });

  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  it('10 workspaces at --max-concurrency 3 never exceed peak=3 and all succeed', async () => {
    const fleetDir = join(root, 'fleet');
    mkdirSync(fleetDir);
    for (let i = 0; i < 10; i++) {
      makeHealthyWorkspace(fleetDir, `ws-${String(i).padStart(2, '0')}`);
    }

    const result = await fleetCompile(fleetDir, {
      maxConcurrency: 3,
      compileOptions: {
        targets: ['oc'],
        outputDir: join(root, 'out'),
        cacheEnabled: false,
        dryRun: true,
      },
    });

    expect(result.summary.totalWorkspaces).toBe(10);
    expect(result.summary.peakConcurrency).toBeLessThanOrEqual(3);
    expect(result.summary.peakConcurrency).toBeGreaterThan(0);
    expect(result.summary.maxConcurrency).toBe(3);
    expect(result.summary.succeeded).toBe(10);
    expect(result.summary.failed).toBe(0);
  });
});
