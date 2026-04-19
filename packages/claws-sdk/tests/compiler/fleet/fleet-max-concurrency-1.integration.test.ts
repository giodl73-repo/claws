/**
 * L1 integration — --max-concurrency 1 is serial (fleet/S02 AC-11).
 *
 * 3-workspace fixture with N=1; assert peakAcquired===1, all 3 succeed,
 * no deadlock.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fleetCompile } from '#src/compiler/fleet/fleet-compile.js';
import { makeHealthyWorkspace } from './fleet-test-helpers.js';

describe('fleet compile: --max-concurrency 1 (integration)', () => {
  let root: string;

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'fleet-serial-'));
  });

  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  it('3-workspace fleet with N=1 runs serially and all complete', async () => {
    const fleetDir = join(root, 'fleet');
    mkdirSync(fleetDir);
    for (const name of ['alpha', 'bravo', 'charlie']) {
      makeHealthyWorkspace(fleetDir, name);
    }

    const result = await fleetCompile(fleetDir, {
      maxConcurrency: 1,
      compileOptions: {
        targets: ['oc'],
        outputDir: join(root, 'out'),
        cacheEnabled: false,
        dryRun: true,
      },
    });

    expect(result.summary.totalWorkspaces).toBe(3);
    expect(result.summary.peakConcurrency).toBe(1);
    expect(result.summary.maxConcurrency).toBe(1);
    expect(result.summary.succeeded).toBe(3);
  });
});
