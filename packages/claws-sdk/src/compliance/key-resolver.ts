/**
 * KeyResolver — pluggable key distribution for blob integrity verification.
 *
 * Provides a `resolve(keyId)` interface so verification code never hardcodes
 * key locations. Three built-in implementations cover common deployment
 * scenarios:
 *
 * - **EnvKeyResolver**: Reads the public key from the `CLAWS_VERIFY_KEY` env var.
 * - **FileKeyResolver**: Reads the key from a file path on disk.
 * - **NullKeyResolver**: Always returns null (backward compat with unsigned manifests).
 *
 * Enterprise deployments can implement `KeyResolver` to integrate with
 * Azure Key Vault, AWS KMS, HashiCorp Vault, etc.
 *
 * @module claws-sdk/compliance/key-resolver
 */

import { readFile } from 'node:fs/promises';

/**
 * KeyResolver interface — resolves a key ID to raw key bytes.
 *
 * Implementations must return `null` when the key is not found, rather
 * than throwing. This allows the caller to decide whether a missing key
 * is a warning (pre-signing era) or an error (`requireSignedArtifacts`).
 */
export interface KeyResolver {
  /**
   * Resolve a key ID to its raw key material.
   *
   * @param keyId - The key identifier to look up.
   * @returns The key bytes, or null if the key is not found.
   */
  resolve(keyId: string): Promise<Buffer | null>;
}

/**
 * EnvKeyResolver — reads the verification key from an environment variable.
 *
 * Expects the key to be base64-encoded in the `CLAWS_VERIFY_KEY` env var
 * (or a custom env var name passed at construction).
 *
 * Returns null if the env var is not set or is empty.
 */
export class EnvKeyResolver implements KeyResolver {
  constructor(private readonly envVar: string = 'CLAWS_VERIFY_KEY') {}

  async resolve(keyId: string): Promise<Buffer | null> {
    // Try keyId-specific env var first: CLAWS_VERIFY_KEY_{keyId}
    const sanitized = keyId.replace(/[^a-zA-Z0-9_]/g, '_');
    const specific = process.env[`${this.envVar}_${sanitized}`];
    if (specific) return Buffer.from(specific, 'base64');

    // Fall back to the base env var
    const value = process.env[this.envVar];
    if (!value) return null;
    return Buffer.from(value, 'base64');
  }
}

/**
 * FileKeyResolver — reads the verification key from a file path.
 *
 * The key file should contain PEM-encoded or raw key material.
 * Returns null if the file does not exist or cannot be read.
 */
export class FileKeyResolver implements KeyResolver {
  constructor(private readonly keyFilePath: string) {}

  async resolve(_keyId: string): Promise<Buffer | null> {
    try {
      return await readFile(this.keyFilePath);
    } catch {
      return null;
    }
  }
}

/**
 * NullKeyResolver — always returns null.
 *
 * Used for backward compatibility with unsigned manifests in the
 * pre-signing era. When `requireSignedArtifacts` is false, a null
 * key produces a warning rather than a hard failure.
 */
export class NullKeyResolver implements KeyResolver {
  async resolve(_keyId: string): Promise<Buffer | null> {
    return null;
  }
}
