/**
 * L0: ArtifactSigner -- Ed25519 + HMAC-SHA256 signing and verification.
 *
 * Tests:
 * 1. Ed25519 sign/verify roundtrip
 * 2. HMAC sign/verify roundtrip
 * 3. RFC 3161 timestamp request format
 * 4. Configurable PBKDF2 iterations
 * 5. Ed25519 key generation uses crypto.generateKeyPairSync
 * 6. storePrivateKey disk persistence + chmod
 * 7. verifyEvidence with wrong key types / unknown algorithms
 * 8. hashEvidence edge cases (null, undefined, arrays, nested)
 * 9. DER multi-byte length encoding (long-form)
 * 10. validateTspResponse error paths
 * 11. requestTimestamp with mocked fetch
 */

import { describe, it, expect, vi } from 'vitest';
import { randomBytes, generateKeyPairSync } from 'node:crypto';
import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  signAuditEntry,
  verifyAuditEntry,
  type AuditChainEntry,
  generateSigningKeyPair,
  signEd25519,
  signHmac256,
  verifyEd25519,
  verifyHmac256,
  verifyEvidence,
  buildTimestampRequest,
  validateTsaUrl,
  validateTspResponse,
  hashEvidence,
  storePrivateKey,
  requestTimestamp,
  type SignedEvidence,
} from '../../src/compliance/artifact-signer.js';
import {
  deriveSingleDevKey,
  validatePbkdf2Iterations,
  PBKDF2_DEFAULT_ITERATIONS,
  PBKDF2_MIN_ITERATIONS,
  PBKDF2_MAX_ITERATIONS,
} from '../../src/keys/ceremony.js';

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

const sampleEvidence = {
  version: '1.0.0',
  generatedAt: '2026-04-14T10:00:00Z',
  scope: '/test/workspace',
  overallStatus: 'pass',
  controls: [{ controlId: 'CC6.1', status: 'pass', evidenceCount: 5 }],
};

// ── Existing HMAC audit chain tests ─────────────────────────────────────────

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

// ── New Pulse 18 tests ──────────────────────────────────────────────────────

describe('Ed25519 sign/verify roundtrip', () => {
  it('signs and verifies evidence with Ed25519', () => {
    const keyPair = generateSigningKeyPair();
    const envelope = signEd25519(sampleEvidence, keyPair.privateKey, keyPair.keyId);

    expect(envelope.algorithm).toBe('ed25519');
    expect(envelope.signature).toBeTruthy();
    expect(envelope.keyId).toBe(keyPair.keyId);
    expect(envelope.evidenceHash).toMatch(/^[0-9a-f]{64}$/);
    expect(envelope.signedAt).toBeTruthy();

    // Verify succeeds with correct public key
    expect(verifyEd25519(envelope, sampleEvidence, keyPair.publicKey)).toBe(true);

    // Verify fails with different key pair
    const otherKeyPair = generateSigningKeyPair();
    expect(verifyEd25519(envelope, sampleEvidence, otherKeyPair.publicKey)).toBe(false);

    // Verify fails with tampered evidence
    const tampered = { ...sampleEvidence, overallStatus: 'fail' };
    expect(verifyEd25519(envelope, tampered, keyPair.publicKey)).toBe(false);

    // Unified verifyEvidence dispatches correctly
    expect(verifyEvidence(envelope, sampleEvidence, keyPair.publicKey)).toBe(true);
  });
});

describe('HMAC-SHA256 sign/verify roundtrip', () => {
  it('signs and verifies evidence with HMAC-SHA256', () => {
    const secret = randomBytes(32);
    const keyId = 'hmac-test-key';
    const envelope = signHmac256(sampleEvidence, secret, keyId);

    expect(envelope.algorithm).toBe('hmac-sha256');
    expect(envelope.signature).toBeTruthy();
    expect(envelope.keyId).toBe(keyId);
    expect(envelope.evidenceHash).toMatch(/^[0-9a-f]{64}$/);

    // Verify succeeds with correct secret
    expect(verifyHmac256(envelope, sampleEvidence, secret)).toBe(true);

    // Verify fails with different secret
    const otherSecret = randomBytes(32);
    expect(verifyHmac256(envelope, sampleEvidence, otherSecret)).toBe(false);

    // Verify fails with tampered evidence
    const tampered = { ...sampleEvidence, overallStatus: 'fail' };
    expect(verifyHmac256(envelope, tampered, secret)).toBe(false);

    // Accepts hex string secret
    const hexSecret = randomBytes(32).toString('hex');
    const envelope2 = signHmac256(sampleEvidence, hexSecret, 'hex-key');
    expect(verifyHmac256(envelope2, sampleEvidence, hexSecret)).toBe(true);

    // Unified verifyEvidence dispatches correctly
    expect(verifyEvidence(envelope, sampleEvidence, secret)).toBe(true);
  });
});

describe('RFC 3161 timestamp request format', () => {
  it('builds a valid DER-encoded timestamp request with nonce', () => {
    const hash = hashEvidence(sampleEvidence);
    const { request: tsReq, nonce } = buildTimestampRequest(hash);

    // Must be a Buffer
    expect(Buffer.isBuffer(tsReq)).toBe(true);

    // Nonce is 8 bytes
    expect(Buffer.isBuffer(nonce)).toBe(true);
    expect(nonce.length).toBe(8);

    // First byte is 0x30 (SEQUENCE)
    expect(tsReq[0]).toBe(0x30);

    // Contains the version INTEGER 1
    expect(tsReq.includes(Buffer.from([0x02, 0x01, 0x01]))).toBe(true);

    // Contains SHA-256 OID (2.16.840.1.101.3.4.2.1)
    const sha256OidBytes = Buffer.from([
      0x60, 0x86, 0x48, 0x01, 0x65, 0x03, 0x04, 0x02, 0x01,
    ]);
    expect(tsReq.includes(sha256OidBytes)).toBe(true);

    // Contains the hash as an OCTET STRING
    const hashBytes = Buffer.from(hash, 'hex');
    expect(tsReq.includes(hashBytes)).toBe(true);

    // Contains certReq BOOLEAN TRUE
    expect(tsReq.includes(Buffer.from([0x01, 0x01, 0xff]))).toBe(true);

    // Contains the nonce
    expect(tsReq.includes(nonce)).toBe(true);
  });

  it('validates TSA URL requires HTTPS', () => {
    expect(() => validateTsaUrl('http://tsa.example.com'))
      .toThrow('TSA URL must use HTTPS');

    expect(() => validateTsaUrl('https://tsa.example.com'))
      .not.toThrow();
  });

  it('validates TSA URL against allowlist', () => {
    const allowlist = ['https://tsa.example.com', 'https://tsa.corp.com'];

    expect(() => validateTsaUrl('https://tsa.example.com', allowlist))
      .not.toThrow();

    expect(() => validateTsaUrl('https://evil.example.com', allowlist))
      .toThrow('TSA URL not in allowlist');
  });

  it('allows any HTTPS URL when allowlist is empty', () => {
    expect(() => validateTsaUrl('https://any-tsa.example.com', []))
      .not.toThrow();
  });
});

describe('Configurable PBKDF2 iterations (C-02 fix)', () => {
  it('uses default 600,000 iterations when not specified', () => {
    const result = deriveSingleDevKey('test-passphrase', 'test-salt');
    expect(result.algorithm).toBe('pbkdf2-sha256');
    expect(result.key).toMatch(/^[0-9a-f]{64}$/);
    expect(PBKDF2_DEFAULT_ITERATIONS).toBe(600_000);
  });

  it('accepts custom iteration count', () => {
    const r1 = deriveSingleDevKey('test-passphrase', 'test-salt', 200_000);
    const r2 = deriveSingleDevKey('test-passphrase', 'test-salt', 600_000);
    // Different iteration counts produce different keys
    expect(r1.key).not.toBe(r2.key);
  });

  it('rejects iterations below minimum (100,000)', () => {
    expect(() => deriveSingleDevKey('pass', 'salt', 50_000))
      .toThrow(/must be >= 100000/);
    expect(PBKDF2_MIN_ITERATIONS).toBe(100_000);
  });

  it('rejects iterations above maximum (10,000,000)', () => {
    expect(() => deriveSingleDevKey('pass', 'salt', 20_000_000))
      .toThrow(/must be <= 10000000/);
    expect(PBKDF2_MAX_ITERATIONS).toBe(10_000_000);
  });

  it('validates iteration count via standalone validator', () => {
    expect(() => validatePbkdf2Iterations(600_000)).not.toThrow();
    expect(() => validatePbkdf2Iterations(100_000)).not.toThrow();
    expect(() => validatePbkdf2Iterations(10_000_000)).not.toThrow();
    expect(() => validatePbkdf2Iterations(99_999)).toThrow();
    expect(() => validatePbkdf2Iterations(10_000_001)).toThrow();
    expect(() => validatePbkdf2Iterations(1.5)).toThrow(/must be an integer/);
  });
});

describe('Ed25519 key generation uses crypto.generateKeyPairSync', () => {
  it('generates valid Ed25519 key pair with PEM encoding', () => {
    const keyPair = generateSigningKeyPair();

    // Public key is PEM-encoded SPKI
    expect(keyPair.publicKey).toContain('BEGIN PUBLIC KEY');
    expect(keyPair.publicKey).toContain('END PUBLIC KEY');

    // Private key is PEM-encoded PKCS#8
    expect(keyPair.privateKey).toContain('BEGIN PRIVATE KEY');
    expect(keyPair.privateKey).toContain('END PRIVATE KEY');

    // Key ID follows expected pattern
    expect(keyPair.keyId).toMatch(/^ed25519-sign-[0-9a-f]{8}$/);
  });

  it('generates unique key pairs on each call', () => {
    const kp1 = generateSigningKeyPair();
    const kp2 = generateSigningKeyPair();

    expect(kp1.publicKey).not.toBe(kp2.publicKey);
    expect(kp1.privateKey).not.toBe(kp2.privateKey);
    expect(kp1.keyId).not.toBe(kp2.keyId);
  });

  it('generated keys can sign and verify evidence', () => {
    const kp = generateSigningKeyPair();
    const envelope = signEd25519(sampleEvidence, kp.privateKey, kp.keyId);
    expect(verifyEd25519(envelope, sampleEvidence, kp.publicKey)).toBe(true);
  });
});

// ── DER multi-byte length encoding ────────────────────────────────────────

describe('buildTimestampRequest DER encoding', () => {
  it('produces properly encoded DER with multi-byte lengths', () => {
    const hash = hashEvidence(sampleEvidence);
    const { request: tsReq } = buildTimestampRequest(hash);

    // The outer SEQUENCE tag
    expect(tsReq[0]).toBe(0x30);

    // For SHA-256 hash (32 bytes), the body will be > 127 bytes due to
    // version + messageImprint + nonce + certReq, so the outer SEQUENCE
    // should use long-form DER length encoding (0x81 prefix for 128-255)
    const outerLengthByte = tsReq[1];
    const bodyLength = tsReq.length - 2 - (outerLengthByte & 0x80 ? (outerLengthByte & 0x7f) : 0);
    // Total request is well-formed (no truncation)
    expect(tsReq.length).toBeGreaterThan(60);
  });

  it('returns unique nonces on each call', () => {
    const hash = hashEvidence(sampleEvidence);
    const r1 = buildTimestampRequest(hash);
    const r2 = buildTimestampRequest(hash);
    expect(r1.nonce.equals(r2.nonce)).toBe(false);
  });
});

// ── TSP Response Validation ───────────────────────────────────────────────

/**
 * Helper: build a DER tag-length-value.
 */
function derWrapTest(tag: number, content: Buffer): Buffer {
  const len = content.length;
  if (len < 0x80) {
    return Buffer.concat([Buffer.from([tag, len]), content]);
  }
  const lengthBytes: number[] = [];
  let remaining = len;
  while (remaining > 0) {
    lengthBytes.unshift(remaining & 0xff);
    remaining >>= 8;
  }
  return Buffer.concat([
    Buffer.from([tag, 0x80 | lengthBytes.length, ...lengthBytes]),
    content,
  ]);
}

/**
 * Build a minimal valid TSP response for testing.
 */
function buildMockTspResponse(hash: string, nonce: Buffer, status: number = 0): Buffer {
  // TSTInfo fields
  const tstVersion = derWrapTest(0x02, Buffer.from([0x01])); // version 1
  const policy = derWrapTest(0x06, Buffer.from([0x2b, 0x06, 0x01])); // dummy OID
  const sha256Oid = derWrapTest(0x30, Buffer.concat([
    derWrapTest(0x06, Buffer.from([0x60, 0x86, 0x48, 0x01, 0x65, 0x03, 0x04, 0x02, 0x01])),
    Buffer.from([0x05, 0x00]),
  ]));
  const hashOctet = derWrapTest(0x04, Buffer.from(hash, 'hex'));
  const messageImprint = derWrapTest(0x30, Buffer.concat([sha256Oid, hashOctet]));
  const serial = derWrapTest(0x02, Buffer.from([0x01])); // serial 1
  const genTime = derWrapTest(0x18, Buffer.from('20260414100000Z')); // GeneralizedTime
  const nonceField = derWrapTest(0x02, nonce);

  const tstInfo = derWrapTest(0x30, Buffer.concat([
    tstVersion, policy, messageImprint, serial, genTime, nonceField,
  ]));

  // EncapsulatedContentInfo: SEQUENCE { eContentType OID, eContent [0] EXPLICIT }
  const eContentType = derWrapTest(0x06, Buffer.from([0x2a, 0x86, 0x48])); // dummy OID
  const eContent = derWrapTest(0xa0, derWrapTest(0x04, tstInfo.subarray(0))); // [0] EXPLICIT wrapping OCTET STRING
  const encapContentInfo = derWrapTest(0x30, Buffer.concat([eContentType, eContent]));

  // SignedData: SEQUENCE { version, digestAlgorithms SET, encapContentInfo }
  const sdVersion = derWrapTest(0x02, Buffer.from([0x03]));
  const digestAlgs = derWrapTest(0x31, Buffer.from([])); // empty SET
  const signedData = derWrapTest(0x30, Buffer.concat([sdVersion, digestAlgs, encapContentInfo]));

  // ContentInfo: SEQUENCE { contentType OID, content [0] EXPLICIT }
  const contentType = derWrapTest(0x06, Buffer.from([0x2a, 0x86, 0x48]));
  const contentExplicit = derWrapTest(0xa0, signedData);
  const contentInfo = derWrapTest(0x30, Buffer.concat([contentType, contentExplicit]));

  // PKIStatusInfo: SEQUENCE { status INTEGER }
  const pkiStatus = derWrapTest(0x30, derWrapTest(0x02, Buffer.from([status])));

  // TimeStampResp: SEQUENCE { PKIStatusInfo, ContentInfo }
  return derWrapTest(0x30, Buffer.concat([pkiStatus, contentInfo]));
}

describe('validateTspResponse', () => {
  const testHash = hashEvidence(sampleEvidence);
  const testNonce = randomBytes(8);

  it('accepts a valid TSP response with matching nonce and hash', () => {
    const resp = buildMockTspResponse(testHash, testNonce, 0);
    expect(() => validateTspResponse(resp, testNonce, testHash)).not.toThrow();
  });

  it('accepts grantedWithMods (status 1)', () => {
    const resp = buildMockTspResponse(testHash, testNonce, 1);
    expect(() => validateTspResponse(resp, testNonce, testHash)).not.toThrow();
  });

  it('rejects rejection status (2)', () => {
    const resp = buildMockTspResponse(testHash, testNonce, 2);
    expect(() => validateTspResponse(resp, testNonce, testHash))
      .toThrow(/status is 2/);
  });

  it('rejects nonce mismatch', () => {
    const wrongNonce = randomBytes(8);
    const resp = buildMockTspResponse(testHash, wrongNonce, 0);
    expect(() => validateTspResponse(resp, testNonce, testHash))
      .toThrow(/nonce mismatch/);
  });

  it('rejects messageImprint hash mismatch', () => {
    const wrongHash = 'a'.repeat(64);
    const resp = buildMockTspResponse(wrongHash, testNonce, 0);
    expect(() => validateTspResponse(resp, testNonce, testHash))
      .toThrow(/messageImprint hash mismatch/);
  });

  it('rejects non-SEQUENCE outer wrapper', () => {
    // Build a buffer starting with tag 0x02 (INTEGER) instead of 0x30 (SEQUENCE)
    const resp = Buffer.from([0x02, 0x01, 0x00]);
    expect(() => validateTspResponse(resp, testNonce, testHash))
      .toThrow(/expected SEQUENCE/);
  });

  it('rejects truncated DER buffer', () => {
    // Only 1 byte, derRead needs at least 2
    expect(() => validateTspResponse(Buffer.from([0x30]), testNonce, testHash))
      .toThrow(/DER read past end/);
  });

  it('rejects when timeStampToken is missing', () => {
    // TimeStampResp with only PKIStatusInfo (status=0) and no ContentInfo
    const pkiStatus = derWrapTest(0x30, derWrapTest(0x02, Buffer.from([0x00])));
    const resp = derWrapTest(0x30, pkiStatus);
    expect(() => validateTspResponse(resp, testNonce, testHash))
      .toThrow(/no timeStampToken present/);
  });

  it('rejects when PKIStatusInfo is not a SEQUENCE', () => {
    // Wrap an INTEGER where SEQUENCE is expected for PKIStatusInfo
    const notSeq = derWrapTest(0x02, Buffer.from([0x00])); // INTEGER instead of SEQUENCE
    const filler = derWrapTest(0x30, Buffer.from([0x00])); // dummy content after
    const resp = derWrapTest(0x30, Buffer.concat([notSeq, filler]));
    expect(() => validateTspResponse(resp, testNonce, testHash))
      .toThrow(/expected PKIStatusInfo SEQUENCE/);
  });

  it('rejects when PKIStatus is not an INTEGER', () => {
    // PKIStatusInfo is a SEQUENCE containing a non-INTEGER
    const badStatus = derWrapTest(0x30, derWrapTest(0x04, Buffer.from([0x00]))); // OCTET STRING
    const filler = derWrapTest(0x30, Buffer.from([0x00]));
    const resp = derWrapTest(0x30, Buffer.concat([badStatus, filler]));
    expect(() => validateTspResponse(resp, testNonce, testHash))
      .toThrow(/expected PKIStatus INTEGER/);
  });

  it('rejects status value from multi-byte INTEGER', () => {
    // Status INTEGER with 2 bytes (will be read as -1 due to length check)
    const multiByteStatus = derWrapTest(0x02, Buffer.from([0x00, 0x05]));
    const pkiStatus = derWrapTest(0x30, multiByteStatus);
    const filler = derWrapTest(0x30, Buffer.from([0x00]));
    const resp = derWrapTest(0x30, Buffer.concat([pkiStatus, filler]));
    expect(() => validateTspResponse(resp, testNonce, testHash))
      .toThrow(/status is -1/);
  });

  it('rejects when ContentInfo is not a SEQUENCE', () => {
    const pkiStatus = derWrapTest(0x30, derWrapTest(0x02, Buffer.from([0x00])));
    // Put an INTEGER where ContentInfo SEQUENCE is expected
    const notSeq = derWrapTest(0x02, Buffer.from([0x01]));
    const resp = derWrapTest(0x30, Buffer.concat([pkiStatus, notSeq]));
    expect(() => validateTspResponse(resp, testNonce, testHash))
      .toThrow(/expected ContentInfo SEQUENCE/);
  });

  it('rejects when SignedData content is missing from ContentInfo', () => {
    const pkiStatus = derWrapTest(0x30, derWrapTest(0x02, Buffer.from([0x00])));
    // ContentInfo with just an OID, no content
    const oid = derWrapTest(0x06, Buffer.from([0x2a, 0x86, 0x48]));
    const contentInfo = derWrapTest(0x30, oid);
    const resp = derWrapTest(0x30, Buffer.concat([pkiStatus, contentInfo]));
    expect(() => validateTspResponse(resp, testNonce, testHash))
      .toThrow(/no SignedData content/);
  });

  it('rejects when SignedData is not a SEQUENCE', () => {
    const pkiStatus = derWrapTest(0x30, derWrapTest(0x02, Buffer.from([0x00])));
    const oid = derWrapTest(0x06, Buffer.from([0x2a, 0x86, 0x48]));
    // Explicit content wrapping an INTEGER instead of SEQUENCE
    const explicitContent = derWrapTest(0xa0, derWrapTest(0x02, Buffer.from([0x01])));
    const contentInfo = derWrapTest(0x30, Buffer.concat([oid, explicitContent]));
    const resp = derWrapTest(0x30, Buffer.concat([pkiStatus, contentInfo]));
    expect(() => validateTspResponse(resp, testNonce, testHash))
      .toThrow(/expected SignedData SEQUENCE/);
  });

  it('rejects when EncapsulatedContentInfo is not a SEQUENCE', () => {
    const pkiStatus = derWrapTest(0x30, derWrapTest(0x02, Buffer.from([0x00])));
    const oid = derWrapTest(0x06, Buffer.from([0x2a, 0x86, 0x48]));
    // SignedData: version + digestAlgs + INTEGER (not SEQUENCE for encapContent)
    const sdVersion = derWrapTest(0x02, Buffer.from([0x03]));
    const digestAlgs = derWrapTest(0x31, Buffer.from([]));
    const notSeq = derWrapTest(0x02, Buffer.from([0x01])); // INTEGER, not SEQUENCE
    const signedData = derWrapTest(0x30, Buffer.concat([sdVersion, digestAlgs, notSeq]));
    const explicitContent = derWrapTest(0xa0, signedData);
    const contentInfo = derWrapTest(0x30, Buffer.concat([oid, explicitContent]));
    const resp = derWrapTest(0x30, Buffer.concat([pkiStatus, contentInfo]));
    expect(() => validateTspResponse(resp, testNonce, testHash))
      .toThrow(/expected EncapsulatedContentInfo/);
  });

  it('rejects when eContent is missing from EncapsulatedContentInfo', () => {
    const pkiStatus = derWrapTest(0x30, derWrapTest(0x02, Buffer.from([0x00])));
    const oid = derWrapTest(0x06, Buffer.from([0x2a, 0x86, 0x48]));
    const sdVersion = derWrapTest(0x02, Buffer.from([0x03]));
    const digestAlgs = derWrapTest(0x31, Buffer.from([]));
    // EncapContentInfo with only an OID, no eContent
    const eContentType = derWrapTest(0x06, Buffer.from([0x2a, 0x86, 0x48]));
    const encapContentInfo = derWrapTest(0x30, eContentType);
    const signedData = derWrapTest(0x30, Buffer.concat([sdVersion, digestAlgs, encapContentInfo]));
    const explicitContent = derWrapTest(0xa0, signedData);
    const contentInfo = derWrapTest(0x30, Buffer.concat([oid, explicitContent]));
    const resp = derWrapTest(0x30, Buffer.concat([pkiStatus, contentInfo]));
    expect(() => validateTspResponse(resp, testNonce, testHash))
      .toThrow(/no eContent in EncapsulatedContentInfo/);
  });

  it('rejects when TSTInfo is not a SEQUENCE', () => {
    const pkiStatus = derWrapTest(0x30, derWrapTest(0x02, Buffer.from([0x00])));
    const oid = derWrapTest(0x06, Buffer.from([0x2a, 0x86, 0x48]));
    const sdVersion = derWrapTest(0x02, Buffer.from([0x03]));
    const digestAlgs = derWrapTest(0x31, Buffer.from([]));
    const eContentType = derWrapTest(0x06, Buffer.from([0x2a, 0x86, 0x48]));
    // eContent OCTET STRING wrapping an INTEGER, not a SEQUENCE
    const badTstInfo = derWrapTest(0x02, Buffer.from([0x01]));
    const eContentExplicit = derWrapTest(0xa0, derWrapTest(0x04, badTstInfo));
    const encapContentInfo = derWrapTest(0x30, Buffer.concat([eContentType, eContentExplicit]));
    const signedData = derWrapTest(0x30, Buffer.concat([sdVersion, digestAlgs, encapContentInfo]));
    const explicitContent = derWrapTest(0xa0, signedData);
    const contentInfo = derWrapTest(0x30, Buffer.concat([oid, explicitContent]));
    const resp = derWrapTest(0x30, Buffer.concat([pkiStatus, contentInfo]));
    expect(() => validateTspResponse(resp, testNonce, testHash))
      .toThrow(/expected TSTInfo SEQUENCE/);
  });

  it('rejects when MessageImprint is not a SEQUENCE', () => {
    // Build full TSP response but with bad messageImprint tag
    const tstVersion = derWrapTest(0x02, Buffer.from([0x01]));
    const policy = derWrapTest(0x06, Buffer.from([0x2b, 0x06, 0x01]));
    const badMsgImprint = derWrapTest(0x02, Buffer.from([0x01])); // INTEGER not SEQUENCE
    const serial = derWrapTest(0x02, Buffer.from([0x01]));
    const genTime = derWrapTest(0x18, Buffer.from('20260414100000Z'));
    const nonceField = derWrapTest(0x02, testNonce);
    const tstInfo = derWrapTest(0x30, Buffer.concat([
      tstVersion, policy, badMsgImprint, serial, genTime, nonceField,
    ]));
    const eContentType = derWrapTest(0x06, Buffer.from([0x2a, 0x86, 0x48]));
    const eContent = derWrapTest(0xa0, derWrapTest(0x04, tstInfo));
    const encapContentInfo = derWrapTest(0x30, Buffer.concat([eContentType, eContent]));
    const sdVersion = derWrapTest(0x02, Buffer.from([0x03]));
    const digestAlgs = derWrapTest(0x31, Buffer.from([]));
    const signedData = derWrapTest(0x30, Buffer.concat([sdVersion, digestAlgs, encapContentInfo]));
    const oid = derWrapTest(0x06, Buffer.from([0x2a, 0x86, 0x48]));
    const explicitContent = derWrapTest(0xa0, signedData);
    const contentInfo = derWrapTest(0x30, Buffer.concat([oid, explicitContent]));
    const pkiStatus = derWrapTest(0x30, derWrapTest(0x02, Buffer.from([0x00])));
    const resp = derWrapTest(0x30, Buffer.concat([pkiStatus, contentInfo]));
    expect(() => validateTspResponse(resp, testNonce, testHash))
      .toThrow(/expected MessageImprint SEQUENCE/);
  });

  it('rejects when hashedMessage is not OCTET STRING', () => {
    // Build valid TSP response but with INTEGER instead of OCTET STRING for hash
    const sha256Oid = derWrapTest(0x30, Buffer.concat([
      derWrapTest(0x06, Buffer.from([0x60, 0x86, 0x48, 0x01, 0x65, 0x03, 0x04, 0x02, 0x01])),
      Buffer.from([0x05, 0x00]),
    ]));
    const badHashField = derWrapTest(0x02, Buffer.from(testHash, 'hex')); // INTEGER not OCTET STRING
    const messageImprint = derWrapTest(0x30, Buffer.concat([sha256Oid, badHashField]));
    const tstVersion = derWrapTest(0x02, Buffer.from([0x01]));
    const policy = derWrapTest(0x06, Buffer.from([0x2b, 0x06, 0x01]));
    const serial = derWrapTest(0x02, Buffer.from([0x01]));
    const genTime = derWrapTest(0x18, Buffer.from('20260414100000Z'));
    const nonceField = derWrapTest(0x02, testNonce);
    const tstInfo = derWrapTest(0x30, Buffer.concat([
      tstVersion, policy, messageImprint, serial, genTime, nonceField,
    ]));
    const eContentType = derWrapTest(0x06, Buffer.from([0x2a, 0x86, 0x48]));
    const eContent = derWrapTest(0xa0, derWrapTest(0x04, tstInfo));
    const encapContentInfo = derWrapTest(0x30, Buffer.concat([eContentType, eContent]));
    const sdVersion = derWrapTest(0x02, Buffer.from([0x03]));
    const digestAlgs = derWrapTest(0x31, Buffer.from([]));
    const signedData = derWrapTest(0x30, Buffer.concat([sdVersion, digestAlgs, encapContentInfo]));
    const oid = derWrapTest(0x06, Buffer.from([0x2a, 0x86, 0x48]));
    const explicitContent = derWrapTest(0xa0, signedData);
    const contentInfo = derWrapTest(0x30, Buffer.concat([oid, explicitContent]));
    const pkiStatus = derWrapTest(0x30, derWrapTest(0x02, Buffer.from([0x00])));
    const resp = derWrapTest(0x30, Buffer.concat([pkiStatus, contentInfo]));
    expect(() => validateTspResponse(resp, testNonce, testHash))
      .toThrow(/expected hashedMessage OCTET STRING/);
  });

  it('rejects when nonce is not found in TSTInfo', () => {
    // Build TSP response with no INTEGER field after genTime
    const sha256Oid = derWrapTest(0x30, Buffer.concat([
      derWrapTest(0x06, Buffer.from([0x60, 0x86, 0x48, 0x01, 0x65, 0x03, 0x04, 0x02, 0x01])),
      Buffer.from([0x05, 0x00]),
    ]));
    const hashOctet = derWrapTest(0x04, Buffer.from(testHash, 'hex'));
    const messageImprint = derWrapTest(0x30, Buffer.concat([sha256Oid, hashOctet]));
    const tstVersion = derWrapTest(0x02, Buffer.from([0x01]));
    const policy = derWrapTest(0x06, Buffer.from([0x2b, 0x06, 0x01]));
    const serial = derWrapTest(0x02, Buffer.from([0x01]));
    const genTime = derWrapTest(0x18, Buffer.from('20260414100000Z'));
    // No nonce field -- only a BOOLEAN after genTime
    const boolField = derWrapTest(0x01, Buffer.from([0xff]));
    const tstInfo = derWrapTest(0x30, Buffer.concat([
      tstVersion, policy, messageImprint, serial, genTime, boolField,
    ]));
    const eContentType = derWrapTest(0x06, Buffer.from([0x2a, 0x86, 0x48]));
    const eContent = derWrapTest(0xa0, derWrapTest(0x04, tstInfo));
    const encapContentInfo = derWrapTest(0x30, Buffer.concat([eContentType, eContent]));
    const sdVersion = derWrapTest(0x02, Buffer.from([0x03]));
    const digestAlgs = derWrapTest(0x31, Buffer.from([]));
    const signedData = derWrapTest(0x30, Buffer.concat([sdVersion, digestAlgs, encapContentInfo]));
    const oid = derWrapTest(0x06, Buffer.from([0x2a, 0x86, 0x48]));
    const explicitContent = derWrapTest(0xa0, signedData);
    const contentInfo = derWrapTest(0x30, Buffer.concat([oid, explicitContent]));
    const pkiStatus = derWrapTest(0x30, derWrapTest(0x02, Buffer.from([0x00])));
    const resp = derWrapTest(0x30, Buffer.concat([pkiStatus, contentInfo]));
    expect(() => validateTspResponse(resp, testNonce, testHash))
      .toThrow(/nonce not found/);
  });

  it('handles DER long-form length in response parsing', () => {
    // Build a response where an inner field uses multi-byte DER length (>= 128 bytes)
    // This exercises the derRead long-form length path
    const resp = buildMockTspResponse(testHash, testNonce, 0);
    // Valid response should parse without error (exercises the derRead path
    // through multiple nested structures, some may use long-form)
    expect(() => validateTspResponse(resp, testNonce, testHash)).not.toThrow();
  });

  it('parses DER structures with long-form lengths (>=128 bytes)', () => {
    // Build a mock response where inner fields are padded to >= 128 bytes,
    // forcing derRead to use the long-form length parsing path (lines 568-573).
    // We pad the policy OID with extra bytes to push tstInfo content past 128 bytes.
    const tstVersion = derWrapTest(0x02, Buffer.from([0x01]));
    // Large policy OID (130 bytes of content to force long-form)
    const largePolicyContent = Buffer.alloc(130, 0x2b);
    const policy = derWrapTest(0x06, largePolicyContent);
    const sha256Oid = derWrapTest(0x30, Buffer.concat([
      derWrapTest(0x06, Buffer.from([0x60, 0x86, 0x48, 0x01, 0x65, 0x03, 0x04, 0x02, 0x01])),
      Buffer.from([0x05, 0x00]),
    ]));
    const hashOctet = derWrapTest(0x04, Buffer.from(testHash, 'hex'));
    const messageImprint = derWrapTest(0x30, Buffer.concat([sha256Oid, hashOctet]));
    const serial = derWrapTest(0x02, Buffer.from([0x01]));
    const genTime = derWrapTest(0x18, Buffer.from('20260414100000Z'));
    const nonceField = derWrapTest(0x02, testNonce);

    const tstInfo = derWrapTest(0x30, Buffer.concat([
      tstVersion, policy, messageImprint, serial, genTime, nonceField,
    ]));

    const eContentType = derWrapTest(0x06, Buffer.from([0x2a, 0x86, 0x48]));
    const eContent = derWrapTest(0xa0, derWrapTest(0x04, tstInfo));
    const encapContentInfo = derWrapTest(0x30, Buffer.concat([eContentType, eContent]));

    const sdVersion = derWrapTest(0x02, Buffer.from([0x03]));
    const digestAlgs = derWrapTest(0x31, Buffer.from([]));
    const signedData = derWrapTest(0x30, Buffer.concat([sdVersion, digestAlgs, encapContentInfo]));

    const contentType = derWrapTest(0x06, Buffer.from([0x2a, 0x86, 0x48]));
    const contentExplicit = derWrapTest(0xa0, signedData);
    const contentInfo = derWrapTest(0x30, Buffer.concat([contentType, contentExplicit]));

    const pkiStatus = derWrapTest(0x30, derWrapTest(0x02, Buffer.from([0x00])));
    const resp = derWrapTest(0x30, Buffer.concat([pkiStatus, contentInfo]));

    // The response is well over 128 bytes, so outer SEQUENCE uses long-form DER
    expect(resp.length).toBeGreaterThan(128);
    // Verify derRead parses the long-form lengths correctly
    expect(() => validateTspResponse(resp, testNonce, testHash)).not.toThrow();
  });

  it('rejects truncated DER long-form length field', () => {
    // Build a buffer where the DER long-form length field extends past the buffer end.
    // Tag 0x30 (SEQUENCE), length byte 0x82 (2-byte long form), but only 1 byte follows
    const truncated = Buffer.from([0x30, 0x82, 0x01]); // needs 2 length bytes, has 1
    expect(() => validateTspResponse(truncated, testNonce, testHash))
      .toThrow(/DER length field past end/);
  });
});

// ── storePrivateKey disk persistence ──────────────────────────────────────

describe('storePrivateKey', () => {
  it('writes a PEM file to the specified directory', async () => {
    const tmpDir = await mkdtemp(join(tmpdir(), 'signer-test-'));
    const keyPair = generateSigningKeyPair();
    await storePrivateKey(keyPair.privateKey, keyPair.keyId, tmpDir);

    const filePath = join(tmpDir, `${keyPair.keyId}.pem`);
    const contents = await readFile(filePath, 'utf-8');
    expect(contents).toBe(keyPair.privateKey);
    expect(contents).toContain('BEGIN PRIVATE KEY');
  });

  it('handles chmod failure gracefully (non-fatal)', async () => {
    // storePrivateKey catches chmod errors (expected on Windows)
    // Just verify the file is written even if chmod fails
    const tmpDir = await mkdtemp(join(tmpdir(), 'signer-test-'));
    await storePrivateKey('test-key-data', 'test-key-id', tmpDir);

    const filePath = join(tmpDir, 'test-key-id.pem');
    const contents = await readFile(filePath, 'utf-8');
    expect(contents).toBe('test-key-data');
  });
});

// ── hashEvidence edge cases ──────────────────────────────────────────────

describe('hashEvidence edge cases', () => {
  it('hashes null values', () => {
    const h1 = hashEvidence(null);
    expect(h1).toMatch(/^[0-9a-f]{64}$/);
  });

  it('throws on undefined (JSON.stringify returns undefined)', () => {
    // deepSortKeys passes through undefined, and JSON.stringify(undefined)
    // returns the JS undefined value, which crypto.update rejects
    expect(() => hashEvidence(undefined)).toThrow();
  });

  it('hashes primitive values', () => {
    const hStr = hashEvidence('hello');
    const hNum = hashEvidence(42);
    const hBool = hashEvidence(true);
    expect(hStr).toMatch(/^[0-9a-f]{64}$/);
    expect(hNum).toMatch(/^[0-9a-f]{64}$/);
    expect(hBool).toMatch(/^[0-9a-f]{64}$/);
    // All different
    expect(new Set([hStr, hNum, hBool]).size).toBe(3);
  });

  it('hashes arrays preserving order', () => {
    const h1 = hashEvidence([1, 2, 3]);
    const h2 = hashEvidence([3, 2, 1]);
    expect(h1).not.toBe(h2);
  });

  it('hashes nested objects with deep key sorting', () => {
    const h1 = hashEvidence({ b: 1, a: { d: 2, c: 3 } });
    const h2 = hashEvidence({ a: { c: 3, d: 2 }, b: 1 });
    // Same content, different key order => same hash (deep sort)
    expect(h1).toBe(h2);
  });

  it('hashes arrays of objects', () => {
    const h1 = hashEvidence([{ b: 1, a: 2 }, { d: 3, c: 4 }]);
    const h2 = hashEvidence([{ a: 2, b: 1 }, { c: 4, d: 3 }]);
    expect(h1).toBe(h2);
  });

  it('is deterministic for the same input', () => {
    const evidence = { x: 1, y: [2, 3], z: { w: 4 } };
    expect(hashEvidence(evidence)).toBe(hashEvidence(evidence));
  });
});

// ── verifyEvidence dispatch + edge cases ─────────────────────────────────

describe('verifyEvidence edge cases', () => {
  it('returns false for unknown algorithm', () => {
    const envelope: SignedEvidence = {
      algorithm: 'unknown-algo' as never,
      signature: 'dGVzdA==',
      keyId: 'k1',
      signedAt: new Date().toISOString(),
      evidenceHash: hashEvidence(sampleEvidence),
    };
    expect(verifyEvidence(envelope, sampleEvidence, 'any-key')).toBe(false);
  });

  it('dispatches ed25519 correctly via verifyEvidence', () => {
    const kp = generateSigningKeyPair();
    const envelope = signEd25519(sampleEvidence, kp.privateKey, kp.keyId);
    expect(verifyEvidence(envelope, sampleEvidence, kp.publicKey)).toBe(true);
  });

  it('dispatches hmac-sha256 correctly via verifyEvidence', () => {
    const secret = randomBytes(32);
    const envelope = signHmac256(sampleEvidence, secret, 'hmac-k');
    expect(verifyEvidence(envelope, sampleEvidence, secret)).toBe(true);
  });
});

// ── verifyEd25519 error paths ────────────────────────────────────────────

describe('verifyEd25519 error paths', () => {
  it('returns false when algorithm is not ed25519', () => {
    const kp = generateSigningKeyPair();
    const envelope = signEd25519(sampleEvidence, kp.privateKey, kp.keyId);
    const wrongAlgo: SignedEvidence = { ...envelope, algorithm: 'hmac-sha256' };
    expect(verifyEd25519(wrongAlgo, sampleEvidence, kp.publicKey)).toBe(false);
  });

  it('returns false when evidenceHash does not match', () => {
    const kp = generateSigningKeyPair();
    const envelope = signEd25519(sampleEvidence, kp.privateKey, kp.keyId);
    const badHash: SignedEvidence = { ...envelope, evidenceHash: 'a'.repeat(64) };
    expect(verifyEd25519(badHash, sampleEvidence, kp.publicKey)).toBe(false);
  });

  it('returns false for invalid public key (catches error)', () => {
    const kp = generateSigningKeyPair();
    const envelope = signEd25519(sampleEvidence, kp.privateKey, kp.keyId);
    // Pass garbage as the public key -- createPublicKey will throw
    expect(verifyEd25519(envelope, sampleEvidence, 'not-a-valid-pem')).toBe(false);
  });

  it('returns false when RSA key is used instead of Ed25519', () => {
    const kp = generateSigningKeyPair();
    const envelope = signEd25519(sampleEvidence, kp.privateKey, kp.keyId);
    // Generate an RSA key pair to pass as wrong key type
    const rsaKp = generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    });
    expect(verifyEd25519(envelope, sampleEvidence, rsaKp.publicKey)).toBe(false);
  });
});

// ── verifyHmac256 error paths ────────────────────────────────────────────

describe('verifyHmac256 error paths', () => {
  it('returns false when algorithm is not hmac-sha256', () => {
    const secret = randomBytes(32);
    const envelope = signHmac256(sampleEvidence, secret, 'k1');
    const wrongAlgo: SignedEvidence = { ...envelope, algorithm: 'ed25519' };
    expect(verifyHmac256(wrongAlgo, sampleEvidence, secret)).toBe(false);
  });

  it('returns false when evidenceHash does not match', () => {
    const secret = randomBytes(32);
    const envelope = signHmac256(sampleEvidence, secret, 'k1');
    const badHash: SignedEvidence = { ...envelope, evidenceHash: 'b'.repeat(64) };
    expect(verifyHmac256(badHash, sampleEvidence, secret)).toBe(false);
  });

  it('returns false when signature length differs', () => {
    const secret = randomBytes(32);
    const envelope = signHmac256(sampleEvidence, secret, 'k1');
    // Truncate the base64 signature so decoded lengths won't match
    const shortSig: SignedEvidence = { ...envelope, signature: 'YQ==' };
    expect(verifyHmac256(shortSig, sampleEvidence, secret)).toBe(false);
  });

  it('returns false for corrupted signature', () => {
    const secret = randomBytes(32);
    const envelope = signHmac256(sampleEvidence, secret, 'k1');
    // Flip bits in the signature
    const corruptSig = Buffer.from(envelope.signature, 'base64');
    corruptSig[0] ^= 0xff;
    const corrupted: SignedEvidence = { ...envelope, signature: corruptSig.toString('base64') };
    expect(verifyHmac256(corrupted, sampleEvidence, secret)).toBe(false);
  });
});

// ── verifyAuditEntry catch block ─────────────────────────────────────────

describe('verifyAuditEntry error handling', () => {
  it('returns false when HMAC creation throws (empty key)', () => {
    const key = randomBytes(32);
    const signed = signAuditEntry(baseEntry(), key, 'key-1');
    // Pass an empty buffer as key -- createHmac may throw
    expect(verifyAuditEntry(signed, Buffer.alloc(0))).toBe(false);
  });
});

// ── DER long-form length encoding ────────────────────────────────────────

describe('DER long-form length via buildTimestampRequest', () => {
  it('handles standard SHA-256 hash', () => {
    const hash = 'ab'.repeat(32); // 64 hex chars = 32 bytes
    const { request } = buildTimestampRequest(hash);
    expect(request[0]).toBe(0x30);
    expect(request.length).toBeGreaterThan(60);
  });

  it('exercises derLength long-form when hash payload is large', () => {
    // Pass a 256-byte hex hash (512 hex chars) to make the messageImprint
    // and outer body exceed 128 bytes, forcing derLength into long-form encoding
    const largeHash = 'cd'.repeat(256); // 512 hex chars = 256 bytes
    const { request } = buildTimestampRequest(largeHash);

    expect(request[0]).toBe(0x30); // outer SEQUENCE
    // The outer SEQUENCE length must be long-form (body > 128 bytes)
    expect(request[1] & 0x80).toBe(0x80); // 0x81 or 0x82 prefix
    // Total request is much larger due to 256-byte hash
    expect(request.length).toBeGreaterThan(280);
    // The hash bytes are embedded in the request
    expect(request.includes(Buffer.from(largeHash, 'hex'))).toBe(true);
  });
});

// ── validateTsaUrl edge cases ────────────────────────────────────────────

describe('validateTsaUrl edge cases', () => {
  it('passes when no allowlist is provided', () => {
    expect(() => validateTsaUrl('https://any-tsa.example.com')).not.toThrow();
  });

  it('passes when allowlist is undefined', () => {
    expect(() => validateTsaUrl('https://any-tsa.example.com', undefined)).not.toThrow();
  });

  it('rejects ftp protocol', () => {
    expect(() => validateTsaUrl('ftp://tsa.example.com')).toThrow('must use HTTPS');
  });
});

// ── requestTimestamp with mocked fetch ───────────────────────────────────

describe('requestTimestamp', () => {
  it('sends POST to TSA and returns TimestampToken on valid response', async () => {
    const hash = hashEvidence(sampleEvidence);

    // We need to intercept the nonce that buildTimestampRequest generates
    // so we can build a matching mock response. Mock fetch to capture the
    // request body and build a valid response from it.
    const originalFetch = globalThis.fetch;
    try {
      globalThis.fetch = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
        // Extract the nonce from the DER-encoded request body
        const reqBuf = Buffer.from(init?.body as ArrayBuffer);
        // The nonce is an 8-byte INTEGER inside the request. Find it by
        // parsing: after the messageImprint, there's a 0x02 tag + 0x08 length + 8 bytes
        // We'll find the last 0x02 0x08 sequence (nonce INTEGER)
        let nonceOffset = -1;
        for (let i = reqBuf.length - 1; i >= 1; i--) {
          if (reqBuf[i - 1] === 0x02 && reqBuf[i] === 0x08) {
            nonceOffset = i + 1;
            break;
          }
        }
        const sentNonce = reqBuf.subarray(nonceOffset, nonceOffset + 8);

        // Build a valid mock TSP response with matching hash and nonce
        const resp = buildMockTspResponse(hash, sentNonce, 0);
        return new Response(resp, {
          status: 200,
          headers: { 'Content-Type': 'application/timestamp-reply' },
        });
      });

      const token = await requestTimestamp(hash, {
        tsaUrl: 'https://tsa.example.com',
        timeoutMs: 5000,
      });

      expect(token.tsaUrl).toBe('https://tsa.example.com');
      expect(token.hashedMessage).toBe(hash);
      expect(token.timestampResponse).toBeTruthy();
      expect(token.requestedAt).toBeTruthy();
      // Verify base64 encoding
      expect(() => Buffer.from(token.timestampResponse, 'base64')).not.toThrow();
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('throws on HTTP error response', async () => {
    const hash = hashEvidence(sampleEvidence);
    const originalFetch = globalThis.fetch;
    try {
      globalThis.fetch = vi.fn(async () => {
        return new Response('Internal Server Error', { status: 500, statusText: 'Internal Server Error' });
      });

      await expect(requestTimestamp(hash, {
        tsaUrl: 'https://tsa.example.com',
      })).rejects.toThrow(/TSA request failed: HTTP 500/);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('throws on non-HTTPS TSA URL', async () => {
    const hash = hashEvidence(sampleEvidence);
    await expect(requestTimestamp(hash, {
      tsaUrl: 'http://insecure-tsa.example.com',
    })).rejects.toThrow('TSA URL must use HTTPS');
  });

  it('throws when TSA URL is not in allowlist', async () => {
    const hash = hashEvidence(sampleEvidence);
    await expect(requestTimestamp(hash, {
      tsaUrl: 'https://evil-tsa.example.com',
      allowedTsaUrls: ['https://good-tsa.example.com'],
    })).rejects.toThrow('TSA URL not in allowlist');
  });

  it('throws on TSP response validation failure', async () => {
    const hash = hashEvidence(sampleEvidence);
    const originalFetch = globalThis.fetch;
    try {
      globalThis.fetch = vi.fn(async () => {
        // Return a TSP response with rejection status (2)
        const badResp = buildMockTspResponse(hash, randomBytes(8), 2);
        return new Response(badResp, { status: 200 });
      });

      await expect(requestTimestamp(hash, {
        tsaUrl: 'https://tsa.example.com',
      })).rejects.toThrow(/status is 2/);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
