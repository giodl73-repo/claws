/**
 * L1: Secrets vault — full lifecycle and persistence across sessions.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
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
const PASSPHRASE = 'integration-test-passphrase-strong!';

beforeEach(async () => {
  resetArgon2Cache();
  setArgon2Available(false);
  tempDir = await mkdtemp(join(tmpdir(), 'claws-vault-int-'));
  config = defaultVaultConfig(tempDir);
});

afterEach(async () => {
  if (tempDir) {
    await rm(tempDir, { recursive: true, force: true });
  }
});

describe('vault lifecycle', () => {
  it('init/set/get/list across multiple keys', { timeout: 15000 }, async () => {
    // Init vault
    const { kdf } = await init(config, PASSPHRASE);
    expect(kdf).toBe('scrypt');

    // Set multiple keys
    await set(config, 'api-key', 'sk-1234567890abcdef', PASSPHRASE);
    await set(config, 'db-password', 'p@ssw0rd!complex', PASSPHRASE);
    await set(config, 'jwt-secret', 'eyJhbGciOiJIUzI1NiJ9', PASSPHRASE);

    // List returns all keys sorted
    const keys = await list(config);
    expect(keys).toEqual(['api-key', 'db-password', 'jwt-secret']);

    // Get returns correct values
    expect(await get(config, 'api-key', PASSPHRASE)).toBe('sk-1234567890abcdef');
    expect(await get(config, 'db-password', PASSPHRASE)).toBe('p@ssw0rd!complex');
    expect(await get(config, 'jwt-secret', PASSPHRASE)).toBe('eyJhbGciOiJIUzI1NiJ9');

    // Delete one key
    await del(config, 'db-password', PASSPHRASE);

    // Verify deletion
    const keysAfter = await list(config);
    expect(keysAfter).toEqual(['api-key', 'jwt-secret']);

    // Get deleted key throws
    await expect(get(config, 'db-password', PASSPHRASE)).rejects.toThrow(
      /Key "db-password" not found/,
    );
  });
});

describe('vault persistence across sessions', () => {
  it('init in one call, set+get in another', async () => {
    // Session 1: init vault
    await init(config, PASSPHRASE);

    // Session 2: set values (fresh config, same paths)
    const config2 = defaultVaultConfig(tempDir);
    await set(config2, 'token', 'persistence-test-value', PASSPHRASE);

    // Session 3: get values (fresh config again)
    const config3 = defaultVaultConfig(tempDir);
    const value = await get(config3, 'token', PASSPHRASE);
    expect(value).toBe('persistence-test-value');

    // Session 4: list (fresh config)
    const config4 = defaultVaultConfig(tempDir);
    const keys = await list(config4);
    expect(keys).toEqual(['token']);
  });
});
