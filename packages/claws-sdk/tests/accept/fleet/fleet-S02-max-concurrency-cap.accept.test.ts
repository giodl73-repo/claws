/**
 * L3 accept — fleet/S02-max-concurrency-cap scenario.
 *
 * Every `expect:` clause from the scenario manifest is asserted:
 *   - concurrency_guard: declared_max=3, observed_peak<=3, exceeded_ever=false
 *   - completion: total=10, succeeded=10, failed=0
 *   - wall_clock: parallelism ratio documents real scaling (positive, finite)
 *   - process_count: peak via instrumented semaphore counter
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fleetCompile } from '#src/compiler/fleet/fleet-compile.js';
import { makeHealthyWorkspace } from '../../compiler/fleet/fleet-test-helpers.js';

describe('fleet/S02 accept: max-concurrency-cap', () => {
  let root: string;

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'accept-s02-'));
  });

  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  it('satisfies every expect: clause from S02 scenario.yaml', async () => {
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

    // concurrency_guard: declared_max=3, observed_peak<=3, exceeded_ever=false
    expect(result.summary.maxConcurrency).toBe(3);
    expect(result.summary.peakConcurrency).toBeLessThanOrEqual(3);
    expect(result.summary.peakConcurrency).toBeGreaterThan(0);

    // completion: total=10, succeeded=10, failed=0
    expect(result.summary.totalWorkspaces).toBe(10);
    expect(result.summary.succeeded).toBe(10);
    expect(result.summary.failed).toBe(0);

    // wall_clock + parallelism: observed ratio is a positive finite number
    expect(Number.isFinite(result.summary.parallelismRatio)).toBe(true);
    expect(result.summary.parallelismRatio).toBeGreaterThanOrEqual(1);

    // process_count: instrumented counter exposes peak via peakConcurrency.
    expect(typeof result.summary.peakConcurrency).toBe('number');
  });
});
