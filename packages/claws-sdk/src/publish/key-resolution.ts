/**
 * Signing key resolution chain for publish pipeline.
 *
 * Resolution priority: CI env var > fleet key > identity key
 *
 * @module claws-sdk/publish/key-resolution
 */

import { readRegistry, getKey } from '../keys/registry.js';
import { createStorage } from '../keys/storage.js';
import { assertKeyNotRevoked } from '../keys/revoke.js';
import type { KeyEntry } from '../keys/types.js';

/**
 * Source of the resolved signing key.
 */
export type KeySource = 'ci-env' | 'fleet' | 'identity';

/**
 * Result of signing key resolution.
 */
export interface KeyResolutionResult {
  /** The resolved signing key material (hex-encoded). */
  readonly keyMaterial: string;
  /** Source that provided the key. */
  readonly source: KeySource;
  /** Key ID (from registry, or synthetic for env var). */
  readonly keyId: string;
  /** Human-readable explanation of resolution. */
  readonly reason: string;
}

/**
 * Environment variable name for CI signing key.
 */
const CI_SIGNING_KEY_ENV = 'CLAWS_CI_SIGNING_KEY';

/**
 * Environment variable name for CI signing key ID.
 */
const CI_SIGNING_KEY_ID_ENV = 'CLAWS_CI_SIGNING_KEY_ID';

/**
 * Fleet signing key file name within the fleet directory.
 */
const FLEET_KEY_PURPOSE = 'signing';

/**
 * Minimum key length in bytes (64 hex chars = 32 bytes).
 */
const MIN_KEY_BYTES = 32;

/**
 * Pattern for valid hex-encoded strings.
 */
const HEX_PATTERN = /^[0-9a-fA-F]+$/;

/**
 * Validate that a CI signing key is well-formed hex of sufficient length.
 *
 * @param raw - Raw key material string
 * @returns Error message if invalid, null if valid
 */
export function validateCiKeyFormat(raw: string): string | null {
  const trimmed = raw.trim();
  if (trimmed.length === 0) {
    return `${CI_SIGNING_KEY_ENV} is empty after trimming whitespace`;
  }
  if (!HEX_PATTERN.test(trimmed)) {
    return `${CI_SIGNING_KEY_ENV} contains non-hex characters — expected hex-encoded key`;
  }
  const byteLength = trimmed.length / 2;
  if (byteLength < MIN_KEY_BYTES) {
    return `${CI_SIGNING_KEY_ENV} is ${byteLength} bytes (${trimmed.length} hex chars) — minimum is ${MIN_KEY_BYTES} bytes (${MIN_KEY_BYTES * 2} hex chars)`;
  }
  return null;
}

/**
 * Attempt to resolve signing key from CI environment variables.
 *
 * Validates format/length and checks revocation when a key ID is provided.
 *
 * @param workspaceRoot - Workspace root for registry access (revocation check)
 */
async function resolveFromCiEnv(
  workspaceRoot: string,
): Promise<KeyResolutionResult | null> {
  const rawMaterial = process.env[CI_SIGNING_KEY_ENV];
  if (!rawMaterial) return null;

  // Validate format and minimum length
  const validationError = validateCiKeyFormat(rawMaterial);
  if (validationError) {
    throw new Error(validationError);
  }

  const keyMaterial = rawMaterial.trim();
  const keyId = process.env[CI_SIGNING_KEY_ID_ENV] ?? 'ci-env-key';

  // If a key ID is provided, check the registry for revocation
  if (process.env[CI_SIGNING_KEY_ID_ENV]) {
    const entry = await getKey(workspaceRoot, keyId);
    if (entry) {
      await assertKeyNotRevoked(workspaceRoot, keyId);
    }
  }

  return {
    keyMaterial,
    source: 'ci-env',
    keyId,
    reason: `Signing key resolved from ${CI_SIGNING_KEY_ENV} environment variable`,
  };
}

/**
 * Find the best signing key from the registry.
 *
 * Selects the most recent non-revoked signing key.
 */
function selectBestKey(keys: readonly KeyEntry[]): KeyEntry | null {
  const signingKeys = keys
    .filter((k) => k.purpose === FLEET_KEY_PURPOSE && !k.revoked)
    .sort((a, b) => {
      // Prefer most recently created/rotated
      const aDate = a.rotatedAt ?? a.createdAt;
      const bDate = b.rotatedAt ?? b.createdAt;
      return bDate.localeCompare(aDate);
    });

  return signingKeys[0] ?? null;
}

/**
 * Attempt to resolve signing key from fleet key registry.
 *
 * Reads the key registry and selects the best signing key with
 * 'file' storage tier (fleet keys).
 */
async function resolveFromFleetKey(
  workspaceRoot: string,
): Promise<KeyResolutionResult | null> {
  const keys = await readRegistry(workspaceRoot);
  const fleetKeys = keys.filter((k) => k.storageTier === 'file');
  const best = selectBestKey(fleetKeys);
  if (!best) return null;

  const storage = createStorage('file', workspaceRoot);
  const material = await storage.read(best.id);
  if (!material) return null;

  return {
    keyMaterial: material,
    source: 'fleet',
    keyId: best.id,
    reason: `Signing key resolved from fleet registry: ${best.id} (v${best.version})`,
  };
}

/**
 * Attempt to resolve signing key from identity key (env storage).
 */
async function resolveFromIdentityKey(
  workspaceRoot: string,
): Promise<KeyResolutionResult | null> {
  const keys = await readRegistry(workspaceRoot);
  const envKeys = keys.filter((k) => k.storageTier === 'env');
  const best = selectBestKey(envKeys);
  if (!best) return null;

  const storage = createStorage('env', workspaceRoot);
  const material = await storage.read(best.id);
  if (!material) return null;

  return {
    keyMaterial: material,
    source: 'identity',
    keyId: best.id,
    reason: `Signing key resolved from identity (env) key: ${best.id} (v${best.version})`,
  };
}

/**
 * Resolve the signing key through the priority chain.
 *
 * Priority: CI env var > fleet key > identity key
 *
 * @param workspaceRoot - Workspace root for registry access
 * @returns Resolved key, or null if no key found
 */
export async function resolveSigningKey(
  workspaceRoot: string,
): Promise<KeyResolutionResult | null> {
  // Priority 1: CI environment variable
  const ciKey = await resolveFromCiEnv(workspaceRoot);
  if (ciKey) return ciKey;

  // Priority 2: Fleet key (file storage)
  const fleetKey = await resolveFromFleetKey(workspaceRoot);
  if (fleetKey) return fleetKey;

  // Priority 3: Identity key (env storage)
  const identityKey = await resolveFromIdentityKey(workspaceRoot);
  if (identityKey) return identityKey;

  return null;
}
