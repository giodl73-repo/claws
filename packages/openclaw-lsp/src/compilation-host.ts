/**
 * CompilationHost — cached GovernanceIR with SHA-256 hash-based invalidation.
 *
 * Maintains an in-memory cache of compiled GovernanceIR per file URI.
 * Uses SHA-256 content hashing to detect changes: unchanged files skip
 * recompilation entirely. A 300ms batch window collects rapid saves into
 * a single compile pass, preventing redundant recompiles during burst editing.
 *
 * @module openclaw-lsp/compilation-host
 */

import { hashContent, type ICompilationHost, type GovernanceIRLike } from '@bic/claws-sdk';
export { hashContent, type GovernanceIRLike } from '@bic/claws-sdk';

/**
 * A compile function supplied by the consumer. Given a file URI and its
 * content, it produces a GovernanceIR (or throws on compile error).
 */
export type CompileFn = (uri: string, content: string) => Promise<GovernanceIRLike>;

/**
 * Per-file cache entry: the SHA-256 hash at compile time + the resulting IR.
 */
interface CacheEntry {
  readonly hash: string;
  readonly ir: GovernanceIRLike;
}

/**
 * Result of a compile pass — may include multiple files when batched.
 */
export interface CompileResult {
  /** URIs that were recompiled. */
  readonly recompiled: readonly string[];
  /** URIs that were skipped (hash unchanged). */
  readonly skipped: readonly string[];
  /** Total duration of the compile pass in milliseconds. */
  readonly durationMs: number;
}

/**
 * Default batch window duration in milliseconds.
 * Collects rapid saves into one compile pass.
 */
const DEFAULT_BATCH_MS = 300;

/**
 * CompilationHost — LSP compilation cache with batched invalidation.
 *
 * Usage:
 * ```ts
 * const host = new CompilationHost(compileFn);
 * // On file change from the editor:
 * const result = await host.notifyChange(uri, content);
 * // Get cached IR (instant):
 * const ir = host.getCachedIR(uri);
 * ```
 */
export class CompilationHost implements ICompilationHost {
  private readonly cache = new Map<string, CacheEntry>();
  private readonly compileFn: CompileFn;
  private readonly batchMs: number;

  /** Pending changes waiting for the batch window to close. */
  private readonly pending = new Map<string, string>();
  /** The active batch timer (null when no batch is in progress). */
  private batchTimer: ReturnType<typeof setTimeout> | null = null;
  /** The promise for the in-flight batch compile (null when idle). */
  private batchPromise: Promise<CompileResult> | null = null;
  /** Resolve function for the current batch promise. */
  private batchResolve: ((result: CompileResult) => void) | null = null;

  constructor(compileFn: CompileFn, batchMs: number = DEFAULT_BATCH_MS) {
    this.compileFn = compileFn;
    this.batchMs = batchMs;
  }

  /**
   * Notify the host that a file changed. The change is batched: the actual
   * compile runs after {@link batchMs} of inactivity. Returns a promise
   * that resolves when the batch compile completes.
   *
   * If the file's content hash hasn't changed, it will be skipped during
   * the compile pass (no-op save detection).
   */
  notifyChange(uri: string, content: string): Promise<CompileResult> {
    this.pending.set(uri, content);

    // Reset the batch timer on every change
    if (this.batchTimer !== null) {
      clearTimeout(this.batchTimer);
    }

    // Create a new batch promise if one doesn't exist
    if (this.batchPromise === null) {
      this.batchPromise = new Promise<CompileResult>((resolve) => {
        this.batchResolve = resolve;
      });
    }

    const currentPromise = this.batchPromise;

    this.batchTimer = setTimeout(() => {
      void this.flushBatch();
    }, this.batchMs);

    return currentPromise;
  }

  /**
   * Flush the pending batch immediately, bypassing the timer.
   * Useful for tests or forced compilation.
   */
  async flush(): Promise<CompileResult> {
    if (this.batchTimer !== null) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }
    return this.flushBatch();
  }

  /**
   * Get the cached GovernanceIR for a URI, or undefined if not cached.
   * This is a synchronous, zero-cost lookup.
   */
  getCachedIR(uri: string): GovernanceIRLike | undefined {
    return this.cache.get(uri)?.ir;
  }

  /**
   * Get the content hash currently stored for a URI, or undefined.
   */
  getHash(uri: string): string | undefined {
    return this.cache.get(uri)?.hash;
  }

  /**
   * Remove a URI from the cache (e.g., on file deletion).
   */
  invalidate(uri: string): void {
    this.cache.delete(uri);
    this.pending.delete(uri);
  }

  /** Number of cached entries. */
  get size(): number {
    return this.cache.size;
  }

  /** Clear all caches and pending state. */
  clear(): void {
    this.cache.clear();
    this.pending.clear();
    if (this.batchTimer !== null) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }
    this.batchPromise = null;
    this.batchResolve = null;
  }

  /**
   * Internal: run the batch compile for all pending changes.
   */
  private async flushBatch(): Promise<CompileResult> {
    const start = Date.now();
    const recompiled: string[] = [];
    const skipped: string[] = [];

    // Snapshot and clear pending
    const changes = new Map(this.pending);
    this.pending.clear();
    this.batchTimer = null;

    // Capture and reset the batch promise/resolve before async work
    const resolve = this.batchResolve;
    this.batchPromise = null;
    this.batchResolve = null;

    for (const [uri, content] of changes) {
      const newHash = hashContent(content);
      const existing = this.cache.get(uri);

      // Skip if content hash is unchanged
      if (existing && existing.hash === newHash) {
        skipped.push(uri);
        continue;
      }

      try {
        const ir = await this.compileFn(uri, content);
        this.cache.set(uri, { hash: newHash, ir });
        recompiled.push(uri);
      } catch {
        // Compile error — do not cache, leave previous entry if any
        recompiled.push(uri);
      }
    }

    const result: CompileResult = {
      recompiled,
      skipped,
      durationMs: Date.now() - start,
    };

    // Resolve waiting callers
    if (resolve) {
      resolve(result);
    }

    return result;
  }
}
