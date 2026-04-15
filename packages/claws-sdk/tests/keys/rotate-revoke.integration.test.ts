/**
 * L1: Rotate + verify signatures, Revoke + verify signing blocked.
 */

import { describe, it, expect, afterEach } from 'vitest';
import { mkdtemp, rm, mkdir, writeFile, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { sign as cryptoSign, verify as cryptoVerify } from 'node:crypto';
import {
  generateKey,
  createStorage,
  registerKey,
  rotateKey,
  revokeKey,
  assertKeyNotRevoked,
} from '../../src/keys/index.js';

describe('rotate + verify new signatures are valid', () => {
  let tempDir: string;

  afterEach(async () => {
    if (tempDir) {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it('rotates an Ed25519 key and verifies new signatures on compiled artifacts', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'claws-int-rot-'));

    // Generate key and register
    const generated = generateKey('ed25519');
    const storage = createStorage('file', tempDir);
    const entry = await registerKey(tempDir, {
      id: 'int-rotate-1',
      algorithm: 'ed25519',
      storageTier: 'file',
    });
    await storage.write(entry.id, generated.privateKey);
    if (generated.publicKey) {
      await storage.write(`${entry.id}.pub`, generated.publicKey);
    }

    // Create compiled artifacts
    const compiledDir = join(tempDir, '.claws', 'compiled');
    await mkdir(compiledDir, { recursive: true });

    const content1 = 'artifact-content-alpha';
    const content2 = 'artifact-content-beta';
    await writeFile(join(compiledDir, 'alpha.json'), content1, 'utf-8');
    await writeFile(join(compiledDir, 'beta.json'), content2, 'utf-8');

    // Sign both with original key (Ed25519 uses null algorithm)
    const sig1 = cryptoSign(null, Buffer.from(content1), generated.privateKey).toString('hex');
    await writeFile(join(compiledDir, 'alpha.json.sig'), sig1, 'utf-8');

    const sig2 = cryptoSign(null, Buffer.from(content2), generated.privateKey).toString('hex');
    await writeFile(join(compiledDir, 'beta.json.sig'), sig2, 'utf-8');

    // Rotate
    const result = await rotateKey(tempDir, 'int-rotate-1');
    expect(result.entry.version).toBe(2);
    expect(result.artifactsReSigned).toBe(2);

    // Read new public key
    const newPubKey = await storage.read(`${entry.id}.pub`);
    expect(newPubKey).toBeTruthy();

    // Verify new signatures are valid with new public key
    const newSig1 = await readFile(join(compiledDir, 'alpha.json.sig'), 'utf-8');
    expect(cryptoVerify(null, Buffer.from(content1), newPubKey!, Buffer.from(newSig1, 'hex'))).toBe(true);

    const newSig2 = await readFile(join(compiledDir, 'beta.json.sig'), 'utf-8');
    expect(cryptoVerify(null, Buffer.from(content2), newPubKey!, Buffer.from(newSig2, 'hex'))).toBe(true);
  });
});

describe('revoke + verify signing is blocked', () => {
  let tempDir: string;

  afterEach(async () => {
    if (tempDir) {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it('revokes a key and verifies signing attempts are blocked', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'claws-int-rev-'));

    const generated = generateKey('ed25519');
    const storage = createStorage('file', tempDir);
    const entry = await registerKey(tempDir, {
      id: 'int-revoke-1',
      algorithm: 'ed25519',
      storageTier: 'file',
    });
    await storage.write(entry.id, generated.privateKey);

    // Assert signing works before revocation
    await assertKeyNotRevoked(tempDir, 'int-revoke-1');

    // Revoke
    const result = await revokeKey(tempDir, 'int-revoke-1', 'compromised');
    expect(result.entry.revoked).toBe(true);

    // Verify signing is blocked
    await expect(assertKeyNotRevoked(tempDir, 'int-revoke-1')).rejects.toThrow(
      'Signing blocked: key int-revoke-1 has been revoked',
    );

    // Verify rotation is also blocked for revoked keys
    await expect(rotateKey(tempDir, 'int-revoke-1')).rejects.toThrow(
      'Cannot rotate revoked key',
    );
  });
});
