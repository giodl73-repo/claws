/**
 * @bic/openclaw-guardrails/approvals — HandleBinding round-trip helpers.
 *
 * Binds an approval decision to {providerId, contentHash, sequenceNumber,
 * approverPrincipal, keyId, ttlSeconds, nonce}. Canonical-JSON-serialize,
 * HMAC-SHA256-sign, base64url-encode. Parse back with timing-safe verify.
 *
 * TTL expiry fails closed unless the caller layers `escalate` policy on top.
 */

import { createHmac, timingSafeEqual } from 'node:crypto';
import { canonicalize } from '@bic/openclaw-workspace/canonicalize';

/** See HandleBinding in default export (/types.ts). Duplicated here for subpath independence. */
export interface HandleBinding {
  providerId: string;
  contentHash: string;
  sequenceNumber: number;
  approverPrincipal: string;
  keyId: string;
  ttlSeconds: number;
  nonce: string;
}

/** Binding + issuance metadata — what actually gets signed. */
export interface SignedBinding {
  binding: HandleBinding;
  issuedAt: number; // Unix seconds
}

/** Parsed handle: binding + signature, re-verifiable. */
export interface ParsedHandle {
  payload: SignedBinding;
  signature: string;
}

function b64urlEncode(input: string): string {
  return Buffer.from(input, 'utf-8')
    .toString('base64')
    .replace(/=+$/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function b64urlDecode(input: string): string {
  const padded = input.replace(/-/g, '+').replace(/_/g, '/');
  const pad = padded.length % 4 === 0 ? '' : '='.repeat(4 - (padded.length % 4));
  return Buffer.from(padded + pad, 'base64').toString('utf-8');
}

/**
 * Sign a HandleBinding. `now` injectable for deterministic tests.
 */
export function signHandle(
  binding: HandleBinding,
  hmacKey: Buffer,
  now?: Date,
): string {
  const issuedAt = Math.floor((now ?? new Date()).getTime() / 1000);
  const payload: SignedBinding = { binding, issuedAt };
  const serialized = canonicalize(payload);
  const sig = createHmac('sha256', hmacKey).update(serialized).digest('hex');
  const encoded = b64urlEncode(serialized);
  return `${encoded}.${sig}`;
}

/**
 * Parse a signed handle back into its binding + metadata. Does NOT verify.
 * Use `verifyHandle` for end-to-end verification.
 */
export function parseHandle(handle: string): ParsedHandle {
  const idx = handle.lastIndexOf('.');
  if (idx < 1) {
    throw new Error('Malformed handle: missing signature separator');
  }
  const encoded = handle.slice(0, idx);
  const signature = handle.slice(idx + 1);
  const serialized = b64urlDecode(encoded);
  const payload = JSON.parse(serialized) as SignedBinding;
  return { payload, signature };
}

export type VerifyResult =
  | { valid: true; binding: HandleBinding; issuedAt: number }
  | { valid: false; reason: 'bad_signature' | 'expired' | 'malformed' };

/**
 * Verify a signed handle:
 *   1. Re-serialize canonical payload and HMAC it → timing-safe compare.
 *   2. Check TTL: issuedAt + binding.ttlSeconds must be in the future.
 */
export function verifyHandle(
  handle: string,
  hmacKey: Buffer,
  now?: Date,
): VerifyResult {
  let parsed: ParsedHandle;
  try {
    parsed = parseHandle(handle);
  } catch {
    return { valid: false, reason: 'malformed' };
  }
  const serialized = canonicalize(parsed.payload);
  const expected = createHmac('sha256', hmacKey).update(serialized).digest('hex');
  if (
    expected.length !== parsed.signature.length ||
    !timingSafeEqual(Buffer.from(expected), Buffer.from(parsed.signature))
  ) {
    return { valid: false, reason: 'bad_signature' };
  }
  const nowSec = Math.floor((now ?? new Date()).getTime() / 1000);
  const expiresAt = parsed.payload.issuedAt + parsed.payload.binding.ttlSeconds;
  if (nowSec > expiresAt) {
    return { valid: false, reason: 'expired' };
  }
  return {
    valid: true,
    binding: parsed.payload.binding,
    issuedAt: parsed.payload.issuedAt,
  };
}
