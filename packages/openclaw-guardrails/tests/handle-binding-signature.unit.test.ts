import { describe, expect, it } from 'vitest';
import { createHmac, randomBytes } from 'node:crypto';
import { checkSignature } from '../src/handle-binding/fields/signature.js';

/**
 * Direct unit tests for the signature pre-check — the orchestrator tests
 * exercise the happy path and the malformed-signature short-circuit, but the
 * branch table (missing separator, empty keyId, keyId in trustSet without a
 * lookup hit, odd-length hex) is easier to cover in isolation.
 */
describe('checkSignature — branch coverage', () => {
  const key = randomBytes(32);
  const keyId = 'k_trusted';
  const trustSet = new Set([keyId]);
  const keyLookup = (kid: string): Buffer | undefined =>
    kid === keyId ? key : undefined;
  const payload = new TextEncoder().encode('payload');
  const mac = createHmac('sha256', key).update(payload).digest('hex');
  const goodSignature = `${keyId}.${mac}`;

  it('accepts a correct HMAC', () => {
    expect(
      checkSignature({ payload, signature: goodSignature, trustSet, keyLookup }),
    ).toBeNull();
  });

  it('rejects signature missing separator', () => {
    expect(
      checkSignature({ payload, signature: 'no-separator', trustSet, keyLookup }),
    ).toBe('signature-mismatch');
  });

  it('rejects signature with leading separator (empty keyId)', () => {
    expect(
      checkSignature({ payload, signature: '.deadbeef', trustSet, keyLookup }),
    ).toBe('signature-mismatch');
  });

  it('rejects signature with trailing separator (empty mac)', () => {
    expect(
      checkSignature({ payload, signature: `${keyId}.`, trustSet, keyLookup }),
    ).toBe('signature-mismatch');
  });

  it('rejects keyId not in trust set', () => {
    expect(
      checkSignature({
        payload,
        signature: `k_other.${mac}`,
        trustSet,
        keyLookup,
      }),
    ).toBe('unknown-keyId');
  });

  it('rejects keyId in trust set but missing from registry lookup', () => {
    const stretchedTrustSet = new Set([keyId, 'k_dangling']);
    expect(
      checkSignature({
        payload,
        signature: `k_dangling.${mac}`,
        trustSet: stretchedTrustSet,
        keyLookup,
      }),
    ).toBe('unknown-keyId');
  });

  it('rejects signature whose mac length differs from expected', () => {
    expect(
      checkSignature({
        payload,
        signature: `${keyId}.abcd`,
        trustSet,
        keyLookup,
      }),
    ).toBe('signature-mismatch');
  });

  it('rejects signature with wrong (but length-matched) mac', () => {
    const wrongMac = createHmac('sha256', randomBytes(32)).update(payload).digest('hex');
    expect(
      checkSignature({
        payload,
        signature: `${keyId}.${wrongMac}`,
        trustSet,
        keyLookup,
      }),
    ).toBe('signature-mismatch');
  });
});
