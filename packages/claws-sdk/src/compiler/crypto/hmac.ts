/**
 * HMAC-SHA256 message authentication using Node.js `crypto`.
 *
 * Used for content integrity verification in the free tier.
 *
 * @module claws-sdk/compiler/crypto/hmac
 */

import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Compute an HMAC-SHA256 signature.
 *
 * @param data - Data to sign (UTF-8 string)
 * @param secret - Hex-encoded secret key
 * @returns Hex-encoded HMAC signature
 */
export function hmacSign(data: string, secret: string): string {
  return createHmac('sha256', Buffer.from(secret, 'hex'))
    .update(data, 'utf-8')
    .digest('hex');
}

/**
 * Verify an HMAC-SHA256 signature using constant-time comparison.
 *
 * @param data - Original data (UTF-8 string)
 * @param signature - Hex-encoded HMAC signature to verify
 * @param secret - Hex-encoded secret key
 * @returns `true` if the signature is valid, `false` otherwise
 */
export function hmacVerify(data: string, signature: string, secret: string): boolean {
  const expected = hmacSign(data, secret);
  const expectedBuf = Buffer.from(expected, 'hex');
  const signatureBuf = Buffer.from(signature, 'hex');

  if (expectedBuf.length !== signatureBuf.length) {
    return false;
  }

  return timingSafeEqual(expectedBuf, signatureBuf);
}
