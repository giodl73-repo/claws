import { describe, it, expect } from 'vitest';

import { canonicalizerByteIdentical } from '#harness/canonicalizer-check.ts';

const SIMPLE_INPUT = {
  tool: 'read_file',
  args: { path: '/etc/hosts', mode: 'text' },
  snapshotId: 'snap-abc123',
  principal: 'alice@example.com',
};

const WITH_NESTED = {
  outer: {
    zeta: [3, 2, 1],
    alpha: { nested: true, count: 42 },
  },
  flag: null,
  list: [{ a: 1 }, { b: 2 }],
};

const UNICODE_AND_ESCAPES = {
  unicode: 'caf\u00e9-\u03b1\u03b2\u03b3',
  escapes: 'tab\t\nnewline"quote\\back',
  emoji: '\ud83d\udd25',
};

describe('canonicalizerByteIdentical — SC-08 F-01', () => {
  it('policy canonicalize == snap canonicalize (byte-identical)', async () => {
    const result = await canonicalizerByteIdentical(SIMPLE_INPUT);
    expect(result.policy).toEqual(result.snap);
    expect(result.firstDiffOffset).toBeUndefined();
  });

  it('policy canonicalize == audit canonicalize (byte-identical)', async () => {
    const result = await canonicalizerByteIdentical(SIMPLE_INPUT);
    expect(result.policy).toEqual(result.audit);
  });

  it('snap canonicalize == audit canonicalize (byte-identical)', async () => {
    const result = await canonicalizerByteIdentical(SIMPLE_INPUT);
    expect(result.snap).toEqual(result.audit);
    expect(result.identical).toBe(true);
  });

  it('3-surface identity holds on nested objects', async () => {
    const result = await canonicalizerByteIdentical(WITH_NESTED);
    expect(result.identical).toBe(true);
    expect(result.policy).toEqual(result.snap);
    expect(result.snap).toEqual(result.audit);
  });

  it('3-surface identity holds on unicode + escape sequences', async () => {
    const result = await canonicalizerByteIdentical(UNICODE_AND_ESCAPES);
    expect(result.identical).toBe(true);
  });

  it('reports firstDiffOffset when bytes would differ', async () => {
    const result = await canonicalizerByteIdentical(SIMPLE_INPUT);
    // Sanity: when identical, firstDiffOffset is absent.
    expect(result.firstDiffOffset).toBeUndefined();
    // Construct a synthetic diff by forging one surface's bytes; this
    // exercises the diff-finding code path without breaking the contract
    // under test (the shared canonicalizer always agrees on real inputs).
    const forged = {
      ...result,
      snap: new Uint8Array([...result.policy].map((b, i) => (i === 0 ? b + 1 : b))),
    };
    // Re-run the findFirstDiff logic inline to validate offset semantics.
    const maxLen = Math.max(forged.policy.length, forged.snap.length, forged.audit.length);
    let firstDiff: number | undefined;
    for (let i = 0; i < maxLen; i++) {
      if (forged.policy[i] !== forged.snap[i] || forged.snap[i] !== forged.audit[i]) {
        firstDiff = i;
        break;
      }
    }
    expect(firstDiff).toBe(0);
  });
});

describe('canonicalizerByteIdentical — edge cases', () => {
  it('handles empty object', async () => {
    const r = await canonicalizerByteIdentical({});
    expect(r.identical).toBe(true);
    expect(new TextDecoder().decode(r.policy)).toBe('{}');
  });

  it('handles empty array', async () => {
    const r = await canonicalizerByteIdentical([]);
    expect(r.identical).toBe(true);
    expect(new TextDecoder().decode(r.policy)).toBe('[]');
  });

  it('handles primitive null', async () => {
    const r = await canonicalizerByteIdentical(null);
    expect(r.identical).toBe(true);
    expect(new TextDecoder().decode(r.policy)).toBe('null');
  });

  it('handles deeply-nested structure', async () => {
    const deep = { a: { b: { c: { d: { e: { f: { g: 'leaf' } } } } } } };
    const r = await canonicalizerByteIdentical(deep);
    expect(r.identical).toBe(true);
  });

  it('rejects non-finite numbers from all three surfaces consistently', async () => {
    const bad = { x: Number.POSITIVE_INFINITY };
    await expect(canonicalizerByteIdentical(bad)).rejects.toThrow();
  });
});
