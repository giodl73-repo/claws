/**
 * Compilation cache — hash-based skip logic for GovernanceIR recompilation.
 *
 * Composite cache key: workspace file hashes + claws-sdk version +
 * claws.json hash + rule registry fingerprint. Lives in the SDK so
 * programmatic consumers (CI, IDE, test) get cache benefit automatically.
 *
 * @module claws-sdk/compile/cache
 */

import { readFile, writeFile, mkdir, readdir, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { DEFAULT_FILE_SOURCES } from './types.js';

import { CLAWS_SDK_VERSION } from '../version.js';

/**
 * Cache file location within the .claws sidecar.
 */
const CACHE_DIR = '.claws/cache';
const CACHE_FILE = 'hashes.json';

/**
 * Governance source files checked for changes.
 *
 * Derived from DEFAULT_FILE_SOURCES (the 9 OC workspace files)
 * plus claws.json (compiler config). Kept in sync automatically
 * so the cache invalidates when any actual source changes.
 */
const GOVERNANCE_SOURCE_FILES: readonly string[] = [
  ...DEFAULT_FILE_SOURCES,
  'claws.json',
];

/**
 * Stored cache entry — persisted to .claws/cache/hashes.json.
 */
export interface CacheEntry {
  /** Composite hash of all inputs. */
  readonly compositeHash: string;
  /** ISO 8601 timestamp of when the cache was stored. */
  readonly storedAt: string;
  /** SDK version that produced this cache. */
  readonly sdkVersion: string;
}

/**
 * Result of a cache check.
 */
export interface CacheCheckResult {
  /** Whether the cache is valid (hit). */
  readonly hit: boolean;
  /** The composite hash of current inputs. */
  readonly currentHash: string;
  /** The stored composite hash (null if no cache exists). */
  readonly storedHash: string | null;
  /** Reason for cache miss (null on hit). */
  readonly missReason: string | null;
}

/**
 * Options for CompilationCache operations.
 */
export interface CacheOptions {
  /** Rule registry fingerprint (hash of all registered rule IDs). */
  readonly registryFingerprint?: string;
}

/**
 * Compute SHA-256 hash of a string, normalizing line endings.
 */
function hashContent(content: string): string {
  const normalized = content.replace(/\r\n/g, '\n');
  return createHash('sha256').update(normalized, 'utf8').digest('hex');
}

/**
 * Read a file's content and return its hash, or null if the file doesn't exist.
 */
async function hashFile(filePath: string): Promise<string | null> {
  try {
    const content = await readFile(filePath, 'utf-8');
    return hashContent(content);
  } catch {
    return null;
  }
}

/**
 * Build a composite cache key from all compilation inputs.
 *
 * Components:
 * 1. Per-file content hashes of all governance source files
 * 2. SDK version string
 * 3. claws.json content hash (included in file hashes but also in SDK version salt)
 * 4. Rule registry fingerprint (optional — hash of registered rule IDs)
 */
async function buildCompositeHash(
  workspaceRoot: string,
  options: CacheOptions = {},
): Promise<string> {
  // Hash all governance source files
  const fileHashes: string[] = [];
  for (const fileName of GOVERNANCE_SOURCE_FILES) {
    const filePath = join(workspaceRoot, fileName);
    const hash = await hashFile(filePath);
    fileHashes.push(`${fileName}:${hash ?? 'absent'}`);
  }

  // Build composite input
  const parts = [
    `sdk:${CLAWS_SDK_VERSION}`,
    ...fileHashes,
  ];

  if (options.registryFingerprint) {
    parts.push(`registry:${options.registryFingerprint}`);
  }

  const composite = parts.join('|');
  return hashContent(composite);
}

/**
 * Check whether a cached compilation is still valid.
 *
 * Compares the composite hash of current workspace files against
 * the stored hash. Returns a CacheCheckResult indicating hit/miss
 * and the reason for any miss.
 *
 * @param workspaceRoot - Absolute path to workspace root
 * @param options - Cache options (registry fingerprint)
 * @returns CacheCheckResult
 */
export async function check(
  workspaceRoot: string,
  options: CacheOptions = {},
): Promise<CacheCheckResult> {
  const currentHash = await buildCompositeHash(workspaceRoot, options);

  // Read stored cache
  const cachePath = join(workspaceRoot, CACHE_DIR, CACHE_FILE);
  let storedEntry: CacheEntry | null = null;
  try {
    const content = await readFile(cachePath, 'utf-8');
    storedEntry = JSON.parse(content) as CacheEntry;
  } catch {
    // No cache file or invalid JSON
  }

  if (!storedEntry) {
    return {
      hit: false,
      currentHash,
      storedHash: null,
      missReason: 'no cache file',
    };
  }

  if (storedEntry.sdkVersion !== CLAWS_SDK_VERSION) {
    return {
      hit: false,
      currentHash,
      storedHash: storedEntry.compositeHash,
      missReason: `SDK version changed (${storedEntry.sdkVersion} -> ${CLAWS_SDK_VERSION})`,
    };
  }

  if (storedEntry.compositeHash !== currentHash) {
    return {
      hit: false,
      currentHash,
      storedHash: storedEntry.compositeHash,
      missReason: 'workspace files changed',
    };
  }

  return {
    hit: true,
    currentHash,
    storedHash: storedEntry.compositeHash,
    missReason: null,
  };
}

/**
 * Store the current compilation hash to the cache file.
 *
 * Call this after a successful compilation to enable future cache hits.
 *
 * @param workspaceRoot - Absolute path to workspace root
 * @param options - Cache options (registry fingerprint)
 */
export async function store(
  workspaceRoot: string,
  options: CacheOptions = {},
): Promise<void> {
  const compositeHash = await buildCompositeHash(workspaceRoot, options);

  const entry: CacheEntry = {
    compositeHash,
    storedAt: new Date().toISOString(),
    sdkVersion: CLAWS_SDK_VERSION,
  };

  const cacheDir = join(workspaceRoot, CACHE_DIR);
  await mkdir(cacheDir, { recursive: true });
  await writeFile(
    join(cacheDir, CACHE_FILE),
    JSON.stringify(entry, null, 2),
    'utf-8',
  );
}
