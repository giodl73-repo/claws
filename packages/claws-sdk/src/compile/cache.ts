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
import {
  PhaseCache,
  DependencyGraph,
  type PhaseName,
  type PhaseOutput,
  type CachedOutput,
  type PhaseCacheOptions,
} from './phase-cache.js';
import {
  CompilationQueue,
  type CompileTrigger,
  type CompileResult as QueueCompileResult,
} from './compilation-queue.js';

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
  const cachePath = join(cacheDir, CACHE_FILE);
  await writeFile(
    cachePath,
    JSON.stringify(entry, null, 2),
    { encoding: 'utf-8', mode: 0o600 },
  );
}

/**
 * Per-file hash entry tracked by {@link IncrementalCompilationCache}.
 * Holds the current SHA-256 of the file's on-disk content so callers
 * can detect which file(s) actually changed between recompiles.
 */
export interface FileHashEntry {
  readonly filePath: string;
  readonly hash: string;
}

/**
 * Plan returned from {@link IncrementalCompilationCache.planRecompile}.
 * `phases` is the minimal set of phases to re-run; `changedFiles` is
 * the subset of tracked files whose hash differs from the stored value.
 * A null or empty `phases` signals a full-rebuild fallback — either
 * the dependency graph is unpopulated or an unknown file changed.
 */
export interface RecompilePlan {
  readonly fullRebuild: boolean;
  readonly phases: readonly PhaseName[];
  readonly changedFiles: readonly string[];
}

/**
 * Options for {@link IncrementalCompilationCache}.
 */
export interface IncrementalCacheOptions {
  readonly phaseCache?: PhaseCacheOptions;
}

/**
 * Incremental compilation cache — binds per-file hashes, a phase-output
 * cache, and a file→phase dependency graph into a single coordinator.
 *
 * Hot path:
 * 1. File changes on disk → caller updates the file hash.
 * 2. {@link planRecompile} inspects hash deltas → returns minimal phase
 *    list from the dependency graph.
 * 3. Caller iterates phases; {@link getPhase} returns cached output
 *    for unchanged inputs, {@link setPhase} caches fresh outputs.
 *
 * This class sits on top of the existing file-level `check`/`store`
 * functions rather than replacing them: the on-disk cache still guards
 * cold starts, while this in-memory layer drives warm recompiles.
 */
export class IncrementalCompilationCache {
  private readonly fileHashes = new Map<string, string>();
  readonly phases: PhaseCache;
  readonly graph: DependencyGraph;

  constructor(options: IncrementalCacheOptions = {}) {
    this.phases = new PhaseCache(options.phaseCache);
    this.graph = new DependencyGraph();
  }

  /**
   * Record the current on-disk hash for an OC file. Returns `true` if
   * the hash changed from the previous value (or was never seen),
   * `false` if it is byte-identical to the last recording.
   */
  updateFileHash(filePath: string, content: string): boolean {
    const hash = hashContent(content);
    const prior = this.fileHashes.get(filePath);
    this.fileHashes.set(filePath, hash);
    return prior !== hash;
  }

  /**
   * Explicitly install a pre-computed hash. Used by callers that
   * already hashed the file for another purpose (manifest signing,
   * audit chain) and want to avoid the re-read.
   */
  setFileHash(filePath: string, hash: string): void {
    this.fileHashes.set(filePath, hash);
  }

  /** Current hash for a tracked file, or `undefined`. */
  getFileHash(filePath: string): string | undefined {
    return this.fileHashes.get(filePath);
  }

  /**
   * Determine the minimal recompile plan given a set of candidate
   * file changes. A file whose hash matches the stored value is
   * dropped from the plan; a file the graph does not know about
   * triggers a full rebuild.
   *
   * **VersionStore coordination invariant** (see B2): a `{ phases: [],
   * fullRebuild: false, changedFiles: [] }` result means "no recompile
   * required" — but it does NOT mean "no version recorded." Every
   * successful PATCH that advances the version counter MUST record a
   * `VersionSnapshot` before returning, even when this planner reports
   * nothing to do. The caller re-uses the previous IR reference in that
   * case (hash-equal write → same GovernanceIR, new version number).
   * Skipping the record() would leave `VersionStore.get(vN)` returning
   * `out_of_range` for a version the ETag chain already advertised to
   * the client, breaking time-travel of recent writes.
   */
  planRecompile(candidateFiles: readonly FileHashEntry[]): RecompilePlan {
    if (!this.graph.hasDependencies) {
      return { fullRebuild: true, phases: [], changedFiles: candidateFiles.map((c) => c.filePath) };
    }
    const changed: string[] = [];
    for (const { filePath, hash } of candidateFiles) {
      if (this.fileHashes.get(filePath) !== hash) changed.push(filePath);
    }
    if (changed.length === 0) {
      return { fullRebuild: false, phases: [], changedFiles: [] };
    }
    const affected = new Set<PhaseName>();
    for (const file of changed) {
      const phases = this.graph.phasesFor(file);
      if (phases.size === 0) {
        return { fullRebuild: true, phases: [], changedFiles: changed };
      }
      for (const phase of phases) affected.add(phase);
    }
    return { fullRebuild: false, phases: [...affected], changedFiles: changed };
  }

  /**
   * Get a cached phase output keyed by the composite hash of its
   * inputs. Convenience wrapper over {@link PhaseCache.get}.
   */
  getPhase(phase: PhaseName, inputHashes: readonly string[]): CachedOutput | undefined {
    return this.phases.get(phase, inputHashes);
  }

  /**
   * Store a fresh phase output and record its input dependencies.
   * `dependsOn` is the list of OC files whose content fed the phase;
   * the dependency graph uses it to route future invalidations.
   */
  setPhase(
    phase: PhaseName,
    inputHashes: readonly string[],
    output: PhaseOutput,
    dependsOn: readonly string[] = [],
  ): void {
    this.phases.set(phase, inputHashes, output);
    if (dependsOn.length > 0) this.graph.record(phase, dependsOn);
  }

  /** Drop phase entries affected by `filePath` via the dependency graph. */
  invalidateFile(filePath: string): void {
    this.phases.invalidateByFile(filePath, this.graph);
  }

  /** Full reset — drops file hashes, phases, and the dependency graph. */
  clear(): void {
    this.fileHashes.clear();
    this.phases.clear();
    this.graph.clear();
  }
}

export {
  PhaseCache,
  DependencyGraph,
  CompilationQueue,
  type PhaseName,
  type PhaseOutput,
  type CachedOutput,
  type PhaseCacheOptions,
  type CompileTrigger,
  type QueueCompileResult,
};
