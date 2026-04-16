/**
 * L0: vault-kdf doctor check — unit tests covering all branches.
 *
 * Branches:
 * 1. No vault file (readFile throws) → info + passed
 * 2. Corrupted JSON (parse throws) → error + failed
 * 3. kdf === 'scrypt' → warning + passed
 * 4. kdf === 'argon2id' → info + passed
 * 5. kdf missing/other value → no KDF diagnostic, passed
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { checkVaultKdf } from '../../src/doctor/checks/vault-kdf.js';

let tmpDir: string;

beforeEach(async () => {
  tmpDir = await mkdtemp(join(tmpdir(), 'claws-vault-kdf-'));
});

afterEach(async () => {
  await rm(tmpDir, { recursive: true, force: true });
});

describe('checkVaultKdf', () => {
  it('no vault file — info diagnostic, check passes', async () => {
    // No .claws/secrets/vault.enc exists at all
    const result = await checkVaultKdf(tmpDir);

    expect(result.checkId).toBe('vault-kdf');
    expect(result.name).toBe('Vault Key Derivation');
    expect(result.passed).toBe(true);
    expect(result.diagnostics).toHaveLength(1);
    expect(result.diagnostics[0]!.severity).toBe('info');
    expect(result.diagnostics[0]!.message).toContain('No secrets vault found');
    expect(result.diagnostics[0]!.fixable).toBe(false);
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
  });

  it('corrupted vault JSON — error diagnostic, check fails', async () => {
    const secretsDir = join(tmpDir, '.claws', 'secrets');
    await mkdir(secretsDir, { recursive: true });
    await writeFile(join(secretsDir, 'vault.enc'), 'NOT VALID JSON {{{');

    const result = await checkVaultKdf(tmpDir);

    expect(result.checkId).toBe('vault-kdf');
    expect(result.passed).toBe(false);
    expect(result.diagnostics).toHaveLength(1);
    expect(result.diagnostics[0]!.severity).toBe('error');
    expect(result.diagnostics[0]!.message).toContain('corrupted');
    expect(result.diagnostics[0]!.file).toContain('vault.enc');
    expect(result.diagnostics[0]!.fixable).toBe(false);
  });

  it('kdf is scrypt — warning diagnostic, check passes', async () => {
    const secretsDir = join(tmpDir, '.claws', 'secrets');
    await mkdir(secretsDir, { recursive: true });
    await writeFile(
      join(secretsDir, 'vault.enc'),
      JSON.stringify({ kdf: 'scrypt', entries: {} }),
    );

    const result = await checkVaultKdf(tmpDir);

    expect(result.checkId).toBe('vault-kdf');
    expect(result.passed).toBe(true);
    expect(result.diagnostics).toHaveLength(1);
    expect(result.diagnostics[0]!.severity).toBe('warning');
    expect(result.diagnostics[0]!.message).toContain('scrypt fallback');
    expect(result.diagnostics[0]!.message).toContain('argon2');
    expect(result.diagnostics[0]!.file).toContain('vault.enc');
    expect(result.diagnostics[0]!.fixable).toBe(false);
  });

  it('kdf is argon2id — info diagnostic, check passes', async () => {
    const secretsDir = join(tmpDir, '.claws', 'secrets');
    await mkdir(secretsDir, { recursive: true });
    await writeFile(
      join(secretsDir, 'vault.enc'),
      JSON.stringify({ kdf: 'argon2id', entries: {} }),
    );

    const result = await checkVaultKdf(tmpDir);

    expect(result.checkId).toBe('vault-kdf');
    expect(result.passed).toBe(true);
    expect(result.diagnostics).toHaveLength(1);
    expect(result.diagnostics[0]!.severity).toBe('info');
    expect(result.diagnostics[0]!.message).toContain('Argon2id');
    expect(result.diagnostics[0]!.message).toContain('recommended');
    expect(result.diagnostics[0]!.file).toContain('vault.enc');
  });

  it('kdf is absent — no KDF diagnostic, check passes', async () => {
    const secretsDir = join(tmpDir, '.claws', 'secrets');
    await mkdir(secretsDir, { recursive: true });
    await writeFile(
      join(secretsDir, 'vault.enc'),
      JSON.stringify({ entries: { token: 'encrypted' } }),
    );

    const result = await checkVaultKdf(tmpDir);

    expect(result.checkId).toBe('vault-kdf');
    expect(result.passed).toBe(true);
    // No kdf field means neither scrypt nor argon2id branch is taken
    expect(result.diagnostics).toHaveLength(0);
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
  });

  it('kdf is an unknown value — no KDF diagnostic, check passes', async () => {
    const secretsDir = join(tmpDir, '.claws', 'secrets');
    await mkdir(secretsDir, { recursive: true });
    await writeFile(
      join(secretsDir, 'vault.enc'),
      JSON.stringify({ kdf: 'pbkdf2', entries: {} }),
    );

    const result = await checkVaultKdf(tmpDir);

    expect(result.checkId).toBe('vault-kdf');
    expect(result.passed).toBe(true);
    expect(result.diagnostics).toHaveLength(0);
  });
});
