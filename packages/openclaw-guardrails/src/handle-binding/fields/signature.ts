import { createHmac, timingSafeEqual } from 'node:crypto';
import type { InvalidReason } from '../types.js';

export interface SignatureInput {
  readonly payload: Uint8Array;
  readonly signature: string;
  readonly trustSet: ReadonlySet<string>;
  readonly keyLookup: (keyId: string) => Buffer | undefined;
}

const SIG_SEP = '.';

/**
 * HMAC-SHA256 signature pre-check. Runs before any field evaluation and
 * short-circuits on failure — see CL-07 §1a.
 *
 * Signature format: `<keyId>.<hexMac>`. If the keyId embedded in the signature
 * is not in `trustSet` (or the lookup returns undefined), returns
 * `'unknown-keyId'`; every other malformation or MAC mismatch returns
 * `'signature-mismatch'` (never a generic 'bad-signature' — CL-11 §3a labels).
 */
export function checkSignature(input: SignatureInput): InvalidReason | null {
  const sep = input.signature.indexOf(SIG_SEP);
  if (sep <= 0 || sep === input.signature.length - 1) {
    return 'signature-mismatch';
  }
  const keyId = input.signature.slice(0, sep);
  const macHex = input.signature.slice(sep + 1);
  if (!input.trustSet.has(keyId)) {
    return 'unknown-keyId';
  }
  const trusted = input.keyLookup(keyId);
  if (trusted === undefined) {
    return 'unknown-keyId';
  }
  const expected = createHmac('sha256', trusted).update(input.payload).digest();
  const candidate = Buffer.from(macHex, 'hex');
  if (candidate.length !== expected.length) {
    return 'signature-mismatch';
  }
  return timingSafeEqual(candidate, expected) ? null : 'signature-mismatch';
}
