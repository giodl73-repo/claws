/**
 * Key generation — Ed25519 keypairs and HMAC-SHA256 secrets.
 *
 * Uses Node.js built-in crypto module. No external dependencies.
 *
 * @module claws-sdk/keys/generate
 */

import { generateKeyPairSync, randomBytes } from 'node:crypto';
import type { KeyAlgorithm } from './types.js';

/**
 * Generated key material from a keygen operation.
 */
export interface GeneratedKey {
  /** The algorithm used. */
  readonly algorithm: KeyAlgorithm;
  /** Public key in PEM format (Ed25519 only). Null for HMAC. */
  readonly publicKey: string | null;
  /** Private key in PEM format (Ed25519) or hex-encoded secret (HMAC). */
  readonly privateKey: string;
}

/**
 * Generate an Ed25519 keypair.
 *
 * Returns PEM-encoded public and private keys using Node.js crypto.
 */
export function generateEd25519(): GeneratedKey {
  const { publicKey, privateKey } = generateKeyPairSync('ed25519', {
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  });

  return {
    algorithm: 'ed25519',
    publicKey,
    privateKey,
  };
}

/**
 * Generate an HMAC-SHA256 secret key.
 *
 * Produces a 32-byte (256-bit) random key, hex-encoded.
 */
export function generateHmac(): GeneratedKey {
  const secret = randomBytes(32).toString('hex');

  return {
    algorithm: 'hmac-sha256',
    publicKey: null,
    privateKey: secret,
  };
}

/**
 * Generate a key for the given algorithm.
 *
 * @param algorithm - 'ed25519' or 'hmac-sha256'
 * @returns Generated key material
 */
export function generateKey(algorithm: KeyAlgorithm): GeneratedKey {
  switch (algorithm) {
    case 'ed25519':
      return generateEd25519();
    case 'hmac-sha256':
      return generateHmac();
  }
}
