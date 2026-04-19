/**
 * L3 acceptance tests — incremental compile scenarios (CL-04 §IS).
 *
 * Binds the three incremental scenarios to executable contracts:
 *   - S01 lobster-only edit: exactly lobster misses; downstream stages miss;
 *     other 8 readers cacheHit.
 *   - S02 SOUL-only edit adds a new principle that appears in emit output.
 *   - S03 key rotation invalidates every stage AND converges with
 *     `cache clear` — both paths produce identical emit bytes and identical
 *     cacheHit:false `stageTimings`.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync, readFileSync, cpSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { compile } from '#src/compiler/host/compile.js';
import { STAGE_ORDER } from '#src/compiler/host/stage-deps.js';
import { COMPILER_VERSION_DEFAULT } from '#src/compiler/host/compiler-version.js';
import { serializeStageTimings } from '#src/compiler/host/stage-timings-serialize.js';

const FIXTURES = resolve(__dirname, '../../fixtures');
const CANONICAL = resolve(FIXTURES, 'canonical-oc-workspace');

async function copyCanonical(): Promise<string> {
  const dst = mkdtempSync(join(tmpdir(), 'ra-inc-accept-ws-'));
  cpSync(CANONICAL, dst, { recursive: true });
  return dst;
}

function emitDigest(result: Awaited<ReturnType<typeof compile>>): string {
  // Concatenate every emit file path + content with NUL separators so the
  // comparison is byte-exact across the full emit set. Sorting by path
  // guards against emitter ordering jitter.
  const digest: string[] = [];
  for (const target of Object.keys(result.emitResults).sort()) {
    const r = result.emitResults[target as keyof typeof result.emitResults];
    if (r === undefined) continue;
    const sorted = [...r.files].sort((a, b) => (a.path < b.path ? -1 : 1));
    digest.push(target);
    for (const f of sorted) {
      digest.push(f.path, '\u0000', f.content, '\u0000');
    }
  }
  return digest.join('');
}

describe('compile incremental scenarios (accept)', () => {
  let outputDir: string;
  let cacheDir: string;
  let workspace: string;

  beforeEach(async () => {
    outputDir = mkdtempSync(join(tmpdir(), 'ra-inc-accept-out-'));
    cacheDir = mkdtempSync(join(tmpdir(), 'ra-inc-accept-cache-'));
    workspace = await copyCanonical();
    process.env.NODE_ENV = 'test';
    delete process.env.CLAWS_COMPILER_VERSION_OVERRIDE;
  });

  afterEach(() => {
    rmSync(outputDir, { recursive: true, force: true });
    rmSync(cacheDir, { recursive: true, force: true });
    rmSync(workspace, { recursive: true, force: true });
    delete process.env.CLAWS_COMPILER_VERSION_OVERRIDE;
  });

  it('S01: lobster-only edit invalidates exactly the lobster reader; downstream re-runs; other 8 readers cacheHit', async () => {
    await compile(workspace, {
      targets: ['oc'],
      outputDir,
      cacheEnabled: true,
      cacheDir,
      dryRun: true,
    });

    // Edit only lobster.yaml — every other reader stays byte-identical.
    const lobsterPath = join(workspace, 'lobster.yaml');
    const lobster = readFileSync(lobsterPath, 'utf-8');
    writeFileSync(lobsterPath, `${lobster}\n# S01 accept edit\n`);

    const after = await compile(workspace, {
      targets: ['oc'],
      outputDir,
      cacheEnabled: true,
      cacheDir,
      dryRun: true,
    });

    expect(after.success).toBe(true);
    // Exactly one reader misses, and it is lobster.
    const readerTimings = after.stageTimings.filter((t) =>
      STAGE_ORDER.slice(0, 9).includes(t.stage),
    );
    const misses = readerTimings.filter((t) => !t.cacheHit);
    expect(misses.length).toBe(1);
    expect(misses[0]?.stage).toBe('lobster');
    // Other 8 readers cacheHit.
    const hits = readerTimings.filter((t) => t.cacheHit);
    expect(hits.length).toBe(8);
    // Every downstream stage must miss (upstream byte-hash fold).
    for (const stage of ['modelToIR', 'baselineAnalysis', 'enforceR5', 'emit', 'validate'] as const) {
      const t = after.stageTimings.find((s) => s.stage === stage);
      expect(t?.cacheHit).toBe(false);
    }
  });

  it('S02: SOUL-only edit adds a new principle that is observable in emit output', async () => {
    const soulPath = join(workspace, 'SOUL.md');
    const soul = readFileSync(soulPath, 'utf-8');
    // Inject a distinctive new principle into the existing `## Principles`
    // section so modelToIR picks it up. The canonical fixture ships with
    // a Principles section already. Tolerate both LF and CRLF line endings
    // — the fixture may be checked out either way depending on
    // core.autocrlf, and the reader normalises CRLF downstream anyway.
    const newPrinciple =
      '- Emit output MUST reflect SOUL principle changes on the next compile.';
    const edited = soul.replace(
      /## Principles\r?\n/,
      `## Principles\n${newPrinciple}\n`,
    );
    writeFileSync(soulPath, edited);

    // The Claude Code emitter renders principles verbatim into CLAUDE.md
    // (cc-templates.formatClaudeMd), so it is the observability path for
    // this scenario. Compile both targets in one pass — a single cache
    // dir, so the compile-level cache key folds in both targets.
    const result = await compile(workspace, {
      targets: ['oc', 'claude-code'],
      outputDir,
      cacheEnabled: true,
      cacheDir,
      dryRun: true,
    });

    expect(result.success).toBe(true);

    // The principle text MUST appear somewhere in the concatenated emit
    // digest. The CC CLAUDE.md renders principles inline; the OC emit
    // does not carry raw principle text. Asserting presence in the
    // combined digest keeps the contract observable regardless of which
    // emit target carries it.
    const digest = emitDigest(result);
    expect(digest).toContain('Emit output MUST reflect SOUL principle changes');
  });

  it('S03: key rotation invalidates every stage; `cache clear` + rotation converge on identical emit + stageTimings', async () => {
    // Path A: seed a cache then rotate compiler.version so every stage
    // has to invalidate. The compile-level cache also invalidates since
    // compilerVersion is folded into its key.
    const cacheDirA = mkdtempSync(join(tmpdir(), 'ra-inc-accept-cA-'));
    try {
      await compile(workspace, {
        targets: ['oc'],
        outputDir,
        cacheEnabled: true,
        cacheDir: cacheDirA,
        dryRun: true,
      });
      process.env.CLAWS_COMPILER_VERSION_OVERRIDE = `${COMPILER_VERSION_DEFAULT}+rot-S03`;
      const pathA = await compile(workspace, {
        targets: ['oc'],
        outputDir,
        cacheEnabled: true,
        cacheDir: cacheDirA,
        dryRun: true,
      });
      for (const t of pathA.stageTimings) {
        expect(t.cacheHit).toBe(false);
      }

      // Path B: full `claws cache clear` analogue — drop the entire cache
      // directory — then compile on the same rotated compiler.version.
      // Both paths must converge on byte-identical emit output (same
      // inputs, same compiler version) and structurally identical
      // stageTimings (all cacheHit:false, same stages).
      const cacheDirB = mkdtempSync(join(tmpdir(), 'ra-inc-accept-cB-'));
      try {
        const pathB = await compile(workspace, {
          targets: ['oc'],
          outputDir,
          cacheEnabled: true,
          cacheDir: cacheDirB,
          dryRun: true,
        });
        for (const t of pathB.stageTimings) {
          expect(t.cacheHit).toBe(false);
        }

        // Emit bytes must be byte-identical across both paths.
        expect(emitDigest(pathA)).toBe(emitDigest(pathB));

        // stageTimings are structurally equivalent — durations differ by
        // wall-clock, serializeStageTimings with roundDurations normalizes.
        const serializedA = serializeStageTimings(pathA.stageTimings, { roundDurations: true });
        const serializedB = serializeStageTimings(pathB.stageTimings, { roundDurations: true });
        expect(serializedA).toBe(serializedB);
      } finally {
        rmSync(cacheDirB, { recursive: true, force: true });
      }
    } finally {
      rmSync(cacheDirA, { recursive: true, force: true });
    }
  });
});
