import { describe, expect, it } from 'vitest';
import {
  canonicalize,
  canonicalHash,
  safeParse,
  CANONICALIZER_VERSION,
  CanonicalizeError,
  CanonicalizeErrorCode,
} from '../../src/canonicalize/index.js';

// 25 L0 tests — RFC 8785 + extended rules C-1 through C-15.

describe('canonicalize — RFC 8785 + extended rules', () => {
  // C-1: NFC
  it('V1: NFC pre-composed é passes through unchanged', () => {
    expect(canonicalize({ name: 'caf\u00e9' })).toBe('{"name":"café"}');
  });

  it('V2: NFD decomposed é normalizes to NFC (same as V1)', () => {
    expect(canonicalize({ name: 'cafe\u0301' })).toBe('{"name":"café"}');
  });

  it('V3: duplicate keys after NFC throw E_DUPLICATE_KEY_AFTER_NFC', () => {
    expect(() => canonicalize({ '\u00e9': 1, 'e\u0301': 2 })).toThrow(CanonicalizeError);
    try {
      canonicalize({ '\u00e9': 1, 'e\u0301': 2 });
    } catch (err) {
      expect((err as CanonicalizeError).code).toBe(CanonicalizeErrorCode.DUPLICATE_KEY_AFTER_NFC);
    }
  });

  it('V25: NFKC-collapsible keys throw E_NFKC_COLLAPSIBLE', () => {
    expect(() => canonicalize({ '\uFB01le': 1 })).toThrow(CanonicalizeError);
    try {
      canonicalize({ '\uFB01le': 1 });
    } catch (err) {
      expect((err as CanonicalizeError).code).toBe(CanonicalizeErrorCode.NFKC_COLLAPSIBLE);
    }
  });

  // C-2: UTF-16 code unit sort
  it('V4: keys sort by UTF-16 code unit (a < ä < あ)', () => {
    const out = canonicalize({ 'あ': 1, 'a': 2, 'ä': 3 });
    expect(out).toBe('{"a":2,"ä":3,"あ":1}');
  });

  // C-3: no BOM, no trailing newline
  it('V19: output has no BOM, no trailing newline', () => {
    const out = canonicalize({ a: 1 });
    expect(out).toBe('{"a":1}');
    expect(out.length).toBe(7);
  });

  // C-4: non-finite numbers throw
  it('V7: NaN throws E_NON_FINITE', () => {
    try {
      canonicalize({ n: NaN });
      expect.fail('should have thrown');
    } catch (err) {
      expect((err as CanonicalizeError).code).toBe(CanonicalizeErrorCode.NON_FINITE);
    }
  });

  it('V8: Infinity throws E_NON_FINITE', () => {
    expect(() => canonicalize({ n: Infinity })).toThrow(CanonicalizeError);
  });

  it('V9: -Infinity throws E_NON_FINITE', () => {
    expect(() => canonicalize({ n: -Infinity })).toThrow(CanonicalizeError);
  });

  // C-5: integer serialization
  it('V5: integer in safe range serializes without decimal', () => {
    expect(canonicalize({ n: 42 })).toBe('{"n":42}');
  });

  it('V6: negative zero serializes as 0', () => {
    expect(canonicalize({ n: -0 })).toBe('{"n":0}');
  });

  // C-6: non-integer doubles
  it('V10: float uses shortest round-trip form', () => {
    expect(canonicalize({ n: 0.1 + 0.2 })).toBe('{"n":0.30000000000000004}');
  });

  it('V11: large magnitude uses e+NN exponent', () => {
    const out = canonicalize({ n: 1e21 });
    expect(out).toMatch(/"n":1e\+21/);
  });

  // C-7: subnormals
  it('V12: subnormal double round-trips without flush-to-zero', () => {
    expect(canonicalize({ n: 5e-324 })).toBe('{"n":5e-324}');
  });

  // C-8: array order preserved
  it('V13: array element order is preserved', () => {
    expect(canonicalize({ a: [3, 1, 2] })).toBe('{"a":[3,1,2]}');
  });

  // C-9: empty object / array
  it('V14: empty object emits {}', () => {
    expect(canonicalize({ o: {} })).toBe('{"o":{}}');
  });

  it('V15: empty array emits []', () => {
    expect(canonicalize({ a: [] })).toBe('{"a":[]}');
  });

  it('V16: nested objects sort at every level', () => {
    expect(canonicalize({ b: { y: 1, x: 2 }, a: { z: 3 } }))
      .toBe('{"a":{"z":3},"b":{"x":2,"y":1}}');
  });

  // C-10: depth limit
  it('V17: depth at limit (100) succeeds', () => {
    let n: unknown = 1;
    for (let i = 0; i < 99; i++) n = { n };
    expect(canonicalize(n)).toContain('"n":1');
  });

  it('V18: depth exceeding limit throws E_DEPTH', () => {
    let n: unknown = 1;
    for (let i = 0; i < 120; i++) n = { n };
    try {
      canonicalize(n);
      expect.fail('should have thrown');
    } catch (err) {
      expect((err as CanonicalizeError).code).toBe(CanonicalizeErrorCode.DEPTH);
    }
  });

  // C-11: undefined handling
  it('V20: undefined in array throws E_UNDEFINED_IN_ARRAY', () => {
    try {
      canonicalize({ a: [1, undefined, 2] });
      expect.fail('should have thrown');
    } catch (err) {
      expect((err as CanonicalizeError).code).toBe(CanonicalizeErrorCode.UNDEFINED_IN_ARRAY);
    }
  });

  it('C-11: undefined value in object drops the key', () => {
    expect(canonicalize({ a: 1, b: undefined, c: 2 })).toBe('{"a":1,"c":2}');
  });

  // C-12: BigInt, Symbol, Function throw
  it('V21: BigInt throws E_BIGINT', () => {
    try {
      canonicalize({ n: 42n });
      expect.fail('should have thrown');
    } catch (err) {
      expect((err as CanonicalizeError).code).toBe(CanonicalizeErrorCode.BIGINT);
    }
  });

  // C-13: Date throws
  it('V23: Date throws E_NON_PLAIN_OBJECT', () => {
    try {
      canonicalize({ t: new Date(0) });
      expect.fail('should have thrown');
    } catch (err) {
      expect((err as CanonicalizeError).code).toBe(CanonicalizeErrorCode.NON_PLAIN_OBJECT);
    }
  });

  // C-15: safeParse tokenizer-boundary depth
  it('V28: safeParse rejects overly-nested JSON before canonicalize runs', () => {
    const deep = '['.repeat(500) + '1' + ']'.repeat(500);
    expect(() => safeParse(deep, { maxDepth: 100 })).toThrow(CanonicalizeError);
  });

  it('safeParse accepts input within depth limit', () => {
    const ok = '{"a":{"b":1}}';
    expect(safeParse(ok, { maxDepth: 100 })).toEqual({ a: { b: 1 } });
  });

  // canonicalHash format
  it('canonicalHash output has sha256- prefix and base64url digest', () => {
    const h = canonicalHash({});
    expect(h).toMatch(/^sha256-[A-Za-z0-9_-]+$/);
  });

  it('CANONICALIZER_VERSION is a semver string', () => {
    expect(CANONICALIZER_VERSION).toMatch(/^\d+\.\d+\.\d+/);
  });
});
