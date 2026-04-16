/**
 * L2: Secrets vault — full lifecycle on fixture workspace.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  init,
  set,
  get,
  list,
  del,
  defaultVaultConfig,
  setArgon2Available,
  resetArgon2Cache,
} from '../../src/protect/secrets.js';
import type { VaultConfig } from '../../src/protect/types.js';

let tempDir: string;
let config: VaultConfig;
const PASSPHRASE = 'e2e-test-strong-passphrase!@#';

beforeEach(async () => {
  resetArgon2Cache();
  setArgon2Available(false);
  tempDir = await mkdtemp(join(tmpdir(), 'claws-vault-e2e-'));
  config = defaultVaultConfig(tempDir);
});

afterEach(async () => {
  if (tempDir) {
    await rm(tempDir, { recursive: true, force: true });
  }
});

describe('vault e2e lifecycle', () => {
  it('init + set 3 values + get all 3 + list + delete 1 + verify', { timeout: 15000 }, async () => {
    // 1. Initialize vault
    const { kdf } = await init(config, PASSPHRASE);
    expect(kdf).toBe('scrypt');

    // 2. Set 3 values
    await set(config, 'openai-key', 'sk-proj-abc123def456', PASSPHRASE);
    await set(config, 'signing-cert', '-----BEGIN CERTIFICATE-----\nMIIB...base64...==\n-----END CERTIFICATE-----', PASSPHRASE);
    await set(config, 'webhook-secret', 'whsec_abcdefghijklmnop', PASSPHRASE);

    // 3. Get all 3 values — byte-for-byte fidelity
    expect(await get(config, 'openai-key', PASSPHRASE)).toBe('sk-proj-abc123def456');
    expect(await get(config, 'signing-cert', PASSPHRASE)).toBe(
      '-----BEGIN CERTIFICATE-----\nMIIB...base64...==\n-----END CERTIFICATE-----',
    );
    expect(await get(config, 'webhook-secret', PASSPHRASE)).toBe('whsec_abcdefghijklmnop');

    // 4. List shows all 3 keys (sorted), no values exposed
    const keys = await list(config);
    expect(keys).toEqual(['openai-key', 'signing-cert', 'webhook-secret']);

    // 5. Vault file is not readable as plaintext
    const vaultRaw = await readFile(config.vaultPath, 'utf-8');
    expect(vaultRaw).not.toContain('sk-proj-abc123def456');
    expect(vaultRaw).not.toContain('BEGIN CERTIFICATE');
    expect(vaultRaw).not.toContain('whsec_abcdefghijklmnop');

    // 6. Delete one key
    await del(config, 'signing-cert', PASSPHRASE);

    // 7. Verify deletion
    const keysAfter = await list(config);
    expect(keysAfter).toEqual(['openai-key', 'webhook-secret']);

    // 8. Deleted key throws key-not-found
    await expect(get(config, 'signing-cert', PASSPHRASE)).rejects.toThrow(
      /Key "signing-cert" not found/,
    );

    // 9. Remaining keys still accessible
    expect(await get(config, 'openai-key', PASSPHRASE)).toBe('sk-proj-abc123def456');
    expect(await get(config, 'webhook-secret', PASSPHRASE)).toBe('whsec_abcdefghijklmnop');

    // 10. Wrong passphrase throws descriptive error
    await expect(
      get(config, 'openai-key', 'wrong-passphrase-here!'),
    ).rejects.toThrow(/Decryption failed.*wrong passphrase/);

    // 11. Salt file exists and is binary
    const salt = await readFile(config.saltPath);
    expect(salt.length).toBe(32);
  });
});
