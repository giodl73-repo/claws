/**
 * L0: Key revocation — block signing, audit chain REVOKE event.
 */

import { describe, it, expect, afterEach } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { registerKey, getKey } from '../../src/keys/registry.js';
import { generateKey } from '../../src/keys/generate.js';
import { createStorage } from '../../src/keys/storage.js';
import { revokeKey, assertKeyNotRevoked } from '../../src/keys/revoke.js';
import { readAuditChain } from '../../src/compliance/audit-chain.js';

describe('revokeKey', () => {
  let tempDir: string;

  afterEach(async () => {
    if (tempDir) {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it('marks key as revoked and blocks signing attempts', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'claws-rev-'));

    const generated = generateKey('ed25519');
    const storage = createStorage('file', tempDir);
    const entry = await registerKey(tempDir, {
      id: 'test-revoke-1',
      algorithm: 'ed25519',
      storageTier: 'file',
    });
    await storage.write(entry.id, generated.privateKey);

    // Revoke
    const result = await revokeKey(tempDir, 'test-revoke-1', 'compromised key');
    expect(result.entry.revoked).toBe(true);
    expect(result.entry.revokedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(result.revokedAt).toBe(result.entry.revokedAt);

    // Verify persisted
    const found = await getKey(tempDir, 'test-revoke-1');
    expect(found!.revoked).toBe(true);

    // assertKeyNotRevoked should throw
    await expect(assertKeyNotRevoked(tempDir, 'test-revoke-1')).rejects.toThrow(
      'Signing blocked: key test-revoke-1 has been revoked',
    );
  });

  it('appends REVOKE event to audit chain', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'claws-rev-'));

    const generated = generateKey('ed25519');
    const storage = createStorage('file', tempDir);
    await registerKey(tempDir, {
      id: 'test-audit-1',
      algorithm: 'ed25519',
      storageTier: 'file',
    });
    await storage.write('test-audit-1', generated.privateKey);

    await revokeKey(tempDir, 'test-audit-1', 'security incident');

    const chain = await readAuditChain(tempDir);
    expect(chain.length).toBeGreaterThanOrEqual(1);

    const revokeEvent = chain.find((e) => e.eventType === 'KEY_REVOKED');
    expect(revokeEvent).toBeDefined();
    expect(revokeEvent!.target).toBe('test-audit-1');
    expect(revokeEvent!.action).toBe('revoke');
    expect(revokeEvent!.outcome).toBe('security incident');
  });

  it('throws when revoking a nonexistent key', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'claws-rev-'));
    await expect(revokeKey(tempDir, 'nonexistent')).rejects.toThrow('Key not found: nonexistent');
  });

  it('throws when revoking an already-revoked key', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'claws-rev-'));

    const generated = generateKey('ed25519');
    const storage = createStorage('file', tempDir);
    await registerKey(tempDir, {
      id: 'test-double-rev',
      algorithm: 'ed25519',
      storageTier: 'file',
    });
    await storage.write('test-double-rev', generated.privateKey);

    await revokeKey(tempDir, 'test-double-rev');
    await expect(revokeKey(tempDir, 'test-double-rev')).rejects.toThrow('Key already revoked');
  });

  it('destroys key material from storage on revocation', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'claws-rev-'));

    const generated = generateKey('ed25519');
    const storage = createStorage('file', tempDir);
    await registerKey(tempDir, {
      id: 'test-destroy-1',
      algorithm: 'ed25519',
      storageTier: 'file',
    });
    await storage.write('test-destroy-1', generated.privateKey);
    if (generated.publicKey) {
      await storage.write('test-destroy-1.pub', generated.publicKey);
    }

    // Key material should exist before revocation
    expect(await storage.read('test-destroy-1')).toBeTruthy();

    await revokeKey(tempDir, 'test-destroy-1', 'key destruction test');

    // Key material should be destroyed after revocation
    expect(await storage.read('test-destroy-1')).toBeNull();
    expect(await storage.read('test-destroy-1.pub')).toBeNull();
  });
});

describe('assertKeyNotRevoked', () => {
  let tempDir: string;

  afterEach(async () => {
    if (tempDir) {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it('succeeds for non-revoked keys', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'claws-rev-'));
    await registerKey(tempDir, {
      id: 'test-ok-key',
      algorithm: 'ed25519',
      storageTier: 'file',
    });
    // Should not throw
    await assertKeyNotRevoked(tempDir, 'test-ok-key');
  });

  it('throws for nonexistent keys', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'claws-rev-'));
    await expect(assertKeyNotRevoked(tempDir, 'missing')).rejects.toThrow('Key not found: missing');
  });
});
