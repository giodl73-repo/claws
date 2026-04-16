/**
 * Storage tier abstraction — pluggable backends for key material.
 *
 * Three tiers:
 * - FileStorage: `.claws/keys/` with restricted file permissions
 * - EnvStorage: environment variables
 * - KMSStorage: interface-only stub for enterprise KMS integration
 *
 * @module claws-sdk/keys/storage
 */

import { mkdir, readFile, writeFile, chmod, unlink } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import { join } from 'node:path';
import { CLAWS_SIDECAR_LAYOUT } from '../types/sidecar.js';
import type { StorageTier } from './types.js';

/**
 * Log a warning when plaintext key material is written to non-encrypted storage.
 * Exported for test verification.
 */
export function warnPlaintextKeyStorage(filePath: string): void {
  // eslint-disable-next-line no-console
  console.warn(
    `[claws:security] Plaintext key material written to ${filePath} — ` +
    'consider using encrypted vault storage (claws vault) for key material',
  );
}

/**
 * Regex for valid key IDs: alphanumeric, dots, hyphens, underscores only.
 * Rejects path traversal characters (`/`, `\`, `..`) and any other
 * characters that could escape the keys directory.
 */
const VALID_KEY_ID = /^[a-zA-Z0-9._-]+$/;

/**
 * Validate a keyId against path traversal attacks.
 *
 * Rejects any keyId containing `/`, `\`, `..`, or characters outside
 * the safe set `[a-zA-Z0-9._-]`.
 *
 * @throws Error if keyId is invalid
 */
export function validateKeyId(keyId: string): void {
  if (!VALID_KEY_ID.test(keyId)) {
    throw new Error(
      `Invalid keyId "${keyId}": must match [a-zA-Z0-9._-]+ (no path separators or traversal)`,
    );
  }
  // Double-check for '..' sequences even though the regex blocks '/'
  if (keyId.includes('..')) {
    throw new Error(
      `Invalid keyId "${keyId}": path traversal sequence '..' is not allowed`,
    );
  }
}

/**
 * Storage backend interface for key material persistence.
 */
export interface KeyStorage {
  /** The storage tier identifier. */
  readonly tier: StorageTier;
  /** Write key material to storage. */
  write(keyId: string, material: string): Promise<void>;
  /** Read key material from storage. Returns null if not found. */
  read(keyId: string): Promise<string | null>;
  /** Securely delete key material from storage. */
  delete(keyId: string): Promise<void>;
}

/**
 * File-based key storage under `.claws/keys/`.
 *
 * Each key is stored as a separate file: `.claws/keys/{keyId}.key`.
 * Files are written with 0o600 permissions on POSIX systems.
 */
export class FileStorage implements KeyStorage {
  readonly tier: StorageTier = 'file';
  private readonly keysDir: string;

  constructor(workspaceRoot: string) {
    this.keysDir = join(workspaceRoot, CLAWS_SIDECAR_LAYOUT.keys);
  }

  async write(keyId: string, material: string): Promise<void> {
    validateKeyId(keyId);
    await mkdir(this.keysDir, { recursive: true });
    const filePath = join(this.keysDir, `${keyId}.key`);
    await writeFile(filePath, material, 'utf-8');
    // Restrict permissions (no-op on Windows but safe to call)
    try {
      await chmod(filePath, 0o600);
    } catch {
      // chmod may fail on Windows; non-fatal
    }
  }

  async read(keyId: string): Promise<string | null> {
    validateKeyId(keyId);
    const filePath = join(this.keysDir, `${keyId}.key`);
    try {
      return await readFile(filePath, 'utf-8');
    } catch {
      return null;
    }
  }

  async delete(keyId: string): Promise<void> {
    validateKeyId(keyId);
    const filePath = join(this.keysDir, `${keyId}.key`);
    try {
      // Overwrite with random bytes before unlinking to prevent forensic recovery
      const existing = await readFile(filePath);
      await writeFile(filePath, randomBytes(existing.length));
      await unlink(filePath);
    } catch {
      // File may not exist (env/KMS tier) — non-fatal
    }
  }
}

/**
 * Environment variable key storage.
 *
 * Keys are stored in env vars named `CLAWS_KEY_{NORMALIZED_ID}`.
 * Dots and hyphens in key IDs are replaced with underscores.
 *
 * Writes persist to both `process.env` (current session) and a `.env`
 * file at `.claws/keys/.env` so key material survives process restarts.
 */
export class EnvStorage implements KeyStorage {
  readonly tier: StorageTier = 'env';
  private readonly envFilePath: string | null;

  constructor(workspaceRoot?: string) {
    this.envFilePath = workspaceRoot
      ? join(workspaceRoot, CLAWS_SIDECAR_LAYOUT.keys, '.env')
      : null;
  }

  private envName(keyId: string): string {
    return `CLAWS_KEY_${keyId.replace(/[-. ]/g, '_').toUpperCase()}`;
  }

  async write(keyId: string, material: string): Promise<void> {
    const name = this.envName(keyId);
    process.env[name] = material;

    if (this.envFilePath) {
      await this.persistEnvFile(name, material);
    }
  }

  async read(keyId: string): Promise<string | null> {
    const name = this.envName(keyId);
    // Check process.env first, then fall back to .env file
    const envVal = process.env[name];
    if (envVal !== undefined) {
      return envVal;
    }

    if (this.envFilePath) {
      return await this.readFromEnvFile(name);
    }
    return null;
  }

  async delete(keyId: string): Promise<void> {
    const name = this.envName(keyId);
    delete process.env[name];

    if (this.envFilePath) {
      await this.removeFromEnvFile(name);
    }
  }

  /**
   * Persist an env var assignment to the .env file.
   *
   * Applies 0o600 permissions (owner read/write only) after writing,
   * and warns when plaintext key material is stored to a non-encrypted file.
   */
  private async persistEnvFile(name: string, value: string): Promise<void> {
    const lines = await this.readEnvLines();
    const prefix = `${name}=`;
    const idx = lines.findIndex((l) => l.startsWith(prefix));
    const newLine = `${name}=${value}`;
    if (idx !== -1) {
      lines[idx] = newLine;
    } else {
      lines.push(newLine);
    }
    await mkdir(join(this.envFilePath!, '..'), { recursive: true });
    await writeFile(this.envFilePath!, lines.join('\n') + '\n', 'utf-8');
    // Restrict .env file permissions — owner read/write only (no-op on Windows)
    try {
      await chmod(this.envFilePath!, 0o600);
    } catch {
      // chmod may fail on Windows; non-fatal
    }
    // Warn when plaintext key material is stored in a non-encrypted file
    warnPlaintextKeyStorage(this.envFilePath!);
  }

  /**
   * Read a single env var value from the .env file.
   */
  private async readFromEnvFile(name: string): Promise<string | null> {
    const lines = await this.readEnvLines();
    const prefix = `${name}=`;
    const line = lines.find((l) => l.startsWith(prefix));
    return line ? line.slice(prefix.length) : null;
  }

  /**
   * Remove an env var from the .env file.
   */
  private async removeFromEnvFile(name: string): Promise<void> {
    const lines = await this.readEnvLines();
    const prefix = `${name}=`;
    const filtered = lines.filter((l) => !l.startsWith(prefix));
    if (filtered.length !== lines.length && this.envFilePath) {
      await writeFile(this.envFilePath, filtered.join('\n') + '\n', 'utf-8');
    }
  }

  /**
   * Read the .env file as trimmed, non-empty lines.
   */
  private async readEnvLines(): Promise<string[]> {
    if (!this.envFilePath) return [];
    try {
      const raw = await readFile(this.envFilePath, 'utf-8');
      return raw.split('\n').filter((l) => l.trim() !== '');
    } catch {
      return [];
    }
  }
}

/**
 * KMS storage stub — interface-only for enterprise integration.
 *
 * All operations throw "not implemented". Downstream consumers
 * (P33 ceremony, P30 rotate) will wire in real KMS backends.
 */
export class KMSStorage implements KeyStorage {
  readonly tier: StorageTier = 'kms';

  async write(_keyId: string, _material: string): Promise<void> {
    throw new Error('KMS storage is not implemented. Configure a KMS provider to use this tier.');
  }

  async read(_keyId: string): Promise<string | null> {
    throw new Error('KMS storage is not implemented. Configure a KMS provider to use this tier.');
  }

  async delete(_keyId: string): Promise<void> {
    throw new Error('KMS storage is not implemented. Configure a KMS provider to use this tier.');
  }
}

/**
 * Create a storage backend for the given tier.
 *
 * @param tier - Storage tier identifier
 * @param workspaceRoot - Workspace root (required for 'file' tier)
 * @returns The storage backend instance
 */
export function createStorage(tier: StorageTier, workspaceRoot: string): KeyStorage {
  switch (tier) {
    case 'file':
      return new FileStorage(workspaceRoot);
    case 'env':
      return new EnvStorage(workspaceRoot);
    case 'kms':
      return new KMSStorage();
  }
}
