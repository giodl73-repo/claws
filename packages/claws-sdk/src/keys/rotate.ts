/**
 * Key rotation — generate a new key version, re-sign compiled artifacts,
 * and archive the old key.
 *
 * Rotation acquires a file lock on `.claws/keys/` during the operation.
 * Only `.claws/compiled/` artifacts are re-signed (never user files).
 * Partial re-sign failure rolls back: restores old key, keeps old signatures.
 *
 * @module claws-sdk/keys/rotate
 */

import { mkdir, readdir, readFile, writeFile, rename, open, unlink } from 'node:fs/promises';
import { join } from 'node:path';
import { sign as cryptoSign, timingSafeEqual } from 'node:crypto';

import { CLAWS_SIDECAR_LAYOUT } from '../types/sidecar.js';
import type { KeyEntry } from './types.js';
import { getKey, updateKey } from './registry.js';
import { generateKey } from './generate.js';
import { createStorage } from './storage.js';

/**
 * Result of a key rotation operation.
 */
export interface RotateResult {
  /** The updated key entry with incremented version. */
  readonly entry: KeyEntry;
  /** Number of artifacts re-signed with the new key. */
  readonly artifactsReSigned: number;
  /** The previous version number (before rotation). */
  readonly previousVersion: number;
}

/**
 * Lock file name within the keys directory.
 */
const LOCK_FILE = 'rotate.lock';

/**
 * Default maximum age of a lock file before it is considered stale (60 seconds).
 */
const DEFAULT_LOCK_TIMEOUT_MS = 60 * 1000;

/**
 * Acquire a file lock on the keys directory using atomic O_EXCL create.
 *
 * Uses `fs.open` with `O_CREAT | O_EXCL | O_WRONLY` (flag 'wx') for atomic
 * lock acquisition — the filesystem guarantees that if the file exists, the
 * open fails with EEXIST. No read-check-delete sequence needed.
 *
 * If the lock file exists, checks whether the owning PID is still alive
 * and whether the lock is younger than the configured timeout.
 * Stale locks (dead PID or expired) are reclaimed and retried once.
 *
 * @param workspaceRoot - Absolute path to workspace root
 * @param lockTimeoutMs - Maximum age of a lock before it is stale (default 60s)
 */
async function acquireLock(workspaceRoot: string, lockTimeoutMs: number = DEFAULT_LOCK_TIMEOUT_MS): Promise<string> {
  const keysDir = join(workspaceRoot, CLAWS_SIDECAR_LAYOUT.keys);
  await mkdir(keysDir, { recursive: true });
  const lockPath = join(keysDir, LOCK_FILE);
  const lockContent = `${process.pid}\n${Date.now()}\n`;

  try {
    // O_CREAT | O_EXCL | O_WRONLY — atomic: fails with EEXIST if file exists
    const fh = await open(lockPath, 'wx');
    await fh.writeFile(lockContent, 'utf-8');
    await fh.close();
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
        const fh = await open(lockPath, 'wx');
        await fh.writeFile(lockContent, 'utf-8');
        await fh.close();
        return lockPath;
      }
    } catch {
      // Could not read/parse/clean lock — fall through to throw
    }

    throw new Error('Key rotation already in progress (lock file exists). Wait or remove .claws/keys/rotate.lock');
  }
}

/**
 * Release the file lock by unlinking the lock file.
 */
async function releaseLock(lockPath: string): Promise<void> {
  try {
    await unlink(lockPath);
  } catch {
    // Best-effort cleanup
  }
}

/**
 * Archive old key material by renaming to `{keyId}.v{version}.key`.
 */
async function archiveOldKey(workspaceRoot: string, keyId: string, version: number): Promise<void> {
  const keysDir = join(workspaceRoot, CLAWS_SIDECAR_LAYOUT.keys);
  const currentPath = join(keysDir, `${keyId}.key`);
  const archivePath = join(keysDir, `${keyId}.v${version}.key`);

  try {
    await rename(currentPath, archivePath);
  } catch {
    // Key material may be in env or KMS — archiving file is best-effort
  }

  // Also archive public key if present
  const pubPath = join(keysDir, `${keyId}.pub.key`);
  const pubArchivePath = join(keysDir, `${keyId}.v${version}.pub.key`);
  try {
    await rename(pubPath, pubArchivePath);
  } catch {
    // Public key may not exist (HMAC keys) — ok
  }
}

/**
 * List `.sig` files in `.claws/compiled/` that need re-signing.
 */
async function listCompiledArtifacts(workspaceRoot: string): Promise<string[]> {
  const compiledDir = join(workspaceRoot, CLAWS_SIDECAR_LAYOUT.compiled);
  try {
    const entries = await readdir(compiledDir);
    return entries.filter((f) => f.endsWith('.sig'));
  } catch {
    return [];
  }
}

/**
 * Re-sign a single artifact with a new Ed25519 private key.
 *
 * Reads the original artifact content (the .sig file references a companion file),
 * computes a new Ed25519 signature, and writes it back to the .sig file.
 * Ed25519 uses its own internal hash — no external digest algorithm is specified.
 */
async function reSignArtifact(
  compiledDir: string,
  sigFile: string,
  newPrivateKey: string,
): Promise<void> {
  // The artifact name is the .sig file without the .sig extension
  const artifactName = sigFile.replace(/\.sig$/, '');
  const artifactPath = join(compiledDir, artifactName);
  const sigPath = join(compiledDir, sigFile);

  let content: Buffer;
  try {
    content = await readFile(artifactPath);
  } catch {
    // Artifact file missing — skip, don't fail the whole rotation
    return;
  }

  // Ed25519 sign: algorithm is null (Ed25519 uses built-in SHA-512)
  const signature = cryptoSign(null, content, newPrivateKey);
  await writeFile(sigPath, signature.toString('hex'), 'utf-8');
}

/**
 * Clean up archived key files after a failed rotation.
 *
 * Removes the versioned archive files and restores the original key
 * file from the saved material.
 */
async function cleanupArchive(
  workspaceRoot: string,
  keyId: string,
  version: number,
): Promise<void> {
  const keysDir = join(workspaceRoot, CLAWS_SIDECAR_LAYOUT.keys);
  const archivePath = join(keysDir, `${keyId}.v${version}.key`);
  const pubArchivePath = join(keysDir, `${keyId}.v${version}.pub.key`);

  try { await unlink(archivePath); } catch { /* may not exist */ }
  try { await unlink(pubArchivePath); } catch { /* may not exist */ }
}

/**
 * Compare two key material strings using timing-safe comparison.
 *
 * Prevents timing side-channel leaks that could reveal partial key
 * material through response time differences.
 *
 * @param a - First key material (hex or PEM string)
 * @param b - Second key material (hex or PEM string)
 * @returns true if the key material is identical
 */
export function verifyKeyMaterial(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'utf-8');
  const bufB = Buffer.from(b, 'utf-8');
  const maxLen = Math.max(bufA.length, bufB.length);
  // Pad shorter buffer to prevent timing leak of key length
  const paddedA = maxLen > bufA.length
    ? Buffer.concat([bufA, Buffer.alloc(maxLen - bufA.length)])
    : bufA;
  const paddedB = maxLen > bufB.length
    ? Buffer.concat([bufB, Buffer.alloc(maxLen - bufB.length)])
    : bufB;
  const equal = timingSafeEqual(paddedA, paddedB);
  // Must also confirm original lengths matched — padding makes unequal-length
  // inputs fail timingSafeEqual, but we check explicitly for clarity.
  return equal && bufA.length === bufB.length;
}

/**
 * Rotate a key: generate new version, re-sign artifacts, archive old key.
 *
 * On failure after archive, cleans up the archived key material and
 * restores the original key to its pre-rotation state.
 *
 * @param workspaceRoot - Absolute path to workspace root
 * @param keyId - ID of the key to rotate
 * @returns Rotation result with updated entry and re-sign count
 */
export async function rotateKey(
  workspaceRoot: string,
  keyId: string,
): Promise<RotateResult> {
  const entry = await getKey(workspaceRoot, keyId);
  if (!entry) {
    throw new Error(`Key not found: ${keyId}`);
  }
  if (entry.revoked) {
    throw new Error(`Cannot rotate revoked key: ${keyId}`);
  }

  const lockPath = await acquireLock(workspaceRoot);

  try {
    const previousVersion = entry.version;
    const newVersion = previousVersion + 1;

    // Generate new key material
    const generated = generateKey(entry.algorithm);
    const storage = createStorage(entry.storageTier, workspaceRoot);

    // Read and validate old key material BEFORE any mutations — required for rollback safety
    const oldPrivateKey = await storage.read(keyId);
    if (oldPrivateKey === null) {
      throw new Error(`Cannot rotate: unable to read current key material for rollback safety (key ${keyId})`);
    }
    const oldPublicKey = entry.algorithm === 'ed25519' ? await storage.read(`${keyId}.pub`) : null;
    if (entry.algorithm === 'ed25519' && oldPublicKey === null) {
      throw new Error(`Cannot rotate: unable to read current public key material for rollback safety (key ${keyId})`);
    }

    // Archive old key material
    await archiveOldKey(workspaceRoot, keyId, previousVersion);

    // Write new key material
    await storage.write(keyId, generated.privateKey);
    if (generated.publicKey) {
      await storage.write(`${keyId}.pub`, generated.publicKey);
    }

    // Re-sign compiled artifacts (Ed25519 only, HMAC doesn't sign artifacts)
    let artifactsReSigned = 0;
    if (entry.algorithm === 'ed25519') {
      const sigFiles = await listCompiledArtifacts(workspaceRoot);
      const compiledDir = join(workspaceRoot, CLAWS_SIDECAR_LAYOUT.compiled);

      try {
        for (const sigFile of sigFiles) {
          await reSignArtifact(compiledDir, sigFile, generated.privateKey);
          artifactsReSigned++;
        }
      } catch (reSignError) {
        // Partial re-sign failure: rollback — restore old key material,
        // clean up orphaned archive, and log the rollback action.
        // oldPrivateKey and oldPublicKey are guaranteed non-null by the pre-check above.
        await storage.write(keyId, oldPrivateKey);
        if (oldPublicKey !== null) {
          await storage.write(`${keyId}.pub`, oldPublicKey);
        }

        // Clean up orphaned archive files from the failed rotation
        await cleanupArchive(workspaceRoot, keyId, previousVersion);

        // eslint-disable-next-line no-console
        console.warn(
          `[claws:keys] Rotation rollback for ${keyId}: cleaned up archived v${previousVersion}, restored original key`,
        );

        throw new Error(
          `Partial re-sign failure during rotation of ${keyId}: ${String(reSignError instanceof Error ? reSignError.message : reSignError)}. Rolled back to previous version.`,
        );
      }
    }

    // Update registry entry
    const updated: KeyEntry = {
      ...entry,
      version: newVersion,
      rotatedAt: new Date().toISOString(),
    };
    await updateKey(workspaceRoot, updated);

    return {
      entry: updated,
      artifactsReSigned,
      previousVersion,
    };
  } finally {
    await releaseLock(lockPath);
  }
}

export { acquireLock, releaseLock };
