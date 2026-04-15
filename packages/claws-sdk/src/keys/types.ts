/**
 * Key management types for claws governance keys.
 *
 * @module claws-sdk/keys/types
 */

/**
 * Supported key algorithms.
 */
export type KeyAlgorithm = 'ed25519' | 'hmac-sha256';

/**
 * Storage tier for key material.
 */
export type StorageTier = 'file' | 'env' | 'kms';

/**
 * Key purpose — determines rotation policy defaults.
 */
export type KeyPurpose = 'signing' | 'session' | 'root';

/**
 * Rotation schedule configuration.
 */
export interface RotationSchedule {
  /** Whether auto-rotation is enabled. */
  readonly enabled: boolean;
  /** Rotation interval in days (e.g. 90 for quarterly). */
  readonly intervalDays: number;
}

/**
 * Key metadata entry stored in the registry.
 */
export interface KeyEntry {
  /** Unique key identifier (e.g. "ed25519-a1b2c3d4"). */
  readonly id: string;
  /** Algorithm used to generate the key. */
  readonly algorithm: KeyAlgorithm;
  /** Storage tier where key material resides. */
  readonly storageTier: StorageTier;
  /** ISO 8601 creation timestamp. */
  readonly createdAt: string;
  /** ISO 8601 timestamp of last rotation, or null if never rotated. */
  readonly rotatedAt: string | null;
  /** Whether the key has been revoked. */
  readonly revoked: boolean;
  /** Rotation schedule, or null if not configured. */
  readonly rotationSchedule: RotationSchedule | null;
  /** Key version — incremented on each rotation. Default 1. */
  readonly version: number;
  /** Key purpose — determines rotation policy. Default 'signing'. */
  readonly purpose: KeyPurpose;
  /** ISO 8601 timestamp of revocation, or null if not revoked. */
  readonly revokedAt: string | null;
}
