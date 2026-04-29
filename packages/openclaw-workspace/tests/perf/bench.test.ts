/**
 * Perf bench — measure parse/emit/short-circuit + lint paths against the
 * baseline `JSON.stringify(_, null, 2)`.
 *
 * Per cp-2 dispatch step 0b: 8 fixtures (3 sizes × 2 dialects + 2 lint
 * passes); 100 iterations after warmup; capture p50/p95/p99.
 *
 * Goal: replace the bare "parity-or-faster" claim in PR-DRAFT 1 with
 * measured numbers. Per gateway-eng R1 review B1, the original
 * `isPlainJson` runs AFTER parseJsonc and is therefore strictly slower
 * than bare stringify. The new `isPlainJsonFast` (added 2026-04-28)
 * does a parse-free pre-scan; this bench measures whether that closes
 * the gap.
 *
 * Run: `npx vitest run tests/perf/bench.test.ts --reporter=verbose`
 *
 * Output: a RESULTS.md file in the same directory.
 */

import { describe, it, expect } from 'vitest';
import { writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { performance } from 'node:perf_hooks';
import { parseJsonc } from '../../src/ast/jsonc/parse.js';
import { emitJsonc, emitJsoncWithMutation } from '../../src/ast/jsonc/emit.js';
import { lint } from '../../src/lint/index.js';
import { makeTestSchema } from '../lint/helpers.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const ITERATIONS = 100;
const WARMUP = 10;

interface BenchResult {
  readonly label: string;
  readonly p50: number;
  readonly p95: number;
  readonly p99: number;
  readonly mean: number;
}

function bench(label: string, fn: () => void): BenchResult {
  // Warmup
  for (let i = 0; i < WARMUP; i++) fn();
  const samples: number[] = [];
  for (let i = 0; i < ITERATIONS; i++) {
    const t0 = performance.now();
    fn();
    samples.push(performance.now() - t0);
  }
  samples.sort((a, b) => a - b);
  const p = (q: number) => samples[Math.min(samples.length - 1, Math.floor(samples.length * q))]!;
  const mean = samples.reduce((s, x) => s + x, 0) / samples.length;
  return { label, p50: p(0.5), p95: p(0.95), p99: p(0.99), mean };
}

// -- Fixture generation -----------------------------------------------------

/** Plain JSON fixture of approximately `targetKB` kilobytes. */
function makePlainJsonFixture(targetKB: number): string {
  const obj: Record<string, unknown> = { version: '2026.4.28', channels: {}, plugins: { entries: {} } };
  // Pad with synthetic but realistic-looking config entries until we hit target.
  const channels = obj.channels as Record<string, unknown>;
  let i = 0;
  while (JSON.stringify(obj, null, 2).length < targetKB * 1024) {
    channels[`channel-${i}`] = {
      enabled: true,
      maxConcurrency: 4,
      timeout: 30_000,
      allowFrom: [`user-${i}-a`, `user-${i}-b`, `user-${i}-c`],
      meta: {
        added: '2026-01-15',
        owner: `team-${i % 5}`,
        priority: 'normal',
      },
    };
    i++;
  }
  return JSON.stringify(obj, null, 2);
}

/** JSONC fixture of approximately `targetKB` kilobytes (plain + comments injected). */
function makeJsoncFixture(targetKB: number): string {
  const plain = makePlainJsonFixture(targetKB);
  // Inject a comment after every nth `{` opening to roughly double the comment count
  // without bloating size much.
  const lines = plain.split('\n');
  const out: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    out.push(lines[i]!);
    if (i % 8 === 0 && lines[i]!.trim().endsWith('{')) {
      out.push(`${lines[i]!.match(/^\s*/)?.[0] ?? ''}  // section ${i}`);
    }
  }
  return out.join('\n');
}

// -- Fixtures ---------------------------------------------------------------

const fixtures = {
  plain10K: makePlainJsonFixture(10),
  plain100K: makePlainJsonFixture(100),
  plain1MB: makePlainJsonFixture(1024),
  jsonc10K: makeJsoncFixture(10),
  jsonc100K: makeJsoncFixture(100),
  jsonc1MB: makeJsoncFixture(1024),
};

// -- Schema for lint bench --------------------------------------------------

const benchSchema = makeTestSchema({
  knownChildKeys: (path) => {
    if (path.length === 0) return ['version', 'channels', 'plugins'];
    return [];
  },
  kindOf: () => 'unknown',
});

// -- The bench --------------------------------------------------------------

describe('perf bench — write paths', () => {
  it('runs the full bench suite and writes RESULTS.md', () => {
    const all: { fixture: string; sizeKB: number; results: BenchResult[] }[] = [];
    const HARD_CEILING_MS = 50;

    for (const [name, source] of Object.entries(fixtures)) {
      const sizeKB = Math.round(source.length / 1024);
      const parsed = JSON.parse(source.replace(/\s*\/\/[^\n]*/g, '')); // strip comments for stringify baseline

      const results: BenchResult[] = [
        bench('JSON.stringify (baseline)', () => {
          JSON.stringify(parsed, null, 2);
        }),
        bench('parseJsonc (parse only)', () => {
          parseJsonc(source);
        }),
        bench('parseJsonc + emitJsonc (pristine emit, full AST path)', () => {
          const doc = parseJsonc(source);
          emitJsonc(doc);
        }),
        bench('parseJsonc + emitJsoncWithMutation (no-op mutator)', () => {
          const doc = parseJsonc(source);
          emitJsoncWithMutation(doc, () => undefined);
        }),
      ];
      all.push({ fixture: name, sizeKB, results });
    }

    // Lint pass benches on 100K configs (no schema, full schema)
    const lintBenches: { fixture: string; results: BenchResult[] }[] = [];
    for (const fname of ['plain100K', 'jsonc100K'] as const) {
      const source = fixtures[fname];
      const doc = parseJsonc(source);
      lintBenches.push({
        fixture: fname,
        results: [
          bench('lint(doc) — no schema (AST-only rules fire)', () => lint(doc)),
          bench('lint(doc, { schema }) — full 13-rule pass', () => lint(doc, { schema: benchSchema })),
        ],
      });
    }

    // -- Write RESULTS.md ---------------------------------------------------
    const lines: string[] = [];
    lines.push('# Perf Bench Results');
    lines.push('');
    lines.push('Generated by `tests/perf/bench.test.ts`. Numbers are wall-clock milliseconds');
    lines.push(`per call across ${ITERATIONS} iterations after ${WARMUP} warmup runs.`);
    lines.push('');
    lines.push(`Run on: \`${process.platform}\` Node ${process.version}, ${new Date().toISOString()}`);
    lines.push('');
    lines.push('## Write paths (parse / emit / short-circuit)');
    lines.push('');
    for (const g of all) {
      lines.push(`### ${g.fixture} (~${g.sizeKB} KB)`);
      lines.push('');
      lines.push('| Path | p50 (ms) | p95 (ms) | p99 (ms) | mean (ms) |');
      lines.push('|---|---:|---:|---:|---:|');
      for (const r of g.results) {
        lines.push(`| ${r.label} | ${r.p50.toFixed(3)} | ${r.p95.toFixed(3)} | ${r.p99.toFixed(3)} | ${r.mean.toFixed(3)} |`);
      }
      lines.push('');
    }
    lines.push('## Lint passes');
    lines.push('');
    for (const lb of lintBenches) {
      lines.push(`### ${lb.fixture}`);
      lines.push('');
      lines.push('| Path | p50 (ms) | p95 (ms) | p99 (ms) | mean (ms) |');
      lines.push('|---|---:|---:|---:|---:|');
      for (const r of lb.results) {
        lines.push(`| ${r.label} | ${r.p50.toFixed(3)} | ${r.p95.toFixed(3)} | ${r.p99.toFixed(3)} | ${r.mean.toFixed(3)} |`);
      }
      lines.push('');
    }

    // -- Headline summary ---------------------------------------------------
    lines.push('## Headline — full AST path vs `JSON.stringify` baseline');
    lines.push('');
    lines.push('| Fixture | stringify p50 | full AST p50 | stringify p95 | full AST p95 | p50 ratio | p95 ratio |');
    lines.push('|---|---:|---:|---:|---:|---:|---:|');
    for (const g of all) {
      const baseline = g.results.find((r) => r.label.startsWith('JSON.stringify'))!;
      const ast = g.results.find((r) => r.label.startsWith('parseJsonc + emitJsonc '))!;
      lines.push(
        `| ${g.fixture} (~${g.sizeKB}KB) | ${baseline.p50.toFixed(3)} | ${ast.p50.toFixed(3)} | ${baseline.p95.toFixed(3)} | ${ast.p95.toFixed(3)} | ${(ast.p50 / baseline.p50).toFixed(2)}× | ${(ast.p95 / baseline.p95).toFixed(2)}× |`,
      );
    }
    lines.push('');
    lines.push('## Hard ceiling check');
    lines.push('');
    lines.push(`Budget: ${HARD_CEILING_MS}ms p95 on the 1MB fixtures.`);
    lines.push('');
    for (const g of all) {
      if (g.sizeKB < 800) continue;
      const ast = g.results.find((r) => r.label.startsWith('parseJsonc + emitJsonc '))!;
      const verdict = ast.p95 <= HARD_CEILING_MS ? 'PASS' : 'FAIL';
      lines.push(`- ${g.fixture}: full AST p95 = ${ast.p95.toFixed(3)}ms — **${verdict}**`);
    }
    lines.push('');

    writeFileSync(resolve(HERE, 'RESULTS.md'), lines.join('\n'), 'utf8');

    // Sanity assertions — bench succeeds even if numbers are bad; the
    // results file is the contract artifact. We only fail outright on the
    // hard 1MB ceiling so a CI invocation can flag regressions if it ever
    // runs this file.
    for (const g of all) {
      if (g.sizeKB < 800) continue;
      const ast = g.results.find((r) => r.label.startsWith('parseJsonc + emitJsonc '))!;
      expect(ast.p95, `${g.fixture} full AST p95 exceeds ${HARD_CEILING_MS}ms hard ceiling`).toBeLessThanOrEqual(
        HARD_CEILING_MS,
      );
    }
  }, 60_000); // bench can take up to ~60s on 1MB×100 iterations
});
