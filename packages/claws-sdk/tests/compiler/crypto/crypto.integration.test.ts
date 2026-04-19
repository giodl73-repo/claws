/**
 * Crypto integration tests.
 *
 * L1: AES+HMAC pipeline, Ed25519+SHA-256 pipeline, PEM round-trip,
 * cross-key verification failure.
 */

import { describe, it, expect } from 'vitest';
import { join } from 'node:path';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { aesEncrypt, aesDecrypt, generateAesKey } from '#src/compiler/crypto/aes.js';
import { hmacSign, hmacVerify } from '#src/compiler/crypto/hmac.js';
import { sha256 } from '#src/compiler/crypto/hash.js';
import { generateKeypair, ed25519Sign, ed25519Verify } from '#src/compiler/crypto/ed25519.js';
import { generateAndSave, loadKeypair, keyFingerprint } from '#src/compiler/crypto/keys.js';

describe('Crypto integration', () => {
  it('AES encrypt then HMAC the ciphertext', () => {
    const aesKey = generateAesKey();
    const hmacSecret = generateAesKey(); // reuse for 32 random bytes
    const plaintext = 'governance payload for HMAC pipeline';

    // Encrypt
    const payload = aesEncrypt(plaintext, aesKey);

    // HMAC the ciphertext
    const mac = hmacSign(payload.ciphertext, hmacSecret);

    // Verify HMAC
    expect(hmacVerify(payload.ciphertext, mac, hmacSecret)).toBe(true);

    // Decrypt
    const decrypted = aesDecrypt(payload, aesKey);
    expect(decrypted).toBe(plaintext);
  });

  it('Ed25519 sign + SHA-256 hash pipeline', () => {
    const keypair = generateKeypair();
    const content = 'audit record content';

    // Hash content
    const contentHash = sha256(content);

    // Sign the hash
    const signature = ed25519Sign(contentHash, keypair.privateKey);

    // Verify the signature against the hash
    expect(ed25519Verify(contentHash, signature, keypair.publicKey)).toBe(true);

    // Verify hash is deterministic
    expect(sha256(content)).toBe(contentHash);
  });

  it('keypair save→load from PEM round-trip', () => {
    const tmpDir = mkdtempSync(join(tmpdir(), 'claws-crypto-'));
    try {
      const paths = {
        publicKeyPath: join(tmpDir, 'ed25519.pub.pem'),
        privateKeyPath: join(tmpDir, 'ed25519.key.pem'),
      };

      const original = generateAndSave(paths);
      const loaded = loadKeypair(paths);

      expect(loaded.publicKey).toBe(original.publicKey);
      expect(loaded.privateKey).toBe(original.privateKey);

      // Verify loaded key can sign/verify
      const data = 'round-trip test';
      const sig = ed25519Sign(data, loaded.privateKey);
      expect(ed25519Verify(data, sig, loaded.publicKey)).toBe(true);

      // Fingerprint is consistent
      expect(keyFingerprint(loaded.publicKey)).toBe(keyFingerprint(original.publicKey));
    } finally {
      rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('cross-verification: sign with key A, fail verify with key B', () => {
    const keypairA = generateKeypair();
    const keypairB = generateKeypair();
    const data = 'cross-key verification test';

    // Sign with A
    const signature = ed25519Sign(data, keypairA.privateKey);

    // Verify with A succeeds
    expect(ed25519Verify(data, signature, keypairA.publicKey)).toBe(true);

    // Verify with B fails
    expect(ed25519Verify(data, signature, keypairB.publicKey)).toBe(false);
  });
});
