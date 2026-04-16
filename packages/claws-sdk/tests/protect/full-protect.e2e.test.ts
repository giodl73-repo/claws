/**
 * L2: Full protect lifecycle on reference workspace.
 *
 * 1. Budget, vault, identity all functional.
 * 2. Security hardening regression suite — all THOTH-FINDINGS fixes verified end-to-end.
 */

import { describe, it, expect, afterEach, vi } from 'vitest';
import { mkdtemp, rm, writeFile, mkdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

// Budget
import { budget, checkThresholds, evaluateEnforcement } from '../../src/protect/budget.js';
import { signAuditEntry } from '../../src/compliance/artifact-signer.js';

// Vault
import {
  vaultInit,
  vaultSet,
  vaultGet,
  vaultList,
  vaultDelete,
  defaultVaultConfig,
  setArgon2Available,
  resetArgon2Cache,
} from '../../src/protect/index.js';

// Identity
import { validateOidcConfig, validateSamlConfig, generatePkce, verifyPkce } from '../../src/protect/index.js';

// Keys (path traversal)
import { validateKeyId } from '../../src/keys/storage.js';

// Verifier (D-W2, F2)
import { verifyIntent } from '../../src/compile/llm/verifier.js';
import type { LLMIntent } from '../../src/compile/llm/types.js';
import type { ToolRiskClass } from '../../src/compile/types.js';

// Merger (raise-only)
import { raiseOnlyRisk } from '../../src/compile/llm/merger.js';

// Prompts (S-W4)
import { parseIntentsTyped } from '../../src/compile/llm/prompts.js';

describe('full protect lifecycle on reference workspace', () => {
  let tempDir: string;

  afterEach(async () => {
    resetArgon2Cache();
    if (tempDir) {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it('budget + vault + identity all functional end-to-end', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'claws-protect-e2e-'));
    setArgon2Available(false);

    // ── Budget ────────────────────────────────────────────────────
    const auditDir = join(tempDir, '.claws', 'audit');
    await mkdir(auditDir, { recursive: true });
    const entries = [
      signAuditEntry({
        seq: 0,
        timestamp: '2026-04-14T08:00:00Z',
        eventType: 'TOKEN_USAGE',
        actor: 'test',
        target: '5000',
        action: 'consume',
        outcome: 'allow',
        ruleId: 'budget',
        severity: 1,
        policyVersion: '1.0.0',
      }, Buffer.alloc(32, 'a'), 'k1'),
    ];
    await writeFile(
      join(auditDir, 'chain.jsonl'),
      entries.map((e) => JSON.stringify(e)).join('\n') + '\n',
      'utf-8',
    );
    await writeFile(join(tempDir, 'claws.json'), JSON.stringify({
      trustTier: 2,
      budgetConfig: { daily: 50000, monthly: 500000 },
    }), 'utf-8');

    const alerts = checkThresholds(10);
    expect(alerts).toHaveLength(3);

    // ── Vault ─────────────────────────────────────────────────────
    const config = defaultVaultConfig(tempDir);
    const initResult = await vaultInit(config, 'test-pass-12345!');
    expect(initResult.kdf).toBe('scrypt');

    await vaultSet(config, 'api-key', 'sk-secret-123', 'test-pass-12345!');
    const value = await vaultGet(config, 'api-key', 'test-pass-12345!');
    expect(value).toBe('sk-secret-123');

    const keys = await vaultList(config);
    expect(keys).toContain('api-key');

    await vaultDelete(config, 'api-key', 'test-pass-12345!');
    const keysAfter = await vaultList(config);
    expect(keysAfter).not.toContain('api-key');

    // ── Identity ──────────────────────────────────────────────────
    // validateOidcConfig throws on error, returns void on success
    expect(() => validateOidcConfig({
      issuer: 'https://login.example.com',
      clientId: 'claws-client',
      redirectUri: 'http://localhost:3000/callback',
      scopes: ['openid', 'profile'],
    })).not.toThrow();

    const pkce = generatePkce('S256');
    expect(pkce.codeVerifier).toBeTruthy();
    expect(pkce.codeChallenge).toBeTruthy();
    const pkceValid = verifyPkce(pkce.codeVerifier, pkce.codeChallenge, 'S256');
    expect(pkceValid).toBe(true);
  });
});

describe('security hardening regression suite — THOTH-FINDINGS verified', () => {
  it('all THOTH-FINDINGS security fixes verified end-to-end', () => {
    // T-01: Path traversal in keyId
    expect(() => validateKeyId('../etc/passwd')).toThrow();
    expect(() => validateKeyId('path/to/key')).toThrow();
    expect(() => validateKeyId('path\\key')).toThrow();
    expect(() => validateKeyId('valid-key-1')).not.toThrow();

    // T-04: raise-only risk
    expect(raiseOnlyRisk(1 as ToolRiskClass, 5 as ToolRiskClass)).toBe(5);
    expect(raiseOnlyRisk(undefined, undefined)).toBeUndefined();
    expect(raiseOnlyRisk(3 as ToolRiskClass, undefined)).toBe(3);

    // D-W2: Fuzzy match disabled for R4-R5
    const r5Intent: LLMIntent = {
      kind: 'label',
      target: 'rm-all',
      description: 'remove all',
      confidence: 0.9,
      sourceText: 'rm all', // case differs from "RM ALL" in content
      line: 1,
      riskClass: 5 as ToolRiskClass,
    };
    const { verified: r5Verified } = verifyIntent(r5Intent, 'RM ALL', 'TOOLS.md');
    expect(r5Verified.outcome).toBe('mismatch');

    // R3 fuzzy match should still work
    const r3Intent: LLMIntent = {
      kind: 'label',
      target: 'file-read',
      description: 'read file',
      confidence: 0.9,
      sourceText: 'file read', // case differs
      line: 1,
      riskClass: 3 as ToolRiskClass,
    };
    const { verified: r3Verified } = verifyIntent(r3Intent, 'File Read', 'TOOLS.md');
    expect(r3Verified.outcome).toBe('fuzzy');
    expect(r3Verified.verified).toBe(true);

    // F2: relocated tier
    const relocatedIntent: LLMIntent = {
      kind: 'deny',
      target: 'bad-action',
      description: 'deny bad action',
      confidence: 0.9,
      sourceText: 'deny bad-action',
      line: 1,
    };
    const content = 'other line\nother line\nother line\nother line\nother line\ndeny bad-action\n';
    const { verified: relocatedVerified } = verifyIntent(relocatedIntent, content, 'SOUL.md');
    expect(relocatedVerified.outcome).toBe('relocated');
    expect(relocatedVerified.verified).toBe(true);
    expect(relocatedVerified.intent.confidence).toBeLessThan(0.9);

    // S-W4: Typed parse result
    const parseError = parseIntentsTyped('not json', 'SOUL.md');
    expect(parseError.type).toBe('parse-error');

    const noIntents = parseIntentsTyped('[]', 'SOUL.md');
    expect(noIntents.type).toBe('no-intents');

    const success = parseIntentsTyped(
      JSON.stringify([{ kind: 'deny', target: 'test', description: 'test', confidence: 0.9, sourceText: 'test' }]),
      'SOUL.md',
    );
    expect(success.type).toBe('success');
    if (success.type === 'success') {
      expect(success.intents).toHaveLength(1);
    }
  });
});
