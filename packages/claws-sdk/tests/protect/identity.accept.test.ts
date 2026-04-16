/**
 * L3: SDK acceptance — consumer calls configureIdentity/getIdentity/mapRoleToTier
 * and validates OIDC+SAML config round-trip, role mapping correctness,
 * and claws.json persistence.
 */

import { describe, it, expect, afterEach } from 'vitest';
import { mkdtemp, rm, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

// Public API imports — what an SDK consumer would use
import {
  configureIdentity,
  getIdentity,
  mapRoleToTier,
  validateOidcConfig,
  validateSamlConfig,
  generatePkce,
  verifyPkce,
  requirePkce,
  validateSamlCertChain,
} from '../../src/protect/identity.js';
import type {
  FullIdentityConfig,
  OidcProviderConfig,
  SamlProviderConfig,
  RoleMapping,
} from '../../src/protect/identity.js';

describe('SDK acceptance: identity SSO round-trip', () => {
  let tempDir: string;

  afterEach(async () => {
    if (tempDir) await rm(tempDir, { recursive: true, force: true });
  });

  it('OIDC+SAML config round-trip, role mapping, and persistence', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'claws-identity-accept-'));

    // ── OIDC round-trip ───────────────────────────────────────────────

    const oidcProvider: OidcProviderConfig = {
      issuer: 'https://login.microsoftonline.com/contoso/v2.0',
      clientId: 'claws-enterprise',
      redirectUri: 'https://app.contoso.com/auth/callback',
      scopes: ['openid', 'profile', 'email', 'offline_access'],
    };

    // Validation passes
    expect(() => validateOidcConfig(oidcProvider)).not.toThrow();

    const oidcConfig: FullIdentityConfig = {
      provider: 'OIDC',
      oidc: oidcProvider,
      roleMapping: {
        'GlobalAdmin': 5,
        'SecurityAdmin': 4,
        'ComplianceOfficer': 3,
        'Developer': 2,
        'Viewer': 1,
      },
    };

    // Configure and persist
    await configureIdentity(tempDir, oidcConfig);

    // Read back from disk
    const oidcRead = await getIdentity(tempDir);
    expect(oidcRead).not.toBeNull();
    expect(oidcRead!.provider).toBe('OIDC');
    expect(oidcRead!.oidc!.issuer).toBe(oidcProvider.issuer);
    expect(oidcRead!.oidc!.clientId).toBe(oidcProvider.clientId);
    expect(oidcRead!.oidc!.redirectUri).toBe(oidcProvider.redirectUri);
    expect(oidcRead!.oidc!.scopes).toEqual(oidcProvider.scopes);

    // Verify raw claws.json structure
    const rawJson = JSON.parse(await readFile(join(tempDir, 'claws.json'), 'utf-8'));
    expect(rawJson.identity).toBeDefined();
    expect(rawJson.identity.provider).toBe('OIDC');

    // ── Role mapping correctness ──────────────────────────────────────

    const mapping = oidcRead!.roleMapping;
    expect(mapRoleToTier('GlobalAdmin', mapping)).toBe(5);
    expect(mapRoleToTier('SecurityAdmin', mapping)).toBe(4);
    expect(mapRoleToTier('ComplianceOfficer', mapping)).toBe(3);
    expect(mapRoleToTier('Developer', mapping)).toBe(2);
    expect(mapRoleToTier('Viewer', mapping)).toBe(1);

    // Unmapped role throws
    expect(() => mapRoleToTier('UnknownRole', mapping)).toThrow('no trust tier mapping');

    // ── SAML round-trip ───────────────────────────────────────────────

    const samlProvider: SamlProviderConfig = {
      entityId: 'urn:contoso:claws:sp',
      ssoUrl: 'https://adfs.contoso.com/adfs/ls/',
      certificate: '-----BEGIN CERTIFICATE-----\nMIIDxTCCAq2...\n-----END CERTIFICATE-----',
    };

    expect(() => validateSamlConfig(samlProvider)).not.toThrow();

    const samlConfig: FullIdentityConfig = {
      provider: 'SAML',
      saml: samlProvider,
      roleMapping: {
        'IT-Admin': 4,
        'Auditor': 3,
        'Intern': 1,
      },
    };

    await configureIdentity(tempDir, samlConfig);

    const samlRead = await getIdentity(tempDir);
    expect(samlRead).not.toBeNull();
    expect(samlRead!.provider).toBe('SAML');
    expect(samlRead!.saml!.entityId).toBe(samlProvider.entityId);
    expect(samlRead!.saml!.ssoUrl).toBe(samlProvider.ssoUrl);
    expect(mapRoleToTier('IT-Admin', samlRead!.roleMapping)).toBe(4);
    expect(mapRoleToTier('Intern', samlRead!.roleMapping)).toBe(1);

    // ── PKCE validation ───────────────────────────────────────────────

    const pkce = generatePkce();
    expect(() => requirePkce({ codeChallenge: pkce.codeChallenge })).not.toThrow();
    expect(verifyPkce(pkce.codeVerifier, pkce.codeChallenge)).toBe(true);

    // ── Invalid configs rejected ──────────────────────────────────────

    expect(() => validateOidcConfig({ issuer: '', clientId: 'x', redirectUri: 'https://x', scopes: ['openid'] })).toThrow();
    expect(() => validateSamlConfig({ entityId: '', ssoUrl: 'https://x', certificate: 'x' })).toThrow();

    // ── Non-configured workspace returns null ─────────────────────────

    const emptyDir = await mkdtemp(join(tmpdir(), 'claws-identity-empty-'));
    try {
      const noConfig = await getIdentity(emptyDir);
      expect(noConfig).toBeNull();
    } finally {
      await rm(emptyDir, { recursive: true, force: true });
    }
  });
});
