import { describe, it, expect } from 'vitest';
import { deriveKey } from '#harness/hmac-signer.ts';

describe('hmac seed derivation', () => {
  it('is deterministic across calls with the same seed + scenarioId', () => {
    const a = deriveKey('seed-A', 'scenario-X');
    const b = deriveKey('seed-A', 'scenario-X');
    expect(a.keyId).toBe(b.keyId);
    expect(Buffer.compare(a.key, b.key)).toBe(0);
  });

  it('differs across scenarios for the same seed', () => {
    const s1 = deriveKey('seed-A', 'scenario-X');
    const s2 = deriveKey('seed-A', 'scenario-Y');
    expect(s1.keyId).not.toBe(s2.keyId);
    expect(Buffer.compare(s1.key, s2.key)).not.toBe(0);
  });

  it('differs across seeds for the same scenario', () => {
    const a = deriveKey('seed-A', 'scenario-X');
    const b = deriveKey('seed-B', 'scenario-X');
    expect(a.keyId).not.toBe(b.keyId);
    expect(Buffer.compare(a.key, b.key)).not.toBe(0);
  });
});
