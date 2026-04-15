/**
 * L0: Key resolution chain — CI > fleet > identity priority.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { randomBytes } from 'node:crypto';
import { resolveSigningKey, validateCiKeyFormat } from '../../src/publish/key-resolution.js';
import { registerKey, updateKey } from '../../src/keys/registry.js';
import { createStorage } from '../../src/keys/storage.js';

function tempDir(): string {
  return join(tmpdir(), `claws-test-keyres-${randomBytes(4).toString('hex')}`);
}

describe('resolveSigningKey', () => {
  let dir: string;
  const ciKeyValue = randomBytes(32).toString('hex');

  beforeEach(async () => {
    dir = tempDir();
    await mkdir(dir, { recursive: true });
    // Clean CI env
    delete process.env['CLAWS_CI_SIGNING_KEY'];
    delete process.env['CLAWS_CI_SIGNING_KEY_ID'];
  });

  afterEach(async () => {
    delete process.env['CLAWS_CI_SIGNING_KEY'];
    delete process.env['CLAWS_CI_SIGNING_KEY_ID'];
    await rm(dir, { recursive: true, force: true });
  });

  it('returns null when no key is available', async () => {
    const result = await resolveSigningKey(dir);
    expect(result).toBeNull();
  });

  it('resolves CI env var without explicit key ID (defaults to ci-env-key)', async () => {
    process.env['CLAWS_CI_SIGNING_KEY'] = ciKeyValue;
    // Deliberately NOT setting CLAWS_CI_SIGNING_KEY_ID

    const result = await resolveSigningKey(dir);
    expect(result).not.toBeNull();
    expect(result!.source).toBe('ci-env');
    expect(result!.keyId).toBe('ci-env-key');
  });

  it('resolves CI env var with highest priority', async () => {
    // Set up CI env
    process.env['CLAWS_CI_SIGNING_KEY'] = ciKeyValue;
    process.env['CLAWS_CI_SIGNING_KEY_ID'] = 'ci-key-1';

    // Also register a fleet key
    const entry = await registerKey(dir, {
      algorithm: 'hmac-sha256',
      storageTier: 'file',
      purpose: 'signing',
    });
    const storage = createStorage('file', dir);
    await storage.write(entry.id, randomBytes(32).toString('hex'));

    const result = await resolveSigningKey(dir);
    expect(result).not.toBeNull();
    expect(result!.source).toBe('ci-env');
    expect(result!.keyMaterial).toBe(ciKeyValue);
    expect(result!.keyId).toBe('ci-key-1');
  });

  it('falls back to fleet key when no CI env', async () => {
    const fleetKeyMaterial = randomBytes(32).toString('hex');
    const entry = await registerKey(dir, {
      algorithm: 'hmac-sha256',
      storageTier: 'file',
      purpose: 'signing',
    });
    const storage = createStorage('file', dir);
    await storage.write(entry.id, fleetKeyMaterial);

    const result = await resolveSigningKey(dir);
    expect(result).not.toBeNull();
    expect(result!.source).toBe('fleet');
    expect(result!.keyMaterial).toBe(fleetKeyMaterial);
    expect(result!.keyId).toBe(entry.id);
  });

  it('falls back to identity key when no CI or fleet key', async () => {
    const identityKeyMaterial = randomBytes(32).toString('hex');
    const entry = await registerKey(dir, {
      algorithm: 'hmac-sha256',
      storageTier: 'env',
      purpose: 'signing',
    });
    // Write to env storage
    const envName = `CLAWS_KEY_${entry.id.replace(/[-. ]/g, '_').toUpperCase()}`;
    process.env[envName] = identityKeyMaterial;

    const result = await resolveSigningKey(dir);
    expect(result).not.toBeNull();
    expect(result!.source).toBe('identity');
    expect(result!.keyMaterial).toBe(identityKeyMaterial);

    // Cleanup
    delete process.env[envName];
  });

  it('prefers CI env over fleet and identity', async () => {
    // Set CI
    process.env['CLAWS_CI_SIGNING_KEY'] = ciKeyValue;

    // Register fleet key
    const entry = await registerKey(dir, {
      algorithm: 'hmac-sha256',
      storageTier: 'file',
      purpose: 'signing',
    });
    const storage = createStorage('file', dir);
    await storage.write(entry.id, randomBytes(32).toString('hex'));

    // Register identity key
    const envEntry = await registerKey(dir, {
      algorithm: 'hmac-sha256',
      storageTier: 'env',
      purpose: 'signing',
    });
    const envName = `CLAWS_KEY_${envEntry.id.replace(/[-. ]/g, '_').toUpperCase()}`;
    process.env[envName] = randomBytes(32).toString('hex');

    const result = await resolveSigningKey(dir);
    expect(result!.source).toBe('ci-env');

    delete process.env[envName];
  });

  it('skips fleet key when material is not in storage', async () => {
    // Register key in registry but don't write material to storage
    await registerKey(dir, {
      algorithm: 'hmac-sha256',
      storageTier: 'file',
      purpose: 'signing',
    });

    const result = await resolveSigningKey(dir);
    // Fleet key registered but material not in storage → null
    expect(result).toBeNull();
  });

  it('skips identity key when material is not in env', async () => {
    // Register env-stored key but don't set the env var
    await registerKey(dir, {
      algorithm: 'hmac-sha256',
      storageTier: 'env',
      purpose: 'signing',
    });

    const result = await resolveSigningKey(dir);
    expect(result).toBeNull();
  });

  it('prefers most recently rotated key when multiple fleet keys exist', async () => {
    // Register two keys — second one has a rotatedAt date (more recent)
    const entry1 = await registerKey(dir, {
      algorithm: 'hmac-sha256',
      storageTier: 'file',
      purpose: 'signing',
    });
    const key1Material = randomBytes(32).toString('hex');
    const storage1 = createStorage('file', dir);
    await storage1.write(entry1.id, key1Material);

    const entry2 = await registerKey(dir, {
      algorithm: 'hmac-sha256',
      storageTier: 'file',
      purpose: 'signing',
    });
    const key2Material = randomBytes(32).toString('hex');
    const storage2 = createStorage('file', dir);
    await storage2.write(entry2.id, key2Material);

    // Update entry1 to have a rotatedAt date that's more recent
    const { updateKey } = await import('../../src/keys/registry.js');
    await updateKey(dir, {
      ...entry1,
      rotatedAt: new Date(Date.now() + 10000).toISOString(),
    });

    const result = await resolveSigningKey(dir);
    expect(result).not.toBeNull();
    expect(result!.source).toBe('fleet');
    // Should pick entry1 because it has a more recent rotatedAt
    expect(result!.keyId).toBe(entry1.id);
  });

  it('skips revoked keys', async () => {
    const entry = await registerKey(dir, {
      algorithm: 'hmac-sha256',
      storageTier: 'file',
      purpose: 'signing',
    });
    const storage = createStorage('file', dir);
    await storage.write(entry.id, randomBytes(32).toString('hex'));

    // Revoke the key by updating the registry
    const { readRegistry } = await import('../../src/keys/registry.js');
    const keys = await readRegistry(dir);
    const key = keys.find((k) => k.id === entry.id);
    if (key) {
      await updateKey(dir, { ...key, revoked: true, revokedAt: new Date().toISOString() });
    }

    const result = await resolveSigningKey(dir);
    expect(result).toBeNull();
  });

  it('rejects CI key with empty value', async () => {
    process.env['CLAWS_CI_SIGNING_KEY'] = '   ';

    await expect(resolveSigningKey(dir)).rejects.toThrow('empty after trimming');
  });

  it('rejects CI key with non-hex characters', async () => {
    process.env['CLAWS_CI_SIGNING_KEY'] = 'not-valid-hex-data!!@@##$$%%^^&&';

    await expect(resolveSigningKey(dir)).rejects.toThrow('non-hex characters');
  });

  it('rejects CI key shorter than 32 bytes', async () => {
    // 16 bytes = 32 hex chars, below the minimum of 32 bytes
    process.env['CLAWS_CI_SIGNING_KEY'] = randomBytes(16).toString('hex');

    await expect(resolveSigningKey(dir)).rejects.toThrow('minimum is 32 bytes');
  });

  it('accepts CI key of exactly 32 bytes', async () => {
    process.env['CLAWS_CI_SIGNING_KEY'] = randomBytes(32).toString('hex');

    const result = await resolveSigningKey(dir);
    expect(result).not.toBeNull();
    expect(result!.source).toBe('ci-env');
  });

  it('trims whitespace from CI key before validation', async () => {
    const hex = randomBytes(32).toString('hex');
    process.env['CLAWS_CI_SIGNING_KEY'] = `  ${hex}  `;

    const result = await resolveSigningKey(dir);
    expect(result).not.toBeNull();
    expect(result!.keyMaterial).toBe(hex);
  });

  it('blocks CI key when referenced key ID is revoked in registry', async () => {
    const keyMaterial = randomBytes(32).toString('hex');
    const entry = await registerKey(dir, {
      algorithm: 'hmac-sha256',
      storageTier: 'file',
      purpose: 'signing',
    });

    // Revoke the key
    await updateKey(dir, { ...entry, revoked: true, revokedAt: new Date().toISOString() });

    process.env['CLAWS_CI_SIGNING_KEY'] = keyMaterial;
    process.env['CLAWS_CI_SIGNING_KEY_ID'] = entry.id;

    await expect(resolveSigningKey(dir)).rejects.toThrow('revoked');
  });

  it('allows CI key when referenced key ID is not revoked', async () => {
    const keyMaterial = randomBytes(32).toString('hex');
    const entry = await registerKey(dir, {
      algorithm: 'hmac-sha256',
      storageTier: 'file',
      purpose: 'signing',
    });

    process.env['CLAWS_CI_SIGNING_KEY'] = keyMaterial;
    process.env['CLAWS_CI_SIGNING_KEY_ID'] = entry.id;

    const result = await resolveSigningKey(dir);
    expect(result).not.toBeNull();
    expect(result!.source).toBe('ci-env');
    expect(result!.keyId).toBe(entry.id);
  });

  it('skips revocation check when CI key ID is not in registry', async () => {
    const keyMaterial = randomBytes(32).toString('hex');
    process.env['CLAWS_CI_SIGNING_KEY'] = keyMaterial;
    process.env['CLAWS_CI_SIGNING_KEY_ID'] = 'unknown-key-id';

    const result = await resolveSigningKey(dir);
    expect(result).not.toBeNull();
    expect(result!.source).toBe('ci-env');
    expect(result!.keyId).toBe('unknown-key-id');
  });
});

describe('validateCiKeyFormat', () => {
  it('returns null for valid hex key of sufficient length', () => {
    const hex = randomBytes(32).toString('hex');
    expect(validateCiKeyFormat(hex)).toBeNull();
  });

  it('returns error for empty string', () => {
    expect(validateCiKeyFormat('')).toContain('empty');
  });

  it('returns error for whitespace-only string', () => {
    expect(validateCiKeyFormat('   ')).toContain('empty');
  });

  it('returns error for non-hex characters', () => {
    expect(validateCiKeyFormat('xyz123')).toContain('non-hex');
  });

  it('returns error for short key', () => {
    const shortHex = randomBytes(15).toString('hex'); // 15 bytes = 30 hex chars
    expect(validateCiKeyFormat(shortHex)).toContain('minimum');
  });

  it('accepts key longer than 32 bytes', () => {
    const longHex = randomBytes(64).toString('hex');
    expect(validateCiKeyFormat(longHex)).toBeNull();
  });
});
