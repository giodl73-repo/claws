/**
 * ArtifactSigner -- Ed25519 + HMAC-SHA256 signing infrastructure for
 * compliance evidence packages.
 *
 * Two signing modes:
 * - **Enterprise (Ed25519)**: Asymmetric signatures using crypto.generateKeyPairSync('ed25519').
 *   Key pairs can be managed via PKI. Private keys stored in the secrets vault
 *   (Pulse 04 key storage) when available, with chmod 0o600 file fallback.
 * - **Developer (HMAC-SHA256)**: Symmetric signatures using a shared secret.
 *   Simpler for single-user deployments.
 *
 * RFC 3161 Timestamp Authority client submits a SHA-256 hash to a TSA and
 * receives a signed timestamp token, proving the evidence existed at a specific time.
 * TSA connections require TLS with certificate validation. TSA URL must be from
 * a configurable allowlist in claws.json.
 *
 * Evidence hash scope: The signed payload includes all evidence fields except
 * the signature metadata itself (signature, keyId, algorithm, signedAt).
 * Fields are length-prefixed and concatenated in deterministic order to prevent
 * delimiter confusion attacks.
 *
 * @module claws-sdk/compliance/artifact-signer
 */

import {
  createHmac,
  createHash,
  sign as cryptoSign,
  verify as cryptoVerify,
  generateKeyPairSync,
  createPrivateKey,
  createPublicKey,
  randomBytes,
  timingSafeEqual,
} from 'node:crypto';
import { writeFile, chmod } from 'node:fs/promises';
import { join } from 'node:path';
import type { AuditAlgorithm } from '../ir/audit-event.js';

// ── Audit Chain Entry Signing (existing) ────────────────────────────────────

/**
 * Audit chain entry -- a signed audit event in the append-only chain.
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
 * Format: `${byteLength}:${value}` -- unambiguous even if value contains
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

// ── Compliance Evidence Signing ─────────────────────────────────────────────

/**
 * Signing mode for compliance evidence packages.
 * - 'ed25519': Asymmetric Ed25519 for enterprise deployments.
 * - 'hmac-sha256': Symmetric HMAC-SHA256 for developer/single-user deployments.
 */
export type SigningMode = 'ed25519' | 'hmac-sha256';

/**
 * Signed evidence envelope -- wraps any compliance evidence with a
 * cryptographic signature.
 */
export interface SignedEvidence {
  /** The signing algorithm used. */
  readonly algorithm: SigningMode;
  /** Base64-encoded signature value. */
  readonly signature: string;
  /** Key ID used for signing. */
  readonly keyId: string;
  /** ISO 8601 timestamp of signing. */
  readonly signedAt: string;
  /** SHA-256 hash of the evidence payload (hex). */
  readonly evidenceHash: string;
}

/**
 * RFC 3161 timestamp token -- proof that evidence existed at a specific time.
 */
export interface TimestampToken {
  /** The TSA URL that issued this token. */
  readonly tsaUrl: string;
  /** SHA-256 hash that was timestamped (hex). */
  readonly hashedMessage: string;
  /** Base64-encoded timestamp response from the TSA. */
  readonly timestampResponse: string;
  /** ISO 8601 timestamp when the request was made. */
  readonly requestedAt: string;
}

/**
 * Ed25519 key pair for compliance signing.
 */
export interface Ed25519KeyPair {
  /** PEM-encoded public key. */
  readonly publicKey: string;
  /** PEM-encoded private key. */
  readonly privateKey: string;
  /** Key ID for this key pair. */
  readonly keyId: string;
}

/**
 * Generate an Ed25519 key pair for compliance signing.
 *
 * Uses crypto.generateKeyPairSync('ed25519') with OS CSPRNG via
 * crypto.randomBytes() for secure key material.
 *
 * @returns Ed25519 key pair with generated key ID.
 */
export function generateSigningKeyPair(): Ed25519KeyPair {
  const { publicKey, privateKey } = generateKeyPairSync('ed25519', {
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  });

  const keyId = `ed25519-sign-${randomBytes(4).toString('hex')}`;

  return { publicKey, privateKey, keyId };
}

/**
 * Store an Ed25519 private key to disk with restricted permissions.
 *
 * Writes the PEM-encoded private key to `{dir}/{keyId}.pem` with
 * 0o600 permissions (owner read/write only). On Windows, chmod is
 * best-effort (NTFS uses ACLs, not POSIX modes).
 *
 * @param privateKey - PEM-encoded private key
 * @param keyId - Key identifier (used as filename stem)
 * @param dir - Directory to store the key file
 */
export async function storePrivateKey(
  privateKey: string,
  keyId: string,
  dir: string,
): Promise<void> {
  if (!/^[a-zA-Z0-9_-]+$/.test(keyId)) {
    throw new Error(`Invalid keyId: "${keyId}" — must match /^[a-zA-Z0-9_-]+$/`);
  }
  const filePath = join(dir, `${keyId}.pem`);
  await writeFile(filePath, privateKey, 'utf-8');
  try {
    await chmod(filePath, 0o600);
  } catch {
    // chmod may fail on Windows; non-fatal
  }
}

/**
 * Deep-sort an object's keys for deterministic JSON serialization.
 * Arrays maintain their order; objects have keys sorted recursively.
 */
function deepSortKeys(obj: unknown): unknown {
  if (obj === null || obj === undefined || typeof obj !== 'object') {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map(deepSortKeys);
  }
  const sorted: Record<string, unknown> = {};
  for (const key of Object.keys(obj as Record<string, unknown>).sort()) {
    sorted[key] = deepSortKeys((obj as Record<string, unknown>)[key]);
  }
  return sorted;
}

/**
 * Compute deterministic SHA-256 hash of any evidence payload.
 *
 * Evidence hash scope: all fields of the evidence object are serialized
 * via deterministic JSON (deep-sorted keys) and hashed. The hash covers:
 * - All evidence fields (version, generatedAt, scope, controls, findings, etc.)
 * - Nested objects are recursively serialized with sorted keys
 * - Arrays maintain their order
 *
 * This ensures any modification to any evidence field invalidates the signature.
 *
 * @param evidence - The evidence object to hash
 * @returns Hex-encoded SHA-256 hash
 */
export function hashEvidence(evidence: unknown): string {
  const sorted = deepSortKeys(evidence);
  return createHash('sha256').update(JSON.stringify(sorted), 'utf8').digest('hex');
}

/**
 * Sign compliance evidence with Ed25519 (enterprise mode).
 *
 * @param evidence - The evidence object to sign
 * @param privateKey - PEM-encoded Ed25519 private key
 * @param keyId - Key identifier
 * @returns Signed evidence envelope
 */
export function signEd25519(
  evidence: unknown,
  privateKey: string,
  keyId: string,
): SignedEvidence {
  const evidenceHash = hashEvidence(evidence);
  const keyObj = createPrivateKey(privateKey);
  const sigBuf = cryptoSign(null, Buffer.from(evidenceHash, 'utf8'), keyObj);
  const signature = sigBuf.toString('base64');

  return {
    algorithm: 'ed25519',
    signature,
    keyId,
    signedAt: new Date().toISOString(),
    evidenceHash,
  };
}

/**
 * Sign compliance evidence with HMAC-SHA256 (developer mode).
 *
 * @param evidence - The evidence object to sign
 * @param secret - HMAC secret key (Buffer or hex string)
 * @param keyId - Key identifier
 * @returns Signed evidence envelope
 */
export function signHmac256(
  evidence: unknown,
  secret: Buffer | string,
  keyId: string,
): SignedEvidence {
  const evidenceHash = hashEvidence(evidence);
  const keyBuf = typeof secret === 'string' ? Buffer.from(secret, 'hex') : secret;
  const hmac = createHmac('sha256', keyBuf);
  hmac.update(evidenceHash, 'utf8');
  const signature = hmac.digest('base64');

  return {
    algorithm: 'hmac-sha256',
    signature,
    keyId,
    signedAt: new Date().toISOString(),
    evidenceHash,
  };
}

/**
 * Verify an Ed25519-signed evidence envelope.
 *
 * @param envelope - The signed evidence envelope
 * @param evidence - The original evidence object
 * @param publicKey - PEM-encoded Ed25519 public key
 * @returns true if the signature is valid
 */
export function verifyEd25519(
  envelope: SignedEvidence,
  evidence: unknown,
  publicKey: string,
): boolean {
  if (envelope.algorithm !== 'ed25519') return false;

  const evidenceHash = hashEvidence(evidence);
  if (evidenceHash !== envelope.evidenceHash) return false;

  try {
    const keyObj = createPublicKey(publicKey);
    return cryptoVerify(
      null,
      Buffer.from(evidenceHash, 'utf8'),
      keyObj,
      Buffer.from(envelope.signature, 'base64'),
    );
  } catch {
    return false;
  }
}

/**
 * Verify an HMAC-SHA256-signed evidence envelope.
 * Uses constant-time comparison to prevent timing attacks.
 *
 * @param envelope - The signed evidence envelope
 * @param evidence - The original evidence object
 * @param secret - HMAC secret key (Buffer or hex string)
 * @returns true if the signature is valid
 */
export function verifyHmac256(
  envelope: SignedEvidence,
  evidence: unknown,
  secret: Buffer | string,
): boolean {
  if (envelope.algorithm !== 'hmac-sha256') return false;

  const evidenceHash = hashEvidence(evidence);
  if (evidenceHash !== envelope.evidenceHash) return false;

  try {
    const keyBuf = typeof secret === 'string' ? Buffer.from(secret, 'hex') : secret;
    const hmac = createHmac('sha256', keyBuf);
    hmac.update(evidenceHash, 'utf8');
    const expected = hmac.digest('base64');

    const sigBuf = Buffer.from(envelope.signature, 'base64');
    const expBuf = Buffer.from(expected, 'base64');
    if (sigBuf.length !== expBuf.length) return false;
    return timingSafeEqual(sigBuf, expBuf);
  } catch {
    return false;
  }
}

/**
 * Unified verify -- dispatches to Ed25519 or HMAC-SHA256 based on envelope algorithm.
 *
 * @param envelope - The signed evidence envelope
 * @param evidence - The original evidence object
 * @param key - Public key (PEM, for Ed25519) or secret (Buffer/hex, for HMAC)
 * @returns true if the signature is valid
 */
export function verifyEvidence(
  envelope: SignedEvidence,
  evidence: unknown,
  key: string | Buffer,
): boolean {
  if (envelope.algorithm === 'ed25519') {
    return verifyEd25519(envelope, evidence, key as string);
  }
  if (envelope.algorithm === 'hmac-sha256') {
    return verifyHmac256(envelope, evidence, key);
  }
  return false;
}

// ── RFC 3161 Timestamp Authority Client ─────────────────────────────────────

/**
 * Encode a DER length field. Handles both short-form (0-127) and
 * long-form (128+) lengths per X.690 section 8.1.3.
 */
function derLength(length: number): Buffer {
  if (length < 0x80) {
    return Buffer.from([length]);
  }
  // Long form: first byte is 0x80 | number-of-length-bytes
  const lengthBytes: number[] = [];
  let remaining = length;
  while (remaining > 0) {
    lengthBytes.unshift(remaining & 0xff);
    remaining >>= 8;
  }
  return Buffer.from([0x80 | lengthBytes.length, ...lengthBytes]);
}

/**
 * Wrap content bytes in a DER tag-length-value structure.
 */
function derWrap(tag: number, content: Buffer): Buffer {
  return Buffer.concat([Buffer.from([tag]), derLength(content.length), content]);
}

/**
 * RFC 3161 Timestamp Request -- DER-encoded ASN.1 structure.
 *
 * Per RFC 3161 section 2.4.1:
 * - version: 1
 * - messageImprint: { hashAlgorithm: SHA-256, hashedMessage }
 * - nonce: random 8-byte value for replay protection
 * - certReq: true (request TSA certificate in response)
 *
 * Returns both the DER-encoded request and the nonce for response validation.
 */
export function buildTimestampRequest(evidenceHash: string): { request: Buffer; nonce: Buffer } {
  const nonce = randomBytes(8);

  // SHA-256 OID: 2.16.840.1.101.3.4.2.1
  const sha256OidBytes = Buffer.from([
    0x60, 0x86, 0x48, 0x01, 0x65, 0x03, 0x04, 0x02, 0x01,
  ]);
  const hashAlgorithm = derWrap(0x30, Buffer.concat([
    derWrap(0x06, sha256OidBytes),
    Buffer.from([0x05, 0x00]), // NULL parameters
  ]));

  const hashBytes = Buffer.from(evidenceHash, 'hex');
  const hashOctet = derWrap(0x04, hashBytes);

  // MessageImprint: SEQUENCE { hashAlgorithm, hashedMessage }
  const messageImprintSeq = derWrap(0x30, Buffer.concat([hashAlgorithm, hashOctet]));

  // Nonce: INTEGER
  const nonceField = derWrap(0x02, nonce);

  // CertReq: BOOLEAN TRUE
  const certReq = Buffer.from([0x01, 0x01, 0xff]);

  // Version: INTEGER 1
  const version = Buffer.from([0x02, 0x01, 0x01]);

  // TSP Request: SEQUENCE { version, messageImprint, nonce, certReq }
  const body = Buffer.concat([version, messageImprintSeq, nonceField, certReq]);
  return {
    request: derWrap(0x30, body),
    nonce,
  };
}

/**
 * Options for RFC 3161 timestamp request.
 */
export interface TimestampOptions {
  /** RFC 3161 TSA URL (must be HTTPS). */
  readonly tsaUrl: string;
  /** Allowed TSA URLs (allowlist from claws.json). Empty = no restriction. */
  readonly allowedTsaUrls?: readonly string[];
  /** Request timeout in ms (default: 10000). */
  readonly timeoutMs?: number;
}

/**
 * Validate that a TSA URL uses TLS and is in the allowlist.
 *
 * @throws Error if URL is not HTTPS or not in allowlist
 */
export function validateTsaUrl(url: string, allowlist?: readonly string[]): void {
  const parsed = new URL(url);
  if (parsed.protocol !== 'https:') {
    throw new Error(`TSA URL must use HTTPS: ${url}`);
  }
  if (allowlist && allowlist.length > 0 && !allowlist.includes(url)) {
    throw new Error(`TSA URL not in allowlist: ${url}. Allowed: ${allowlist.join(', ')}`);
  }
}

/**
 * Read a DER tag-length-value at the given offset.
 * Returns the tag, the content bytes, and the offset after the TLV.
 */
function derRead(buf: Buffer, offset: number): { tag: number; content: Buffer; end: number } {
  if (offset + 2 > buf.length) throw new Error('DER read past end of buffer');
  const tag = buf.readUInt8(offset++);
  let length = buf.readUInt8(offset++);
  if (length & 0x80) {
    const numBytes = length & 0x7f;
    if (offset + numBytes > buf.length) throw new Error('DER length field past end of buffer');
    length = 0;
    for (let i = 0; i < numBytes; i++) {
      length = (length << 8) | buf.readUInt8(offset++);
    }
  }
  const content = buf.subarray(offset, offset + length);
  return { tag, content, end: offset + length };
}

/**
 * PKIStatus values from RFC 3161 section 2.4.2.
 * 0 = granted, 1 = grantedWithMods, 2 = rejection, etc.
 */
const TSP_STATUS_GRANTED = 0;
const TSP_STATUS_GRANTED_WITH_MODS = 1;

/**
 * Validate an RFC 3161 TSP response.
 *
 * Checks:
 * 1. PKIStatus is 'granted' (0) or 'grantedWithMods' (1)
 * 2. Nonce in the TSTInfo matches the sent nonce
 * 3. MessageImprint hash in the TSTInfo matches the input evidenceHash
 *
 * @throws Error if the response is invalid or doesn't match the request
 */
export function validateTspResponse(
  responseBuffer: Buffer,
  sentNonce: Buffer,
  evidenceHash: string,
): void {
  // TimeStampResp ::= SEQUENCE { status PKIStatusInfo, timeStampToken [OPTIONAL] }
  const resp = derRead(responseBuffer, 0);
  if (resp.tag !== 0x30) throw new Error('TSP response: expected SEQUENCE');

  // PKIStatusInfo ::= SEQUENCE { status PKIStatus, ... }
  const statusInfo = derRead(resp.content, 0);
  if (statusInfo.tag !== 0x30) throw new Error('TSP response: expected PKIStatusInfo SEQUENCE');

  // PKIStatus ::= INTEGER
  const statusField = derRead(statusInfo.content, 0);
  if (statusField.tag !== 0x02) throw new Error('TSP response: expected PKIStatus INTEGER');
  const statusValue = statusField.content.length === 1 ? statusField.content[0] : -1;
  if (statusValue !== TSP_STATUS_GRANTED && statusValue !== TSP_STATUS_GRANTED_WITH_MODS) {
    throw new Error(`TSP response: status is ${statusValue}, expected granted (0) or grantedWithMods (1)`);
  }

  // timeStampToken is a ContentInfo (SEQUENCE) after PKIStatusInfo
  if (statusInfo.end >= resp.content.length) {
    throw new Error('TSP response: no timeStampToken present');
  }
  const contentInfo = derRead(resp.content, statusInfo.end);
  if (contentInfo.tag !== 0x30) throw new Error('TSP response: expected ContentInfo SEQUENCE');

  // ContentInfo ::= SEQUENCE { contentType OID, content [0] EXPLICIT }
  // Skip OID, read content [0] EXPLICIT
  const oid = derRead(contentInfo.content, 0);
  if (oid.end >= contentInfo.content.length) throw new Error('TSP response: no SignedData content');
  const explicitContent = derRead(contentInfo.content, oid.end);

  // SignedData ::= SEQUENCE { version, digestAlgorithms, encapContentInfo, ... }
  const signedData = derRead(explicitContent.content, 0);
  if (signedData.tag !== 0x30) throw new Error('TSP response: expected SignedData SEQUENCE');

  // Skip version INTEGER
  const sdVersion = derRead(signedData.content, 0);
  // Skip digestAlgorithms SET
  const digestAlgs = derRead(signedData.content, sdVersion.end);
  // encapContentInfo ::= SEQUENCE { eContentType OID, eContent [0] EXPLICIT }
  const encapContentInfo = derRead(signedData.content, digestAlgs.end);
  if (encapContentInfo.tag !== 0x30) throw new Error('TSP response: expected EncapsulatedContentInfo');

  const eContentType = derRead(encapContentInfo.content, 0);
  if (eContentType.end >= encapContentInfo.content.length) {
    throw new Error('TSP response: no eContent in EncapsulatedContentInfo');
  }
  const eContentExplicit = derRead(encapContentInfo.content, eContentType.end);
  // eContent is OCTET STRING
  const eContentOctet = derRead(eContentExplicit.content, 0);

  // TSTInfo ::= SEQUENCE { version, policy, messageImprint, serialNumber, genTime, ...nonce... }
  const tstInfo = derRead(eContentOctet.content, 0);
  if (tstInfo.tag !== 0x30) throw new Error('TSP response: expected TSTInfo SEQUENCE');

  // Parse TSTInfo fields sequentially
  const tstVersion = derRead(tstInfo.content, 0);          // version INTEGER
  const policy = derRead(tstInfo.content, tstVersion.end);  // policy OID
  const msgImprint = derRead(tstInfo.content, policy.end);  // messageImprint SEQUENCE
  const serial = derRead(tstInfo.content, msgImprint.end);  // serialNumber INTEGER
  const genTime = derRead(tstInfo.content, serial.end);     // genTime GeneralizedTime

  // Validate messageImprint: SEQUENCE { hashAlgorithm, hashedMessage }
  if (msgImprint.tag !== 0x30) throw new Error('TSP response: expected MessageImprint SEQUENCE');
  const miAlg = derRead(msgImprint.content, 0);
  const miHash = derRead(msgImprint.content, miAlg.end);
  if (miHash.tag !== 0x04) throw new Error('TSP response: expected hashedMessage OCTET STRING');
  const responseHash = miHash.content.toString('hex');
  if (responseHash !== evidenceHash) {
    throw new Error(`TSP response: messageImprint hash mismatch (expected ${evidenceHash}, got ${responseHash})`);
  }

  // Find nonce: next field after genTime. May have optional accuracy/ordering/extensions before nonce.
  // Nonce is an INTEGER (tag 0x02) that appears after genTime.
  let offset = genTime.end;
  let foundNonce = false;
  while (offset < tstInfo.content.length) {
    const field = derRead(tstInfo.content, offset);
    if (field.tag === 0x02) {
      // INTEGER -- this is the nonce (serialNumber was already consumed)
      if (!timingSafeEqual(field.content, sentNonce)) {
        throw new Error('TSP response: nonce mismatch');
      }
      foundNonce = true;
      break;
    }
    offset = field.end;
  }
  if (!foundNonce) {
    throw new Error('TSP response: nonce not found in TSTInfo');
  }
}

/**
 * Request an RFC 3161 timestamp from a Timestamp Authority.
 *
 * Sends a TimeStampReq to the TSA over HTTPS and returns the signed
 * timestamp response. The TSA URL must be HTTPS (TLS with certificate
 * validation) and optionally in a configured allowlist.
 *
 * Validates the TSP response: checks status is 'granted', nonce matches
 * the sent nonce, and messageImprint hash matches the input evidenceHash.
 *
 * @param evidenceHash - SHA-256 hash of the evidence to timestamp (hex)
 * @param options - TSA URL, allowlist, and timeout configuration
 * @returns TimestampToken with the TSA response
 * @throws Error if TSA URL is invalid, not HTTPS, request fails, or response validation fails
 */
export async function requestTimestamp(
  evidenceHash: string,
  options: TimestampOptions,
): Promise<TimestampToken> {
  validateTsaUrl(options.tsaUrl, options.allowedTsaUrls);

  const { request: tsReq, nonce } = buildTimestampRequest(evidenceHash);
  const timeoutMs = options.timeoutMs ?? 10_000;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(options.tsaUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/timestamp-query',
      },
      body: tsReq,
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`TSA request failed: HTTP ${response.status} ${response.statusText}`);
    }

    const responseBuffer = Buffer.from(await response.arrayBuffer());

    // Validate the TSP response: status, nonce, messageImprint
    validateTspResponse(responseBuffer, nonce, evidenceHash);

    return {
      tsaUrl: options.tsaUrl,
      hashedMessage: evidenceHash,
      timestampResponse: responseBuffer.toString('base64'),
      requestedAt: new Date().toISOString(),
    };
  } finally {
    clearTimeout(timer);
  }
}
