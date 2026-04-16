/**
 * L2: Identity SSO e2e — full identity configuration lifecycle on
 * fixture workspace: OIDC registration, role-to-tier mapping, config
 * persistence, and governance rule consumption.
 */

import { describe, it, expect, afterEach } from 'vitest';
import { mkdtemp, rm, readFile, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  configureIdentity,
  getIdentity,
  mapRoleToTier,
  validateOidcConfig,
  validateSamlConfig,
  generatePkce,
  verifyPkce,
} from '../../src/protect/identity.js';
import type { FullIdentityConfig } from '../../src/protect/identity.js';

describe('full identity configuration lifecycle', () => {
  let tempDir: string;

  afterEach(async () => {
    if (tempDir) await rm(tempDir, { recursive: true, force: true });
  });

  it('OIDC provider registration, mapping, persistence, and consumption', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'claws-identity-e2e-'));

    // Scaffold a minimal workspace with existing claws.json
    await mkdir(join(tempDir, '.claws', 'compiled'), { recursive: true });
    await writeFile(
      join(tempDir, 'claws.json'),
      JSON.stringify({
        trustTier: 2,
        platform: 'claude-code',
        suppressions: [],
        format: 'terminal',
        policySet: 'default',
        auditLevel: 'full',
        failMode: { R1: 'open', R2: 'open', R3: 'gated', R4: 'gated', R5: 'closed' },
        fleet: { allowBypass: false },
      }, null, 2),
      'utf-8',
    );

    // ── Phase 1: Register OIDC provider ───────────────────────────────

    const oidcConfig: FullIdentityConfig = {
      provider: 'OIDC',
      oidc: {
        issuer: 'https://login.microsoftonline.com/contoso/v2.0',
        clientId: 'claws-gov-client',
        redirectUri: 'https://localhost:8443/callback',
        scopes: ['openid', 'profile', 'email'],
      },
      roleMapping: {
        'GlobalAdmin': 5,
        'SecurityAdmin': 4,
        'ComplianceOfficer': 3,
        'Developer': 2,
        'Viewer': 1,
      },
    };

    // Validate before persisting
    expect(() => validateOidcConfig(oidcConfig.oidc!)).not.toThrow();

    // Persist
    await configureIdentity(tempDir, oidcConfig);

    // ── Phase 2: Verify persistence ───────────────────────────────────

    const rawJson = await readFile(join(tempDir, 'claws.json'), 'utf-8');
    const parsed = JSON.parse(rawJson);

    // Existing fields preserved
    expect(parsed.trustTier).toBe(2);
    expect(parsed.platform).toBe('claude-code');
    expect(parsed.failMode.R5).toBe('closed');

    // Identity config present
    expect(parsed.identity).toBeDefined();
    expect(parsed.identity.provider).toBe('OIDC');
    expect(parsed.identity.oidc.issuer).toBe('https://login.microsoftonline.com/contoso/v2.0');
    expect(parsed.identity.oidc.clientId).toBe('claws-gov-client');
    expect(parsed.identity.oidc.scopes).toEqual(['openid', 'profile', 'email']);
    expect(parsed.identity.roleMapping.SecurityAdmin).toBe(4);

    // ── Phase 3: Re-read via SDK ──────────────────────────────────────

    const reloaded = await getIdentity(tempDir);
    expect(reloaded).not.toBeNull();
    expect(reloaded!.provider).toBe('OIDC');
    expect(reloaded!.oidc!.redirectUri).toBe('https://localhost:8443/callback');

    // ── Phase 4: Role-to-tier mapping for governance ──────────────────

    // SecurityAdmin (T4) can run R4 governance tools
    const secAdminTier = mapRoleToTier('SecurityAdmin', reloaded!.roleMapping);
    expect(secAdminTier).toBe(4);
    expect(secAdminTier >= 4).toBe(true);

    // Viewer (T1) cannot run R3+ tools
    const viewerTier = mapRoleToTier('Viewer', reloaded!.roleMapping);
    expect(viewerTier).toBe(1);
    expect(viewerTier >= 3).toBe(false);

    // GlobalAdmin (T5) can run everything
    const globalTier = mapRoleToTier('GlobalAdmin', reloaded!.roleMapping);
    expect(globalTier).toBe(5);

    // ── Phase 5: Update provider to SAML ──────────────────────────────

    const samlConfig: FullIdentityConfig = {
      provider: 'SAML',
      saml: {
        entityId: 'urn:contoso:claws',
        ssoUrl: 'https://adfs.contoso.com/saml2/sso',
        certificate: '-----BEGIN CERTIFICATE-----\nMIIB...\n-----END CERTIFICATE-----',
      },
      roleMapping: {
        'IT-Admin': 4,
        'Engineer': 2,
      },
    };

    expect(() => validateSamlConfig(samlConfig.saml!)).not.toThrow();
    await configureIdentity(tempDir, samlConfig);

    // Verify SAML replaced OIDC
    const updatedIdentity = await getIdentity(tempDir);
    expect(updatedIdentity!.provider).toBe('SAML');
    expect(updatedIdentity!.saml!.entityId).toBe('urn:contoso:claws');
    expect(updatedIdentity!.oidc).toBeUndefined();

    // ── Phase 6: PKCE round-trip ──────────────────────────────────────

    const pkce = generatePkce();
    expect(verifyPkce(pkce.codeVerifier, pkce.codeChallenge)).toBe(true);
    expect(verifyPkce('tampered-verifier', pkce.codeChallenge)).toBe(false);

    // ── Phase 7: Non-existent workspace returns null ──────────────────

    const noIdentity = await getIdentity(join(tempDir, 'nonexistent'));
    expect(noIdentity).toBeNull();
  });
});
