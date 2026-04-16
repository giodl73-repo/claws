/**
 * L3: SDK acceptance — consumer exercises full protect surface
 * (budget, vault, identity, hardening fixes) through public APIs
 * on reference workspace and validates all CP-1 acceptance criteria.
 */

import { describe, it, expect, afterEach } from 'vitest';
import { mkdtemp, rm, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

// Import all protect surface through public barrel exports
import {
  checkThresholds,
  evaluateEnforcement,
  createBudgetLimit,
  vaultInit,
  vaultSet,
  vaultGet,
  vaultList,
  vaultDelete,
  defaultVaultConfig,
  setArgon2Available,
  resetArgon2Cache,
  configureIdentity,
  validateOidcConfig,
  generatePkce,
  verifyPkce,
} from '../../src/protect/index.js';
import { signAuditEntry } from '../../src/compliance/artifact-signer.js';

describe('SDK protect-gate acceptance: full surface validation', () => {
  let tempDir: string;

  afterEach(async () => {
    resetArgon2Cache();
    if (tempDir) {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it('exercises budget, vault, identity through public APIs on reference workspace', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'claws-accept-gate-'));
    setArgon2Available(false);

    // ── Budget surface ───────────────────────────────────────────
    // Budget limits
    const limit = createBudgetLimit(50_000, 500_000, 'warn');
    expect(limit.daily).toBe(50_000);
    expect(limit.monthly).toBe(500_000);
    expect(limit.enforcement).toBe('warn');

    // Budget threshold alerts
    const alerts = checkThresholds(85);
    expect(alerts).toHaveLength(3);
    expect(alerts[0]!.triggered).toBe(true);  // 80% threshold
    expect(alerts[1]!.triggered).toBe(false);  // 95% threshold
    expect(alerts[2]!.triggered).toBe(false);  // 100% threshold

    // Budget enforcement
    const enforcement = evaluateEnforcement(101, 500, limit);
    expect(enforcement).toBeDefined();

    // ── Vault surface ────────────────────────────────────────────
    const config = defaultVaultConfig(tempDir);

    // Init
    const initResult = await vaultInit(config, 'acceptance-pass-test!');
    expect(initResult.kdf).toBe('scrypt');

    // Set multiple keys
    await vaultSet(config, 'db-password', 'secret123', 'acceptance-pass-test!');
    await vaultSet(config, 'api-token', 'tok_abc', 'acceptance-pass-test!');

    // Get
    expect(await vaultGet(config, 'db-password', 'acceptance-pass-test!')).toBe('secret123');
    expect(await vaultGet(config, 'api-token', 'acceptance-pass-test!')).toBe('tok_abc');

    // List
    const keys = await vaultList(config);
    expect(keys).toContain('api-token');
    expect(keys).toContain('db-password');

    // Delete
    await vaultDelete(config, 'api-token', 'acceptance-pass-test!');
    expect(await vaultList(config)).not.toContain('api-token');

    // ── Identity surface ─────────────────────────────────────────
    // OIDC validation — throws on error, void on success
    expect(() => validateOidcConfig({
      issuer: 'https://auth.example.com',
      clientId: 'claws',
      redirectUri: 'http://localhost/callback',
      scopes: ['openid'],
    })).not.toThrow();

    // PKCE flow
    const pkce = generatePkce('S256');
    expect(pkce.codeVerifier.length).toBeGreaterThanOrEqual(43);
    expect(verifyPkce(pkce.codeVerifier, pkce.codeChallenge, 'S256')).toBe(true);
    expect(verifyPkce('wrong-verifier-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx', pkce.codeChallenge, 'S256')).toBe(false);
  });
});
