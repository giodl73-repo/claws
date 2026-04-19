/**
 * CompilationHost — cached GovernanceIR with SHA-256 hash-based invalidation.
 *
 * Request-driven lifecycle: POST /compile triggers recompilation,
 * GET /ir returns the cached result. Uses SHA-256 content hashing
 * to skip recompilation when workspace files haven't changed.
 *
 * Follows the same pattern as claws-lsp's CompilationHost but uses
 * a request-driven lifecycle instead of the LSP document-change lifecycle.
 *
 * @module claws-serve/compilation-host
 */

import { hashContent, type GovernanceIR, type ICompilationHost } from '../../claws-sdk/src/index.js';
export { hashContent } from '../../claws-sdk/src/index.js';

/**
 * A compile function supplied by the consumer. Given a workspace root,
 * it reads governance files and produces a GovernanceIR.
 */
export type CompileFn = (workspaceRoot: string) => Promise<GovernanceIR>;

/**
 * Cached compilation entry: hash at compile time + resulting IR + timestamp.
 */
interface CacheEntry {
  readonly hash: string;
  readonly ir: GovernanceIR;
  readonly compiledAt: string;
}

/**
 * Result of a compile request.
 */
export interface CompileResult {
  /** The compiled GovernanceIR. */
  readonly ir: GovernanceIR;
  /** Whether the IR was freshly compiled or served from cache. */
  readonly cached: boolean;
  /** Duration of the compile pass in milliseconds (0 on cache hit). */
  readonly durationMs: number;
}

/**
 * CompilationHost — HTTP server compilation cache with hash-based invalidation.
 *
 * Usage:
 * ```ts
 * const host = new CompilationHost(compileFn, '/workspace');
 * // POST /compile triggers:
 * const result = await host.compile();
 * // GET /ir returns:
 * const ir = host.getCachedIR();
 * ```
 */
export class CompilationHost implements ICompilationHost {
  private readonly compileFn: CompileFn;
  private readonly workspaceRoot: string;
  private cache: CacheEntry | null = null;

  constructor(compileFn: CompileFn, workspaceRoot: string) {
    this.compileFn = compileFn;
    this.workspaceRoot = workspaceRoot;
  }

  /**
   * Trigger a compilation. If the resulting IR hash matches the cache,
   * the cached entry is returned. Otherwise the cache is updated.
   */
  async compile(): Promise<CompileResult> {
    const start = Date.now();
    const ir = await this.compileFn(this.workspaceRoot);
    const irJson = JSON.stringify(ir);
    const newHash = hashContent(irJson);
    const durationMs = Date.now() - start;

    if (this.cache !== null && this.cache.hash === newHash) {
      return { ir: this.cache.ir, cached: true, durationMs: 0 };
    }

    const compiledAt = new Date().toISOString();
    this.cache = { hash: newHash, ir, compiledAt };

    return { ir, cached: false, durationMs };
  }

  /**
   * Get the cached GovernanceIR, or undefined if no compilation has run.
   * This is a synchronous, zero-cost lookup.
   */
  getCachedIR(): GovernanceIR | undefined {
    return this.cache?.ir;
  }

  /**
   * Get the timestamp of the last successful compilation.
   */
  getCompiledAt(): string | undefined {
    return this.cache?.compiledAt;
  }

  /**
   * Get the content hash of the cached IR.
   */
  getHash(): string | undefined {
    return this.cache?.hash;
  }

  /** Whether the cache contains a compiled IR. */
  get hasCachedIR(): boolean {
    return this.cache !== null;
  }

  /** Clear the cache. */
  clear(): void {
    this.cache = null;
  }
}
