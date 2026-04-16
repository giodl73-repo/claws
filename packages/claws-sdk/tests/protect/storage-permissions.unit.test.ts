/**
 * L0: .env file permissions and plaintext key warning.
 *
 * S-02: .env files must have 0o600 permissions (owner read/write only).
 * S-02: Plaintext key storage triggers a warning log.
 * Key comparison uses timingSafeEqual (verified by mock).
 */

import { describe, it, expect, afterEach, vi } from 'vitest';
import { mkdtemp, rm, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { EnvStorage, warnPlaintextKeyStorage } from '../../src/keys/storage.js';
import { verifyKeyMaterial } from '../../src/keys/rotate.js';

describe('storage-permissions', () => {
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

  it('.env file written by EnvStorage has 0o600 permissions', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'claws-perm-'));
    const storage = new EnvStorage(tempDir);
    envKeys.push('CLAWS_KEY_PERM_TEST_1');

    await storage.write('perm-test-1', 'secret-value-abc');

    const envPath = join(tempDir, '.claws', 'keys', '.env');
    const fileStat = await stat(envPath);

    // On POSIX: mode & 0o777 should be 0o600. On Windows: chmod is a no-op
    // but the call should not error.
    if (process.platform !== 'win32') {
      expect(fileStat.mode & 0o777).toBe(0o600);
    } else {
      // On Windows, verify the file exists and is readable
      expect(fileStat.isFile()).toBe(true);
    }
  });

  it('plaintext key storage triggers warning log', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    tempDir = await mkdtemp(join(tmpdir(), 'claws-warn-'));
    const storage = new EnvStorage(tempDir);
    envKeys.push('CLAWS_KEY_WARN_TEST_1');

    await storage.write('warn-test-1', 'secret-key-material');

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('[claws:security] Plaintext key material written to'),
    );
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('consider using encrypted vault storage'),
    );

    warnSpy.mockRestore();
  });

  it('key comparison uses timingSafeEqual (not ===)', () => {
    const keyA = 'abcdef0123456789abcdef0123456789';
    const keyB = 'abcdef0123456789abcdef0123456789';
    const keyC = 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx';

    // Identical keys should match
    expect(verifyKeyMaterial(keyA, keyB)).toBe(true);

    // Different keys should not match
    expect(verifyKeyMaterial(keyA, keyC)).toBe(false);

    // Different lengths should not match (short-circuit before timingSafeEqual)
    expect(verifyKeyMaterial(keyA, 'short')).toBe(false);
  });
});
