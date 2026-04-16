/**
 * L3: SDK acceptance — consumer exercises key generation, storage, rotation,
 * and doctor colocation check through public APIs and validates security
 * invariants hold.
 */

import { describe, it, expect, afterEach, vi } from 'vitest';
import { mkdtemp, rm, stat, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

// Import only from public barrel exports — as a consumer would
import {
  generateKey,
  registerKey,
  createStorage,
  EnvStorage,
  rotateKey,
  verifyKeyMaterial,
  listKeys,
} from '../../src/keys/index.js';
import {
  resolveSigningKey,
  useSigningKey,
} from '../../src/publish/index.js';
import {
  checkKeyColocation,
  checkKeyColocationDoctor,
} from '../../src/doctor/checks/index.js';

describe('security-hardening-keys acceptance', () => {
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

  it('SDK consumer: key generation, storage, rotation, and doctor check through public APIs', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'claws-accept-hardening-'));
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    // ── 1. Generate and register keys ────────────────────────────────────

    const ed25519Key = generateKey('ed25519');
    expect(ed25519Key.algorithm).toBe('ed25519');
    expect(ed25519Key.privateKey).toBeTruthy();
    expect(ed25519Key.publicKey).toBeTruthy();

    const hmacKey = generateKey('hmac-sha256');
    expect(hmacKey.algorithm).toBe('hmac-sha256');
    expect(hmacKey.privateKey).toBeTruthy();

    // Register via public API
    const edEntry = await registerKey(tempDir, {
      id: 'accept-ed25519',
      algorithm: 'ed25519',
      storageTier: 'file',
      purpose: 'signing',
    });
    const fileStorage = createStorage('file', tempDir);
    await fileStorage.write(edEntry.id, ed25519Key.privateKey);
    await fileStorage.write(`${edEntry.id}.pub`, ed25519Key.publicKey!);

    // ── 2. EnvStorage with permission checks ─────────────────────────────

    const envStorage = new EnvStorage(tempDir);
    envKeys.push('CLAWS_KEY_ACCEPT_HMAC');
    await envStorage.write('accept-hmac', hmacKey.privateKey);

    // Verify .env permissions
    const envPath = join(tempDir, '.claws', 'keys', '.env');
    const envStat = await stat(envPath);
    expect(envStat.isFile()).toBe(true);
    if (process.platform !== 'win32') {
      expect(envStat.mode & 0o777).toBe(0o600);
    }

    // Verify plaintext warning
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('[claws:security]'),
    );

    // ── 3. Key listing ───────────────────────────────────────────────────

    const listResult = await listKeys(tempDir);
    expect(listResult.keys.length).toBeGreaterThanOrEqual(1);
    const ids = listResult.keys.map((k) => k.id);
    expect(ids).toContain('accept-ed25519');

    // ── 4. Rotation with success ─────────────────────────────────────────

    const rotateResult = await rotateKey(tempDir, 'accept-ed25519');
    expect(rotateResult.entry.version).toBe(2);
    expect(rotateResult.previousVersion).toBe(1);

    // New key differs from original (timing-safe comparison)
    const newKey = await fileStorage.read('accept-ed25519');
    expect(verifyKeyMaterial(newKey!, ed25519Key.privateKey)).toBe(false);

    // ── 5. Buffer zeroing through useSigningKey ──────────────────────────

    // Register HMAC key for resolution
    await registerKey(tempDir, {
      id: 'accept-hmac',
      algorithm: 'hmac-sha256',
      storageTier: 'env',
      purpose: 'signing',
    });

    const resolved = await resolveSigningKey(tempDir);
    expect(resolved).not.toBeNull();

    let capturedBuf: Buffer | null = null;
    await useSigningKey(resolved!, (buf) => {
      capturedBuf = buf;
      expect(buf.length).toBeGreaterThan(0);
    });
    expect((capturedBuf! as Buffer).every((b) => b === 0)).toBe(true);

    // ── 6. Doctor colocation check ───────────────────────────────────────

    // Default paths should NOT be co-located
    const doctorResult = await checkKeyColocationDoctor(tempDir);
    // With no HMAC key file, should be info (skipped)
    expect(doctorResult.passed).toBe(true);

    // Direct API: co-located paths should warn
    const colocated = checkKeyColocation(
      join(tempDir, 'shared', 'chain.jsonl'),
      join(tempDir, 'shared', 'hmac.key'),
    );
    expect(colocated.diagnostics[0].severity).toBe('warning');

    // Direct API: separate paths should be info
    const separate = checkKeyColocation(
      join(tempDir, 'audit', 'chain.jsonl'),
      join(tempDir, 'keys', 'hmac.key'),
    );
    expect(separate.diagnostics[0].severity).toBe('info');

    warnSpy.mockRestore();
  });
});
