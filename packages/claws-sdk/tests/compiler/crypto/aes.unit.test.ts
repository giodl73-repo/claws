/**
 * AES-256-GCM unit tests.
 *
 * L0: encrypt→decrypt round-trip, wrong key fails, tampered ciphertext fails.
 */

import { describe, it, expect } from 'vitest';
import { aesEncrypt, aesDecrypt, generateAesKey } from '#src/compiler/crypto/aes.js';

describe('AES-256-GCM', () => {
  it('encrypts and decrypts round-trip', () => {
    const key = generateAesKey();
    const plaintext = 'governance policy v3.2.1';

    const payload = aesEncrypt(plaintext, key);
    const decrypted = aesDecrypt(payload, key);

    expect(decrypted).toBe(plaintext);
  });

  it('fails decryption with wrong key', () => {
    const key1 = generateAesKey();
    const key2 = generateAesKey();
    const plaintext = 'secret audit data';

    const payload = aesEncrypt(plaintext, key1);

    expect(() => aesDecrypt(payload, key2)).toThrow();
  });

  it('fails authentication when ciphertext is tampered', () => {
    const key = generateAesKey();
    const plaintext = 'tamper-proof content';

    const payload = aesEncrypt(plaintext, key);
    // Flip a character in the ciphertext
    const tampered = payload.ciphertext.length > 2
      ? payload.ciphertext.slice(0, -2) + (payload.ciphertext.endsWith('00') ? 'ff' : '00')
      : 'ff';

    expect(() =>
      aesDecrypt({ ...payload, ciphertext: tampered }, key),
    ).toThrow();
  });

  it('rejects invalid key length on encrypt', () => {
    const shortKey = 'aabb'; // 2 bytes, not 32

    expect(() => aesEncrypt('test', shortKey)).toThrow(/32-byte key/);
  });

  it('rejects invalid key length on decrypt', () => {
    const key = generateAesKey();
    const payload = aesEncrypt('test', key);
    const shortKey = 'aabb';

    expect(() => aesDecrypt(payload, shortKey)).toThrow(/32-byte key/);
  });
});
