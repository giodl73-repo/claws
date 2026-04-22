import { describe, it, expect, vi } from 'vitest';

// Force snap to return bytes that differ from policy + audit by one byte.
// This exercises the not-identical return path of
// canonicalizerByteIdentical — the path a CI run would hit on cross-OS
// drift. The live canonicalizer is byte-identical across the 3 consumers,
// so without this mock the path is unreachable.
vi.mock('@bic/openclaw-snap', async () => {
  const actual = await vi.importActual<typeof import('@bic/openclaw-snap')>(
    '@bic/openclaw-snap',
  );
  return {
    ...actual,
    canonicalize: (input: unknown): string => {
      const real = actual.canonicalize(input);
      // Flip one byte to simulate drift.
      return real.length > 0 ? 'X' + real.slice(1) : real;
    },
  };
});

const { canonicalizerByteIdentical } = await import('#harness/canonicalizer-check.ts');

describe('canonicalizerByteIdentical — not-identical return path', () => {
  it('returns identical:false + firstDiffOffset when surfaces diverge', async () => {
    const result = await canonicalizerByteIdentical({ tool: 't', args: {} });
    expect(result.identical).toBe(false);
    expect(result.firstDiffOffset).toBe(0);
    // All three byte arrays are still populated (forensic record for CI).
    expect(result.policy.byteLength).toBeGreaterThan(0);
    expect(result.snap.byteLength).toBeGreaterThan(0);
    expect(result.audit.byteLength).toBeGreaterThan(0);
    // The snap bytes are the one that was forged — first byte differs.
    expect(result.snap[0]).not.toBe(result.policy[0]);
    expect(result.audit[0]).toBe(result.policy[0]);
  });
});
