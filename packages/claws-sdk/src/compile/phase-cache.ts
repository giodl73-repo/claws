/**
 * Per-phase compilation output cache + file→phase dependency graph.
 *
 * Backs the incremental recompile path: when a single OC file changes,
 * the {@link DependencyGraph} returns the minimal set of phases to re-run
 * and the {@link PhaseCache} skips every other phase. Target: a
 * single-file edit completes in <200 ms (40 ms typical).
 *
 * The cache keys on the concatenation of input content hashes so that
 * phase outputs are stable under byte-for-byte unchanged inputs —
 * regardless of which file triggered the recompile.
 *
 * @module claws-sdk/compile/phase-cache
 */

import { hashContent } from '../compilation-host.js';

/**
 * Name of a compilation phase. The four phases in the CAP pipeline —
 * parse, classify, evaluate, emit — are the defaults; callers may
 * introduce additional phase names (string literal discipline), but the
 * cache is name-agnostic.
 */
export type PhaseName = string;

/**
 * Output produced by a compilation phase. Opaque to the cache; callers
 * are free to store any JSON-serializable value. The cache never
 * inspects the payload.
 */
export type PhaseOutput = unknown;

/**
 * Envelope returned from {@link PhaseCache.get}. Wraps the phase output
 * along with the composite input hash that produced it, so consumers
 * can assert cache lineage when chaining phases.
 */
export interface CachedOutput {
  readonly output: PhaseOutput;
  readonly inputHash: string;
}

interface CacheEntry {
  readonly inputHash: string;
  readonly output: PhaseOutput;
  readonly size: number;
  lastAccessed: number;
}

/**
 * Options for {@link PhaseCache}.
 */
export interface PhaseCacheOptions {
  /**
   * Maximum number of phase-entries retained before LRU eviction kicks
   * in. Defaults to 256 — one phase per OC file across a 64-file
   * workspace, with generous headroom.
   */
  readonly maxEntries?: number;
}

const DEFAULT_MAX_ENTRIES = 256;

/**
 * Collapse a list of input content hashes into a single cache key.
 *
 * The delimiter is a byte sequence that cannot appear in a SHA-256 hex
 * digest, so concatenation is collision-free without additional
 * escaping.
 */
function composeInputHash(inputHashes: readonly string[]): string {
  return hashContent(inputHashes.join('|'));
}

/**
 * Per-phase output cache keyed by phase name + composite input hash.
 *
 * Not thread-safe — callers must serialize access through the
 * compilation queue. Memory-bounded via LRU eviction.
 */
export class PhaseCache {
  private readonly entries = new Map<string, CacheEntry>();
  private readonly maxEntries: number;
  private tick = 0;

  constructor(options: PhaseCacheOptions = {}) {
    this.maxEntries = options.maxEntries ?? DEFAULT_MAX_ENTRIES;
  }

  private keyFor(phase: PhaseName, inputHash: string): string {
    return `${phase}:${inputHash}`;
  }

  /**
   * Look up a cached phase output. Returns `undefined` on a miss or
   * when the composite input hash does not match (stale entry).
   */
  get(phase: PhaseName, inputHashes: readonly string[]): CachedOutput | undefined {
    const inputHash = composeInputHash(inputHashes);
    const entry = this.entries.get(this.keyFor(phase, inputHash));
    if (entry === undefined) return undefined;
    entry.lastAccessed = ++this.tick;
    return { output: entry.output, inputHash: entry.inputHash };
  }

  /**
   * Store a phase output under its composite input hash. Triggers LRU
   * eviction if the entry count would exceed {@link maxEntries}.
   */
  set(phase: PhaseName, inputHashes: readonly string[], output: PhaseOutput): void {
    const inputHash = composeInputHash(inputHashes);
    const key = this.keyFor(phase, inputHash);
    const size = estimateSize(output);
    this.entries.set(key, { inputHash, output, size, lastAccessed: ++this.tick });
    this.evictIfNeeded();
  }

  /**
   * Drop every cache entry for a single phase. Used when a phase's
   * implementation changes (e.g., emitter version bump) and all outputs
   * must be recomputed regardless of input hashes.
   */
  invalidate(phase: PhaseName): void {
    const prefix = `${phase}:`;
    for (const key of this.entries.keys()) {
      if (key.startsWith(prefix)) this.entries.delete(key);
    }
  }

  /**
   * Invalidate every phase that depends on the given OC file, as
   * resolved by {@link graph}. A file outside the graph is a no-op.
   */
  invalidateByFile(filePath: string, graph: DependencyGraph): void {
    const phases = graph.phasesFor(filePath);
    for (const phase of phases) this.invalidate(phase);
  }

  /** Drop every cached entry. Used on SDK version changes and tests. */
  clear(): void {
    this.entries.clear();
    this.tick = 0;
  }

  /** Current entry count. Primarily for tests and observability. */
  get size(): number {
    return this.entries.size;
  }

  private evictIfNeeded(): void {
    if (this.entries.size <= this.maxEntries) return;
    // O(n) scan is fine at our scale (maxEntries defaults to 256); a
    // heap buys nothing here. The map is non-empty by the size check.
    let oldestKey = '';
    let oldestTick = Number.POSITIVE_INFINITY;
    for (const [key, entry] of this.entries) {
      if (entry.lastAccessed < oldestTick) {
        oldestTick = entry.lastAccessed;
        oldestKey = key;
      }
    }
    this.entries.delete(oldestKey);
  }
}

function estimateSize(output: PhaseOutput): number {
  try {
    return JSON.stringify(output)?.length ?? 0;
  } catch {
    return 0;
  }
}

/**
 * Maps OC file paths to the set of compilation phases that read them.
 *
 * Populated by {@link record} during the first full compile: each
 * phase declares which files it consumed, and on a subsequent edit the
 * graph returns the minimal set of phases that must re-run.
 */
export class DependencyGraph {
  private readonly fileToPhases = new Map<string, Set<PhaseName>>();
  private readonly phaseToFiles = new Map<PhaseName, Set<string>>();

  /**
   * Record that `phase` consumed `filePaths`. Idempotent — multiple
   * recordings for the same (phase, file) pair are collapsed.
   */
  record(phase: PhaseName, filePaths: readonly string[]): void {
    let phaseFiles = this.phaseToFiles.get(phase);
    if (phaseFiles === undefined) {
      phaseFiles = new Set();
      this.phaseToFiles.set(phase, phaseFiles);
    }
    for (const file of filePaths) {
      phaseFiles.add(file);
      let filePhases = this.fileToPhases.get(file);
      if (filePhases === undefined) {
        filePhases = new Set();
        this.fileToPhases.set(file, filePhases);
      }
      filePhases.add(phase);
    }
  }

  /**
   * Return every phase that must re-run when `filePath` changes.
   * Empty set for unknown files — callers should treat that as "full
   * recompile needed" rather than "nothing to do".
   */
  phasesFor(filePath: string): ReadonlySet<PhaseName> {
    return this.fileToPhases.get(filePath) ?? new Set();
  }

  /**
   * Return every file that `phase` consumed. Used by the compilation
   * cache to build the composite input hash for a phase re-run.
   */
  filesFor(phase: PhaseName): ReadonlySet<string> {
    return this.phaseToFiles.get(phase) ?? new Set();
  }

  /** Whether the graph has any recorded dependency. */
  get hasDependencies(): boolean {
    return this.fileToPhases.size > 0;
  }

  /** Drop every recorded dependency. Used on full-rebuild requests. */
  clear(): void {
    this.fileToPhases.clear();
    this.phaseToFiles.clear();
  }
}
