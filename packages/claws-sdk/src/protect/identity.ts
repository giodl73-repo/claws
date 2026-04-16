/**
 * Identity SSO module — OIDC/SAML provider configuration, role-to-tier
 * mapping, and claws.json persistence under the `identity` key.
 *
 * Enterprise customers map existing identity providers to claws's trust
 * tier model (T1–T5) so governance rules vary by authenticated role.
 *
 * @module claws-sdk/protect/identity
 */

import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { createHash, createVerify, randomBytes, timingSafeEqual } from 'node:crypto';
import type { TrustTier } from '../compile/types.js';
import type { IdentityConfig, IdentityProvider } from './types.js';
import { CLAWS_CONFIG_FILE } from '../types/sidecar.js';

// ── OIDC-specific types ───────────────────────────────────────────────

/** OIDC provider configuration for SSO registration. */
export interface OidcProviderConfig {
  readonly issuer: string;
  readonly clientId: string;
  readonly redirectUri: string;
  readonly scopes: readonly string[];
}

/** PKCE code challenge method. */
export type PkceMethod = 'S256';

/** PKCE parameters for OIDC authorization. */
export interface PkceParams {
  readonly codeVerifier: string;
  readonly codeChallenge: string;
  readonly codeChallengeMethod: PkceMethod;
}

/** JWT claims validated during token verification. */
export interface JwtClaims {
  readonly iss: string;
  readonly aud: string;
  readonly exp: number;
  readonly nonce?: string;
  readonly [key: string]: unknown;
}

/** JWKS key entry from identity provider. */
export interface JwksKey {
  readonly kty: string;
  readonly kid: string;
  readonly n: string;
  readonly e: string;
  readonly alg?: string;
}

// ── SAML-specific types ───────────────────────────────────────────────

/** SAML provider configuration for SSO registration. */
export interface SamlProviderConfig {
  readonly entityId: string;
  readonly ssoUrl: string;
  readonly certificate: string;
}

// ── Role mapping types ────────────────────────────────────────────────

/** Maps an IdP role string to a claws TrustTier. */
export interface RoleMapping {
  readonly [role: string]: TrustTier;
}

// ── Extended identity config for persistence ──────────────────────────

/** Full identity configuration persisted in claws.json under `identity`. */
export interface FullIdentityConfig {
  readonly provider: IdentityProvider;
  readonly oidc?: OidcProviderConfig;
  readonly saml?: SamlProviderConfig;
  readonly roleMapping: RoleMapping;
}

// ── Validation helpers ────────────────────────────────────────────────

const URL_PATTERN = /^https?:\/\/.+/;

/**
 * Validate an OIDC provider configuration.
 * @throws Error if any required field is missing or malformed.
 */
export function validateOidcConfig(config: OidcProviderConfig): void {
  if (!config.issuer || !URL_PATTERN.test(config.issuer)) {
    throw new Error('OIDC issuer must be a valid HTTP(S) URL');
  }
  if (!config.clientId || config.clientId.trim().length === 0) {
    throw new Error('OIDC clientId is required');
  }
  if (!config.redirectUri || !URL_PATTERN.test(config.redirectUri)) {
    throw new Error('OIDC redirectUri must be a valid HTTP(S) URL');
  }
  if (!Array.isArray(config.scopes) || config.scopes.length === 0) {
    throw new Error('OIDC scopes must be a non-empty array');
  }
}

/**
 * Validate a SAML provider configuration.
 * @throws Error if any required field is missing or malformed.
 */
export function validateSamlConfig(config: SamlProviderConfig): void {
  if (!config.entityId || config.entityId.trim().length === 0) {
    throw new Error('SAML entityId is required');
  }
  if (!config.ssoUrl || !URL_PATTERN.test(config.ssoUrl)) {
    throw new Error('SAML ssoUrl must be a valid HTTP(S) URL');
  }
  if (!config.certificate || config.certificate.trim().length === 0) {
    throw new Error('SAML certificate is required');
  }
}

// ── PKCE ──────────────────────────────────────────────────────────────

/**
 * Generate PKCE parameters for OIDC authorization code flow.
 * Uses S256 (SHA-256) challenge method per RFC 7636.
 */
export function generatePkce(): PkceParams {
  const codeVerifier = randomBytes(32).toString('base64url');
  const codeChallenge = createHash('sha256')
    .update(codeVerifier)
    .digest('base64url');
  return {
    codeVerifier,
    codeChallenge,
    codeChallengeMethod: 'S256',
  };
}

/**
 * Verify a PKCE code challenge against the verifier.
 * @returns true if the challenge matches the verifier.
 */
export function verifyPkce(codeVerifier: string, codeChallenge: string): boolean {
  const expected = createHash('sha256')
    .update(codeVerifier)
    .digest('base64url');
  const bufExpected = Buffer.from(expected, 'utf-8');
  const bufChallenge = Buffer.from(codeChallenge, 'utf-8');
  if (bufExpected.length !== bufChallenge.length) return false;
  return timingSafeEqual(bufExpected, bufChallenge);
}

/**
 * Validate that PKCE parameters are present for OIDC flows.
 * @throws Error if code_challenge is missing.
 */
export function requirePkce(params: { codeChallenge?: string }): void {
  if (!params.codeChallenge) {
    throw new Error('PKCE code_challenge is required for all OIDC flows');
  }
}

// ── JWT verification ──────────────────────────────────────────────────

/** Clock skew tolerance for JWT exp validation (seconds). */
const CLOCK_SKEW_TOLERANCE = 300; // 5 minutes

/**
 * Decode a JWT without verification (for claim inspection).
 * Does NOT validate the signature — use verifyJwt for that.
 */
export function decodeJwt(token: string): { header: Record<string, unknown>; payload: JwtClaims } {
  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new Error('Invalid JWT: expected 3 parts');
  }
  const header = JSON.parse(Buffer.from(parts[0]!, 'base64url').toString()) as Record<string, unknown>;
  const payload = JSON.parse(Buffer.from(parts[1]!, 'base64url').toString()) as JwtClaims;
  return { header, payload };
}

/**
 * Verify JWT signature against a JWKS key.
 *
 * @param token - The raw JWT string
 * @param jwksKey - The public key from the JWKS endpoint
 * @returns true if signature is valid
 */
export function verifyJwtSignature(token: string, jwksKey: JwksKey): boolean {
  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new Error('Invalid JWT: expected 3 parts');
  }
  const signedContent = `${parts[0]}.${parts[1]}`;
  const signature = Buffer.from(parts[2]!, 'base64url');

  const keyObject = {
    kty: jwksKey.kty,
    n: jwksKey.n,
    e: jwksKey.e,
  };
  const pem = jwkToPem(keyObject);

  const verifier = createVerify('RSA-SHA256');
  verifier.update(signedContent);
  return verifier.verify(pem, signature);
}

/**
 * Validate JWT claims: issuer, audience, expiry with clock skew.
 * @throws Error if any claim validation fails.
 */
export function validateJwtClaims(
  claims: JwtClaims,
  expectedIssuer: string,
  expectedAudience: string,
  expectedNonce?: string,
): void {
  if (claims.iss !== expectedIssuer) {
    throw new Error(`JWT issuer mismatch: expected "${expectedIssuer}", got "${claims.iss}"`);
  }
  if (claims.aud !== expectedAudience) {
    throw new Error(`JWT audience mismatch: expected "${expectedAudience}", got "${claims.aud}"`);
  }
  const now = Math.floor(Date.now() / 1000);
  if (claims.exp < now - CLOCK_SKEW_TOLERANCE) {
    throw new Error('JWT has expired');
  }
  // Reject tokens with nbf in the future (beyond clock skew tolerance)
  if (typeof claims['nbf'] === 'number' && claims['nbf'] > now + CLOCK_SKEW_TOLERANCE) {
    throw new Error('JWT not yet valid (nbf is in the future)');
  }
  // Reject tokens with iat too far in the future (beyond clock skew tolerance)
  if (typeof claims['iat'] === 'number' && claims['iat'] > now + CLOCK_SKEW_TOLERANCE) {
    throw new Error('JWT issued-at is in the future (iat exceeds clock skew tolerance)');
  }
  if (expectedNonce !== undefined && claims.nonce !== expectedNonce) {
    throw new Error('JWT nonce mismatch');
  }
}

/**
 * Convert a JWK RSA key to PEM format.
 * Minimal implementation for RSA keys from JWKS endpoints.
 */
function jwkToPem(jwk: { kty: string; n: string; e: string }): string {
  if (jwk.kty !== 'RSA') {
    throw new Error(`Unsupported key type: ${jwk.kty}`);
  }
  const n = Buffer.from(jwk.n, 'base64url');
  const e = Buffer.from(jwk.e, 'base64url');

  // DER encode the RSA public key
  const nEncoded = encodeUnsignedInteger(n);
  const eEncoded = encodeUnsignedInteger(e);
  const rsaSequence = encodeDerSequence(Buffer.concat([nEncoded, eEncoded]));
  const bitString = Buffer.concat([
    Buffer.from([0x03]),
    encodeDerLength(rsaSequence.length + 1),
    Buffer.from([0x00]),
    rsaSequence,
  ]);

  // RSA OID: 1.2.840.113549.1.1.1
  const rsaOid = Buffer.from([
    0x30, 0x0d, 0x06, 0x09, 0x2a, 0x86, 0x48, 0x86,
    0xf7, 0x0d, 0x01, 0x01, 0x01, 0x05, 0x00,
  ]);
  const outer = encodeDerSequence(Buffer.concat([rsaOid, bitString]));
  const b64 = outer.toString('base64');
  const lines = b64.match(/.{1,64}/g) ?? [];
  return `-----BEGIN PUBLIC KEY-----\n${lines.join('\n')}\n-----END PUBLIC KEY-----`;
}

function encodeUnsignedInteger(buf: Buffer): Buffer {
  // Prepend 0x00 if high bit is set (to keep it positive in ASN.1)
  const needsPad = buf[0]! >= 0x80;
  const content = needsPad ? Buffer.concat([Buffer.from([0x00]), buf]) : buf;
  return Buffer.concat([
    Buffer.from([0x02]),
    encodeDerLength(content.length),
    content,
  ]);
}

function encodeDerLength(length: number): Buffer {
  if (length < 0x80) {
    return Buffer.from([length]);
  }
  if (length < 0x100) {
    return Buffer.from([0x81, length]);
  }
  return Buffer.from([0x82, (length >> 8) & 0xff, length & 0xff]);
}

function encodeDerSequence(content: Buffer): Buffer {
  return Buffer.concat([
    Buffer.from([0x30]),
    encodeDerLength(content.length),
    content,
  ]);
}

// ── SAML certificate validation ───────────────────────────────────────

/**
 * Validate a SAML certificate chain. Rejects self-signed certificates
 * (where issuer === subject) unless explicitly allowed.
 *
 * @param certificate - PEM-encoded X.509 certificate
 * @param allowSelfSigned - If true, self-signed certs pass (default: false)
 * @throws Error if certificate is self-signed and not allowed
 */
export function validateSamlCertChain(
  certificate: string,
  allowSelfSigned: boolean = false,
): void {
  if (!certificate.includes('-----BEGIN CERTIFICATE-----')) {
    throw new Error('SAML certificate must be PEM-encoded X.509');
  }

  // Extract the DER content to check issuer vs subject
  const b64 = certificate
    .replace(/-----BEGIN CERTIFICATE-----/g, '')
    .replace(/-----END CERTIFICATE-----/g, '')
    .replace(/\s+/g, '');

  if (b64.length === 0) {
    throw new Error('SAML certificate is empty');
  }

  const der = Buffer.from(b64, 'base64');

  // Minimal ASN.1 check: if issuer and subject occupy the same DER offsets,
  // the cert is self-signed. We use a simplified heuristic: compute a hash
  // of the certificate subject and issuer name fields. For self-signed certs,
  // these are identical.
  const isSelfSigned = checkSelfSigned(der);

  if (isSelfSigned && !allowSelfSigned) {
    throw new Error('SAML certificate is self-signed; enterprise deployments require CA-issued certificates');
  }
}

/**
 * Heuristic check for self-signed certificates.
 * Parses the TBS certificate to compare issuer and subject name fields.
 */
function checkSelfSigned(der: Buffer): boolean {
  // The TBS certificate is the first SEQUENCE inside the outer SEQUENCE.
  // Structure: SEQUENCE { tbsCert SEQUENCE, sigAlg, sig }
  // tbsCert: SEQUENCE { version, serial, sigAlg, issuer, validity, subject, ... }
  // We hash the issuer and subject DER blobs and compare.
  try {
    let offset = 0;
    // Outer SEQUENCE
    if (der[offset] !== 0x30) return false;
    offset++;
    const outerLen = readDerLength(der, offset);
    offset = outerLen.nextOffset;

    // TBS SEQUENCE
    if (der[offset] !== 0x30) return false;
    offset++;
    const tbsLen = readDerLength(der, offset);
    offset = tbsLen.nextOffset;

    // Skip version (context tag [0]) if present
    if (der[offset] === 0xa0) {
      offset++;
      const vLen = readDerLength(der, offset);
      offset = vLen.nextOffset + vLen.length;
    }

    // Skip serial INTEGER
    if (der[offset] !== 0x02) return false;
    offset++;
    const serialLen = readDerLength(der, offset);
    offset = serialLen.nextOffset + serialLen.length;

    // Skip signature algorithm SEQUENCE
    if (der[offset] !== 0x30) return false;
    offset++;
    const sigAlgLen = readDerLength(der, offset);
    offset = sigAlgLen.nextOffset + sigAlgLen.length;

    // Issuer Name SEQUENCE
    if (der[offset] !== 0x30) return false;
    const issuerStart = offset;
    offset++;
    const issuerLen = readDerLength(der, offset);
    const issuerEnd = issuerLen.nextOffset + issuerLen.length;
    const issuerDer = der.subarray(issuerStart, issuerEnd);
    offset = issuerEnd;

    // Skip validity SEQUENCE
    if (der[offset] !== 0x30) return false;
    offset++;
    const validityLen = readDerLength(der, offset);
    offset = validityLen.nextOffset + validityLen.length;

    // Subject Name SEQUENCE
    if (der[offset] !== 0x30) return false;
    const subjectStart = offset;
    offset++;
    const subjectLen = readDerLength(der, offset);
    const subjectEnd = subjectLen.nextOffset + subjectLen.length;
    const subjectDer = der.subarray(subjectStart, subjectEnd);

    // Compare issuer and subject
    const issuerHash = createHash('sha256').update(issuerDer).digest('hex');
    const subjectHash = createHash('sha256').update(subjectDer).digest('hex');

    return issuerHash === subjectHash;
  } catch {
    // If parsing fails, assume not self-signed (err on the side of permissive)
    return false;
  }
}

function readDerLength(buf: Buffer, offset: number): { length: number; nextOffset: number } {
  const first = buf[offset]!;
  if (first < 0x80) {
    return { length: first, nextOffset: offset + 1 };
  }
  const numBytes = first & 0x7f;
  let length = 0;
  for (let i = 0; i < numBytes; i++) {
    length = (length << 8) | buf[offset + 1 + i]!;
  }
  return { length, nextOffset: offset + 1 + numBytes };
}

// ── Role-to-tier mapping ──────────────────────────────────────────────

/**
 * Map an IdP role string to a claws TrustTier using the provided mapping.
 *
 * @param role - The role string from the identity provider
 * @param mapping - Record of role string → TrustTier
 * @returns The TrustTier for the role
 * @throws Error if the role is not found in the mapping
 */
export function mapRoleToTier(role: string, mapping: RoleMapping): TrustTier {
  const tier = mapping[role];
  if (tier === undefined) {
    throw new Error(`Role "${role}" has no trust tier mapping`);
  }
  if (tier < 1 || tier > 5 || !Number.isInteger(tier)) {
    throw new Error(`Invalid trust tier ${tier} for role "${role}": must be 1–5`);
  }
  return tier;
}

// ── claws.json persistence ────────────────────────────────────────────

/**
 * Configure identity in claws.json.
 *
 * Validates the config, then persists it under the `identity` key
 * in claws.json at the workspace root. Creates claws.json if it
 * doesn't exist.
 *
 * @param workspacePath - Absolute path to workspace root
 * @param config - Full identity configuration to persist
 */
export async function configureIdentity(
  workspacePath: string,
  config: FullIdentityConfig,
): Promise<void> {
  // Validate provider-specific config
  if (config.provider === 'OIDC') {
    if (!config.oidc) {
      throw new Error('OIDC provider config is required when provider is OIDC');
    }
    validateOidcConfig(config.oidc);
  } else if (config.provider === 'SAML') {
    if (!config.saml) {
      throw new Error('SAML provider config is required when provider is SAML');
    }
    validateSamlConfig(config.saml);
  }

  // Read existing claws.json or start fresh
  const configPath = join(workspacePath, CLAWS_CONFIG_FILE);
  let existing: Record<string, unknown> = {};
  try {
    const raw = await readFile(configPath, 'utf-8');
    existing = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    // File doesn't exist or invalid — start fresh
  }

  // Write identity config under the `identity` key
  existing['identity'] = {
    provider: config.provider,
    ...(config.oidc ? { oidc: config.oidc } : {}),
    ...(config.saml ? { saml: config.saml } : {}),
    roleMapping: config.roleMapping,
  };

  await writeFile(configPath, JSON.stringify(existing, null, 2) + '\n', 'utf-8');
}

/**
 * Read identity configuration from claws.json.
 *
 * @param workspacePath - Absolute path to workspace root
 * @returns The persisted identity config, or null if not configured
 */
export async function getIdentity(
  workspacePath: string,
): Promise<FullIdentityConfig | null> {
  const configPath = join(workspacePath, CLAWS_CONFIG_FILE);
  try {
    const raw = await readFile(configPath, 'utf-8');
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (!parsed['identity']) {
      return null;
    }
    return parsed['identity'] as FullIdentityConfig;
  } catch {
    return null;
  }
}
