import { describe, it, expect } from 'vitest';
import { modifiedArgsHash } from '#harness/audit-chain.ts';

describe('modifiedArgsHash (DecisionEntry.modifiedArgsHash)', () => {
  it('hash reflects redaction: different args produce a different hash', () => {
    const original = { path: '/secret', contents: 'original-secret-data' };
    const redacted = { path: '/secret', contents: '[REDACTED]' };
    const h1 = modifiedArgsHash(original);
    const h2 = modifiedArgsHash(redacted);
    expect(h1).not.toBe(h2);
    expect(h1).toMatch(/^sha256:[0-9a-f]{64}$/);
    expect(h2).toMatch(/^sha256:[0-9a-f]{64}$/);
  });

  it('unchanged args produce an identity hash: same input → same output across calls and key order', () => {
    const args1 = { a: 1, b: 'two', c: [3, 4, 5] };
    // Key-shuffled logical equivalent — JCS sorts keys, so the hash should match.
    const args2 = { c: [3, 4, 5], b: 'two', a: 1 };
    const h1 = modifiedArgsHash(args1);
    const h2 = modifiedArgsHash(args2);
    expect(h1).toBe(h2);
    // Also repeat-calling the same input must be stable.
    expect(modifiedArgsHash(args1)).toBe(h1);
  });
});
