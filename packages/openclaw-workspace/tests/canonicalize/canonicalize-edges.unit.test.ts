import { describe, expect, it } from 'vitest';
import {
  canonicalize,
  safeParse,
  CanonicalizeError,
  CanonicalizeErrorCode,
} from '../../src/canonicalize/index.js';

describe('canonicalize — edge cases', () => {
  it('null value serializes', () => {
    expect(canonicalize({ n: null })).toBe('{"n":null}');
  });

  it('boolean true/false serialize', () => {
    expect(canonicalize({ t: true, f: false })).toBe('{"f":false,"t":true}');
  });

  it('top-level string', () => {
    expect(canonicalize('hi')).toBe('"hi"');
  });

  it('top-level integer', () => {
    expect(canonicalize(123)).toBe('123');
  });

  it('top-level null', () => {
    expect(canonicalize(null)).toBe('null');
  });

  it('top-level boolean', () => {
    expect(canonicalize(true)).toBe('true');
  });

  it('top-level array', () => {
    expect(canonicalize([1, 2, 3])).toBe('[1,2,3]');
  });

  it('string escape sequences', () => {
    expect(canonicalize({ s: 'a"b\\c\nd\te' })).toBe('{"s":"a\\"b\\\\c\\nd\\te"}');
  });

  it('control char escapes with \\u', () => {
    expect(canonicalize({ s: '\u0001' })).toBe('{"s":"\\u0001"}');
  });

  it('backspace / form feed / carriage return escapes', () => {
    expect(canonicalize({ s: '\b\f\r' })).toBe('{"s":"\\b\\f\\r"}');
  });

  it('function throws E_NON_PLAIN_OBJECT', () => {
    try {
      canonicalize({ f: () => 1 });
      expect.fail('should have thrown');
    } catch (err) {
      expect((err as CanonicalizeError).code).toBe(CanonicalizeErrorCode.NON_PLAIN_OBJECT);
    }
  });

  it('Map throws E_NON_PLAIN_OBJECT', () => {
    try {
      canonicalize({ m: new Map() });
      expect.fail('should have thrown');
    } catch (err) {
      expect((err as CanonicalizeError).code).toBe(CanonicalizeErrorCode.NON_PLAIN_OBJECT);
    }
  });

  it('top-level undefined throws', () => {
    try {
      canonicalize(undefined);
      expect.fail('should have thrown');
    } catch (err) {
      expect((err as CanonicalizeError).code).toBe(CanonicalizeErrorCode.UNDEFINED_IN_ARRAY);
    }
  });

  it('sort: empty string key sorts before non-empty', () => {
    expect(canonicalize({ b: 1, '': 2 })).toBe('{"":2,"b":1}');
  });

  it('sort: same-prefix keys sort by length', () => {
    expect(canonicalize({ ab: 1, a: 2 })).toBe('{"a":2,"ab":1}');
  });

  it('negative integer serializes with minus sign', () => {
    expect(canonicalize({ n: -42 })).toBe('{"n":-42}');
  });

  it('nested array of objects', () => {
    expect(canonicalize([{ a: 1 }, { b: 2 }])).toBe('[{"a":1},{"b":2}]');
  });
});

describe('safeParse — edge cases', () => {
  it('parses Uint8Array input', () => {
    const bytes = new TextEncoder().encode('{"a":1}');
    expect(safeParse(bytes, { maxDepth: 100 })).toEqual({ a: 1 });
  });

  it('handles strings containing brackets inside quotes', () => {
    const json = '{"s":"[[[["}';
    expect(safeParse(json, { maxDepth: 100 })).toEqual({ s: '[[[[' });
  });

  it('handles escaped quotes inside strings', () => {
    const json = '{"s":"\\"inner\\""}';
    expect(safeParse(json, { maxDepth: 100 })).toEqual({ s: '"inner"' });
  });

  it('respects maxDepth=1', () => {
    try {
      safeParse('[[1]]', { maxDepth: 1 });
      expect.fail('should have thrown');
    } catch (err) {
      expect((err as CanonicalizeError).code).toBe(CanonicalizeErrorCode.DEPTH);
    }
  });
});
