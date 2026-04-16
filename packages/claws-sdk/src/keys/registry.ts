/**
 * Key metadata registry — tracks key lifecycle without touching key material.
 *
 * The registry is persisted as `.claws/keys/registry.json`. It stores
 * metadata (algorithm, creation time, rotation status, storage tier)
 * but never key material.
 *
 * @module claws-sdk/keys/registry
 */

import { mkdir, readFile, writeFile, rename, open, unlink } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { randomBytes } from 'node:crypto';
import { CLAWS_SIDECAR_LAYOUT } from '../types/sidecar.js';
import type { KeyEntry, KeyAlgorithm, KeyPurpose, StorageTier, RotationSchedule } from './types.js';

/**
 * Registry file name within the keys directory.
 */
const REGISTRY_FILE = 'registry.json';

/**
 * Lock file for registry write operations.
 */
const REGISTRY_LOCK_FILE = 'registry.lock';

/**
 * Default maximum age of a lock file before it is considered stale (60 seconds).
 */
const DEFAULT_LOCK_TIMEOUT_MS = 60 * 1000;

/**
 * Acquire a file lock on the registry using atomic O_EXCL create.
 *
 * Uses `fs.open` with `O_CREAT | O_EXCL | O_WRONLY` (flag 'wx') for atomic
 * lock acquisition. If the lock file exists, checks PID liveness and lock age.
 * Stale locks (dead PID or expired) are reclaimed and retried once.
 */
async function acquireRegistryLock(workspaceRoot: string, lockTimeoutMs: number = DEFAULT_LOCK_TIMEOUT_MS): Promise<string> {
  const keysDir = join(workspaceRoot, CLAWS_SIDECAR_LAYOUT.keys);
  await mkdir(keysDir, { recursive: true });
  const lockPath = join(keysDir, REGISTRY_LOCK_FILE);

  async function writeLock(): Promise<void> {
    const lockContent = `${process.pid}\n${Date.now()}\n`;
    const fh = await open(lockPath, 'wx');
    try {
      await fh.writeFile(lockContent, 'utf-8');
    } finally {
      await fh.close();
    }
  }

  try {
    // O_CREAT | O_EXCL | O_WRONLY — atomic: fails with EEXIST if file exists
    await writeLock();
    return lockPath;
  } catch (err: unknown) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code !== 'EEXIST') throw err;

    // Lock file exists — check if it is stale
    try {
      const content = await readFile(lockPath, 'utf-8');
      const [pidStr, tsStr] = content.trim().split('\n');
      const lockPid = Number(pidStr);
      const lockTs = Number(tsStr);

      // Check if PID is still alive
      let pidAlive = false;
      try {
        process.kill(lockPid, 0);
        pidAlive = true;
      } catch {
        pidAlive = false;
      }

      if (!pidAlive || (Number.isFinite(lockTs) && Date.now() - lockTs > lockTimeoutMs)) {
        // Stale lock — remove and retry once with atomic O_EXCL
        await unlink(lockPath);
        await writeLock();
        return lockPath;
      }
    } catch {
      // Could not recover — fall through to throw
    }

    throw new Error('Registry write already in progress (lock file exists). Wait or remove .claws/keys/registry.lock');
  }
}

/**
 * Release the registry lock by unlinking the lock file.
 */
async function releaseRegistryLock(lockPath: string): Promise<void> {
  try {
    await unlink(lockPath);
  } catch {
    // Best-effort cleanup
  }
}

/**
 * Serialized registry format on disk.
 */
interface RegistryData {
  readonly version: 1;
  readonly keys: readonly KeyEntry[];
}

/**
 * Resolve the path to the registry file.
 */
function registryPath(workspaceRoot: string): string {
  return join(workspaceRoot, CLAWS_SIDECAR_LAYOUT.keys, REGISTRY_FILE);
}

/**
 * Read all key entries from the registry.
 *
 * Returns an empty array if the registry file does not exist.
 */
export async function readRegistry(workspaceRoot: string): Promise<KeyEntry[]> {
  const path = registryPath(workspaceRoot);
  try {
    const raw = await readFile(path, 'utf-8');
    const data = JSON.parse(raw) as RegistryData;
    return [...data.keys];
  } catch {
    return [];
  }
}

/**
 * Write the full set of key entries to the registry.
 *
 * Uses write-to-tmp + rename for atomic updates. On both POSIX and NTFS
 * a same-directory rename is atomic, so a crash mid-write cannot corrupt
 * registry.json.
 */
async function writeRegistry(workspaceRoot: string, keys: readonly KeyEntry[]): Promise<void> {
  const path = registryPath(workspaceRoot);
  const tmpPath = path + '.tmp';
  await mkdir(dirname(path), { recursive: true });
  const data: RegistryData = { version: 1, keys };
  await writeFile(tmpPath, JSON.stringify(data, null, 2) + '\n', 'utf-8');
  await rename(tmpPath, path);
}

/**
 * Generate a short unique key ID.
 *
 * Format: `{algorithm-prefix}-{8 hex chars}` (e.g. "ed25519-a1b2c3d4").
 */
export function generateKeyId(algorithm: KeyAlgorithm): string {
  const suffix = randomBytes(4).toString('hex');
  const prefix = algorithm === 'ed25519' ? 'ed25519' : 'hmac';
  return `${prefix}-${suffix}`;
}

/**
 * Options for registering a new key.
 */
export interface RegisterKeyOptions {
  /** Key ID. If omitted, one is generated. */
  readonly id?: string | undefined;
  /** Algorithm used to generate the key. */
  readonly algorithm: KeyAlgorithm;
  /** Storage tier where key material resides. */
  readonly storageTier: StorageTier;
  /** Optional rotation schedule. */
  readonly rotationSchedule?: RotationSchedule | undefined;
  /** Key purpose (default: 'signing'). */
  readonly purpose?: KeyPurpose | undefined;
}

/**
 * Register a new key in the metadata registry.
 *
 * Acquires a file lock to prevent concurrent read-modify-write races.
 *
 * @returns The created KeyEntry.
 */
export async function registerKey(
  workspaceRoot: string,
  opts: RegisterKeyOptions,
): Promise<KeyEntry> {
  const lockPath = await acquireRegistryLock(workspaceRoot);
  try {
    const keys = await readRegistry(workspaceRoot);
    const entry: KeyEntry = {
      id: opts.id ?? generateKeyId(opts.algorithm),
      algorithm: opts.algorithm,
      storageTier: opts.storageTier,
      createdAt: new Date().toISOString(),
      rotatedAt: null,
      revoked: false,
      rotationSchedule: opts.rotationSchedule ?? null,
      version: 1,
      purpose: opts.purpose ?? 'signing',
      revokedAt: null,
    };

    keys.push(entry);
    await writeRegistry(workspaceRoot, keys);
    return entry;
  } finally {
    await releaseRegistryLock(lockPath);
  }
}

/**
 * Look up a key entry by ID.
 *
 * @returns The KeyEntry or null if not found.
 */
export async function getKey(workspaceRoot: string, keyId: string): Promise<KeyEntry | null> {
  const keys = await readRegistry(workspaceRoot);
  return keys.find((k) => k.id === keyId) ?? null;
}

/**
 * Update an existing key entry in the registry.
 *
 * Acquires a file lock to prevent concurrent read-modify-write races.
 * Replaces the entry with the matching ID. Throws if the key is not found.
 *
 * @param workspaceRoot - Absolute path to workspace root
 * @param updated - The updated KeyEntry (must have a valid id)
 */
export async function updateKey(workspaceRoot: string, updated: KeyEntry): Promise<void> {
  const lockPath = await acquireRegistryLock(workspaceRoot);
  try {
    const keys = await readRegistry(workspaceRoot);
    const idx = keys.findIndex((k) => k.id === updated.id);
    if (idx === -1) {
      throw new Error(`Key not found: ${updated.id}`);
    }
    keys[idx] = updated;
    await writeRegistry(workspaceRoot, keys);
  } finally {
    await releaseRegistryLock(lockPath);
  }
}
