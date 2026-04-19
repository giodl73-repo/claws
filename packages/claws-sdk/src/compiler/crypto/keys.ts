/**
 * Local key management -- generate, load, save, and fingerprint Ed25519 keys.
 *
 * Local-only operations for the free tier. Fleet key distribution is a
 * paid-tier feature.
 *
 * @module claws-sdk/compiler/crypto/keys
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { generateKeypair } from './ed25519.js';
import { sha256 } from './hash.js';
import type { Ed25519Keypair } from './ed25519.js';

/** Key files on disk (public + private PEM paths). */
export interface KeyFiles {
  /** Path to the public key PEM file. */
  readonly publicKeyPath: string;
  /** Path to the private key PEM file. */
  readonly privateKeyPath: string;
}

/**
 * Generate a new Ed25519 keypair and save to PEM files.
 *
 * Creates parent directories if they do not exist.
 *
 * @param paths - File paths for public and private key PEM files
 * @returns The generated keypair
 */
export function generateAndSave(paths: KeyFiles): Ed25519Keypair {
  const keypair = generateKeypair();
  mkdirSync(dirname(paths.publicKeyPath), { recursive: true });
  mkdirSync(dirname(paths.privateKeyPath), { recursive: true });
  writeFileSync(paths.publicKeyPath, keypair.publicKey, 'utf-8');
  writeFileSync(paths.privateKeyPath, keypair.privateKey, { encoding: 'utf-8', mode: 0o600 });
  return keypair;
}

/**
 * Load an Ed25519 keypair from PEM files.
 *
 * @param paths - File paths for public and private key PEM files
 * @returns The loaded keypair
 * @throws If either file does not exist or cannot be read
 */
export function loadKeypair(paths: KeyFiles): Ed25519Keypair {
  const publicKey = readFileSync(paths.publicKeyPath, 'utf-8');
  const privateKey = readFileSync(paths.privateKeyPath, 'utf-8');
  return { publicKey, privateKey };
}

/**
 * Load a public key from a PEM file.
 *
 * @param path - Path to the public key PEM file
 * @returns PEM-encoded public key string
 */
export function loadPublicKey(path: string): string {
  return readFileSync(path, 'utf-8');
}

/**
 * Compute a SHA-256 fingerprint of a public key.
 *
 * @param publicKeyPem - SPKI-encoded public key in PEM format
 * @returns Hex-encoded SHA-256 fingerprint (64 hex chars)
 */
export function keyFingerprint(publicKeyPem: string): string {
  return sha256(publicKeyPem);
}
