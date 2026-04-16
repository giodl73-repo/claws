/**
 * L1: Identity SSO integration — config persistence, pinch rule engine
 * consumption, and full OIDC flow with PKCE + nonce + JWT verification.
 */

import { describe, it, expect, afterEach } from 'vitest';
import { mkdtemp, rm, readFile, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { generateKeyPairSync, createSign } from 'node:crypto';
import {
  configureIdentity,
  getIdentity,
  mapRoleToTier,
  generatePkce,
  verifyPkce,
  decodeJwt,
  verifyJwtSignature,
  validateJwtClaims,
} from '../../src/protect/identity.js';
import type {
  FullIdentityConfig,
  RoleMapping,
  JwksKey,
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

function rsaKeyToJwk(publicKeyPem: string): JwksKey {
  const crypto = require('node:crypto');
  const keyObj = crypto.createPublicKey(publicKeyPem);
  const exported = keyObj.export({ type: 'pkcs1', format: 'der' }) as Buffer;

  let offset = 0;
  offset++; // SEQUENCE tag
  const outerLen = readLen(exported, offset);
  offset = outerLen.next;

  offset++; // INTEGER tag for n
  const nLen = readLen(exported, offset);
  offset = nLen.next;
  let nBuf = exported.subarray(offset, offset + nLen.len);
  if (nBuf[0] === 0x00) nBuf = nBuf.subarray(1);
  offset += nLen.len;

  offset++; // INTEGER tag for e
  const eLen = readLen(exported, offset);
  offset = eLen.next;
  const eBuf = exported.subarray(offset, offset + eLen.len);

  return { kty: 'RSA', kid: 'int-test-key', n: nBuf.toString('base64url'), e: eBuf.toString('base64url') };
}

function readLen(buf: Buffer, off: number): { len: number; next: number } {
  const b = buf[off]!;
  if (b < 0x80) return { len: b, next: off + 1 };
  const n = b & 0x7f;
  let len = 0;
  for (let i = 0; i < n; i++) len = (len << 8) | buf[off + 1 + i]!;
  return { len, next: off + 1 + n };
}

// ── Tests ─────────────────────────────────────────────────────────────

describe('identity config persistence to claws.json', () => {
  let tempDir: string;

  afterEach(async () => {
    if (tempDir) await rm(tempDir, { recursive: true, force: true });
  });

  it('writes and re-reads identity config from claws.json', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'claws-identity-int-'));

    const config: FullIdentityConfig = {
      provider: 'OIDC',
      oidc: {
        issuer: 'https://login.microsoftonline.com/tenant/v2.0',
        clientId: 'app-xyz',
        redirectUri: 'https://localhost:3000/callback',
        scopes: ['openid', 'profile'],
      },
      roleMapping: {
        'security-admin': 4,
        'developer': 2,
        'read-only-user': 1,
      },
    };

    await configureIdentity(tempDir, config);

    // Verify claws.json was written
    const raw = await readFile(join(tempDir, 'claws.json'), 'utf-8');
    const parsed = JSON.parse(raw);
    expect(parsed.identity).toBeDefined();
    expect(parsed.identity.provider).toBe('OIDC');
    expect(parsed.identity.oidc.issuer).toBe('https://login.microsoftonline.com/tenant/v2.0');
    expect(parsed.identity.roleMapping['security-admin']).toBe(4);

    // Re-read via getIdentity
    const reloaded = await getIdentity(tempDir);
    expect(reloaded).not.toBeNull();
    expect(reloaded!.provider).toBe('OIDC');
    expect(reloaded!.oidc!.clientId).toBe('app-xyz');
    expect(reloaded!.roleMapping['developer']).toBe(2);
  });

  it('preserves existing claws.json fields when adding identity', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'claws-identity-merge-'));

    // Write initial claws.json with trustTier
    await writeFile(
      join(tempDir, 'claws.json'),
      JSON.stringify({ trustTier: 3, platform: 'claude-code' }, null, 2),
      'utf-8',
    );

    const config: FullIdentityConfig = {
      provider: 'SAML',
      saml: {
        entityId: 'urn:corp:sp',
        ssoUrl: 'https://idp.corp.com/saml/sso',
        certificate: '-----BEGIN CERTIFICATE-----\nMIIB...\n-----END CERTIFICATE-----',
      },
      roleMapping: { admin: 5 },
    };

    await configureIdentity(tempDir, config);

    const raw = await readFile(join(tempDir, 'claws.json'), 'utf-8');
    const parsed = JSON.parse(raw);
    expect(parsed.trustTier).toBe(3);
    expect(parsed.platform).toBe('claude-code');
    expect(parsed.identity.provider).toBe('SAML');
  });
});

describe('identity config consumed by pinch rule engine for role-based overrides', () => {
  let tempDir: string;

  afterEach(async () => {
    if (tempDir) await rm(tempDir, { recursive: true, force: true });
  });

  it('role mapping drives trust tier for governance decisions', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'claws-identity-pinch-'));

    const config: FullIdentityConfig = {
      provider: 'OIDC',
      oidc: {
        issuer: 'https://auth.example.com',
        clientId: 'gov-app',
        redirectUri: 'https://localhost/callback',
        scopes: ['openid'],
      },
      roleMapping: {
        'security-admin': 4,
        'developer': 2,
        'read-only-user': 1,
      },
    };

    await configureIdentity(tempDir, config);

    // Read back and verify mapping can drive trust tier decisions
    const identity = await getIdentity(tempDir);
    expect(identity).not.toBeNull();

    // Simulate pinch rule engine consumption:
    // Read the roleMapping, map the authenticated role to a trust tier,
    // then use that tier for governance rule evaluation.
    const authenticatedRole = 'security-admin';
    const tier = mapRoleToTier(authenticatedRole, identity!.roleMapping);
    expect(tier).toBe(4);

    // T4 user should be able to run R4 tools (tier >= rule level)
    expect(tier >= 4).toBe(true);

    // A read-only-user at T1 should NOT be able to run R4 tools
    const readOnlyTier = mapRoleToTier('read-only-user', identity!.roleMapping);
    expect(readOnlyTier >= 4).toBe(false);
  });
});

describe('full OIDC flow with PKCE + nonce + JWT verify', () => {
  it('completes end-to-end OIDC authorization with all security checks', () => {
    // Step 1: Generate PKCE parameters
    const pkce = generatePkce();
    expect(pkce.codeChallengeMethod).toBe('S256');

    // Step 2: Generate nonce for replay protection
    const nonce = require('node:crypto').randomBytes(16).toString('hex');

    // Step 3: Simulate IdP returning a JWT after auth code exchange
    const { privateKey, publicKey } = generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: { type: 'pkcs1', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    });

    const now = Math.floor(Date.now() / 1000);
    const idToken = makeJwt({
      iss: 'https://auth.example.com',
      aud: 'gov-app',
      exp: now + 3600,
      nonce,
      sub: 'user-123',
      roles: ['security-admin'],
    }, privateKey);

    // Step 4: Verify PKCE (server-side would verify code_verifier matches code_challenge)
    expect(verifyPkce(pkce.codeVerifier, pkce.codeChallenge)).toBe(true);

    // Step 5: Verify JWT signature against JWKS
    const jwk = rsaKeyToJwk(publicKey);
    expect(verifyJwtSignature(idToken, jwk)).toBe(true);

    // Step 6: Validate claims (iss, aud, exp, nonce)
    const { payload } = decodeJwt(idToken);
    expect(() => validateJwtClaims(payload, 'https://auth.example.com', 'gov-app', nonce)).not.toThrow();

    // Step 7: Extract roles and map to trust tier
    const roles = (payload as Record<string, unknown>)['roles'] as string[];
    const mapping: RoleMapping = { 'security-admin': 4, 'developer': 2 };
    const tier = mapRoleToTier(roles[0]!, mapping);
    expect(tier).toBe(4);
  });
});
