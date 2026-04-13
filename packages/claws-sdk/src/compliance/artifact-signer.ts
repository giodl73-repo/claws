/**
 * ArtifactSigner — HMAC-SHA256 signing for audit chain entries.
 *
 * Every audit event is integrity-protected from day one. The signer
 * produces hex-encoded HMAC signatures and verifies them using
 * constant-time comparison.
 *
 * @module claws-sdk/compliance/artifact-signer
 */

import { createHmac, timingSafeEqual } from 'node:crypto';
import type { AuditAlgorithm } from '../ir/audit-event.js';

/**
 * Audit chain entry — a signed audit event in the append-only chain.
 */
export interface AuditChainEntry {
  /** Sequential index in the chain (0-based). */
  readonly seq: number;
  /** ISO 8601 timestamp of the event. */
  readonly timestamp: string;
  /** Category of the event. */
  readonly eventType: string;
  /** Who triggered the event. */
  readonly actor: string;
  /** What the event applies to. */
  readonly target: string;
  /** The action taken. */
  readonly action: string;
  /** Result of the action. */
  readonly outcome: string;
  /** Rule that triggered this event. */
  readonly ruleId: string;
  /** Severity level (1-5). */
  readonly severity: number;
  /** Policy version at the time of the event. */
  readonly policyVersion: string;
  /** HMAC signature (hex-encoded). */
  readonly hmacSignature: string;
  /** Key ID used for signing (allows key rotation). */
  readonly keyId: string;
  /** Algorithm used for HMAC signing. */
  readonly algorithm: AuditAlgorithm;
}

/**
 * Map from AuditAlgorithm to the Node.js crypto algorithm name.
 */
const ALGORITHM_MAP: Record<AuditAlgorithm, string> = {
  sha256: 'sha256',
  sha384: 'sha384',
  sha512: 'sha512',
};

/**
 * Length-prefix a field value to eliminate delimiter confusion.
 * Format: `${byteLength}:${value}` — unambiguous even if value contains
 * NUL bytes, colons, or any other character.
 */
function lengthPrefix(value: string): string {
  const byteLength = Buffer.byteLength(value, 'utf8');
  return `${byteLength}:${value}`;
}

/**
 * Extract the signable payload from an audit chain entry.
 * Produces a deterministic string by length-prefixing each field and
 * concatenating in fixed order. Length-prefixed encoding prevents
 * delimiter confusion attacks (e.g. NUL byte injection).
 *
 * The hmacSignature, keyId, and algorithm fields are excluded from the payload
 * since they are metadata about the signature itself.
 */
function signablePayload(entry: Omit<AuditChainEntry, 'hmacSignature' | 'keyId' | 'algorithm'>): string {
  return [
    lengthPrefix(entry.seq.toString()),
    lengthPrefix(entry.timestamp),
    lengthPrefix(entry.eventType),
    lengthPrefix(entry.actor),
    lengthPrefix(entry.target),
    lengthPrefix(entry.action),
    lengthPrefix(entry.outcome),
    lengthPrefix(entry.ruleId),
    lengthPrefix(entry.severity.toString()),
    lengthPrefix(entry.policyVersion),
  ].join('');
}

/**
 * Sign an audit chain entry with HMAC.
 *
 * @param entry - The entry fields (without signature metadata).
 * @param key - The HMAC secret key (raw bytes as Buffer or hex string).
 * @param keyId - Identifier for the key (supports key rotation).
 * @param algorithm - HMAC algorithm to use (default: sha256).
 * @returns A complete AuditChainEntry with hmacSignature, keyId, and algorithm.
 */
export function signAuditEntry(
  entry: Omit<AuditChainEntry, 'hmacSignature' | 'keyId' | 'algorithm'>,
  key: Buffer | string,
  keyId: string,
  algorithm: AuditAlgorithm = 'sha256',
): AuditChainEntry {
  const payload = signablePayload(entry);
  const keyBuf = typeof key === 'string' ? Buffer.from(key, 'hex') : key;
  const hmac = createHmac(ALGORITHM_MAP[algorithm], keyBuf);
  hmac.update(payload, 'utf8');
  const hmacSignature = hmac.digest('hex');

  return {
    ...entry,
    hmacSignature,
    keyId,
    algorithm,
  };
}

/**
 * Verify an audit chain entry's HMAC signature.
 * Uses constant-time comparison to prevent timing attacks.
 *
 * @param entry - The complete signed audit chain entry.
 * @param key - The HMAC secret key (raw bytes as Buffer or hex string).
 * @returns true if the signature is valid, false if tampered.
 */
export function verifyAuditEntry(
  entry: AuditChainEntry,
  key: Buffer | string,
): boolean {
  const algorithm = ALGORITHM_MAP[entry.algorithm];
  if (!algorithm) {
    return false;
  }

  let expected: string;
  try {
    const payload = signablePayload(entry);
    const keyBuf = typeof key === 'string' ? Buffer.from(key, 'hex') : key;
    const hmac = createHmac(algorithm, keyBuf);
    hmac.update(payload, 'utf8');
    expected = hmac.digest('hex');
  } catch {
    return false;
  }

  const sigBuf = Buffer.from(entry.hmacSignature, 'hex');
  const expBuf = Buffer.from(expected, 'hex');

  if (sigBuf.length !== expBuf.length) {
    return false;
  }

  return timingSafeEqual(sigBuf, expBuf);
}
