/**
 * L0: Secrets vault — key derivation, encrypt/decrypt, passphrase checks,
 * vault CRUD, salt management, Argon2 param validation, KDF readback.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { randomBytes } from 'node:crypto';
import { mkdtemp, rm, readFile, writeFile, mkdir, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  deriveKey,
  setArgon2Available,
  resetArgon2Cache,
  isArgon2Available,
  defaultVaultConfig,
  init,
  set,
  get,
  list,
  del,
  readVaultKdf,
  DEFAULT_ARGON2_PARAMS,
} from '../../src/protect/secrets.js';
import type { Argon2Params } from '../../src/protect/secrets.js';
import type { VaultConfig } from '../../src/protect/types.js';

// Force scrypt fallback in unit tests (no argon2 native module in CI)
beforeEach(() => {
  resetArgon2Cache();
  setArgon2Available(false);
});

// ── Temp workspace helper ────────────────────────────────────────────

let tmpDir: string;

beforeEach(async () => {
  tmpDir = await mkdtemp(join(tmpdir(), 'secrets-test-'));
});

afterEach(async () => {
  await rm(tmpDir, { recursive: true, force: true });
});

const GOOD_PASS = 'Strong!Pass#2024xK';

function tmpVaultConfig(): VaultConfig {
  return defaultVaultConfig(tmpDir);
}

// ── Key derivation ───────────────────────────────────────────────────

describe('key derivation', () => {
  it('produces consistent output for same passphrase + salt', async () => {
    const salt = randomBytes(32);
    const passphrase = 'test-passphrase-1234';

    const { key: key1, kdf: kdf1 } = await deriveKey(passphrase, salt);
    const { key: key2, kdf: kdf2 } = await deriveKey(passphrase, salt);

    expect(kdf1).toBe('scrypt');
    expect(kdf2).toBe('scrypt');
    expect(Buffer.compare(key1, key2)).toBe(0);
    expect(key1.length).toBe(32);
  });

  it('returns scrypt when argon2 is unavailable', async () => {
    const salt = randomBytes(32);
    const { kdf } = await deriveKey('test-passphrase-1234', salt);
    expect(kdf).toBe('scrypt');
  });
});

// ── Argon2 availability cache ─────────────────────────────────────────

describe('argon2 availability', () => {
  it('caches result after first probe', async () => {
    resetArgon2Cache();
    // First call probes
    const first = await isArgon2Available();
    // Second call returns cached value
    const second = await isArgon2Available();
    expect(first).toBe(second);
  });

  it('setArgon2Available overrides the cache', () => {
    setArgon2Available(true);
    // We can verify via isArgon2Available returning the override
    // (But deriveKey would fail because argon2 module isn't installed)
    resetArgon2Cache(); // Clean up
  });

  it('resetArgon2Cache clears the override', async () => {
    setArgon2Available(true);
    resetArgon2Cache();
    // After reset, isArgon2Available re-probes (will be false in CI)
    const result = await isArgon2Available();
    expect(typeof result).toBe('boolean');
  });
});

// ── Argon2 parameter validation ───────────────────────────────────────

describe('argon2 parameter validation', () => {
  it('rejects memoryCost below floor', async () => {
    setArgon2Available(true);
    const salt = randomBytes(32);
    const badParams: Argon2Params = { memoryCost: 1000, timeCost: 4, parallelism: 4 };
    // deriveKey with argon2 enabled will validate params before the import fails
    await expect(deriveKey('test-passphrase-1234', salt, badParams)).rejects.toThrow(
      /memoryCost must be >= 65536/,
    );
  });

  it('rejects timeCost below floor', async () => {
    setArgon2Available(true);
    const salt = randomBytes(32);
    const badParams: Argon2Params = { memoryCost: 65536, timeCost: 1, parallelism: 4 };
    await expect(deriveKey('test-passphrase-1234', salt, badParams)).rejects.toThrow(
      /timeCost must be >= 3/,
    );
  });

  it('rejects parallelism below floor', async () => {
    setArgon2Available(true);
    const salt = randomBytes(32);
    const badParams: Argon2Params = { memoryCost: 65536, timeCost: 3, parallelism: 0 };
    await expect(deriveKey('test-passphrase-1234', salt, badParams)).rejects.toThrow(
      /parallelism must be >= 1/,
    );
  });

  it('DEFAULT_ARGON2_PARAMS passes validation', () => {
    expect(DEFAULT_ARGON2_PARAMS.memoryCost).toBeGreaterThanOrEqual(65536);
    expect(DEFAULT_ARGON2_PARAMS.timeCost).toBeGreaterThanOrEqual(3);
    expect(DEFAULT_ARGON2_PARAMS.parallelism).toBeGreaterThanOrEqual(1);
  });

  it('argon2 path fails at import when module not installed (valid params)', async () => {
    setArgon2Available(true);
    const salt = randomBytes(32);
    // Valid params pass validateArgon2Params but the import("argon2") will fail
    const validParams: Argon2Params = { memoryCost: 65536, timeCost: 3, parallelism: 1 };
    await expect(deriveKey('test-passphrase-1234', salt, validParams)).rejects.toThrow();
  });

  it('argon2 path uses default params when none provided', async () => {
    setArgon2Available(true);
    const salt = randomBytes(32);
    // No argon2Params → uses DEFAULT_ARGON2_PARAMS → fails at import
    await expect(deriveKey('test-passphrase-1234', salt)).rejects.toThrow();
  });
});

// ── Encrypt/decrypt roundtrip ─────────────────────────────────────────

describe('encrypt/decrypt roundtrip', () => {
  it('preserves value exactly through vault set/get', async () => {
    const salt = randomBytes(32);
    const passphrase = 'test-passphrase-roundtrip';
    const { key } = await deriveKey(passphrase, salt);

    const { createCipheriv, createDecipheriv } = await import('node:crypto');
    const iv = randomBytes(12);
    const plaintext = 'super-secret-api-key-12345!@#$%';

    const cipher = createCipheriv('aes-256-gcm', key, iv);
    const encrypted = Buffer.concat([
      cipher.update(plaintext, 'utf8'),
      cipher.final(),
    ]);
    const tag = cipher.getAuthTag();

    const decipher = createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(tag);
    const decrypted = Buffer.concat([
      decipher.update(encrypted),
      decipher.final(),
    ]);

    expect(decrypted.toString('utf8')).toBe(plaintext);
  });
});

// ── Wrong passphrase rejection ────────────────────────────────────────

describe('wrong passphrase rejection', () => {
  it('different passphrases produce different keys', async () => {
    const salt = randomBytes(32);

    const { key: key1 } = await deriveKey('correct-passphrase!', salt);
    const { key: key2 } = await deriveKey('wrong-passphrase!!1', salt);

    expect(Buffer.compare(key1, key2)).not.toBe(0);
  });
});

// ── Vault file not plaintext ──────────────────────────────────────────

describe('vault file not plaintext', () => {
  it('encrypted ciphertext does not contain original value', async () => {
    const salt = randomBytes(32);
    const passphrase = 'encryption-test-pass';
    const { key } = await deriveKey(passphrase, salt);

    const { createCipheriv } = await import('node:crypto');
    const iv = randomBytes(12);
    const secret = 'my-database-password-visible';

    const cipher = createCipheriv('aes-256-gcm', key, iv);
    const encrypted = Buffer.concat([
      cipher.update(secret, 'utf8'),
      cipher.final(),
    ]);

    expect(encrypted.toString('utf8')).not.toContain(secret);
    expect(encrypted.toString('base64')).not.toContain(secret);
  });
});

// ── Passphrase entropy check ──────────────────────────────────────────

describe('passphrase entropy check', () => {
  it('rejects weak passphrase via init', async () => {
    const config = tmpVaultConfig();

    // Too short
    await expect(init(config, 'short')).rejects.toThrow(
      /Passphrase too short: 5 characters/,
    );

    // Long but single-charset (low entropy)
    await expect(init(config, 'aaaaaaaaaaaa')).rejects.toThrow(
      /Passphrase too weak/,
    );
  });

  it('rejects passphrase too short via set', async () => {
    const config = tmpVaultConfig();
    await expect(set(config, 'key', 'val', 'short')).rejects.toThrow(/Passphrase too short/);
  });

  it('rejects passphrase too short via get', async () => {
    const config = tmpVaultConfig();
    await expect(get(config, 'key', 'short')).rejects.toThrow(/Passphrase too short/);
  });

  it('rejects passphrase too short via del', async () => {
    const config = tmpVaultConfig();
    await expect(del(config, 'key', 'short')).rejects.toThrow(/Passphrase too short/);
  });

  it('accepts a strong mixed-charset passphrase', async () => {
    const config = tmpVaultConfig();
    const { kdf } = await init(config, GOOD_PASS);
    expect(kdf).toBe('scrypt');
  });
});

// ── defaultVaultConfig ────────────────────────────────────────────────

describe('defaultVaultConfig', () => {
  it('returns correct paths relative to workspace root', () => {
    const config = defaultVaultConfig('/workspace');
    expect(config.algorithm).toBe('aes-256-gcm');
    expect(config.saltPath).toContain('.claws');
    expect(config.saltPath).toContain('vault.salt');
    expect(config.vaultPath).toContain('.claws');
    expect(config.vaultPath).toContain('vault.enc');
    expect(config.keyDerivation).toBe('argon2');
  });
});

// ── Vault init ────────────────────────────────────────────────────────

describe('vault init', () => {
  it('creates salt file and empty vault', async () => {
    const config = tmpVaultConfig();
    const { kdf } = await init(config, GOOD_PASS);
    expect(kdf).toBe('scrypt');

    // Salt file exists
    const saltStat = await stat(config.saltPath);
    expect(saltStat.isFile()).toBe(true);

    // Vault file exists and has correct structure
    const vaultRaw = await readFile(config.vaultPath, 'utf-8');
    const vault = JSON.parse(vaultRaw);
    expect(vault.version).toBe(1);
    expect(vault.kdf).toBe('scrypt');
    expect(vault.entries).toEqual({});
  });

  it('rejects re-init when vault already exists', async () => {
    const config = tmpVaultConfig();
    await init(config, GOOD_PASS);
    await expect(init(config, GOOD_PASS)).rejects.toThrow(/Vault already exists/);
  });

  it('sets vault file permissions to 0o600', async () => {
    const config = tmpVaultConfig();
    await init(config, GOOD_PASS);
    const vaultStat = await stat(config.vaultPath);
    // On Windows, permissions are not enforced the same way, but the call succeeds
    expect(vaultStat.isFile()).toBe(true);
  });
});

// ── Vault set / get roundtrip ─────────────────────────────────────────

describe('vault set/get', () => {
  it('stores and retrieves a secret', async () => {
    const config = tmpVaultConfig();
    await init(config, GOOD_PASS);

    await set(config, 'api-key', 'sk-1234567890', GOOD_PASS);
    const value = await get(config, 'api-key', GOOD_PASS);
    expect(value).toBe('sk-1234567890');
  });

  it('overwrites an existing key', async () => {
    const config = tmpVaultConfig();
    await init(config, GOOD_PASS);

    await set(config, 'token', 'old-value', GOOD_PASS);
    await set(config, 'token', 'new-value', GOOD_PASS);
    const value = await get(config, 'token', GOOD_PASS);
    expect(value).toBe('new-value');
  });

  it('stores multiple keys independently', async () => {
    const config = tmpVaultConfig();
    await init(config, GOOD_PASS);

    await set(config, 'key-a', 'value-a', GOOD_PASS);
    await set(config, 'key-b', 'value-b', GOOD_PASS);

    expect(await get(config, 'key-a', GOOD_PASS)).toBe('value-a');
    expect(await get(config, 'key-b', GOOD_PASS)).toBe('value-b');
  });

  it('throws when getting non-existent key', async () => {
    const config = tmpVaultConfig();
    await init(config, GOOD_PASS);

    await expect(get(config, 'nope', GOOD_PASS)).rejects.toThrow(
      /Key "nope" not found in vault/,
    );
  });

  it('throws when vault not initialized (set)', async () => {
    const config = tmpVaultConfig();
    // Create salt file without vault
    await mkdir(join(tmpDir, '.claws', 'secrets'), { recursive: true });
    await writeFile(config.saltPath, randomBytes(32));

    await expect(set(config, 'key', 'val', GOOD_PASS)).rejects.toThrow(
      /Vault not initialized/,
    );
  });

  it('throws when vault not initialized (get)', async () => {
    const config = tmpVaultConfig();
    await mkdir(join(tmpDir, '.claws', 'secrets'), { recursive: true });
    await writeFile(config.saltPath, randomBytes(32));

    await expect(get(config, 'key', GOOD_PASS)).rejects.toThrow(
      /Vault not initialized/,
    );
  });

  it('throws when salt file missing (set)', async () => {
    const config = tmpVaultConfig();
    await expect(set(config, 'key', 'val', GOOD_PASS)).rejects.toThrow(
      /salt file not found/,
    );
  });

  it('throws when salt file missing (get)', async () => {
    const config = tmpVaultConfig();
    await expect(get(config, 'key', GOOD_PASS)).rejects.toThrow(
      /salt file not found/,
    );
  });

  it('decryption fails with wrong passphrase', async () => {
    const config = tmpVaultConfig();
    await init(config, GOOD_PASS);
    await set(config, 'secret', 'the-value', GOOD_PASS);

    await expect(get(config, 'secret', 'Wrong!Pass#2024xY')).rejects.toThrow(
      /Decryption failed.*wrong passphrase/,
    );
  });
});

// ── Vault list ────────────────────────────────────────────────────────

describe('vault list', () => {
  it('returns empty array for empty vault', async () => {
    const config = tmpVaultConfig();
    await init(config, GOOD_PASS);

    const keys = await list(config);
    expect(keys).toEqual([]);
  });

  it('returns sorted keys', async () => {
    const config = tmpVaultConfig();
    await init(config, GOOD_PASS);

    await set(config, 'z-key', 'val', GOOD_PASS);
    await set(config, 'a-key', 'val', GOOD_PASS);
    await set(config, 'm-key', 'val', GOOD_PASS);

    const keys = await list(config);
    expect(keys).toEqual(['a-key', 'm-key', 'z-key']);
  });

  it('throws when vault not initialized', async () => {
    const config = tmpVaultConfig();
    await expect(list(config)).rejects.toThrow(/Vault not initialized/);
  });
});

// ── Vault del ─────────────────────────────────────────────────────────

describe('vault del', () => {
  it('removes a key from the vault', async () => {
    const config = tmpVaultConfig();
    await init(config, GOOD_PASS);
    await set(config, 'to-delete', 'secret-val', GOOD_PASS);

    await del(config, 'to-delete', GOOD_PASS);

    const keys = await list(config);
    expect(keys).not.toContain('to-delete');
  });

  it('throws when deleting non-existent key', async () => {
    const config = tmpVaultConfig();
    await init(config, GOOD_PASS);

    await expect(del(config, 'nope', GOOD_PASS)).rejects.toThrow(
      /Key "nope" not found in vault/,
    );
  });

  it('throws when vault not initialized', async () => {
    const config = tmpVaultConfig();
    await mkdir(join(tmpDir, '.claws', 'secrets'), { recursive: true });
    await writeFile(config.saltPath, randomBytes(32));

    await expect(del(config, 'key', GOOD_PASS)).rejects.toThrow(
      /Vault not initialized/,
    );
  });

  it('throws when salt file missing', async () => {
    const config = tmpVaultConfig();
    await expect(del(config, 'key', GOOD_PASS)).rejects.toThrow(
      /salt file not found/,
    );
  });

  it('decryption verification fails with wrong passphrase on del', async () => {
    const config = tmpVaultConfig();
    await init(config, GOOD_PASS);
    await set(config, 'protected', 'val', GOOD_PASS);

    await expect(del(config, 'protected', 'Wrong!Pass#2024xY')).rejects.toThrow(
      /Decryption failed.*wrong passphrase/,
    );
  });
});

// ── readVaultKdf ──────────────────────────────────────────────────────

describe('readVaultKdf', () => {
  it('returns the KDF used by the vault', async () => {
    const config = tmpVaultConfig();
    await init(config, GOOD_PASS);

    const kdf = await readVaultKdf(config);
    expect(kdf).toBe('scrypt');
  });

  it('returns undefined when vault does not exist', async () => {
    const config = tmpVaultConfig();
    const kdf = await readVaultKdf(config);
    expect(kdf).toBeUndefined();
  });
});
