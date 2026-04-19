/**
 * End-to-end crypto pipeline test.
 *
 * L2: Full pipeline from key generation through sign/verify/encrypt/decrypt.
 */

import { describe, it, expect } from 'vitest';
import { join } from 'node:path';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { aesEncrypt, aesDecrypt, generateAesKey } from '#src/compiler/crypto/aes.js';
import { hmacSign, hmacVerify } from '#src/compiler/crypto/hmac.js';
import { sha256 } from '#src/compiler/crypto/hash.js';
import { ed25519Sign, ed25519Verify } from '#src/compiler/crypto/ed25519.js';
import { generateAndSave, loadKeypair, keyFingerprint } from '#src/compiler/crypto/keys.js';

describe('Crypto E2E pipeline', () => {
  it('full lifecycle: keygen → encrypt → sign → verify → decrypt', () => {
    const tmpDir = mkdtempSync(join(tmpdir(), 'claws-crypto-e2e-'));
    try {
      // 1. Generate and persist Ed25519 keypair
      const paths = {
        publicKeyPath: join(tmpDir, 'audit.pub.pem'),
        privateKeyPath: join(tmpDir, 'audit.key.pem'),
      };
      generateAndSave(paths);

      // 2. Load the keypair back
      const keypair = loadKeypair(paths);
      const fingerprint = keyFingerprint(keypair.publicKey);
      expect(fingerprint).toHaveLength(64); // SHA-256 hex

      // 3. Generate AES key and HMAC secret
      const aesKey = generateAesKey();
      const hmacSecret = generateAesKey();

      // 4. Encrypt a governance payload
      const payload = 'policy: deny-all-by-default; version: 3.2.1';
      const encrypted = aesEncrypt(payload, aesKey);

      // 5. Hash the ciphertext for the audit entry
      const ciphertextHash = sha256(encrypted.ciphertext);

      // 6. HMAC the ciphertext for integrity
      const mac = hmacSign(encrypted.ciphertext, hmacSecret);

      // 7. Sign the hash with Ed25519 for audit chain
      const signature = ed25519Sign(ciphertextHash, keypair.privateKey);

      // ── Verification phase ──

      // 8. Verify HMAC integrity
      expect(hmacVerify(encrypted.ciphertext, mac, hmacSecret)).toBe(true);

      // 9. Verify Ed25519 signature on hash
      expect(ed25519Verify(ciphertextHash, signature, keypair.publicKey)).toBe(true);

      // 10. Decrypt the payload
      const decrypted = aesDecrypt(encrypted, aesKey);
      expect(decrypted).toBe(payload);

      // 11. Verify the decrypted content hash matches
      const decryptedHash = sha256(decrypted);
      expect(sha256(payload)).toBe(decryptedHash);
    } finally {
      rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});
