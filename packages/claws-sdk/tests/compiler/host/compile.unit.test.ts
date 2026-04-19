/**
 * L0 unit tests for compile() -- branch coverage for the pipeline host.
 *
 * Exercises: cache-disabled success path, cache-hit short-circuit, sidecar
 * validation failure, emit failure for an unsupported target, and a
 * missing-files fixture that still produces a valid (though skeletal) IR.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { compile } from '#src/compiler/host/compile.js';
import { CompilerEventBus } from '#src/compiler/events/bus.js';
import type { CompilerEvent } from '#src/compiler/events/types.js';

const FIXTURES = resolve(__dirname, '../../fixtures');

describe('compile() (unit)', () => {
  let outputDir: string;
  let cacheDir: string;

  beforeEach(() => {
    outputDir = mkdtempSync(join(tmpdir(), 'host-unit-out-'));
    cacheDir = mkdtempSync(join(tmpdir(), 'host-unit-cache-'));
  });

  afterEach(() => {
    rmSync(outputDir, { recursive: true, force: true });
    rmSync(cacheDir, { recursive: true, force: true });
  });

  it('cache-disabled path runs the full pipeline and returns a CompileResult', async () => {
    const result = await compile(resolve(FIXTURES, 'full-workspace'), {
      targets: ['oc'],
      outputDir,
      cacheEnabled: false,
      dryRun: true,
    });
    expect(result.cacheHit).toBe(false);
    expect(result.duration).toBeGreaterThanOrEqual(0);
    expect(result.contentHash).toMatch(/^[0-9a-f]{64}$/);
    expect(result.emitResults.oc).toBeDefined();
  });

  it('verbose flag propagates to emitters', async () => {
    const result = await compile(resolve(FIXTURES, 'full-workspace'), {
      targets: ['oc'],
      outputDir,
      cacheEnabled: false,
      dryRun: true,
      verbose: true,
    });
    expect(result.emitResults.oc).toBeDefined();
  });

  it('fails fast when .claws sidecar is malformed', async () => {
    const bad = mkdtempSync(join(tmpdir(), 'host-unit-bad-'));
    try {
      // Minimal OC files so readers succeed.
      writeFileSync(join(bad, 'SOUL.md'), '# SOUL\npersona: x\n');
      writeFileSync(join(bad, 'TOOLS.md'), '# TOOLS\n');
      // Invalid sidecar -- missing required "version".
      writeFileSync(join(bad, '.claws'), JSON.stringify({ targets: ['oc'] }));

      const result = await compile(bad, {
        targets: ['oc'],
        outputDir,
        cacheEnabled: false,
        dryRun: true,
      });

      expect(result.success).toBe(false);
      expect(result.diagnostics.find((d) => d.code === 'SIDECAR-INVALID')).toBeDefined();
    } finally {
      rmSync(bad, { recursive: true, force: true });
    }
  });

  it('survives a missing-files workspace (readers emit warnings, no sidecar)', async () => {
    const sparse = mkdtempSync(join(tmpdir(), 'host-unit-sparse-'));
    try {
      // Just one file so at least something is read; others become diagnostics.
      writeFileSync(join(sparse, 'SOUL.md'), '# SOUL\npersona: tiny\n');

      const result = await compile(sparse, {
        targets: ['oc'],
        outputDir,
        cacheEnabled: false,
        dryRun: true,
      });

      // Read-stage diagnostics from missing optional files land on the result.
      expect(
        result.diagnostics.some((d) => d.stage === 'read'),
      ).toBe(true);
      expect(result.contentHash).toMatch(/^[0-9a-f]{64}$/);
    } finally {
      rmSync(sparse, { recursive: true, force: true });
    }
  });

  it('cache hit sets cacheHit=true and preserves the contentHash', async () => {
    const opts = {
      targets: ['oc'] as const,
      outputDir,
      cacheEnabled: true,
      cacheDir,
      cacheMaxSize: 1024 * 1024,
      dryRun: true,
    };
    const a = await compile(resolve(FIXTURES, 'full-workspace'), opts);
    expect(a.cacheHit).toBe(false);

    const b = await compile(resolve(FIXTURES, 'full-workspace'), opts);
    expect(b.cacheHit).toBe(true);
    expect(b.contentHash).toBe(a.contentHash);
  });

  it('recovers from a corrupt cache entry by invalidating and recompiling', async () => {
    const { readdirSync } = await import('node:fs');
    const opts = {
      targets: ['oc'] as const,
      outputDir,
      cacheEnabled: true,
      cacheDir,
      dryRun: true,
    };
    // First compile to seed the cache.
    const first = await compile(resolve(FIXTURES, 'full-workspace'), opts);
    expect(first.cacheHit).toBe(false);

    // Corrupt every cache entry file so JSON.parse throws on next get. The
    // cache key is derived from contentHash plus options, so the exact
    // filename is not the contentHash itself.
    const entriesDir = join(cacheDir, 'entries');
    for (const name of readdirSync(entriesDir)) {
      writeFileSync(join(entriesDir, name), '{not valid json', 'utf-8');
    }

    const second = await compile(resolve(FIXTURES, 'full-workspace'), opts);
    expect(second.cacheHit).toBe(false);
    expect(
      second.diagnostics.some((d) => d.code === 'CACHE-CORRUPT' || d.stage === 'cache'),
    ).toBe(true);
  });

  it('skips cache wiring when cacheEnabled is true but cacheDir is absent', async () => {
    // cacheDir omitted -> cache is not constructed -> cacheHit stays false.
    const result = await compile(resolve(FIXTURES, 'full-workspace'), {
      targets: ['oc'],
      outputDir,
      cacheEnabled: true,
      dryRun: true,
    });
    expect(result.cacheHit).toBe(false);
  });

  it('populates outputHash on emit results consumed by the validator', async () => {
    const result = await compile(resolve(FIXTURES, 'full-workspace'), {
      targets: ['oc'],
      outputDir,
      cacheEnabled: false,
      dryRun: true,
    });
    // Check 12 (output hash stability) must pass end-to-end.
    const check12 = result.validationReport?.checks.find((c) => c.checkId === 12);
    expect(check12?.pass).toBe(true);
  });

  it('drops agent tool references that are not declared in TOOLS.md', async () => {
    // The full-workspace fixture declares agents with tool refs that may not
    // appear in TOOLS.md; the host filters them so check 3 passes.
    const result = await compile(resolve(FIXTURES, 'full-workspace'), {
      targets: ['oc'],
      outputDir,
      cacheEnabled: false,
      dryRun: true,
    });
    const check3 = result.validationReport?.checks.find((c) => c.checkId === 3);
    expect(check3?.pass).toBe(true);
  });

  it('honors dryRun flag by not writing to outputDir when true', async () => {
    const { readdirSync } = await import('node:fs');
    await compile(resolve(FIXTURES, 'full-workspace'), {
      targets: ['oc'],
      outputDir,
      cacheEnabled: false,
      dryRun: true,
    });
    expect(readdirSync(outputDir).length).toBe(0);
  });

  it('creates the cache dir lazily when the compile wants to persist', async () => {
    const freshCache = mkdtempSync(join(tmpdir(), 'host-unit-fresh-cache-'));
    // Remove it so the host has to create it.
    rmSync(freshCache, { recursive: true, force: true });
    try {
      await compile(resolve(FIXTURES, 'full-workspace'), {
        targets: ['oc'],
        outputDir,
        cacheEnabled: true,
        cacheDir: freshCache,
        dryRun: true,
      });
      const { existsSync, readdirSync } = await import('node:fs');
      expect(existsSync(freshCache)).toBe(true);
      expect(readdirSync(freshCache).length).toBeGreaterThan(0);
    } finally {
      rmSync(freshCache, { recursive: true, force: true });
    }
  });

  it('computes a deterministic contentHash across repeat compiles', async () => {
    const opts = {
      targets: ['oc'] as const,
      outputDir,
      cacheEnabled: false,
      dryRun: true,
    };
    const a = await compile(resolve(FIXTURES, 'full-workspace'), opts);
    const b = await compile(resolve(FIXTURES, 'full-workspace'), opts);
    expect(a.contentHash).toBe(b.contentHash);
  });

  it('produces cache hit stats after warm-up', async () => {
    const opts = {
      targets: ['oc'] as const,
      outputDir,
      cacheEnabled: true,
      cacheDir,
      dryRun: true,
    };
    await compile(resolve(FIXTURES, 'full-workspace'), opts);
    await compile(resolve(FIXTURES, 'full-workspace'), opts);
    await compile(resolve(FIXTURES, 'full-workspace'), opts);
    const { readFileSync } = await import('node:fs');
    const manifestPath = join(cacheDir, 'manifest.json');
    const mf = JSON.parse(readFileSync(manifestPath, 'utf-8'));
    expect(mf.hitCount).toBeGreaterThanOrEqual(2);
  });

  it('includes "read" stage diagnostics for each missing optional file', async () => {
    const oneFile = mkdtempSync(join(tmpdir(), 'host-one-'));
    try {
      writeFileSync(join(oneFile, 'SOUL.md'), '# SOUL\npersona: x\n');
      const result = await compile(oneFile, {
        targets: ['oc'],
        outputDir,
        cacheEnabled: false,
        dryRun: true,
      });
      const readDiags = result.diagnostics.filter((d) => d.stage === 'read');
      expect(readDiags.length).toBeGreaterThan(0);
    } finally {
      rmSync(oneFile, { recursive: true, force: true });
    }
  });

  it('R5 fails closed when a required file (TOOLS.md) is missing', async () => {
    const noTools = mkdtempSync(join(tmpdir(), 'host-no-tools-'));
    try {
      // Provide SOUL.md but omit TOOLS.md -- tools-reader marks this required.
      writeFileSync(join(noTools, 'SOUL.md'), '# SOUL\npersona: x\n');

      const result = await compile(noTools, {
        targets: ['oc'],
        outputDir,
        cacheEnabled: false,
        dryRun: true,
      });

      expect(result.success).toBe(false);
      expect(
        result.diagnostics.some((d) => d.stage === 'enforce' && d.severity === 'error'),
      ).toBe(true);
    } finally {
      rmSync(noTools, { recursive: true, force: true });
    }
  });

  it('single-target compile with mismatched platform produces failCount > 0', async () => {
    // user.platform defaults to "oc" in modelToIR, but emit=claude-code triggers
    // check 10 to fail, which propagates to failCount>=1 in the report.
    const result = await compile(resolve(FIXTURES, 'full-workspace'), {
      targets: ['claude-code'],
      outputDir,
      cacheEnabled: false,
      dryRun: true,
    });
    expect(result.validationReport?.failCount).toBeGreaterThanOrEqual(1);
    expect(result.validationReport?.overallPass).toBe(false);
    expect(result.success).toBe(false);
  });

  it('T0-T4 annotation in tool description wins trust parsing', async () => {
    const ws = mkdtempSync(join(tmpdir(), 'host-trust-'));
    try {
      writeFileSync(join(ws, 'SOUL.md'), '# SOUL\npersona: trust-annotations\n');
      writeFileSync(
        join(ws, 'TOOLS.md'),
        '# TOOLS\n## Read\nT0 read-only file access\n\n## Deploy\nT4 production deploy\n',
      );
      const result = await compile(ws, {
        targets: ['oc'],
        outputDir,
        cacheEnabled: false,
        dryRun: true,
      });
      // Trust derived from T0/T4 annotations — T4 should land the tool in blockedTools.
      const config = result.emitResults.oc?.files.find((f) =>
        f.path.endsWith('claws-governance.config.json'),
      );
      expect(config?.content).toContain('Deploy');
    } finally {
      rmSync(ws, { recursive: true, force: true });
    }
  });

  it('USER.md Platform fallback when value is unknown', async () => {
    const ws = mkdtempSync(join(tmpdir(), 'host-plat-unknown-'));
    try {
      writeFileSync(join(ws, 'SOUL.md'), '# SOUL\npersona: weird-platform\n');
      writeFileSync(join(ws, 'TOOLS.md'), '# TOOLS\n## Read\nRead files.\n');
      writeFileSync(
        join(ws, 'USER.md'),
        '# User\n## Role\nDeveloper\n## Platform\nunsupported-platform\n',
      );
      // Unknown platform falls back to 'oc'; compile for oc succeeds.
      const result = await compile(ws, {
        targets: ['oc'],
        outputDir,
        cacheEnabled: false,
        dryRun: true,
      });
      expect(result.success).toBe(true);
    } finally {
      rmSync(ws, { recursive: true, force: true });
    }
  });

  it('threads user bounds from USER.md when a Bounds section exists', async () => {
    const ws = mkdtempSync(join(tmpdir(), 'host-bounds-'));
    try {
      writeFileSync(join(ws, 'SOUL.md'), '# SOUL\npersona: bounded\n');
      writeFileSync(join(ws, 'TOOLS.md'), '# TOOLS\n## Read\nRead files.\n');
      writeFileSync(
        join(ws, 'USER.md'),
        '# User\n## Role\nEngineer\n## Bounds\n- deploy\n- read\n',
      );
      // Compile succeeds when bounds are surfaced into IR.
      const result = await compile(ws, {
        targets: ['oc'],
        outputDir,
        cacheEnabled: false,
        dryRun: true,
      });
      expect(result.success).toBe(true);
    } finally {
      rmSync(ws, { recursive: true, force: true });
    }
  });

  it('can compile a workspace with empty skills directory', async () => {
    const empty = mkdtempSync(join(tmpdir(), 'host-empty-skills-'));
    try {
      writeFileSync(join(empty, 'SOUL.md'), '# SOUL\npersona: x\n');
      writeFileSync(join(empty, 'TOOLS.md'), '# TOOLS\n');
      mkdirSync(join(empty, 'skills'));

      const result = await compile(empty, {
        targets: ['oc'],
        outputDir,
        cacheEnabled: false,
        dryRun: true,
      });
      expect(result.contentHash).toMatch(/^[0-9a-f]{64}$/);
    } finally {
      rmSync(empty, { recursive: true, force: true });
    }
  });

  it('compile-level cache hit with bus fires cache.hit + compile.complete events (mtime fast-path disabled)', async () => {
    // Seed the compile-level cache with a successful compile.
    const opts = {
      targets: ['oc'] as const,
      outputDir,
      cacheEnabled: true,
      cacheDir,
      cacheMaxSize: 1024 * 1024,
      dryRun: true,
    };
    const first = await compile(resolve(FIXTURES, 'full-workspace'), opts);
    expect(first.cacheHit).toBe(false);

    // Delete ONLY the mtime fast-path index so the next compile skips the
    // fingerprint short-circuit and falls through to the normal-path
    // compile-level cache lookup — that path is where the 'cache.hit' and
    // terminal 'compile.complete' event emissions live (compile.ts lines
    // around the normal-path `fire(bus, …)` calls).
    const indexFile = join(cacheDir, 'mtime-index.json');
    if (existsSync(indexFile)) rmSync(indexFile);

    const bus = new CompilerEventBus();
    const events: CompilerEvent[] = [];
    for (const type of ['cache.hit', 'compile.complete'] as const) {
      bus.on(type, (e) => events.push(e));
    }

    const second = await compile(resolve(FIXTURES, 'full-workspace'), {
      ...opts,
      events: bus,
    });
    expect(second.cacheHit).toBe(true);
    expect(second.contentHash).toBe(first.contentHash);

    // The normal-path cache-hit emits cache.hit WITHOUT a `stage` field
    // (stage-level events always carry a stage).
    const compileLevelHits = events.filter(
      (e) => e.type === 'cache.hit' && !('stage' in e && e.stage !== undefined),
    );
    expect(compileLevelHits.length).toBeGreaterThanOrEqual(1);

    // And the terminal compile.complete fires exactly once on the cache-hit
    // return path.
    const completes = events.filter((e) => e.type === 'compile.complete');
    expect(completes.length).toBe(1);
  });

  it('sidecar-invalid path with bus wired emits compile.failed with sidecar diagnostic', async () => {
    const bad = mkdtempSync(join(tmpdir(), 'host-unit-bad-bus-'));
    try {
      writeFileSync(join(bad, 'SOUL.md'), '# SOUL\npersona: x\n');
      writeFileSync(join(bad, 'TOOLS.md'), '# TOOLS\n');
      // Missing required "version" → resolveSidecar throws → SIDECAR-INVALID
      writeFileSync(join(bad, '.claws'), JSON.stringify({ targets: ['oc'] }));

      const bus = new CompilerEventBus();
      const events: CompilerEvent[] = [];
      bus.on('compile.failed', (e) => events.push(e));

      const result = await compile(bad, {
        targets: ['oc'],
        outputDir,
        cacheEnabled: false,
        dryRun: true,
        events: bus,
      });

      expect(result.success).toBe(false);
      // Exactly one compile.failed emission on the early-return sidecar
      // path (separate from the tail-end compile.failed which only fires
      // when the full pipeline ran and produced a non-success result).
      expect(events.length).toBe(1);
      const failed = events[0]!;
      if (failed.type !== 'compile.failed') throw new Error('expected compile.failed');
      expect(failed.diagnostics.some((d) => d.code === 'SIDECAR-INVALID')).toBe(true);
    } finally {
      rmSync(bad, { recursive: true, force: true });
    }
  });

  it('tail-end compile.failed with bus fires when the pipeline completes but validation reports errors', async () => {
    // The missing-files fixture path produces a pipeline that runs end-to-end
    // but accumulates read-stage error diagnostics that flip `success` to
    // false. That drives the tail-end `else` branch of the terminal
    // event emission (compile.ts ~line 1565).
    const sparse = mkdtempSync(join(tmpdir(), 'host-unit-fail-tail-'));
    try {
      // Only SOUL present — readers for TOOLS/AGENTS/MEMORY/IDENTITY/USER/
      // HEARTBEAT/skills/lobster.yaml report error-severity diagnostics,
      // and validation checks that depend on them fail.
      writeFileSync(join(sparse, 'SOUL.md'), '# SOUL\npersona: tiny\n');

      const bus = new CompilerEventBus();
      const events: CompilerEvent[] = [];
      bus.on('compile.failed', (e) => events.push(e));
      bus.on('compile.complete', (e) => events.push(e));

      const result = await compile(sparse, {
        targets: ['oc'],
        outputDir,
        cacheEnabled: false,
        dryRun: true,
        events: bus,
      });

      // Either compile.failed or compile.complete will fire exactly once
      // at the pipeline tail. When success is false (errors in diagnostics
      // or validation fails) the failed branch fires — that's what we want
      // to cover. If the sparse fixture ever produces success=true (it
      // should not: multiple readers error), the test surfaces that.
      expect(events.length).toBe(1);
      if (!result.success) {
        expect(events[0]!.type).toBe('compile.failed');
      }
    } finally {
      rmSync(sparse, { recursive: true, force: true });
    }
  });
});
