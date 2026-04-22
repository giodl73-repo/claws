import { describe, it, expect } from 'vitest';
import { validateLayerConfig } from '#harness/config-validator.ts';

describe('config-validator LayerConfig shape', () => {
  it('accepts a valid shape and returns the parsed config', () => {
    const result = validateLayerConfig({
      layerId: 'L2-gateway',
      track: 'enforced',
      decide: true,
      enforceReview: true,
      providers: ['trust-set-guard', 'handle-validator'],
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.config.layerId).toBe('L2-gateway');
    expect(result.config.track).toBe('enforced');
    expect(result.config.decide).toBe(true);
    expect(result.config.enforceReview).toBe(true);
    expect(result.config.providers).toEqual(['trust-set-guard', 'handle-validator']);
    expect(result.skipCompanionCheck).toBe(false);
  });

  it('rejects an invalid track mode', () => {
    const result = validateLayerConfig({
      layerId: 'L1',
      track: 'audit-only', // unknown mode
      decide: true,
      enforceReview: true,
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe('invalid-track-mode');
    expect(result.detail).toContain('track must be one of');
  });

  it('rejects decide=false with providers declared', () => {
    const result = validateLayerConfig({
      layerId: 'L3',
      track: 'advisory',
      decide: false,
      enforceReview: false,
      providers: ['observer'],
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe('providers-without-decide');
  });

  it('sets skipCompanionCheck when enforceReview=false', () => {
    const result = validateLayerConfig({
      layerId: 'L0',
      track: 'disabled',
      decide: true,
      enforceReview: false,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.skipCompanionCheck).toBe(true);
    expect(result.config.enforceReview).toBe(false);
  });

  it('rejects non-object input (null / primitive)', () => {
    const r1 = validateLayerConfig(null);
    expect(r1.ok).toBe(false);
    if (r1.ok) return;
    expect(r1.reason).toBe('non-object');

    const r2 = validateLayerConfig('not-an-object');
    expect(r2.ok).toBe(false);
    if (r2.ok) return;
    expect(r2.reason).toBe('non-object');
  });

  it('rejects missing or empty layerId', () => {
    const r1 = validateLayerConfig({
      track: 'advisory',
      decide: true,
      enforceReview: true,
    });
    expect(r1.ok).toBe(false);
    if (r1.ok) return;
    expect(r1.reason).toBe('missing-layerId');

    const r2 = validateLayerConfig({
      layerId: '',
      track: 'advisory',
      decide: true,
      enforceReview: true,
    });
    expect(r2.ok).toBe(false);
    if (r2.ok) return;
    expect(r2.reason).toBe('missing-layerId');
  });

  it('rejects providers that is not a string array', () => {
    const r1 = validateLayerConfig({
      layerId: 'L1',
      track: 'enforced',
      decide: true,
      enforceReview: true,
      providers: 'trust-set-guard', // string, not array
    });
    expect(r1.ok).toBe(false);
    if (r1.ok) return;
    expect(r1.reason).toBe('providers-without-decide');

    const r2 = validateLayerConfig({
      layerId: 'L1',
      track: 'enforced',
      decide: true,
      enforceReview: true,
      providers: ['valid', 42], // mixed types
    });
    expect(r2.ok).toBe(false);
    if (r2.ok) return;
    expect(r2.reason).toBe('providers-without-decide');
  });

  it('accepts decide=false with empty providers array', () => {
    const r = validateLayerConfig({
      layerId: 'L-observer',
      track: 'advisory',
      decide: false,
      enforceReview: true,
      providers: [],
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.config.providers).toEqual([]);
  });
});
