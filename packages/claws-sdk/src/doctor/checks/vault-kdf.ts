/**
 * Doctor check: vault-kdf — warn when scrypt fallback is active on a vault.
 *
 * Argon2id is the recommended KDF. Scrypt is a valid fallback but weaker
 * against GPU-accelerated attacks. This check reads the vault metadata
 * and warns when scrypt is in use.
 *
 * @module claws-sdk/doctor/checks/vault-kdf
 */

import { join } from 'node:path';
import { readFile } from 'node:fs/promises';
import { CLAWS_SIDECAR_LAYOUT } from '../../types/sidecar.js';
import type { CheckResult, Diagnostic } from '../orchestrator.js';

const CHECK_ID = 'vault-kdf';
const CHECK_NAME = 'Vault Key Derivation';

/**
 * Check vault KDF — warn if scrypt fallback is active.
 */
export async function checkVaultKdf(workspaceRoot: string): Promise<CheckResult> {
  const start = Date.now();
  const diagnostics: Diagnostic[] = [];
  const vaultPath = join(workspaceRoot, CLAWS_SIDECAR_LAYOUT.secrets, 'vault.enc');

  let raw: string;
  try {
    raw = await readFile(vaultPath, 'utf-8');
  } catch {
    // No vault — nothing to check
    diagnostics.push({
      checkId: CHECK_ID,
      severity: 'info',
      message: 'No secrets vault found — skipping KDF check',
      fixable: false,
    });
    return {
      checkId: CHECK_ID,
      name: CHECK_NAME,
      passed: true,
      diagnostics,
      durationMs: Date.now() - start,
    };
  }

  let vaultData: { kdf?: string; entries?: Record<string, unknown> };
  try {
    vaultData = JSON.parse(raw) as { kdf?: string; entries?: Record<string, unknown> };
  } catch {
    diagnostics.push({
      checkId: CHECK_ID,
      severity: 'error',
      message: 'Vault file is corrupted — cannot parse JSON',
      file: vaultPath,
      fixable: false,
    });
    return {
      checkId: CHECK_ID,
      name: CHECK_NAME,
      passed: false,
      diagnostics,
      durationMs: Date.now() - start,
    };
  }

  if (vaultData.kdf === 'scrypt') {
    diagnostics.push({
      checkId: CHECK_ID,
      severity: 'warning',
      message:
        'Vault uses scrypt fallback instead of Argon2id. ' +
        'Install the argon2 native module for stronger key derivation: npm install argon2',
      file: vaultPath,
      fixable: false,
    });
  } else if (vaultData.kdf === 'argon2id') {
    diagnostics.push({
      checkId: CHECK_ID,
      severity: 'info',
      message: 'Vault uses Argon2id key derivation (recommended)',
      file: vaultPath,
      fixable: false,
    });
  }

  return {
    checkId: CHECK_ID,
    name: CHECK_NAME,
    passed: diagnostics.every((d) => d.severity !== 'error'),
    diagnostics,
    durationMs: Date.now() - start,
  };
}
