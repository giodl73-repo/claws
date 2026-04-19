/**
 * L0 unit test — deterministic `stageTimings` JSON (CL-04 §IS.4, S01-F08).
 *
 * Same input always produces identical bytes. Stage order follows the
 * canonical STAGE_ORDER even when input is shuffled. `roundDurations`
 * zeroes every `durationMs` for snapshot fixtures.
 */

import { describe, it, expect } from 'vitest';
import { serializeStageTimings } from '#src/compiler/host/stage-timings-serialize.js';
import type { StageTiming } from '#src/compiler/host/types.js';

const SAMPLE: StageTiming[] = [
  { stage: 'validate', cacheHit: false, durationMs: 12, byteHash: 'vh' },
  { stage: 'soul', cacheHit: true, durationMs: 1, byteHash: 'sh' },
  { stage: 'emit', cacheHit: false, durationMs: 42, byteHash: 'eh' },
];

describe('serializeStageTimings (unit)', () => {
  it('deterministic output: identical bytes across invocations', () => {
    const a = serializeStageTimings(SAMPLE);
    const b = serializeStageTimings(SAMPLE);
    expect(a).toBe(b);
  });

  it('stage order is STAGE_ORDER, not input order', () => {
    const s = serializeStageTimings(SAMPLE);
    const parsed = JSON.parse(s) as Array<{ stage: string }>;
    const stages = parsed.map((e) => e.stage);
    // "soul" appears before "emit" which appears before "validate" per
    // canonical order, regardless of input order above.
    expect(stages.indexOf('soul')).toBeLessThan(stages.indexOf('emit'));
    expect(stages.indexOf('emit')).toBeLessThan(stages.indexOf('validate'));
  });

  it('roundDurations zeroes every durationMs for snapshot use', () => {
    const rounded = serializeStageTimings(SAMPLE, { roundDurations: true });
    const parsed = JSON.parse(rounded) as Array<{ durationMs: number }>;
    for (const e of parsed) expect(e.durationMs).toBe(0);
  });

  it('entry keys are emitted in fixed order: stage, cacheHit, durationMs, byteHash', () => {
    const s = serializeStageTimings([SAMPLE[0]!]);
    // Keys should appear in a deterministic order in the emitted JSON.
    const firstObj = s.slice(1, s.length - 1); // strip outer []
    expect(firstObj.indexOf('"stage"')).toBeLessThan(firstObj.indexOf('"cacheHit"'));
    expect(firstObj.indexOf('"cacheHit"')).toBeLessThan(firstObj.indexOf('"durationMs"'));
    expect(firstObj.indexOf('"durationMs"')).toBeLessThan(firstObj.indexOf('"byteHash"'));
  });

  it('unknown stages sort lexicographically after the canonical order', () => {
    // Cast through unknown to inject stage names outside the canonical
    // STAGE_ORDER; the forward-compat branch must sort unknown stages in
    // stable lexicographic order behind every known stage. Three distinct
    // names exercise the <, >, and === sort-comparator branches.
    const unknown = [
      { stage: 'zeta' as unknown as StageTiming['stage'], cacheHit: false, durationMs: 0, byteHash: 'z' },
      { stage: 'alpha' as unknown as StageTiming['stage'], cacheHit: false, durationMs: 0, byteHash: 'a' },
      { stage: 'beta' as unknown as StageTiming['stage'], cacheHit: false, durationMs: 0, byteHash: 'b' },
      { stage: 'soul', cacheHit: true, durationMs: 0, byteHash: 's' },
    ] satisfies StageTiming[];
    const s = serializeStageTimings(unknown);
    const parsed = JSON.parse(s) as Array<{ stage: string }>;
    expect(parsed[0]?.stage).toBe('soul');
    const rest = parsed.slice(1).map((e) => e.stage);
    expect(rest).toEqual(['alpha', 'beta', 'zeta']);
  });

});
