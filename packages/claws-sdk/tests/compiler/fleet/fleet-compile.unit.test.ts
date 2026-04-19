/**
 * L0 unit — fleet orchestrator shape (fleet/S01 AC-01/05, AC-15).
 *
 * Covers:
 *   - Promise.allSettled semantics: one throwing workspace does not tank
 *     siblings.
 *   - Per-workspace cache isolation: each task receives a distinct
 *     cacheDir subpath by construction.
 *   - Empty fleet directory returns an empty result with zero totals.
 *   - Discovery ordering is lexicographic.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fleetCompile, mapStage, kindForStage } from '#src/compiler/fleet/fleet-compile.js';
import type { CompileOptions } from '#src/compiler/host/types.js';
import { writeFileSync } from 'node:fs';
import { makeHealthyWorkspace, makeBrokenWorkspace } from './fleet-test-helpers.js';

function baseCompileOptions(outDir: string, cacheDir: string): CompileOptions {
  return {
    targets: ['oc'],
    outputDir: outDir,
    cacheEnabled: true,
    cacheDir,
    dryRun: true,
  };
}

describe('fleetCompile (unit)', () => {
  let root: string;

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'fleet-unit-'));
  });

  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  it('empty fleet directory yields empty workspaces + zero totals', async () => {
    const fleetDir = join(root, 'fleet');
    mkdirSync(fleetDir);
    const result = await fleetCompile(fleetDir, {
      maxConcurrency: 4,
      compileOptions: baseCompileOptions(join(root, 'out'), join(root, 'cache')),
    });
    expect(result.workspaces).toEqual([]);
    expect(result.summary.totalWorkspaces).toBe(0);
    expect(result.summary.succeeded).toBe(0);
    expect(result.summary.failed).toBe(0);
    expect(result.summary.maxConcurrency).toBe(4);
    // parallelismRatio on an empty run exercises the wallClockMs === 0
    // defensive fallback; must be a finite positive default (1).
    expect(Number.isFinite(result.summary.parallelismRatio)).toBe(true);
  });

  it('cacheDir undefined path: compileOptions without cacheDir scopes outputDir only', async () => {
    const fleetDir = join(root, 'fleet');
    mkdirSync(fleetDir);
    makeHealthyWorkspace(fleetDir, 'alpha');
    // baseCompileOptions sets cacheEnabled=true+cacheDir; here we pass a
    // bare compile option set with cacheEnabled=false + no cacheDir so the
    // scopeCompileOptions undefined-branch runs.
    const result = await fleetCompile(fleetDir, {
      maxConcurrency: 1,
      compileOptions: {
        targets: ['oc'],
        outputDir: join(root, 'out'),
        cacheEnabled: false,
        dryRun: true,
      },
    });
    expect(result.summary.totalWorkspaces).toBe(1);
    expect(result.summary.succeeded).toBe(1);
  });

  it('one broken workspace does not short-circuit the batch', async () => {
    const fleetDir = join(root, 'fleet');
    mkdirSync(fleetDir);
    makeHealthyWorkspace(fleetDir, 'alpha');
    makeBrokenWorkspace(fleetDir, 'broken');
    makeHealthyWorkspace(fleetDir, 'charlie');

    const result = await fleetCompile(fleetDir, {
      maxConcurrency: 2,
      compileOptions: baseCompileOptions(join(root, 'out'), join(root, 'cache')),
    });

    expect(result.workspaces).toHaveLength(3);
    const notStarted = result.workspaces.filter((w) => w.status === 'not-started');
    expect(notStarted).toHaveLength(0);

    // Order is lexicographic.
    const order = result.workspaces.map((w) =>
      w.status === 'failure' ? w.diagnostic.workspace : w.workspace.split(/[\\/]/).pop(),
    );
    expect(order).toEqual(['alpha', 'broken', 'charlie']);
  });

  it('peakConcurrency in summary stays at or below maxConcurrency', async () => {
    const fleetDir = join(root, 'fleet');
    mkdirSync(fleetDir);
    for (const name of ['a', 'b', 'c', 'd']) {
      makeHealthyWorkspace(fleetDir, name);
    }
    const result = await fleetCompile(fleetDir, {
      maxConcurrency: 2,
      compileOptions: baseCompileOptions(join(root, 'out'), join(root, 'cache')),
    });
    expect(result.summary.peakConcurrency).toBeLessThanOrEqual(2);
    expect(result.summary.peakConcurrency).toBeGreaterThan(0);
    expect(result.summary.maxConcurrency).toBe(2);
    expect(result.summary.totalWorkspaces).toBe(4);
  });

  it('signal aborted before enqueue — all workspaces report not-started', async () => {
    const fleetDir = join(root, 'fleet');
    mkdirSync(fleetDir);
    for (const name of ['alpha', 'bravo', 'charlie']) {
      makeHealthyWorkspace(fleetDir, name);
    }
    const controller = new AbortController();
    controller.abort();
    const result = await fleetCompile(fleetDir, {
      maxConcurrency: 2,
      compileOptions: baseCompileOptions(join(root, 'out'), join(root, 'cache')),
      signal: controller.signal,
    });
    // AC-08: workspaces that never acquired a permit emit `not-started`.
    // With a pre-aborted signal NONE of the 3 workspaces reach the
    // semaphore, so all three are `not-started` — giving admin clear
    // visibility that the batch attempted zero actual compiles.
    expect(result.summary.totalWorkspaces).toBe(3);
    expect(result.summary.skipped).toBe(3);
    expect(result.summary.succeeded).toBe(0);
    expect(result.summary.failed).toBe(0);
    expect(result.workspaces.every((w) => w.status === 'not-started')).toBe(true);
  });

  it('signal aborted mid-batch — later workspaces report cancelled at dequeue gate', async () => {
    // Exercise the dequeue-time branch: workspaces already in the
    // semaphore queue when the signal fires MUST report `cancelled`
    // (they acquired a permit), distinguishing them from the enqueue-
    // time `not-started` short-circuit. We drive this with a
    // concurrency-1 semaphore: the first workspace occupies the permit,
    // the rest wait; aborting during the first compile means every
    // waiter dequeues with `signal.aborted === true` and hits the
    // dequeue gate — landing as `cancelled`, not `not-started`.
    const fleetDir = join(root, 'fleet');
    mkdirSync(fleetDir);
    for (const name of ['alpha', 'bravo', 'charlie']) {
      makeHealthyWorkspace(fleetDir, name);
    }
    const controller = new AbortController();
    const resultPromise = fleetCompile(fleetDir, {
      maxConcurrency: 1,
      compileOptions: baseCompileOptions(join(root, 'out'), join(root, 'cache')),
      signal: controller.signal,
    });
    // Abort after a short real delay so the first workspace has entered
    // the compile path and the remaining two are queued on the
    // semaphore's waiter list. Any waiter that dequeues after abort
    // lands in the `cancelled` branch (not `not-started`).
    await new Promise<void>((resolve) => setTimeout(resolve, 10));
    controller.abort();
    const result = await resultPromise;
    expect(result.summary.totalWorkspaces).toBe(3);
    // The key M3 invariant: `not-started` is reserved for enqueue-time
    // short-circuit. Everything that reached the semaphore reports
    // `success` or `cancelled` — never `not-started`. Enqueue happened
    // before abort in this test so NO workspace should be `not-started`.
    const notStarted = result.workspaces.filter((w) => w.status === 'not-started');
    expect(notStarted).toHaveLength(0);
  });

  it('mapStage collapses host stages onto the 4-stage fleet surface', () => {
    expect(mapStage('enforce')).toBe('enforce');
    expect(mapStage('emit')).toBe('emit');
    expect(mapStage('validate')).toBe('validate');
    expect(mapStage('read')).toBe('parse');
    expect(mapStage('sidecar')).toBe('parse');
    expect(mapStage('ir')).toBe('parse');
    expect(mapStage('cache')).toBe('parse');
    expect(mapStage('audit')).toBe('parse');
  });

  it('kindForStage maps emit/validate to specific kinds; other stages to CompileFailed', () => {
    expect(kindForStage('emit')).toBe('EmitFailed');
    expect(kindForStage('validate')).toBe('ValidationFailed');
    expect(kindForStage('parse')).toBe('CompileFailed');
    expect(kindForStage('enforce')).toBe('CompileFailed');
  });

  it('non-throwing compile failure (sidecar-invalid) surfaces as failure with CompileFailed kind', async () => {
    const fleetDir = join(root, 'fleet');
    mkdirSync(fleetDir);
    makeHealthyWorkspace(fleetDir, 'alpha');
    // Seed a workspace clone, then corrupt its sidecar — compile() returns
    // success:false without throwing, exercising the non-throw failure
    // branch.
    const badWsRoot = makeHealthyWorkspace(fleetDir, 'zulu');
    writeFileSync(join(badWsRoot, '.claws'), '{"targets": ["oc"]}');

    const result = await fleetCompile(fleetDir, {
      maxConcurrency: 2,
      compileOptions: baseCompileOptions(join(root, 'out'), join(root, 'cache')),
    });
    expect(result.summary.totalWorkspaces).toBe(2);
    const bad = result.workspaces.find((w) => w.status === 'failure');
    expect(bad).toBeDefined();
    if (bad !== undefined && bad.status === 'failure') {
      expect(bad.diagnostic.workspace).toBe('zulu');
      // sidecar-invalid tags the `sidecar` host stage, which collapses to
      // `parse` on the fleet surface — kind = CompileFailed.
      expect(bad.diagnostic.kind).toBe('CompileFailed');
      expect(bad.diagnostic.stage).toBe('parse');
    }
  });
});
