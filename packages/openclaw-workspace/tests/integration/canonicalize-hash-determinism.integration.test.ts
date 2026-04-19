import { describe, expect, it } from 'vitest';
import { canonicalize, canonicalHash } from '../../src/canonicalize/index.js';

describe('canonicalize -> hash determinism', () => {
  it('same input produces same bytes and same hash across 1000 invocations', () => {
    const input = { b: { y: 2, x: 1 }, a: [1, 2, 3], s: 'hello' };
    const reference = canonicalize(input);
    const refHash = canonicalHash(input);
    for (let i = 0; i < 1000; i++) {
      expect(canonicalize(input)).toBe(reference);
      expect(canonicalHash(input)).toBe(refHash);
    }
  });
});
