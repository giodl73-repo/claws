/**
 * Key ceremony — M-of-N Shamir's Secret Sharing for root key management.
 *
 * Implements GF(256) Shamir Secret Sharing from scratch (~150 lines).
 * No external dependency. Split a root key into N shares with threshold M,
 * reconstruct from M shares, track participant identity and timestamps.
 *
 * Single-developer mode: bypass ceremony with passphrase-derived key.
 *
 * @module claws-sdk/keys/ceremony
 */

import { randomBytes, createHash, pbkdf2Sync } from 'node:crypto';
import { registerKey } from './registry.js';
import { createStorage } from './storage.js';
import type { KeyPurpose } from './types.js';

// ─── GF(256) Arithmetic ─────────────────────────────────────────────────────

/**
 * GF(256) with irreducible polynomial x^8 + x^4 + x^3 + x + 1 (0x11B).
 * Same field used by AES.
 */
/**
 * Doubled exp table (510 entries) eliminates modulo in GF(256)
 * multiply/divide — avoids CodeQL false positive on `% 255`.
 */
const EXP_TABLE = new Uint8Array(510);
const LOG_TABLE = new Uint8Array(256);

// Build exp/log lookup tables
(function buildTables(): void {
  let x = 1;
  for (let i = 0; i < 255; i++) {
    EXP_TABLE[i] = x;
    LOG_TABLE[x] = i;
    x = x ^ (x << 1);
    if (x >= 256) {
      x ^= 0x11b;
    }
  }
  // Double the table so (a + b) never exceeds 508 — index directly, no modulo
  for (let i = 255; i < 510; i++) {
    EXP_TABLE[i] = EXP_TABLE[i - 255]!;
  }
})();

/** Multiply two elements in GF(256). */
function gfMul(a: number, b: number): number {
  if (a === 0 || b === 0) return 0;
  return EXP_TABLE[LOG_TABLE[a]! + LOG_TABLE[b]!]!;
}

/** Divide two elements in GF(256). b must be non-zero. */
function gfDiv(a: number, b: number): number {
  if (b === 0) throw new Error('Division by zero in GF(256)');
  if (a === 0) return 0;
  return EXP_TABLE[LOG_TABLE[a]! - LOG_TABLE[b]! + 255]!;
}

// ─── Shamir Primitives ──────────────────────────────────────────────────────

/**
 * Evaluate a polynomial at point x in GF(256).
 * coefficients[0] is the constant term (the secret byte).
 */
function evalPoly(coefficients: readonly number[], x: number): number {
  let result = 0;
  for (let i = coefficients.length - 1; i >= 0; i--) {
    result = gfMul(result, x) ^ coefficients[i]!;
  }
  return result;
}

/**
 * Split a single byte into n shares with threshold t using Shamir SSS.
 *
 * @param secret - The secret byte (0-255)
 * @param n - Total number of shares
 * @param t - Reconstruction threshold
 * @returns Array of n share values (each for x = 1..n)
 */
function splitByte(secret: number, n: number, t: number): number[] {
  // Build random polynomial of degree t-1 with secret as constant term
  const coefficients = new Array<number>(t);
  coefficients[0] = secret;
  const rand = randomBytes(t - 1);
  for (let i = 1; i < t; i++) {
    coefficients[i] = rand[i - 1]!;
  }

  // Evaluate at x = 1..n
  const shares = new Array<number>(n);
  for (let i = 0; i < n; i++) {
    shares[i] = evalPoly(coefficients, i + 1);
  }
  return shares;
}

/**
 * Reconstruct a single byte from shares using Lagrange interpolation in GF(256).
 *
 * @param xs - x-coordinates (1-indexed share indices)
 * @param ys - y-coordinates (share values)
 * @returns The reconstructed secret byte
 */
function reconstructByte(xs: readonly number[], ys: readonly number[]): number {
  let secret = 0;
  const k = xs.length;

  for (let i = 0; i < k; i++) {
    let num = 1;
    let den = 1;
    for (let j = 0; j < k; j++) {
      if (i === j) continue;
      num = gfMul(num, xs[j]!); // Lagrange: multiply by x_j (evaluate at x=0)
      den = gfMul(den, xs[i]! ^ xs[j]!); // x_i - x_j in GF(256) is XOR
    }
    const lagrange = gfDiv(num, den);
    secret ^= gfMul(ys[i]!, lagrange);
  }
  return secret;
}

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * A single share from a Shamir split operation.
 */
export interface CeremonyShare {
  /** 1-indexed share index (x-coordinate). */
  readonly index: number;
  /** Hex-encoded share data (y-values for each secret byte). */
  readonly data: string;
}

/**
 * Participant who received a share during distribution.
 */
export interface ShareParticipant {
  /** Participant identity (name or email). */
  readonly identity: string;
  /** Share index assigned to this participant. */
  readonly index: number;
  /** ISO 8601 timestamp of share distribution. */
  readonly distributedAt: string;
}

/**
 * Result of a ceremony initialization (split) operation.
 */
export interface CeremonyInitResult {
  /** Unique ceremony ID. */
  readonly ceremonyId: string;
  /** Number of shares created. */
  readonly totalShares: number;
  /** Minimum shares required for reconstruction. */
  readonly threshold: number;
  /** The individual shares (each written to separate output). */
  readonly shares: readonly CeremonyShare[];
  /** SHA-256 hash of the original key for verification after reconstruction. */
  readonly keyHash: string;
}

/**
 * Result of a ceremony reconstruction operation.
 */
export interface CeremonyReconstructResult {
  /** The reconstructed key material (hex-encoded). */
  readonly key: string;
  /** Whether the reconstructed key matches the original hash. */
  readonly verified: boolean;
}

/**
 * Result of a single-developer key derivation.
 */
export interface SingleDevKeyResult {
  /** The derived key (hex-encoded). */
  readonly key: string;
  /** Algorithm used for derivation. */
  readonly algorithm: 'pbkdf2-sha256';
}

/**
 * Split a root key into N shares with threshold M using Shamir's Secret Sharing.
 *
 * @param keyMaterial - Hex-encoded key material to split
 * @param totalShares - N: total number of shares to create
 * @param threshold - M: minimum shares required for reconstruction
 * @returns Ceremony initialization result with individual shares
 */
export function shamirSplit(
  keyMaterial: string,
  totalShares: number,
  threshold: number,
): CeremonyInitResult {
  if (threshold < 2) {
    throw new Error('Threshold must be at least 2');
  }
  if (totalShares < threshold) {
    throw new Error('Total shares must be >= threshold');
  }
  if (totalShares > 255) {
    throw new Error('Maximum 255 shares supported');
  }

  const keyBytes = Buffer.from(keyMaterial, 'hex');
  if (keyBytes.length === 0) {
    throw new Error('Key material must not be empty');
  }

  // Split each byte independently
  const shareArrays: number[][] = Array.from({ length: totalShares }, () => []);
  for (let byteIdx = 0; byteIdx < keyBytes.length; byteIdx++) {
    const byteShares = splitByte(keyBytes[byteIdx]!, totalShares, threshold);
    for (let s = 0; s < totalShares; s++) {
      shareArrays[s]!.push(byteShares[s]!);
    }
  }

  const shares: CeremonyShare[] = shareArrays.map((arr, i) => ({
    index: i + 1,
    data: Buffer.from(arr).toString('hex'),
  }));

  const ceremonyId = randomBytes(8).toString('hex');
  const keyHash = createHash('sha256').update(keyBytes).digest('hex');

  return {
    ceremonyId,
    totalShares,
    threshold,
    shares,
    keyHash,
  };
}

/**
 * Reconstruct a root key from M or more shares.
 *
 * @param shares - Array of shares (must have at least threshold shares)
 * @param expectedHash - SHA-256 hash of the original key for verification
 * @returns Reconstruction result with the key and verification status
 */
export function shamirReconstruct(
  shares: readonly CeremonyShare[],
  expectedHash: string,
): CeremonyReconstructResult {
  if (shares.length === 0) {
    throw new Error('No shares provided');
  }

  const xs = shares.map((s) => s.index);
  const shareBuffers = shares.map((s) => Buffer.from(s.data, 'hex'));

  // All shares must have the same length
  const len = shareBuffers[0]!.length;
  for (const buf of shareBuffers) {
    if (buf.length !== len) {
      throw new Error('Share data length mismatch');
    }
  }

  // Reconstruct each byte via Lagrange interpolation
  const reconstructed = Buffer.alloc(len);
  for (let byteIdx = 0; byteIdx < len; byteIdx++) {
    const ys = shareBuffers.map((buf) => buf[byteIdx]!);
    reconstructed[byteIdx] = reconstructByte(xs, ys);
  }

  const key = reconstructed.toString('hex');
  const actualHash = createHash('sha256').update(reconstructed).digest('hex');
  const verified = actualHash === expectedHash;

  return { key, verified };
}

/**
 * Track participant share distribution.
 *
 * @param identity - Participant identity string
 * @param shareIndex - The share index assigned
 * @returns ShareParticipant record with timestamp
 */
export function recordParticipant(
  identity: string,
  shareIndex: number,
): ShareParticipant {
  return {
    identity,
    index: shareIndex,
    distributedAt: new Date().toISOString(),
  };
}

/**
 * Options for the SDK-level ceremony initialization.
 */
export interface InitCeremonyOptions {
  /** Total number of shares (N). */
  readonly totalShares: number;
  /** Reconstruction threshold (M). */
  readonly threshold: number;
  /** Key purpose for the registry entry (default: 'root'). */
  readonly purpose?: KeyPurpose | undefined;
}

/**
 * Result of an SDK-level ceremony initialization.
 *
 * Contains shares, key ID, and verification hash. The key material itself
 * is never returned — it is registered in the key registry and stored
 * in the file storage backend.
 */
export interface InitCeremonyResult {
  /** Unique ceremony ID. */
  readonly ceremonyId: string;
  /** Key ID registered in the key registry. */
  readonly keyId: string;
  /** Number of shares created. */
  readonly totalShares: number;
  /** Minimum shares required for reconstruction. */
  readonly threshold: number;
  /** The individual shares. */
  readonly shares: readonly CeremonyShare[];
  /** SHA-256 hash of the original key for verification after reconstruction. */
  readonly keyHash: string;
}

/**
 * Initialize a key ceremony: generate key material, register in the key
 * registry, persist to file storage, and split into N shares with threshold M.
 *
 * Key material is generated internally and NEVER returned to the caller.
 * Only the shares, key ID, and verification hash are returned.
 *
 * @param workspaceRoot - Absolute path to workspace root
 * @param opts - Ceremony options (totalShares, threshold)
 * @returns Ceremony result with shares, key ID, and hash
 */
export async function initCeremony(
  workspaceRoot: string,
  opts: InitCeremonyOptions,
): Promise<InitCeremonyResult> {
  // Generate 32-byte root key material internally — never exposed
  const keyMaterial = randomBytes(32);
  const keyHex = keyMaterial.toString('hex');

  // Register the key in the metadata registry
  const entry = await registerKey(workspaceRoot, {
    algorithm: 'hmac-sha256',
    storageTier: 'file',
    purpose: opts.purpose ?? 'root',
  });

  // Persist key material to file storage
  const storage = createStorage('file', workspaceRoot);
  await storage.write(entry.id, keyHex);

  // Split via Shamir SSS
  const splitResult = shamirSplit(keyHex, opts.totalShares, opts.threshold);

  return {
    ceremonyId: splitResult.ceremonyId,
    keyId: entry.id,
    totalShares: splitResult.totalShares,
    threshold: splitResult.threshold,
    shares: splitResult.shares,
    keyHash: splitResult.keyHash,
  };
}

/**
 * Derive a key from a passphrase for single-developer mode.
 *
 * Uses PBKDF2-SHA256 with 600,000 iterations (OWASP 2023 minimum for
 * PBKDF2-SHA256) and a fixed salt derived from the workspace context.
 *
 * @param passphrase - User-provided passphrase
 * @param salt - Context salt (e.g. workspace identifier)
 * @returns Derived key result
 */
export function deriveSingleDevKey(
  passphrase: string,
  salt: string,
): SingleDevKeyResult {
  const derived = pbkdf2Sync(passphrase, salt, 600_000, 32, 'sha256');
  return {
    key: derived.toString('hex'),
    algorithm: 'pbkdf2-sha256',
  };
}
