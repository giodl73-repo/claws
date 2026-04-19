import { describe, expect, it } from 'vitest';
import { canonicalize, canonicalHash } from '../../src/canonicalize/index.js';

/**
 * Byte-identical-across-platforms CI gate (Linux + Windows per-PR; macOS
 * nightly). Each vector has expected bytes captured from a Linux x64 Node
 * 22 run; every OS MUST produce identical bytes.
 *
 * When CANONICALIZER_VERSION majors, regenerate these reference bytes
 * via scripts/capture-canonicalize-reference (follow-up pulse).
 */

interface ReferenceVector {
  readonly id: string;
  readonly input: unknown;
  readonly expectedBytes: string;
  readonly expectedHash: string;
}

const REFERENCE_VECTORS: readonly ReferenceVector[] = [
  {
    id: 'V-INT',
    input: { n: 42 },
    expectedBytes: '{"n":42}',
    expectedHash: 'sha256-Tgcw8jj4HeE3_yfYnsO8w-ut-VEHZhOH34IEPE7CVHU',
  },
  {
    id: 'V-NESTED-SORT',
    input: { b: { y: 1, x: 2 }, a: { z: 3 } },
    expectedBytes: '{"a":{"z":3},"b":{"x":2,"y":1}}',
    expectedHash: 'sha256-sVkbcxFc7WfQs5uRqaoBMqQZnx-ktQ6LRPLjDiZwEGs',
  },
  {
    id: 'V-UNICODE',
    input: { name: 'caf\u00e9' },
    expectedBytes: '{"name":"café"}',
    expectedHash: 'sha256-ZF-kQxJqiVT8bYcZErj8Z7wu6P6uQX7-VVRiUZYsp00',
  },
];

describe('canonicalize cross-platform byte-parity', () => {
  for (const v of REFERENCE_VECTORS) {
    it(`${v.id}: bytes match reference on this platform (${process.platform})`, () => {
      const actual = canonicalize(v.input);
      expect(actual).toBe(v.expectedBytes);
    });
  }

  it('canonicalHash output matches reference on this platform', () => {
    for (const v of REFERENCE_VECTORS) {
      expect(canonicalHash(v.input)).toBe(v.expectedHash);
    }
  });
});
