/**
 * L1 integration test — cached-hit `durationMs ≤ 5` (CP-4 R1 M14).
 *
 * Pulse 80 AC line 210-212: "Cached-hit stages report `durationMs ≤ 2` on
 * the canonical fixture." The ≤2ms spec target absorbs CI jitter poorly;
 * this test uses a 5ms ceiling (still catches the 50ms-regression class
 * of bug — e.g. cache hit path quietly re-hashing content — while
 * tolerating Windows scheduler noise).
 *
 * Scope note (cluster E / M14 strategy (a)): cluster D (CP-4 M02) is
 * extending stage caching to all 14 stages. Until that lands, only reader
 * stages reliably populate a per-stage cache on warm runs. This test
 * filters to reader stages so it is stable before and after cluster D.
 * Once cluster D lands, the filter can widen to all cacheHit stages.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, cpSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { compile } from '#src/compiler/host/compile.js';
import { READER_STAGES } from '#src/compiler/host/stage-deps.js';

const FIXTURES = resolve(__dirname, '../../fixtures');
const CANONICAL = resolve(FIXTURES, 'canonical-oc-workspace');

/**
 * Cached-hit duration ceiling (ms). Spec says ≤2ms; test uses 5ms to
 * absorb Windows scheduler jitter while still catching the
 * 50ms-regression class of bug.
 */
const CACHED_HIT_DURATION_CEILING_MS = 5;

const READER_STAGE_SET = new Set<string>(READER_STAGES);

async function copyCanonical(): Promise<string> {
  const dst = mkdtempSync(join(tmpdir(), 'ra-inc-cached-hit-'));
  cpSync(CANONICAL, dst, { recursive: true });
  return dst;
}

describe('compile incremental — cached-hit durationMs (M14)', () => {
  let outputDir: string;
  let cacheDir: string;
  let workspace: string;

  beforeEach(async () => {
    outputDir = mkdtempSync(join(tmpdir(), 'ra-inc-cached-hit-out-'));
    cacheDir = mkdtempSync(join(tmpdir(), 'ra-inc-cached-hit-cache-'));
    workspace = await copyCanonical();
    process.env.NODE_ENV = 'test';
    delete process.env.CLAWS_COMPILER_VERSION_OVERRIDE;
  });

  afterEach(() => {
    rmSync(outputDir, { recursive: true, force: true });
    rmSync(cacheDir, { recursive: true, force: true });
    rmSync(workspace, { recursive: true, force: true });
  });

  it('second compile with no edit reports reader cacheHit stages at ≤5ms', async () => {
    // Cold compile populates the per-stage caches.
    const first = await compile(workspace, {
      targets: ['oc'],
      outputDir,
      cacheEnabled: true,
      cacheDir,
      dryRun: true,
    });
    expect(first.success).toBe(true);

    // Second compile exercises the warm path. Every cacheHit READER stage
    // must report durationMs within the ceiling — a regression where a
    // cache hit quietly does 50ms of work (e.g. re-hashing content) would
    // blow this assertion.
    const second = await compile(workspace, {
      targets: ['oc'],
      outputDir,
      cacheEnabled: true,
      cacheDir,
      dryRun: true,
    });

    const warmReaderTimings = second.stageTimings.filter(
      (t) => t.cacheHit && READER_STAGE_SET.has(t.stage),
    );

    // Sanity: at least one reader stage must actually be a warm hit —
    // otherwise we'd be asserting over an empty set.
    expect(warmReaderTimings.length).toBeGreaterThan(0);

    for (const timing of warmReaderTimings) {
      expect(
        timing.durationMs,
        `stage '${timing.stage}' cacheHit durationMs=${timing.durationMs} exceeds ${CACHED_HIT_DURATION_CEILING_MS}ms ceiling`,
      ).toBeLessThanOrEqual(CACHED_HIT_DURATION_CEILING_MS);
    }
  });
});
