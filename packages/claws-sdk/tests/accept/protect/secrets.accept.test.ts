/**
 * L3: SDK acceptance — secrets vault lifecycle, encrypted storage,
 * roundtrip fidelity, and error handling.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

// Import from the public protect barrel — as a consumer would
import {
  vaultInit,
  vaultSet,
  vaultGet,
  vaultList,
  vaultDelete,
  defaultVaultConfig,
  setArgon2Available,
  resetArgon2Cache,
} from '../../../src/protect/index.js';
import type { VaultConfig } from '../../../src/protect/types.js';

let tempDir: string;
let config: VaultConfig;
const PASSPHRASE = 'accept-test-strong-passphrase!';
const WRONG_PASSPHRASE = 'totally-wrong-passphrase!';

beforeEach(async () => {
  resetArgon2Cache();
  setArgon2Available(false);
  tempDir = await mkdtemp(join(tmpdir(), 'claws-vault-accept-'));
  config = defaultVaultConfig(tempDir);
});

afterEach(async () => {
  if (tempDir) {
    await rm(tempDir, { recursive: true, force: true });
  }
});

describe('accept: secrets vault lifecycle', () => {
  it('full init/set/get/list/delete lifecycle with encrypted storage and roundtrip fidelity', async () => {
    // ── Init ──────────────────────────────────────────────────────────
    const { kdf } = await vaultInit(config, PASSPHRASE);
    expect(kdf).toBe('scrypt');

    // ── Set secrets ──────────────────────────────────────────────────
    const secrets: Record<string, string> = {
      'api-key': 'sk-live-abc123xyz789',
      'signing-key': 'ed25519:base64encodedprivatekeybytes==',
      'webhook-url': 'https://hooks.example.com/secret?token=abc',
    };

    for (const [k, v] of Object.entries(secrets)) {
      await vaultSet(config, k, v, PASSPHRASE);
    }

    // ── Get — roundtrip fidelity ─────────────────────────────────────
    for (const [k, v] of Object.entries(secrets)) {
      const retrieved = await vaultGet(config, k, PASSPHRASE);
      expect(retrieved).toBe(v);
    }

    // ── List — keys only, no values ──────────────────────────────────
    const keys = await vaultList(config);
    expect(keys).toEqual(['api-key', 'signing-key', 'webhook-url']);

    // ── Encrypted storage — vault.enc is not plaintext ───────────────
    const vaultRaw = await readFile(config.vaultPath, 'utf-8');
    for (const v of Object.values(secrets)) {
      expect(vaultRaw).not.toContain(v);
    }

    // ── Delete ───────────────────────────────────────────────────────
    await vaultDelete(config, 'signing-key', PASSPHRASE);
    const keysAfter = await vaultList(config);
    expect(keysAfter).toEqual(['api-key', 'webhook-url']);

    // Deleted key throws
    await expect(vaultGet(config, 'signing-key', PASSPHRASE)).rejects.toThrow(
      /Key "signing-key" not found/,
    );

    // Remaining keys still work
    expect(await vaultGet(config, 'api-key', PASSPHRASE)).toBe(secrets['api-key']);
  });

  it('wrong passphrase throws descriptive error', async () => {
    await vaultInit(config, PASSPHRASE);
    await vaultSet(config, 'secret', 'value-to-protect', PASSPHRASE);

    await expect(
      vaultGet(config, 'secret', WRONG_PASSPHRASE),
    ).rejects.toThrow(/Decryption failed.*wrong passphrase/);
  });
});
