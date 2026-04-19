/**
 * AES-256-GCM symmetric encryption using Node.js `crypto`.
 *
 * Used for local vault encryption in the free tier. Random 12-byte IV
 * per encryption (never reused). Authentication tag validates integrity.
 *
 * @module claws-sdk/compiler/crypto/aes
 */

import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

/** AES-256-GCM encrypted payload. */
export interface AesPayload {
  /** Random 12-byte initialization vector (hex-encoded). */
  readonly iv: string;
  /** Ciphertext (hex-encoded). */
  readonly ciphertext: string;
  /** 16-byte GCM authentication tag (hex-encoded). */
  readonly tag: string;
}

const ALGORITHM = 'aes-256-gcm';
const IV_BYTES = 12;
const KEY_BYTES = 32;

/**
 * Encrypt plaintext with AES-256-GCM.
 *
 * @param plaintext - UTF-8 string to encrypt
 * @param key - 32-byte key (hex-encoded, 64 hex chars)
 * @returns Encrypted payload with IV, ciphertext, and authentication tag
 * @throws If key length is not 32 bytes (64 hex chars)
 */
export function aesEncrypt(plaintext: string, key: string): AesPayload {
  const keyBuf = Buffer.from(key, 'hex');
  if (keyBuf.length !== KEY_BYTES) {
    throw new Error(`AES-256-GCM requires a ${KEY_BYTES}-byte key (${KEY_BYTES * 2} hex chars), got ${keyBuf.length} bytes`);
  }

  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, keyBuf, iv);

  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf-8'),
    cipher.final(),
  ]);

  const tag = cipher.getAuthTag();

  return {
    iv: iv.toString('hex'),
    ciphertext: encrypted.toString('hex'),
    tag: tag.toString('hex'),
  };
}

/**
 * Decrypt an AES-256-GCM payload.
 *
 * @param payload - Encrypted payload from {@link aesEncrypt}
 * @param key - 32-byte key (hex-encoded, 64 hex chars)
 * @returns Decrypted UTF-8 string
 * @throws If key is wrong, ciphertext is tampered, or tag validation fails
 */
export function aesDecrypt(payload: AesPayload, key: string): string {
  const keyBuf = Buffer.from(key, 'hex');
  if (keyBuf.length !== KEY_BYTES) {
    throw new Error(`AES-256-GCM requires a ${KEY_BYTES}-byte key (${KEY_BYTES * 2} hex chars), got ${keyBuf.length} bytes`);
  }

  const iv = Buffer.from(payload.iv, 'hex');
  const ciphertext = Buffer.from(payload.ciphertext, 'hex');
  const tag = Buffer.from(payload.tag, 'hex');

  const decipher = createDecipheriv(ALGORITHM, keyBuf, iv);
  decipher.setAuthTag(tag);

  const decrypted = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]);

  return decrypted.toString('utf-8');
}

/**
 * Generate a random 32-byte AES-256 key.
 *
 * @returns Hex-encoded 32-byte key (64 hex chars)
 */
export function generateAesKey(): string {
  return randomBytes(KEY_BYTES).toString('hex');
}
