/**
 * test/e2e/harness/config-validator — LayerConfig shape validation.
 *
 * `LayerConfig` is the harness-layer control surface that each scenario uses
 * to describe which OpenClaw layer (L0..L4) it is exercising. The validator
 * lives in the harness (not in a shipping package) because it is a test-only
 * contract — the real plugin layer config lives inside packages/claws and
 * has a different schema.
 *
 * The four load-bearing rules validated here (D4 scenarios):
 *
 *   1. `track` MUST be one of: `'disabled' | 'advisory' | 'enforced'`.
 *   2. If `decide === false`, the scenario cannot declare `providers` — a
 *      provider list only makes sense when the layer actually decides.
 *   3. If `enforceReview === false`, the companion-check step is skipped at
 *      runtime; the validator returns `skipCompanionCheck: true` so the
 *      harness driver can branch without re-reading the config.
 *   4. Unknown `track` strings are rejected (not coerced to a default).
 *
 * @module test/e2e/harness/config-validator
 */

export type TrackMode = 'disabled' | 'advisory' | 'enforced';

const TRACK_MODES: ReadonlySet<TrackMode> = new Set<TrackMode>([
  'disabled',
  'advisory',
  'enforced',
]);

export interface LayerConfig {
  readonly layerId: string;
  readonly track: TrackMode;
  readonly decide: boolean;
  readonly enforceReview: boolean;
  readonly providers?: readonly string[];
}

export type LayerConfigInvalidReason =
  | 'invalid-track-mode'
  | 'providers-without-decide'
  | 'missing-layerId'
  | 'non-object';

export interface LayerConfigValid {
  readonly ok: true;
  readonly config: LayerConfig;
  readonly skipCompanionCheck: boolean;
}

export interface LayerConfigInvalid {
  readonly ok: false;
  readonly reason: LayerConfigInvalidReason;
  readonly detail: string;
}

export type LayerConfigValidation = LayerConfigValid | LayerConfigInvalid;

export function validateLayerConfig(input: unknown): LayerConfigValidation {
  if (input === null || typeof input !== 'object') {
    return { ok: false, reason: 'non-object', detail: 'input must be an object' };
  }
  const obj = input as Record<string, unknown>;

  const layerId = obj['layerId'];
  if (typeof layerId !== 'string' || layerId.length === 0) {
    return {
      ok: false,
      reason: 'missing-layerId',
      detail: 'layerId must be a non-empty string',
    };
  }

  const track = obj['track'];
  if (typeof track !== 'string' || !TRACK_MODES.has(track as TrackMode)) {
    return {
      ok: false,
      reason: 'invalid-track-mode',
      detail: `track must be one of ${[...TRACK_MODES].join(', ')} (got ${JSON.stringify(track)})`,
    };
  }

  const decide = obj['decide'] === true;
  const enforceReview = obj['enforceReview'] === true;
  const rawProviders = obj['providers'];

  let providers: readonly string[] | undefined;
  if (rawProviders !== undefined) {
    if (
      !Array.isArray(rawProviders) ||
      !rawProviders.every((p): p is string => typeof p === 'string')
    ) {
      return {
        ok: false,
        reason: 'providers-without-decide',
        detail: 'providers must be an array of strings',
      };
    }
    if (!decide && rawProviders.length > 0) {
      return {
        ok: false,
        reason: 'providers-without-decide',
        detail:
          'providers declared with decide=false — providers only make sense when the layer decides',
      };
    }
    providers = rawProviders;
  }

  const config: LayerConfig = {
    layerId,
    track: track as TrackMode,
    decide,
    enforceReview,
    ...(providers !== undefined ? { providers } : {}),
  };

  return {
    ok: true,
    config,
    skipCompanionCheck: !enforceReview,
  };
}
