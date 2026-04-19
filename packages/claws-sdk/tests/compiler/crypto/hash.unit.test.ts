/**
 * SHA-256 hash unit tests.
 *
 * L0: SHA-256 matches known NIST test vector, supports Buffer input.
 */

import { describe, it, expect } from 'vitest';
import { sha256, sha256Stream } from '#src/compiler/crypto/hash.js';

describe('SHA-256', () => {
  it('matches NIST test vector for "abc"', () => {
    // NIST FIPS 180-4 test vector: SHA-256("abc")
    const expected = 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad';

    expect(sha256('abc')).toBe(expected);
  });

  it('hashes Buffer input identically to string input', () => {
    const str = 'hello world';
    const buf = Buffer.from(str, 'utf-8');

    expect(sha256(buf)).toBe(sha256(str));
  });
});

describe('sha256Stream', () => {
  it('produces the same digest as sha256 over the concatenation', () => {
    const parts = ['abc', 'def', 'ghi'];
    const streamed = sha256Stream(function* () {
      for (const p of parts) yield p;
    });

    expect(streamed).toBe(sha256(parts.join('')));
  });

  it('accepts Buffer chunks and mixed chunks interchangeably', () => {
    const viaStrings = sha256Stream(function* () {
      yield 'hello ';
      yield 'world';
    });
    const viaBuffers = sha256Stream(function* () {
      yield Buffer.from('hello ', 'utf-8');
      yield Buffer.from('world', 'utf-8');
    });
    const viaMixed = sha256Stream(function* () {
      yield 'hello ';
      yield Buffer.from('world', 'utf-8');
    });

    expect(viaStrings).toBe(sha256('hello world'));
    expect(viaBuffers).toBe(viaStrings);
    expect(viaMixed).toBe(viaStrings);
  });

  it('hashes the empty iterable to the SHA-256 of the empty string', () => {
    const emptyDigest = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';
    const streamed = sha256Stream(function* () {
      // yield nothing
    });

    expect(streamed).toBe(emptyDigest);
    expect(streamed).toBe(sha256(''));
  });
});
