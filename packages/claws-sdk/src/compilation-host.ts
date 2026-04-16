/**
 * ICompilationHost — shared interface for governance IR compilation hosts.
 *
 * Both the LSP server (per-URI, batched) and the HTTP server (per-workspace,
 * request-driven) implement this interface. Consumers that need only cached
 * IR access (e.g., classify routes, hover providers) depend on this interface
 * rather than a concrete implementation.
 *
 * @module claws-sdk/compilation-host
 */

import { createHash } from 'node:crypto';
import type { GovernanceIR } from './ir/governance-ir.js';

/**
 * Structural type for GovernanceIR-like objects.
 *
 * The LSP server uses this to avoid a hard runtime import of the full
 * claws-sdk. Consumers that only read cached IR can accept either the
 * concrete GovernanceIR or a structurally compatible object.
 */
export interface GovernanceIRLike {
  readonly capabilities: unknown;
  readonly analysis: unknown;
  readonly intents: readonly unknown[];
  readonly delegationMap: readonly unknown[];
  readonly conflicts: unknown;
  readonly compiler: {
    readonly compilerVersion: string;
    readonly compiledAt: string;
    readonly schemaVersion: number;
  };
}

/**
 * Shared compilation host interface.
 *
 * Both claws-lsp and claws-serve CompilationHost classes implement this
 * contract. The interface captures the common behavioral surface:
 * - Retrieve cached IR (synchronous, zero-cost)
 * - Retrieve content hash for a cached entry
 * - Invalidate / clear cached entries
 */
export interface ICompilationHost {
  /** Get the cached GovernanceIR, or undefined if not available. */
  getCachedIR(...args: readonly unknown[]): GovernanceIR | GovernanceIRLike | undefined;

  /** Get the content hash for a cached entry, or undefined. */
  getHash(...args: readonly unknown[]): string | undefined;

  /** Clear all cached state. */
  clear(): void;
}

/**
 * Compute SHA-256 hash of content after normalizing line endings.
 *
 * Shared between claws-lsp and claws-serve CompilationHost implementations.
 * Both use identical logic: CRLF → LF normalization, then SHA-256 hex digest.
 */
export function hashContent(content: string): string {
  const normalized = content.replace(/\r\n/g, '\n');
  return createHash('sha256').update(normalized, 'utf8').digest('hex');
}
