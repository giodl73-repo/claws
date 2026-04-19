/**
 * Ed25519 digital signatures using Node.js `crypto`.
 *
 * Used for audit chain signing and tamper detection in the free tier.
 * Ed25519 signing is in the free tier per R1 review finding C6 --
 * HMAC-only audit is cryptographically insufficient.
 *
 * @module claws-sdk/compiler/crypto/ed25519
 */

import { generateKeyPairSync, sign, verify } from 'node:crypto';

/** Ed25519 keypair in PEM format. */
export interface Ed25519Keypair {
  /** SPKI-encoded public key in PEM format. */
  readonly publicKey: string;
  /** PKCS8-encoded private key in PEM format. */
  readonly privateKey: string;
}

/**
 * Generate an Ed25519 keypair.
 *
 * @returns PEM-encoded keypair in standard OpenSSL-compatible format
 */
export function generateKeypair(): Ed25519Keypair {
  const { publicKey, privateKey } = generateKeyPairSync('ed25519', {
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  });

  return { publicKey, privateKey };
}

/**
 * Sign data with an Ed25519 private key.
 *
 * @param data - Data to sign (UTF-8 string)
 * @param privateKeyPem - PKCS8-encoded private key in PEM format
 * @returns Hex-encoded Ed25519 signature
 */
export function ed25519Sign(data: string, privateKeyPem: string): string {
  const signature = sign(null, Buffer.from(data, 'utf-8'), privateKeyPem);
  return signature.toString('hex');
}

/**
 * Verify an Ed25519 signature.
 *
 * @param data - Original data (UTF-8 string)
 * @param signature - Hex-encoded Ed25519 signature
 * @param publicKeyPem - SPKI-encoded public key in PEM format
 * @returns `true` if the signature is valid, `false` otherwise
 */
export function ed25519Verify(data: string, signature: string, publicKeyPem: string): boolean {
  return verify(null, Buffer.from(data, 'utf-8'), publicKeyPem, Buffer.from(signature, 'hex'));
}
