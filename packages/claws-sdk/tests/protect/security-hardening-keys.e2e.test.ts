/**
 * L2: Full key material lifecycle — generate key, verify 0o600 permissions,
 * use for signing with Buffer, verify zeroing, rotate with rollback on failure,
 * confirm cleanup.
 */

import { describe, it, expect, afterEach, vi } from 'vitest';
import { mkdtemp, rm, stat, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { sign as cryptoSign, verify as cryptoVerify } from 'node:crypto';
import { generateKey } from '../../src/keys/generate.js';
import { registerKey, getKey } from '../../src/keys/registry.js';
import { createStorage, EnvStorage } from '../../src/keys/storage.js';
import { rotateKey, verifyKeyMaterial } from '../../src/keys/rotate.js';
import { resolveSigningKey, useSigningKey } from '../../src/publish/key-resolution.js';
import { checkKeyColocation } from '../../src/doctor/checks/key-colocation.js';

describe('security-hardening-keys e2e', () => {
  let tempDir: string;
  const envKeys: string[] = [];

  afterEach(async () => {
    for (const k of envKeys) {
      delete process.env[k];
    }
    envKeys.length = 0;
    if (tempDir) {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it('full key material lifecycle with permissions, signing, zeroing, and rotation rollback', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'claws-e2e-hardening-'));
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    // ── Phase 1: Generate and store with permissions ──────────────────────

    // Generate Ed25519 key for signing
    const generated = generateKey('ed25519');
    const fileStorage = createStorage('file', tempDir);

    // Register and store key
    const entry = await registerKey(tempDir, {
      id: 'e2e-hardening-key',
      algorithm: 'ed25519',
      storageTier: 'file',
      purpose: 'signing',
    });
    await fileStorage.write(entry.id, generated.privateKey);
    await fileStorage.write(`${entry.id}.pub`, generated.publicKey!);

    // Also store HMAC key via EnvStorage to test .env permissions
    const envStorage = new EnvStorage(tempDir);
    envKeys.push('CLAWS_KEY_E2E_HMAC');
    await envStorage.write('e2e-hmac', 'deadbeefcafebabe1234567890abcdef');

    // Verify .env file permissions
    const envPath = join(tempDir, '.claws', 'keys', '.env');
    const envStat = await stat(envPath);
    if (process.platform !== 'win32') {
      expect(envStat.mode & 0o777).toBe(0o600);
    }

    // Verify plaintext warning was emitted
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('[claws:security] Plaintext key material'),
    );

    // ── Phase 2: Sign with Buffer and verify zeroing ─────────────────────

    // Register an HMAC signing key for resolution
    const hmacEntry = await registerKey(tempDir, {
      id: 'e2e-hmac',
      algorithm: 'hmac-sha256',
      storageTier: 'env',
      purpose: 'signing',
    });

    const resolved = await resolveSigningKey(tempDir);
    expect(resolved).not.toBeNull();

    let capturedBuffer: Buffer | null = null;
    const signResult = await useSigningKey(resolved!, (keyBuffer) => {
      capturedBuffer = keyBuffer;
      expect(keyBuffer.length).toBeGreaterThan(0);
      return 'signed-artifact';
    });
    expect(signResult).toBe('signed-artifact');

    // Buffer must be zeroed
    expect(capturedBuffer).not.toBeNull();
    expect((capturedBuffer! as Buffer).every((b) => b === 0)).toBe(true);

    // ── Phase 3: Successful rotation ─────────────────────────────────────

    const rotateResult = await rotateKey(tempDir, 'e2e-hardening-key');
    expect(rotateResult.entry.version).toBe(2);

    // New key material should differ from original
    const newKey = await fileStorage.read(entry.id);
    expect(newKey).not.toBe(generated.privateKey);

    // Archive should exist (preserved for recovery)
    const keysDir = join(tempDir, '.claws', 'keys');
    const archiveStat = await stat(join(keysDir, 'e2e-hardening-key.v1.key'));
    expect(archiveStat.isFile()).toBe(true);

    // ── Phase 4: Rotation rollback on failure ────────────────────────────

    // Create artifact that will cause re-sign failure
    const compiledDir = join(tempDir, '.claws', 'compiled');
    await mkdir(compiledDir, { recursive: true });
    await writeFile(join(compiledDir, 'policy.json'), 'governance-policy', 'utf-8');
    await mkdir(join(compiledDir, 'policy.json.sig'), { recursive: true });

    await expect(rotateKey(tempDir, 'e2e-hardening-key')).rejects.toThrow(
      'Partial re-sign failure',
    );

    // Verify archive from failed rotation was cleaned up
    await expect(stat(join(keysDir, 'e2e-hardening-key.v2.key'))).rejects.toThrow();

    // Verify registry was NOT updated to v3
    const afterEntry = await getKey(tempDir, 'e2e-hardening-key');
    expect(afterEntry!.version).toBe(2);

    // ── Phase 5: Doctor check — key colocation ───────────────────────────

    // Default layout has keys in .claws/keys/ and audit chain in .claws/audit/
    const colocationResult = checkKeyColocation(
      join(tempDir, '.claws', 'audit', 'chain.jsonl'),
      join(tempDir, '.claws', 'keys', 'hmac.key'),
    );
    expect(colocationResult.passed).toBe(true);
    expect(colocationResult.diagnostics[0].severity).toBe('info');

    // Co-located case should warn
    const colocatedResult = checkKeyColocation(
      join(tempDir, '.claws', 'shared', 'chain.jsonl'),
      join(tempDir, '.claws', 'shared', 'hmac.key'),
    );
    expect(colocatedResult.diagnostics[0].severity).toBe('warning');
    expect(colocatedResult.diagnostics[0].message).toContain('co-located');

    warnSpy.mockRestore();
  });
});
