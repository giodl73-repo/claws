/**
 * L0: Identity SSO — OIDC/SAML validation, role-to-tier mapping,
 * PKCE, JWT verification, SAML cert chain validation,
 * claws.json identity persistence.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { generateKeyPairSync, createSign, randomBytes } from 'node:crypto';
import { mkdtemp, rm, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  validateOidcConfig,
  validateSamlConfig,
  mapRoleToTier,
  generatePkce,
  requirePkce,
  verifyPkce,
  verifyJwtSignature,
  decodeJwt,
  validateJwtClaims,
  validateSamlCertChain,
  configureIdentity,
  getIdentity,
} from '../../src/protect/identity.js';
import type {
  OidcProviderConfig,
  SamlProviderConfig,
  RoleMapping,
  JwksKey,
  FullIdentityConfig,
} from '../../src/protect/identity.js';

// ── Helpers ───────────────────────────────────────────────────────────

function makeJwt(
  payload: Record<string, unknown>,
  privateKey: string,
): string {
  const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signedContent = `${header}.${body}`;
  const signer = createSign('RSA-SHA256');
  signer.update(signedContent);
  const signature = signer.sign(privateKey, 'base64url');
  return `${signedContent}.${signature}`;
}

function rsaKeyToJwk(publicKey: string): JwksKey {
  // Extract the modulus and exponent from the PEM
  const keyObj = require('node:crypto').createPublicKey(publicKey);
  const exported = keyObj.export({ type: 'pkcs1', format: 'der' }) as Buffer;

  // Parse the DER to extract n and e
  // PKCS#1 RSA Public Key: SEQUENCE { INTEGER n, INTEGER e }
  let offset = 0;
  // Outer SEQUENCE
  offset++; // tag 0x30
  const outerLen = readTestDerLength(exported, offset);
  offset = outerLen.nextOffset;

  // n INTEGER
  offset++; // tag 0x02
  const nLen = readTestDerLength(exported, offset);
  offset = nLen.nextOffset;
  let nBuf = exported.subarray(offset, offset + nLen.length);
  // Strip leading zero padding
  if (nBuf[0] === 0x00) nBuf = nBuf.subarray(1);
  offset += nLen.length;

  // e INTEGER
  offset++; // tag 0x02
  const eLen = readTestDerLength(exported, offset);
  offset = eLen.nextOffset;
  const eBuf = exported.subarray(offset, offset + eLen.length);

  return {
    kty: 'RSA',
    kid: 'test-key-1',
    n: nBuf.toString('base64url'),
    e: eBuf.toString('base64url'),
  };
}

function readTestDerLength(buf: Buffer, offset: number): { length: number; nextOffset: number } {
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

// ── Self-signed certificate for test ──────────────────────────────────

function generateSelfSignedCert(): string {
  const { execSync } = require('node:child_process');
  // Use Node's crypto to generate a self-signed cert
  // Since we need a real X.509 cert, use openssl if available or build one manually
  // For testing, we'll construct a minimal self-signed cert using node:crypto
  const { privateKey, publicKey } = generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  });

  // Use X509Certificate to create a self-signed cert
  // Node 15+ has the crypto.X509Certificate but generating one requires external tools
  // For the test, we'll build a minimal DER-encoded self-signed cert
  return buildSelfSignedCert(privateKey, publicKey);
}

function buildSelfSignedCert(privateKeyPem: string, publicKeyPem: string): string {
  // Minimal self-signed X.509 cert where issuer === subject
  // This is a simplified construction for testing the self-signed detection
  const crypto = require('node:crypto');

  const subjectName = buildX509Name('CN=Test Self-Signed');
  const issuerName = subjectName; // Same as subject = self-signed

  const publicKeyDer = crypto.createPublicKey(publicKeyPem).export({ type: 'spki', format: 'der' }) as Buffer;

  // Build TBS certificate
  const version = Buffer.from([0xa0, 0x03, 0x02, 0x01, 0x02]); // v3
  const serial = Buffer.concat([Buffer.from([0x02, 0x01]), Buffer.from([0x01])]); // serial 1
  const sigAlg = Buffer.from([
    0x30, 0x0d, 0x06, 0x09, 0x2a, 0x86, 0x48, 0x86,
    0xf7, 0x0d, 0x01, 0x01, 0x0b, 0x05, 0x00,
  ]); // SHA256WithRSA
  const validity = buildValidity();

  const tbsContent = Buffer.concat([
    version, serial, sigAlg, issuerName, validity, subjectName, publicKeyDer,
  ]);
  const tbs = buildDerSequence(tbsContent);

  // Sign the TBS
  const signer = crypto.createSign('RSA-SHA256');
  signer.update(tbs);
  const sigBytes = signer.sign(privateKeyPem) as Buffer;
  const sigBitString = Buffer.concat([
    Buffer.from([0x03]),
    buildTestDerLength(sigBytes.length + 1),
    Buffer.from([0x00]),
    sigBytes,
  ]);

  const cert = buildDerSequence(Buffer.concat([tbs, sigAlg, sigBitString]));
  const b64 = cert.toString('base64');
  const lines = b64.match(/.{1,64}/g) ?? [];
  return `-----BEGIN CERTIFICATE-----\n${lines.join('\n')}\n-----END CERTIFICATE-----`;
}

function buildX509Name(cn: string): Buffer {
  const value = cn.replace('CN=', '');
  const utf8Val = Buffer.from(value, 'utf-8');
  const attrValue = Buffer.concat([Buffer.from([0x0c]), buildTestDerLength(utf8Val.length), utf8Val]); // UTF8String
  const cnOid = Buffer.from([0x06, 0x03, 0x55, 0x04, 0x03]); // OID 2.5.4.3 (CN)
  const attrSeq = buildDerSequence(Buffer.concat([cnOid, attrValue]));
  const rdnSet = Buffer.concat([Buffer.from([0x31]), buildTestDerLength(attrSeq.length), attrSeq]);
  return buildDerSequence(rdnSet);
}

function buildValidity(): Buffer {
  // Not Before: 2024-01-01, Not After: 2030-01-01
  const notBefore = Buffer.from([0x17, 0x0d, ...Buffer.from('240101000000Z', 'ascii')]);
  const notAfter = Buffer.from([0x17, 0x0d, ...Buffer.from('300101000000Z', 'ascii')]);
  return buildDerSequence(Buffer.concat([notBefore, notAfter]));
}

function buildDerSequence(content: Buffer): Buffer {
  return Buffer.concat([Buffer.from([0x30]), buildTestDerLength(content.length), content]);
}

function buildTestDerLength(length: number): Buffer {
  if (length < 0x80) return Buffer.from([length]);
  if (length < 0x100) return Buffer.from([0x81, length]);
  return Buffer.from([0x82, (length >> 8) & 0xff, length & 0xff]);
}

// ── A CA-issued cert (issuer !== subject) ─────────────────────────────

function buildCaIssuedCert(privateKeyPem: string, publicKeyPem: string): string {
  const crypto = require('node:crypto');

  const issuerName = buildX509Name('CN=Test CA');
  const subjectName = buildX509Name('CN=Test Leaf');

  const publicKeyDer = crypto.createPublicKey(publicKeyPem).export({ type: 'spki', format: 'der' }) as Buffer;

  const version = Buffer.from([0xa0, 0x03, 0x02, 0x01, 0x02]);
  const serial = Buffer.concat([Buffer.from([0x02, 0x01]), Buffer.from([0x02])]);
  const sigAlg = Buffer.from([
    0x30, 0x0d, 0x06, 0x09, 0x2a, 0x86, 0x48, 0x86,
    0xf7, 0x0d, 0x01, 0x01, 0x0b, 0x05, 0x00,
  ]);
  const validity = buildValidity();

  const tbsContent = Buffer.concat([
    version, serial, sigAlg, issuerName, validity, subjectName, publicKeyDer,
  ]);
  const tbs = buildDerSequence(tbsContent);

  const signer = crypto.createSign('RSA-SHA256');
  signer.update(tbs);
  const sigBytes = signer.sign(privateKeyPem) as Buffer;
  const sigBitString = Buffer.concat([
    Buffer.from([0x03]),
    buildTestDerLength(sigBytes.length + 1),
    Buffer.from([0x00]),
    sigBytes,
  ]);

  const cert = buildDerSequence(Buffer.concat([tbs, sigAlg, sigBitString]));
  const b64 = cert.toString('base64');
  const lines = b64.match(/.{1,64}/g) ?? [];
  return `-----BEGIN CERTIFICATE-----\n${lines.join('\n')}\n-----END CERTIFICATE-----`;
}

// ── Tests ─────────────────────────────────────────────────────────────

describe('OIDC config validation', () => {
  it('accepts valid issuer/clientId/redirectUri/scopes', () => {
    const config: OidcProviderConfig = {
      issuer: 'https://login.microsoftonline.com/tenant-id/v2.0',
      clientId: 'app-12345',
      redirectUri: 'https://localhost:3000/callback',
      scopes: ['openid', 'profile', 'email'],
    };

    expect(() => validateOidcConfig(config)).not.toThrow();
  });

  it('rejects missing issuer', () => {
    const config = {
      issuer: '',
      clientId: 'app-12345',
      redirectUri: 'https://localhost:3000/callback',
      scopes: ['openid'],
    } as OidcProviderConfig;

    expect(() => validateOidcConfig(config)).toThrow('OIDC issuer must be a valid HTTP(S) URL');
  });

  it('rejects empty clientId', () => {
    const config = {
      issuer: 'https://login.example.com',
      clientId: '  ',
      redirectUri: 'https://localhost:3000/callback',
      scopes: ['openid'],
    } as OidcProviderConfig;

    expect(() => validateOidcConfig(config)).toThrow('OIDC clientId is required');
  });
});

describe('SAML config validation', () => {
  it('accepts valid entityId/ssoUrl/certificate', () => {
    const config: SamlProviderConfig = {
      entityId: 'urn:example:sp',
      ssoUrl: 'https://idp.example.com/sso',
      certificate: '-----BEGIN CERTIFICATE-----\nMIIB...\n-----END CERTIFICATE-----',
    };

    expect(() => validateSamlConfig(config)).not.toThrow();
  });

  it('rejects missing entityId', () => {
    const config = {
      entityId: '',
      ssoUrl: 'https://idp.example.com/sso',
      certificate: 'cert-data',
    } as SamlProviderConfig;

    expect(() => validateSamlConfig(config)).toThrow('SAML entityId is required');
  });
});

describe('role-to-tier mapping', () => {
  it('maps security-admin to T4 and read-only-user to T1', () => {
    const mapping: RoleMapping = {
      'security-admin': 4,
      'read-only-user': 1,
      'developer': 2,
      'ops-lead': 3,
      'super-admin': 5,
    };

    expect(mapRoleToTier('security-admin', mapping)).toBe(4);
    expect(mapRoleToTier('read-only-user', mapping)).toBe(1);
    expect(mapRoleToTier('developer', mapping)).toBe(2);
    expect(mapRoleToTier('ops-lead', mapping)).toBe(3);
    expect(mapRoleToTier('super-admin', mapping)).toBe(5);
  });

  it('throws for unmapped roles', () => {
    const mapping: RoleMapping = { admin: 4 };
    expect(() => mapRoleToTier('unknown-role', mapping)).toThrow(
      'Role "unknown-role" has no trust tier mapping',
    );
  });
});

describe('PKCE code_challenge required for OIDC flows', () => {
  it('throws when code_challenge is missing', () => {
    expect(() => requirePkce({})).toThrow('PKCE code_challenge is required');
    expect(() => requirePkce({ codeChallenge: '' })).toThrow('PKCE code_challenge is required');
  });

  it('passes when code_challenge is present', () => {
    const pkce = generatePkce();
    expect(() => requirePkce({ codeChallenge: pkce.codeChallenge })).not.toThrow();
  });

  it('generates valid PKCE pairs that verify', () => {
    const pkce = generatePkce();
    expect(pkce.codeChallengeMethod).toBe('S256');
    expect(pkce.codeVerifier.length).toBeGreaterThan(0);
    expect(pkce.codeChallenge.length).toBeGreaterThan(0);
    expect(verifyPkce(pkce.codeVerifier, pkce.codeChallenge)).toBe(true);
    expect(verifyPkce('wrong-verifier', pkce.codeChallenge)).toBe(false);
  });
});

describe('JWT signature verification against JWKS', () => {
  it('verifies a valid RS256 JWT and rejects tampered tokens', () => {
    const { privateKey, publicKey } = generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: { type: 'pkcs1', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    });

    const jwk = rsaKeyToJwk(publicKey);
    const now = Math.floor(Date.now() / 1000);
    const token = makeJwt(
      { iss: 'https://login.example.com', aud: 'app-123', exp: now + 3600, sub: 'user1' },
      privateKey,
    );

    expect(verifyJwtSignature(token, jwk)).toBe(true);

    // Tampered payload
    const parts = token.split('.');
    const tamperedPayload = Buffer.from(JSON.stringify({ iss: 'attacker', aud: 'x', exp: now + 3600 })).toString('base64url');
    const tampered = `${parts[0]}.${tamperedPayload}.${parts[2]}`;
    expect(verifyJwtSignature(tampered, jwk)).toBe(false);
  });

  it('validates iss, aud, and exp claims', () => {
    const now = Math.floor(Date.now() / 1000);
    const claims = { iss: 'https://login.example.com', aud: 'app-123', exp: now + 3600 };

    expect(() => validateJwtClaims(claims, 'https://login.example.com', 'app-123')).not.toThrow();
    expect(() => validateJwtClaims(claims, 'https://wrong.com', 'app-123')).toThrow('issuer mismatch');
    expect(() => validateJwtClaims(claims, 'https://login.example.com', 'wrong-aud')).toThrow('audience mismatch');

    const expired = { ...claims, exp: now - 600 };
    expect(() => validateJwtClaims(expired, 'https://login.example.com', 'app-123')).toThrow('expired');
  });
});

describe('SAML cert chain validation rejects self-signed', () => {
  it('rejects self-signed certificates', () => {
    const { privateKey, publicKey } = generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    });

    const selfSignedCert = buildSelfSignedCert(privateKey, publicKey);
    expect(() => validateSamlCertChain(selfSignedCert)).toThrow('self-signed');
  });

  it('accepts CA-issued certificates (issuer !== subject)', () => {
    const { privateKey, publicKey } = generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    });

    const caIssuedCert = buildCaIssuedCert(privateKey, publicKey);
    expect(() => validateSamlCertChain(caIssuedCert)).not.toThrow();
  });

  it('rejects non-PEM certificates', () => {
    expect(() => validateSamlCertChain('not-a-pem')).toThrow('PEM-encoded');
  });

  it('allows self-signed when explicitly permitted', () => {
    const { privateKey, publicKey } = generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    });

    const selfSignedCert = buildSelfSignedCert(privateKey, publicKey);
    expect(() => validateSamlCertChain(selfSignedCert, true)).not.toThrow();
  });

  it('rejects empty certificate body', () => {
    const emptyCert = '-----BEGIN CERTIFICATE-----\n-----END CERTIFICATE-----';
    expect(() => validateSamlCertChain(emptyCert)).toThrow('SAML certificate is empty');
  });

  it('handles malformed DER gracefully (not self-signed)', () => {
    // Random garbage that starts with valid PEM markers but has invalid DER
    const garbageDer = Buffer.from([0xFF, 0xFF, 0xFF, 0x01, 0x02]).toString('base64');
    const malformedCert = `-----BEGIN CERTIFICATE-----\n${garbageDer}\n-----END CERTIFICATE-----`;
    // checkSelfSigned catch block returns false → not self-signed → no error
    expect(() => validateSamlCertChain(malformedCert)).not.toThrow();
  });
});

// ── Additional OIDC validation branches ───────────────────────────────

describe('OIDC config validation — additional branches', () => {
  it('rejects non-URL issuer', () => {
    const config: OidcProviderConfig = {
      issuer: 'not-a-url',
      clientId: 'app-123',
      redirectUri: 'https://localhost/callback',
      scopes: ['openid'],
    };
    expect(() => validateOidcConfig(config)).toThrow('OIDC issuer must be a valid HTTP(S) URL');
  });

  it('rejects non-URL redirectUri', () => {
    const config: OidcProviderConfig = {
      issuer: 'https://login.example.com',
      clientId: 'app-123',
      redirectUri: 'not-a-url',
      scopes: ['openid'],
    };
    expect(() => validateOidcConfig(config)).toThrow('OIDC redirectUri must be a valid HTTP(S) URL');
  });

  it('rejects empty scopes array', () => {
    const config: OidcProviderConfig = {
      issuer: 'https://login.example.com',
      clientId: 'app-123',
      redirectUri: 'https://localhost/callback',
      scopes: [],
    };
    expect(() => validateOidcConfig(config)).toThrow('OIDC scopes must be a non-empty array');
  });
});

// ── Additional SAML validation branches ───────────────────────────────

describe('SAML config validation — additional branches', () => {
  it('rejects non-URL ssoUrl', () => {
    const config: SamlProviderConfig = {
      entityId: 'urn:example:sp',
      ssoUrl: 'not-a-url',
      certificate: 'cert-data',
    };
    expect(() => validateSamlConfig(config)).toThrow('SAML ssoUrl must be a valid HTTP(S) URL');
  });

  it('rejects empty certificate', () => {
    const config: SamlProviderConfig = {
      entityId: 'urn:example:sp',
      ssoUrl: 'https://idp.example.com/sso',
      certificate: '  ',
    };
    expect(() => validateSamlConfig(config)).toThrow('SAML certificate is required');
  });
});

// ── Role-to-tier mapping — additional branches ────────────────────────

describe('role-to-tier mapping — invalid tiers', () => {
  it('rejects non-integer tier', () => {
    const mapping: RoleMapping = { admin: 2.5 as never };
    expect(() => mapRoleToTier('admin', mapping)).toThrow(
      /Invalid trust tier.*must be 1–5/,
    );
  });

  it('rejects tier below 1', () => {
    const mapping: RoleMapping = { admin: 0 as never };
    expect(() => mapRoleToTier('admin', mapping)).toThrow(
      /Invalid trust tier.*must be 1–5/,
    );
  });

  it('rejects tier above 5', () => {
    const mapping: RoleMapping = { admin: 6 as never };
    expect(() => mapRoleToTier('admin', mapping)).toThrow(
      /Invalid trust tier.*must be 1–5/,
    );
  });
});

// ── PKCE — length mismatch branch ─────────────────────────────────────

describe('PKCE verification — length mismatch', () => {
  it('returns false for different length challenges', () => {
    expect(verifyPkce('short', 'much-longer-challenge-value')).toBe(false);
  });
});

// ── JWT decode ────────────────────────────────────────────────────────

describe('JWT decode', () => {
  it('decodes header and payload without verifying signature', () => {
    const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
    const payload = Buffer.from(JSON.stringify({ iss: 'https://test.com', aud: 'app', exp: 99999999999 })).toString('base64url');
    const fakeSignature = Buffer.from('fake-sig').toString('base64url');
    const token = `${header}.${payload}.${fakeSignature}`;

    const decoded = decodeJwt(token);
    expect(decoded.header.alg).toBe('RS256');
    expect(decoded.payload.iss).toBe('https://test.com');
    expect(decoded.payload.aud).toBe('app');
  });

  it('throws on malformed JWT (not 3 parts)', () => {
    expect(() => decodeJwt('only.two')).toThrow('Invalid JWT: expected 3 parts');
    expect(() => decodeJwt('just-one')).toThrow('Invalid JWT: expected 3 parts');
  });
});

// ── JWT signature verification — malformed token ──────────────────────

describe('JWT signature verification — edge cases', () => {
  it('throws on malformed token (not 3 parts)', () => {
    const jwk: JwksKey = { kty: 'RSA', kid: 'k1', n: 'test', e: 'AQAB' };
    expect(() => verifyJwtSignature('not.valid', jwk)).toThrow('Invalid JWT: expected 3 parts');
  });

  it('rejects non-RSA key type in jwkToPem', () => {
    const { privateKey, publicKey } = generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: { type: 'pkcs1', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    });

    const jwk = rsaKeyToJwk(publicKey);
    const token = makeJwt(
      { iss: 'test', aud: 'app', exp: Math.floor(Date.now() / 1000) + 3600 },
      privateKey,
    );

    // Override kty to trigger the jwkToPem error
    const badJwk: JwksKey = { ...jwk, kty: 'EC' };
    expect(() => verifyJwtSignature(token, badJwk)).toThrow('Unsupported key type: EC');
  });
});

// ── JWT claims validation — additional branches ───────────────────────

describe('JWT claims validation — additional branches', () => {
  it('rejects JWT with nbf in the future', () => {
    const now = Math.floor(Date.now() / 1000);
    const claims = {
      iss: 'https://login.example.com',
      aud: 'app-123',
      exp: now + 3600,
      nbf: now + 600, // 10 min in future, beyond 5 min clock skew
    };
    expect(() => validateJwtClaims(claims, 'https://login.example.com', 'app-123')).toThrow(
      'JWT not yet valid',
    );
  });

  it('accepts JWT with nbf within clock skew tolerance', () => {
    const now = Math.floor(Date.now() / 1000);
    const claims = {
      iss: 'https://login.example.com',
      aud: 'app-123',
      exp: now + 3600,
      nbf: now + 100, // within 300s clock skew
    };
    expect(() => validateJwtClaims(claims, 'https://login.example.com', 'app-123')).not.toThrow();
  });

  it('rejects JWT with iat in the future', () => {
    const now = Math.floor(Date.now() / 1000);
    const claims = {
      iss: 'https://login.example.com',
      aud: 'app-123',
      exp: now + 3600,
      iat: now + 600, // 10 min in future
    };
    expect(() => validateJwtClaims(claims, 'https://login.example.com', 'app-123')).toThrow(
      'JWT issued-at is in the future',
    );
  });

  it('accepts JWT with iat within clock skew', () => {
    const now = Math.floor(Date.now() / 1000);
    const claims = {
      iss: 'https://login.example.com',
      aud: 'app-123',
      exp: now + 3600,
      iat: now + 100,
    };
    expect(() => validateJwtClaims(claims, 'https://login.example.com', 'app-123')).not.toThrow();
  });

  it('rejects nonce mismatch', () => {
    const now = Math.floor(Date.now() / 1000);
    const claims = {
      iss: 'https://login.example.com',
      aud: 'app-123',
      exp: now + 3600,
      nonce: 'abc',
    };
    expect(() => validateJwtClaims(claims, 'https://login.example.com', 'app-123', 'xyz')).toThrow(
      'JWT nonce mismatch',
    );
  });

  it('passes nonce check when expected nonce matches', () => {
    const now = Math.floor(Date.now() / 1000);
    const claims = {
      iss: 'https://login.example.com',
      aud: 'app-123',
      exp: now + 3600,
      nonce: 'correct-nonce',
    };
    expect(() => validateJwtClaims(claims, 'https://login.example.com', 'app-123', 'correct-nonce')).not.toThrow();
  });
});

// ── claws.json identity persistence ───────────────────────────────────

describe('configureIdentity / getIdentity', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), 'identity-test-'));
  });

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true });
  });

  const validOidcConfig: FullIdentityConfig = {
    provider: 'OIDC',
    oidc: {
      issuer: 'https://login.microsoftonline.com/tenant/v2.0',
      clientId: 'app-abc',
      redirectUri: 'https://localhost:3000/callback',
      scopes: ['openid', 'profile'],
    },
    roleMapping: { admin: 4, viewer: 1 },
  };

  const validSamlConfig: FullIdentityConfig = {
    provider: 'SAML',
    saml: {
      entityId: 'urn:example:sp',
      ssoUrl: 'https://idp.example.com/sso',
      certificate: '-----BEGIN CERTIFICATE-----\nMIIB...\n-----END CERTIFICATE-----',
    },
    roleMapping: { admin: 5 },
  };

  it('persists OIDC identity config to claws.json', async () => {
    await configureIdentity(tmpDir, validOidcConfig);

    const raw = await readFile(join(tmpDir, 'claws.json'), 'utf-8');
    const parsed = JSON.parse(raw);
    expect(parsed.identity.provider).toBe('OIDC');
    expect(parsed.identity.oidc.issuer).toBe(validOidcConfig.oidc!.issuer);
    expect(parsed.identity.roleMapping).toEqual({ admin: 4, viewer: 1 });
  });

  it('persists SAML identity config to claws.json', async () => {
    await configureIdentity(tmpDir, validSamlConfig);

    const result = await getIdentity(tmpDir);
    expect(result).not.toBeNull();
    expect(result!.provider).toBe('SAML');
    expect(result!.saml?.entityId).toBe('urn:example:sp');
  });

  it('reads back identity via getIdentity', async () => {
    await configureIdentity(tmpDir, validOidcConfig);
    const result = await getIdentity(tmpDir);
    expect(result).not.toBeNull();
    expect(result!.provider).toBe('OIDC');
    expect(result!.oidc!.clientId).toBe('app-abc');
  });

  it('returns null when no identity configured', async () => {
    const result = await getIdentity(tmpDir);
    expect(result).toBeNull();
  });

  it('returns null when claws.json exists but has no identity key', async () => {
    await writeFile(join(tmpDir, 'claws.json'), JSON.stringify({ version: 1 }), 'utf-8');
    const result = await getIdentity(tmpDir);
    expect(result).toBeNull();
  });

  it('preserves existing claws.json keys when adding identity', async () => {
    await writeFile(
      join(tmpDir, 'claws.json'),
      JSON.stringify({ version: 1, customKey: 'preserved' }),
      'utf-8',
    );

    await configureIdentity(tmpDir, validOidcConfig);

    const raw = await readFile(join(tmpDir, 'claws.json'), 'utf-8');
    const parsed = JSON.parse(raw);
    expect(parsed.customKey).toBe('preserved');
    expect(parsed.identity.provider).toBe('OIDC');
  });

  it('throws when OIDC provider specified but oidc config missing', async () => {
    const badConfig: FullIdentityConfig = {
      provider: 'OIDC',
      roleMapping: { admin: 4 },
    };
    await expect(configureIdentity(tmpDir, badConfig)).rejects.toThrow(
      'OIDC provider config is required',
    );
  });

  it('throws when SAML provider specified but saml config missing', async () => {
    const badConfig: FullIdentityConfig = {
      provider: 'SAML',
      roleMapping: { admin: 4 },
    };
    await expect(configureIdentity(tmpDir, badConfig)).rejects.toThrow(
      'SAML provider config is required',
    );
  });

  it('validates OIDC config before persisting', async () => {
    const badOidc: FullIdentityConfig = {
      provider: 'OIDC',
      oidc: {
        issuer: 'not-a-url',
        clientId: 'app-1',
        redirectUri: 'https://localhost/callback',
        scopes: ['openid'],
      },
      roleMapping: {},
    };
    await expect(configureIdentity(tmpDir, badOidc)).rejects.toThrow(
      'OIDC issuer must be a valid HTTP(S) URL',
    );
  });

  it('validates SAML config before persisting', async () => {
    const badSaml: FullIdentityConfig = {
      provider: 'SAML',
      saml: {
        entityId: '',
        ssoUrl: 'https://idp.example.com/sso',
        certificate: 'cert',
      },
      roleMapping: {},
    };
    await expect(configureIdentity(tmpDir, badSaml)).rejects.toThrow(
      'SAML entityId is required',
    );
  });

  it('does not include oidc key for SAML config', async () => {
    await configureIdentity(tmpDir, validSamlConfig);
    const raw = await readFile(join(tmpDir, 'claws.json'), 'utf-8');
    const parsed = JSON.parse(raw);
    expect(parsed.identity.oidc).toBeUndefined();
    expect(parsed.identity.saml).toBeDefined();
  });

  it('does not include saml key for OIDC config', async () => {
    await configureIdentity(tmpDir, validOidcConfig);
    const raw = await readFile(join(tmpDir, 'claws.json'), 'utf-8');
    const parsed = JSON.parse(raw);
    expect(parsed.identity.saml).toBeUndefined();
    expect(parsed.identity.oidc).toBeDefined();
  });
});
