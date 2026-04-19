/**
 * HMAC-SHA256 unit tests.
 *
 * L0: sign produces hex output, verify round-trip, wrong secret fails,
 * mismatched-length signature fails.
 */

import { describe, it, expect } from 'vitest';
import { hmacSign, hmacVerify } from '#src/compiler/crypto/hmac.js';
import { randomBytes } from 'node:crypto';

describe('HMAC-SHA256', () => {
  const secret = randomBytes(32).toString('hex');

  it('sign returns a 64-char hex string', () => {
    const sig = hmacSign('test data', secret);

    expect(sig).toHaveLength(64);
    expect(sig).toMatch(/^[0-9a-f]{64}$/);
  });

  it('verify round-trip succeeds', () => {
    const data = 'governance audit entry';
    const sig = hmacSign(data, secret);

    expect(hmacVerify(data, sig, secret)).toBe(true);
  });

  it('verify fails with wrong secret', () => {
    const data = 'signed content';
    const secret2 = randomBytes(32).toString('hex');
    const sig = hmacSign(data, secret);

    expect(hmacVerify(data, sig, secret2)).toBe(false);
  });

  it('verify fails with mismatched-length signature', () => {
    const data = 'test';
    // Truncated signature — length mismatch triggers the early return
    expect(hmacVerify(data, 'ab', secret)).toBe(false);
  });
});
