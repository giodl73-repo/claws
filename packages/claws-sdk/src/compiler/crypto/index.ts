/**
 * Crypto primitives for the claws free tier.
 *
 * All operations use Node.js `crypto` directly -- zero third-party dependencies.
 *
 * @module claws-sdk/compiler/crypto
 */

export { aesEncrypt, aesDecrypt, generateAesKey } from './aes.js';
export type { AesPayload } from './aes.js';

export { hmacSign, hmacVerify } from './hmac.js';

export { sha256 } from './hash.js';

export { generateKeypair, ed25519Sign, ed25519Verify } from './ed25519.js';
export type { Ed25519Keypair } from './ed25519.js';

export { generateAndSave, loadKeypair, loadPublicKey, keyFingerprint } from './keys.js';
export type { KeyFiles } from './keys.js';
