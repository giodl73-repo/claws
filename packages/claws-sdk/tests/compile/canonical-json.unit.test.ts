/**
 * L0: canonicalJson — RFC 8785 JCS serialization primitive.
 *
 * Internalized from agent-sdk in Pulse 13. Covers every branch of the
 * recursive serializer so the package-local copy has full coverage
 * independent of audit-chain callers.
 */

import { describe, it, expect } from 'vitest';
import { canonicalJson } from '#src/util/canonical-json.js';

describe('canonicalJson', () => {
  it('serializes null and undefined via JSON.stringify', () => {
    expect(canonicalJson(null)).toBe('null');
    expect(canonicalJson(undefined)).toBe(undefined as unknown as string);
    // ^ JSON.stringify(undefined) returns undefined; the union surface is
    // fine because callers never pass a bare top-level undefined.
  });

  it('serializes primitives identically to JSON.stringify', () => {
    expect(canonicalJson(42)).toBe('42');
    expect(canonicalJson(-0.5)).toBe('-0.5');
    expect(canonicalJson('a"b')).toBe('"a\\"b"');
    expect(canonicalJson(true)).toBe('true');
    expect(canonicalJson(false)).toBe('false');
  });

  it('sorts object keys lexicographically', () => {
    expect(canonicalJson({ b: 2, a: 1, c: 3 })).toBe('{"a":1,"b":2,"c":3}');
  });

  it('drops keys whose value is undefined', () => {
    const shape = { a: 1, b: undefined, c: 3 } as const;
    expect(canonicalJson(shape)).toBe('{"a":1,"c":3}');
  });

  it('preserves array order and recurses', () => {
    expect(canonicalJson([3, 1, 2])).toBe('[3,1,2]');
    expect(canonicalJson([{ b: 2, a: 1 }, [true, null]])).toBe(
      '[{"a":1,"b":2},[true,null]]',
    );
  });

  it('recurses through nested objects deterministically', () => {
    const left = { outer: { y: 2, x: 1 } };
    const right = { outer: { x: 1, y: 2 } };
    expect(canonicalJson(left)).toBe(canonicalJson(right));
    expect(canonicalJson(left)).toBe('{"outer":{"x":1,"y":2}}');
  });

  it('keeps explicit null values in objects (not dropped like undefined)', () => {
    expect(canonicalJson({ a: null, b: 1 })).toBe('{"a":null,"b":1}');
  });
});
