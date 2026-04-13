/**
 * L0: ArtifactSigner — HMAC-SHA256 signing and verification.
 */

import { describe, it, expect } from 'vitest';
import { randomBytes } from 'node:crypto';
import {
  signAuditEntry,
  verifyAuditEntry,
  type AuditChainEntry,
} from '../../src/compliance/artifact-signer.js';

function baseEntry(): Omit<AuditChainEntry, 'hmacSignature' | 'keyId' | 'algorithm'> {
  return {
    seq: 0,
    timestamp: '2026-01-01T00:00:00Z',
    eventType: 'tool-call',
    actor: 'agent-1',
    target: 'Bash',
    action: 'invoke',
    outcome: 'deny',
    ruleId: 'SEC-001',
    severity: 4,
    policyVersion: '1.0.0',
  };
}

describe('signAuditEntry', () => {
  it('signs an entry with sha256 by default', () => {
    const key = randomBytes(32);
    const signed = signAuditEntry(baseEntry(), key, 'key-1');
    expect(signed.hmacSignature).toMatch(/^[0-9a-f]{64}$/);
    expect(signed.keyId).toBe('key-1');
    expect(signed.algorithm).toBe('sha256');
    expect(signed.seq).toBe(0);
    expect(signed.eventType).toBe('tool-call');
  });

  it('accepts hex string key', () => {
    const hexKey = randomBytes(32).toString('hex');
    const signed = signAuditEntry(baseEntry(), hexKey, 'key-hex');
    expect(signed.hmacSignature).toMatch(/^[0-9a-f]{64}$/);
  });

  it('uses sha384 when specified', () => {
    const key = randomBytes(32);
    const signed = signAuditEntry(baseEntry(), key, 'key-384', 'sha384');
    expect(signed.algorithm).toBe('sha384');
    expect(signed.hmacSignature).toMatch(/^[0-9a-f]{96}$/);
  });

  it('uses sha512 when specified', () => {
    const key = randomBytes(32);
    const signed = signAuditEntry(baseEntry(), key, 'key-512', 'sha512');
    expect(signed.algorithm).toBe('sha512');
    expect(signed.hmacSignature).toMatch(/^[0-9a-f]{128}$/);
  });

  it('produces deterministic signatures for same input', () => {
    const key = Buffer.from('deadbeef'.repeat(8), 'hex');
    const s1 = signAuditEntry(baseEntry(), key, 'k1');
    const s2 = signAuditEntry(baseEntry(), key, 'k1');
    expect(s1.hmacSignature).toBe(s2.hmacSignature);
  });

  it('produces different signatures for different keys', () => {
    const k1 = randomBytes(32);
    const k2 = randomBytes(32);
    const s1 = signAuditEntry(baseEntry(), k1, 'k1');
    const s2 = signAuditEntry(baseEntry(), k2, 'k2');
    expect(s1.hmacSignature).not.toBe(s2.hmacSignature);
  });
});

describe('verifyAuditEntry', () => {
  it('returns true for correctly signed entry', () => {
    const key = randomBytes(32);
    const signed = signAuditEntry(baseEntry(), key, 'key-1');
    expect(verifyAuditEntry(signed, key)).toBe(true);
  });

  it('returns false for tampered entry', () => {
    const key = randomBytes(32);
    const signed = signAuditEntry(baseEntry(), key, 'key-1');
    const tampered = { ...signed, action: 'allow' };
    expect(verifyAuditEntry(tampered, key)).toBe(false);
  });

  it('returns false for wrong key', () => {
    const k1 = randomBytes(32);
    const k2 = randomBytes(32);
    const signed = signAuditEntry(baseEntry(), k1, 'key-1');
    expect(verifyAuditEntry(signed, k2)).toBe(false);
  });

  it('returns false for truncated signature', () => {
    const key = randomBytes(32);
    const signed = signAuditEntry(baseEntry(), key, 'key-1');
    const truncated = { ...signed, hmacSignature: signed.hmacSignature.slice(0, 32) };
    expect(verifyAuditEntry(truncated, key)).toBe(false);
  });

  it('returns false for unknown algorithm', () => {
    const key = randomBytes(32);
    const signed = signAuditEntry(baseEntry(), key, 'key-1');
    const bad = { ...signed, algorithm: 'md5' as never };
    expect(verifyAuditEntry(bad, key)).toBe(false);
  });

  it('round-trips with hex string key', () => {
    const hexKey = randomBytes(32).toString('hex');
    const signed = signAuditEntry(baseEntry(), hexKey, 'hex-key');
    expect(verifyAuditEntry(signed, hexKey)).toBe(true);
  });

  it('verifies across sha384 algorithm', () => {
    const key = randomBytes(32);
    const signed = signAuditEntry(baseEntry(), key, 'k384', 'sha384');
    expect(verifyAuditEntry(signed, key)).toBe(true);
  });

  it('verifies across sha512 algorithm', () => {
    const key = randomBytes(32);
    const signed = signAuditEntry(baseEntry(), key, 'k512', 'sha512');
    expect(verifyAuditEntry(signed, key)).toBe(true);
  });
});
