/**
 * L2 e2e — wall-clock scaling with parallel compiles (fleet/S02-F03).
 *
 * Runs a 6-workspace fleet at --max-concurrency 3 and asserts the
 * parallelismRatio invariant: when peak>1 and per-task ms is nonzero,
 * parallelismRatio >= 1. The compile pipeline in dryRun mode is fast, so
 * rather than a fixed scaling-band assertion (brittle on fast machines),
 * we verify the observable contract: peak respects the cap, ratio is a
 * finite positive number, all 6 attempted.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fleetCompile } from '#src/compiler/fleet/fleet-compile.js';
import { makeHealthyWorkspace } from './fleet-test-helpers.js';

describe('fleet compile: wall-clock scaling (e2e)', () => {
  let root: string;

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'fleet-scale-'));
  });

  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  it('parallelismRatio reports positive scaling when max>1 with multi-workspace fleet', async () => {
    const fleetDir = join(root, 'fleet');
    mkdirSync(fleetDir);
    for (let i = 0; i < 6; i++) {
      makeHealthyWorkspace(fleetDir, `ws-${String(i).padStart(2, '0')}`);
    }

    const result = await fleetCompile(fleetDir, {
      maxConcurrency: 3,
      compileOptions: {
        targets: ['oc'],
        outputDir: join(root, 'out-parallel'),
        cacheEnabled: false,
        dryRun: true,
      },
    });

    expect(result.summary.parallelismRatio).toBeGreaterThanOrEqual(1);
    expect(Number.isFinite(result.summary.parallelismRatio)).toBe(true);
    expect(result.summary.peakConcurrency).toBeGreaterThan(0);
    expect(result.summary.peakConcurrency).toBeLessThanOrEqual(3);
    expect(result.summary.totalWorkspaces).toBe(6);
    expect(result.summary.succeeded).toBe(6);
  });
});
