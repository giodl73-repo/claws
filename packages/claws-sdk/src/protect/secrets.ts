/**
 * Secrets vault — AES-256-GCM encrypted key-value store with Argon2id
 * key derivation (scrypt fallback when argon2 native module is unavailable).
 *
 * Vault file: `.claws/secrets/vault.enc`
 * Salt file:  `.claws/secrets/vault.salt`
 *
 * Each entry is independently encrypted with its own IV + auth tag,
 * making per-entry decrypt possible without loading the entire vault.
 *
 * @module claws-sdk/protect/secrets
 */

import {
  randomBytes,
  createCipheriv,
  createDecipheriv,
  scryptSync,
} from 'node:crypto';
import { readFile, writeFile, mkdir, chmod } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import type { VaultConfig } from './types.js';

// ── Constants ─────────────────────────────────────────────────────────

/** AES-256-GCM IV length in bytes. */
const IV_LENGTH = 12;

/** AES-256-GCM auth tag length in bytes. */
const AUTH_TAG_LENGTH = 16;

/** Key length in bytes (256 bits). */
const KEY_LENGTH = 32;

/** Salt length in bytes. */
const SALT_LENGTH = 32;

/** Minimum passphrase length. */
const MIN_PASSPHRASE_LENGTH = 12;

/** Minimum passphrase entropy in bits. */
const MIN_ENTROPY_BITS = 40;

// ── Argon2id defaults (OWASP recommended tier) ───────────────────────

/** Memory cost in KiB (256 MiB). */
const ARGON2_MEMORY = 262_144;

/** Time cost (iterations). */
const ARGON2_TIME = 4;

/** Parallelism degree. */
const ARGON2_PARALLELISM = 4;

// ── Argon2id parameter floors ─────────────────────────────────────────

const ARGON2_MEMORY_FLOOR = 65_536;
const ARGON2_TIME_FLOOR = 3;
const ARGON2_PARALLELISM_FLOOR = 1;

// ── Scrypt defaults ───────────────────────────────────────────────────

/** Scrypt N parameter (2^17 = 131072). */
const SCRYPT_N = 2 ** 17;

/** Scrypt r parameter. */
const SCRYPT_R = 8;

/** Scrypt p parameter. */
const SCRYPT_P = 1;

// ── Argon2id parameters ───────────────────────────────────────────────

/**
 * Configurable Argon2id parameters with minimum floors.
 */
export interface Argon2Params {
  /** Memory cost in KiB (min 65536). */
  readonly memoryCost: number;
  /** Time cost / iterations (min 3). */
  readonly timeCost: number;
  /** Parallelism degree (min 1). */
  readonly parallelism: number;
}

/**
 * Vault entry as stored in the vault file.
 * Each entry is independently encrypted.
 */
interface VaultEntry {
  /** Base64-encoded IV. */
  iv: string;
  /** Base64-encoded auth tag. */
  tag: string;
  /** Base64-encoded ciphertext. */
  ciphertext: string;
}

/**
 * Vault file format — JSON object mapping keys to encrypted entries.
 */
interface VaultData {
  /** Version for future format migrations. */
  version: 1;
  /** Which KDF was used: 'argon2id' or 'scrypt'. */
  kdf: 'argon2id' | 'scrypt';
  /** Encrypted entries keyed by name. */
  entries: Record<string, VaultEntry>;
}

// ── Entropy check ─────────────────────────────────────────────────────

/**
 * Estimate entropy of a passphrase in bits.
 *
 * Uses the minimum of two approaches:
 * 1. Charset-class estimation: log2(charset_size) * length
 * 2. Unique-character estimation: log2(unique_chars) * length
 *
 * The min prevents `aaaaaaaaaaaa` from scoring high despite
 * having only one unique character.
 */
function estimateEntropy(passphrase: string): number {
  let charsetSize = 0;
  let hasLower = false;
  let hasUpper = false;
  let hasDigit = false;
  let hasSpecial = false;

  const unique = new Set<string>();
  for (const ch of passphrase) {
    unique.add(ch);
    const code = ch.codePointAt(0)!;
    if (code >= 97 && code <= 122) hasLower = true;
    else if (code >= 65 && code <= 90) hasUpper = true;
    else if (code >= 48 && code <= 57) hasDigit = true;
    else hasSpecial = true;
  }

  if (hasLower) charsetSize += 26;
  if (hasUpper) charsetSize += 26;
  if (hasDigit) charsetSize += 10;
  if (hasSpecial) charsetSize += 32;

  if (charsetSize === 0 || unique.size === 0) return 0;

  // Take the minimum — charset estimation can overcount when
  // the passphrase uses very few distinct characters.
  const charsetEntropy = Math.log2(charsetSize) * passphrase.length;
  const uniqueEntropy = Math.log2(unique.size) * passphrase.length;
  return Math.min(charsetEntropy, uniqueEntropy);
}

/**
 * Validate passphrase strength. Throws if too short or too weak.
 */
function validatePassphrase(passphrase: string): void {
  if (passphrase.length < MIN_PASSPHRASE_LENGTH) {
    throw new Error(
      `Passphrase too short: ${passphrase.length} characters (minimum ${MIN_PASSPHRASE_LENGTH})`,
    );
  }
  const entropy = estimateEntropy(passphrase);
  if (entropy < MIN_ENTROPY_BITS) {
    throw new Error(
      `Passphrase too weak: ~${Math.floor(entropy)} bits entropy (minimum ${MIN_ENTROPY_BITS})`,
    );
  }
}

// ── Argon2id availability check ───────────────────────────────────────

/**
 * Whether Argon2id is available (argon2 native module installed).
 * Cached after first probe.
 */
let argon2Available: boolean | undefined;

/**
 * Check if the argon2 native module is available.
 */
export async function isArgon2Available(): Promise<boolean> {
  if (argon2Available !== undefined) return argon2Available;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    await (Function('return import("argon2")')() as Promise<unknown>);
    argon2Available = true;
  } catch {
    argon2Available = false;
  }
  return argon2Available;
}

/**
 * Reset the Argon2id availability cache (for testing).
 */
export function resetArgon2Cache(): void {
  argon2Available = undefined;
}

/**
 * Override the Argon2id availability flag (for testing).
 */
export function setArgon2Available(available: boolean): void {
  argon2Available = available;
}

// ── Key derivation ────────────────────────────────────────────────────

/**
 * Validate Argon2 parameters against minimum floors.
 */
function validateArgon2Params(params: Argon2Params): void {
  if (params.memoryCost < ARGON2_MEMORY_FLOOR) {
    throw new RangeError(
      `Argon2id memoryCost must be >= ${ARGON2_MEMORY_FLOOR}, got ${params.memoryCost}`,
    );
  }
  if (params.timeCost < ARGON2_TIME_FLOOR) {
    throw new RangeError(
      `Argon2id timeCost must be >= ${ARGON2_TIME_FLOOR}, got ${params.timeCost}`,
    );
  }
  if (params.parallelism < ARGON2_PARALLELISM_FLOOR) {
    throw new RangeError(
      `Argon2id parallelism must be >= ${ARGON2_PARALLELISM_FLOOR}, got ${params.parallelism}`,
    );
  }
}

/**
 * Default Argon2id parameters (OWASP recommended tier).
 */
export const DEFAULT_ARGON2_PARAMS: Argon2Params = {
  memoryCost: ARGON2_MEMORY,
  timeCost: ARGON2_TIME,
  parallelism: ARGON2_PARALLELISM,
};

/**
 * Derive a 256-bit key from a passphrase + salt using Argon2id.
 * Falls back to scrypt if argon2 native module is unavailable.
 *
 * Returns the derived key and which KDF was actually used.
 */
export async function deriveKey(
  passphrase: string,
  salt: Buffer,
  argon2Params?: Argon2Params,
): Promise<{ key: Buffer; kdf: 'argon2id' | 'scrypt' }> {
  const useArgon2 = await isArgon2Available();

  if (useArgon2) {
    const params = argon2Params ?? DEFAULT_ARGON2_PARAMS;
    validateArgon2Params(params);

    // Dynamic import — only loaded when argon2 native module is available.
    // Uses indirect eval to avoid TypeScript resolving the module specifier.
    /* istanbul ignore next -- argon2 native module not available in CI/unit tests */
    const argon2 = await (Function('return import("argon2")')() as Promise<{
      hash: (password: string, opts: Record<string, unknown>) => Promise<Buffer>;
      argon2id: number;
    }>);
    /* istanbul ignore next -- argon2 native module not available in CI/unit tests */
    const hash = await argon2.hash(passphrase, {
      type: argon2.argon2id,
      memoryCost: params.memoryCost,
      timeCost: params.timeCost,
      parallelism: params.parallelism,
      salt,
      hashLength: KEY_LENGTH,
      raw: true,
    });
    /* istanbul ignore next -- argon2 native module not available in CI/unit tests */
    return { key: Buffer.from(hash), kdf: 'argon2id' };
  }

  // Scrypt fallback — maxmem must accommodate 128 * N * r bytes
  const key = scryptSync(passphrase, salt, KEY_LENGTH, {
    N: SCRYPT_N,
    r: SCRYPT_R,
    p: SCRYPT_P,
    maxmem: 128 * SCRYPT_N * SCRYPT_R * 2, // 2x safety margin
  });
  return { key: Buffer.from(key), kdf: 'scrypt' };
}

// ── Per-entry encryption ──────────────────────────────────────────────

/**
 * Encrypt a single value using AES-256-GCM.
 */
function encryptValue(key: Buffer, plaintext: string): VaultEntry {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  return {
    iv: iv.toString('base64'),
    tag: tag.toString('base64'),
    ciphertext: encrypted.toString('base64'),
  };
}

/**
 * Decrypt a single vault entry using AES-256-GCM.
 * Throws a descriptive error on wrong passphrase (auth tag mismatch).
 */
function decryptValue(key: Buffer, entry: VaultEntry, entryKey: string): string {
  const iv = Buffer.from(entry.iv, 'base64');
  const tag = Buffer.from(entry.tag, 'base64');
  const ciphertext = Buffer.from(entry.ciphertext, 'base64');

  const decipher = createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);

  try {
    const decrypted = Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(),
    ]);
    return decrypted.toString('utf8');
  } catch {
    throw new Error(
      `Decryption failed for key "${entryKey}": wrong passphrase or corrupted entry`,
    );
  }
}

// ── Vault I/O ─────────────────────────────────────────────────────────

/**
 * Read the vault data file, or return undefined if it doesn't exist.
 */
async function readVault(vaultPath: string): Promise<VaultData | undefined> {
  try {
    const raw = await readFile(vaultPath, 'utf-8');
    return JSON.parse(raw) as VaultData;
  } catch {
    return undefined;
  }
}

/**
 * Write vault data to disk.
 */
async function writeVault(vaultPath: string, data: VaultData): Promise<void> {
  await mkdir(dirname(vaultPath), { recursive: true });
  await writeFile(vaultPath, JSON.stringify(data), 'utf-8');
  await chmod(vaultPath, 0o600);
}

/**
 * Read or create the salt file. Returns the salt as a Buffer.
 * Currently unused — retained for potential future use.
 */
/* istanbul ignore next -- unused private helper, retained for future use */
async function readOrCreateSalt(saltPath: string): Promise<Buffer> {
  try {
    const raw = await readFile(saltPath);
    return raw;
  } catch {
    const salt = randomBytes(SALT_LENGTH);
    await mkdir(dirname(saltPath), { recursive: true });
    await writeFile(saltPath, salt);
    return salt;
  }
}

/**
 * Read the existing salt file. Throws if it doesn't exist.
 */
async function readSalt(saltPath: string): Promise<Buffer> {
  try {
    return await readFile(saltPath);
  } catch {
    throw new Error(`Vault not initialized: salt file not found at ${saltPath}`);
  }
}

// ── Public API ─────────────────────────────────────────────────────────

/**
 * Build default VaultConfig from a workspace root.
 */
export function defaultVaultConfig(workspaceRoot: string): VaultConfig {
  return {
    algorithm: 'aes-256-gcm',
    saltPath: join(workspaceRoot, '.claws', 'secrets', 'vault.salt'),
    vaultPath: join(workspaceRoot, '.claws', 'secrets', 'vault.enc'),
    keyDerivation: 'argon2',
  };
}

/**
 * Initialize a new vault with a passphrase.
 *
 * Creates the salt file and an empty vault. If a vault already exists,
 * throws to prevent accidental overwrite.
 */
export async function init(
  config: VaultConfig,
  passphrase: string,
  argon2Params?: Argon2Params,
): Promise<{ kdf: 'argon2id' | 'scrypt' }> {
  validatePassphrase(passphrase);

  // Check if vault already exists
  const existing = await readVault(config.vaultPath);
  if (existing) {
    throw new Error('Vault already exists. Delete it first to reinitialize.');
  }

  // Create salt
  const salt = randomBytes(SALT_LENGTH);
  await mkdir(dirname(config.saltPath), { recursive: true });
  await writeFile(config.saltPath, salt);

  // Derive key to determine which KDF is available
  const { kdf } = await deriveKey(passphrase, salt, argon2Params);

  // Write empty vault
  const vaultData: VaultData = {
    version: 1,
    kdf,
    entries: {},
  };
  await writeVault(config.vaultPath, vaultData);

  return { kdf };
}

/**
 * Store an encrypted key-value pair in the vault.
 */
export async function set(
  config: VaultConfig,
  entryKey: string,
  value: string,
  passphrase: string,
  argon2Params?: Argon2Params,
): Promise<void> {
  validatePassphrase(passphrase);

  const salt = await readSalt(config.saltPath);
  const { key } = await deriveKey(passphrase, salt, argon2Params);

  const vault = await readVault(config.vaultPath);
  if (!vault) {
    throw new Error('Vault not initialized. Run init() first.');
  }

  vault.entries[entryKey] = encryptValue(key, value);
  await writeVault(config.vaultPath, vault);
}

/**
 * Retrieve and decrypt a value from the vault.
 */
export async function get(
  config: VaultConfig,
  entryKey: string,
  passphrase: string,
  argon2Params?: Argon2Params,
): Promise<string> {
  validatePassphrase(passphrase);

  const salt = await readSalt(config.saltPath);
  const { key } = await deriveKey(passphrase, salt, argon2Params);

  const vault = await readVault(config.vaultPath);
  if (!vault) {
    throw new Error('Vault not initialized. Run init() first.');
  }

  const entry = vault.entries[entryKey];
  if (!entry) {
    throw new Error(`Key "${entryKey}" not found in vault`);
  }

  return decryptValue(key, entry, entryKey);
}

/**
 * List all stored keys without exposing values.
 */
export async function list(config: VaultConfig): Promise<readonly string[]> {
  const vault = await readVault(config.vaultPath);
  if (!vault) {
    throw new Error('Vault not initialized. Run init() first.');
  }

  return Object.keys(vault.entries).sort();
}

/**
 * Delete a key-value pair from the vault.
 * Requires passphrase to verify vault access.
 */
export async function del(
  config: VaultConfig,
  entryKey: string,
  passphrase: string,
  argon2Params?: Argon2Params,
): Promise<void> {
  validatePassphrase(passphrase);

  const salt = await readSalt(config.saltPath);
  // Derive key to validate passphrase — attempt to decrypt any entry
  const { key } = await deriveKey(passphrase, salt, argon2Params);

  const vault = await readVault(config.vaultPath);
  if (!vault) {
    throw new Error('Vault not initialized. Run init() first.');
  }

  if (!(entryKey in vault.entries)) {
    throw new Error(`Key "${entryKey}" not found in vault`);
  }

  // Verify passphrase by attempting to decrypt the target entry
  const entry = vault.entries[entryKey]!;
  decryptValue(key, entry, entryKey);

  // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
  delete vault.entries[entryKey];
  await writeVault(config.vaultPath, vault);
}

/**
 * Read the KDF used by the vault (for doctor checks).
 * Returns undefined if vault doesn't exist.
 */
export async function readVaultKdf(
  config: VaultConfig,
): Promise<'argon2id' | 'scrypt' | undefined> {
  const vault = await readVault(config.vaultPath);
  return vault?.kdf;
}
