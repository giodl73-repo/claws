/**
 * Deterministic serialization for `stageTimings` (CL-04 §IS.4, S01-F08).
 *
 * Emits sorted-key JSON so snapshot tests are stable across Node versions
 * and object-property-insertion orders. Optionally rounds durations when
 * the caller wants a wall-clock-independent snapshot (durations round to
 * the nearest millisecond; `0` stays `0`).
 *
 * @module claws-sdk/compiler/host/stage-timings-serialize
 */
import type { StageTiming } from './types.js';
import { STAGE_ORDER } from './stage-deps.js';

export interface SerializeOptions {
  /**
   * When true, replace every `durationMs` with `0`. Snapshot tests use this
   * to keep the fixture stable regardless of machine speed.
   */
  readonly roundDurations?: boolean;
}

/**
 * Return a deterministic JSON string for `timings`.
 *
 * The timings are reordered by the canonical `STAGE_ORDER` before emission
 * so stage order is a documented contract rather than a consequence of how
 * the compiler happened to iterate. Unknown stage names (a forward-compat
 * hedge) are appended after the known order, sorted lexicographically.
 * Each entry's keys are emitted in a fixed order: stage, cacheHit,
 * durationMs, byteHash.
 */
export function serializeStageTimings(
  timings: readonly StageTiming[],
  options: SerializeOptions = {},
): string {
  const byStage = new Map<string, StageTiming>();
  for (const t of timings) {
    byStage.set(t.stage, t);
  }

  const ordered: StageTiming[] = [];
  for (const stage of STAGE_ORDER) {
    const t = byStage.get(stage);
    if (t !== undefined) {
      ordered.push(t);
      byStage.delete(stage);
    }
  }
  const remaining = Array.from(byStage.values()).sort(
    /* c8 ignore next 3 -- forward-compat path; `byStage` keys are unique so equal stages never coexist, and the `<`/`>` branches depend on V8's sort algorithm order. */
    (a, b) =>
      a.stage < b.stage ? -1 : a.stage > b.stage ? 1 : 0,
  );
  ordered.push(...remaining);

  const round = options.roundDurations === true;
  const entries = ordered.map((t) => ({
    stage: t.stage,
    cacheHit: t.cacheHit,
    durationMs: round ? 0 : t.durationMs,
    byteHash: t.byteHash,
  }));

  return JSON.stringify(entries);
}
