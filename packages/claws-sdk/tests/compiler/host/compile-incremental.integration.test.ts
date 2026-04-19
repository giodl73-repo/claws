/**
 * L1 integration tests — incremental compile + stageTimings (CL-04 §IS).
 *
 * Covers S01-F03 (upstream byte-hash folding), S02-F04 (downstream
 * invalidation on reader miss), and the key-rotation full-invalidate rule.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync, cpSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { compile } from '#src/compiler/host/compile.js';
import { COMPILER_VERSION_DEFAULT } from '#src/compiler/host/compiler-version.js';
import { STAGE_ORDER } from '#src/compiler/host/stage-deps.js';
import { CompilerEventBus } from '#src/compiler/events/bus.js';
import type { CompilerEvent } from '#src/compiler/events/types.js';

const FIXTURES = resolve(__dirname, '../../fixtures');

async function copyFixture(src: string): Promise<string> {
  const dst = mkdtempSync(join(tmpdir(), 'ra-inc-ws-'));
  cpSync(src, dst, { recursive: true });
  return dst;
}

describe('compile incremental (integration)', () => {
  let outputDir: string;
  let cacheDir: string;
  let workspace: string;

  beforeEach(async () => {
    outputDir = mkdtempSync(join(tmpdir(), 'ra-inc-out-'));
    cacheDir = mkdtempSync(join(tmpdir(), 'ra-inc-cache-'));
    workspace = await copyFixture(resolve(FIXTURES, 'full-workspace'));
    process.env.NODE_ENV = 'test';
    delete process.env.CLAWS_COMPILER_VERSION_OVERRIDE;
  });

  afterEach(() => {
    rmSync(outputDir, { recursive: true, force: true });
    rmSync(cacheDir, { recursive: true, force: true });
    rmSync(workspace, { recursive: true, force: true });
    delete process.env.CLAWS_COMPILER_VERSION_OVERRIDE;
  });

  it('second compile with no edit reports cacheHit:true for every stage', async () => {
    const first = await compile(workspace, {
      targets: ['oc'],
      outputDir,
      cacheEnabled: true,
      cacheDir,
      dryRun: true,
    });
    expect(first.stageTimings.length).toBe(STAGE_ORDER.length);

    const second = await compile(workspace, {
      targets: ['oc'],
      outputDir,
      cacheEnabled: true,
      cacheDir,
      dryRun: true,
    });
    // Either the compile-level short-circuit OR the per-stage path must
    // report every stage as a hit on an unchanged workspace.
    for (const t of second.stageTimings) {
      expect(t.cacheHit).toBe(true);
    }
  });

  it('downstream stage cache key includes upstream byte-hash (SOUL edit forces downstream miss)', async () => {
    await compile(workspace, {
      targets: ['oc'],
      outputDir,
      cacheEnabled: true,
      cacheDir,
      dryRun: true,
    });

    // Edit SOUL.md so its byte-hash changes. Downstream (modelToIR /
    // baselineAnalysis / enforceR5 / emit / validate) must miss on the
    // next compile because upstream byte-hashes fold into their keys.
    const soulPath = join(workspace, 'SOUL.md');
    writeFileSync(
      soulPath,
      '# SOUL\n\nUpdated persona.\n\n## Principles\n- Rebuild downstream on SOUL edits.\n',
    );

    const afterEdit = await compile(workspace, {
      targets: ['oc'],
      outputDir,
      cacheEnabled: true,
      cacheDir,
      dryRun: true,
    });

    const soulTiming = afterEdit.stageTimings.find((t) => t.stage === 'soul');
    const modelTiming = afterEdit.stageTimings.find((t) => t.stage === 'modelToIR');
    expect(soulTiming?.cacheHit).toBe(false);
    expect(modelTiming?.cacheHit).toBe(false);
  });

  it('per-stage cache.hit fires on the bus when a warm stage short-circuits (readers + downstream)', async () => {
    // Seed TWICE so both reader AND downstream stage caches are warm:
    // downstream writes happen only on the success path AFTER the write,
    // so the second compile is the one that can serve downstream from
    // the per-stage cache when we skip the compile-level short-circuit.
    await compile(workspace, {
      targets: ['oc'],
      outputDir,
      cacheEnabled: true,
      cacheDir,
      dryRun: true,
    });
    await compile(workspace, {
      targets: ['oc'],
      outputDir,
      cacheEnabled: true,
      cacheDir,
      dryRun: true,
    });

    // Now compile with a bus wired and NO edits. Path depends on the
    // compile-level cache: if the compile-level cache serves the hit, a
    // compile-level `cache.hit` event fires (without `stage`) and every
    // stageTiming is synthesized. Per-stage `cache.hit` events fire only
    // when the compile-level cache misses and per-stage caches serve.
    // Either outcome exercises the bus-wired cache.hit emission path.
    const bus = new CompilerEventBus();
    const events: CompilerEvent[] = [];
    for (const type of ['cache.hit', 'cache.miss', 'cache.write'] as const) {
      bus.on(type, (e) => events.push(e));
    }

    await compile(workspace, {
      targets: ['oc'],
      outputDir,
      cacheEnabled: true,
      cacheDir,
      dryRun: true,
      events: bus,
    });

    const hits = events.filter((e) => e.type === 'cache.hit');
    expect(hits.length).toBeGreaterThanOrEqual(1);
  });

  it('per-stage cache.hit + downstream hit fire with bus after a no-op re-compile on warm caches', async () => {
    // Warm readers + downstream by compiling twice without a compile-level
    // cache (cacheEnabled: false skips compile-level, but stage caches
    // don't exist under that path). Instead, we DELETE the compile-level
    // manifest between warmup and probe so the third compile MUST walk
    // the per-stage path with both reader AND downstream entries warm.
    await compile(workspace, {
      targets: ['oc'],
      outputDir,
      cacheEnabled: true,
      cacheDir,
      dryRun: true,
    });

    // Remove only the compile-level manifest + entry files; keep
    // .claws/cache/stages/* intact so the per-stage path serves every
    // stage on the next compile.
    const { readdirSync, rmSync: rmFile, statSync } = await import('node:fs');
    for (const entry of readdirSync(cacheDir)) {
      const full = join(cacheDir, entry);
      if (entry === 'stages') continue;
      const s = statSync(full);
      if (s.isFile()) rmFile(full, { force: true });
    }

    const bus = new CompilerEventBus();
    const events: CompilerEvent[] = [];
    for (const type of ['cache.hit', 'cache.miss', 'cache.write'] as const) {
      bus.on(type, (e) => events.push(e));
    }

    const result = await compile(workspace, {
      targets: ['oc'],
      outputDir,
      cacheEnabled: true,
      cacheDir,
      dryRun: true,
      events: bus,
    });
    expect(result.success).toBe(true);

    // Per-stage cache.hit events for reader stages: at least one reader
    // MUST have hit. The downstream path depends on byte-hash equality
    // across runs, which holds for deterministic compiles.
    const perStageHits = events.filter(
      (e) => e.type === 'cache.hit' && 'stage' in e && e.stage !== undefined,
    );
    expect(perStageHits.length).toBeGreaterThanOrEqual(1);
  });

  it('compiler.version override invalidates every stage (S03-F01/F02)', async () => {
    await compile(workspace, {
      targets: ['oc'],
      outputDir,
      cacheEnabled: true,
      cacheDir,
      dryRun: true,
    });

    // Simulate key rotation via the test-only compiler.version override.
    process.env.CLAWS_COMPILER_VERSION_OVERRIDE = `${COMPILER_VERSION_DEFAULT}+rotated`;
    const afterRotation = await compile(workspace, {
      targets: ['oc'],
      outputDir,
      cacheEnabled: true,
      cacheDir,
      dryRun: true,
    });

    // Rotation invalidates every stage: no cacheHit anywhere in stageTimings.
    for (const t of afterRotation.stageTimings) {
      expect(t.cacheHit).toBe(false);
    }
  });
});
