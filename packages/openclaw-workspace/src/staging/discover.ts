/**
 * @bic/openclaw-workspace/staging — workspace discovery.
 *
 * `discoverWorkspaceFiles(root)` combines `readStagedOrCanonical`,
 * `classify`, and `parse` into a single call that consumers at
 * package boundaries (e.g. `@bic/openclaw-policy`'s fs pipeline) need
 * to turn a workspace root into a typed list of parsed files.
 *
 * This exists because downstream packages MUST NOT reach into
 * `fs/promises` themselves; the workspace package is the authoritative
 * owner of filesystem semantics (walk, stage overlay, encoding, hidden
 * directories). Consumers that want just one file can still call
 * `readStagedOrCanonical` + `parseWorkspaceFile` directly.
 *
 * @module @bic/openclaw-workspace/staging/discover
 */

import { classify } from '../ast/classify.js';
import { parse } from '../ast/parse.js';
import type {
  Diagnostic,
  ParseResult,
  WorkspaceAst,
  WorkspaceFileKind,
} from '../ast/ast-types.js';

import { readStagedOrCanonical } from './readStagedOrCanonical.js';

export interface DiscoveredWorkspaceFile {
  /** Forward-slash path relative to the workspace root. */
  readonly relPath: string;
  /** Classified kind. Always non-null — unclassified files are dropped. */
  readonly kind: WorkspaceFileKind;
  /** Raw UTF-8 contents (stage-aware). */
  readonly raw: string;
  /** Parsed AST. */
  readonly ast: WorkspaceAst;
  /** Diagnostics produced by the parser for this file. */
  readonly diagnostics: readonly Diagnostic[];
}

export interface DiscoveryResult {
  readonly files: readonly DiscoveredWorkspaceFile[];
  /**
   * Relative paths that were read from disk but did NOT classify to a
   * known `WorkspaceFileKind` — consumers can decide whether to warn.
   */
  readonly unclassified: readonly string[];
}

/**
 * Discover + parse every classifiable file under `workspaceRoot`.
 *
 * Honours `.stage/` overlay precedence (same as `readStagedOrCanonical`).
 * Hidden directories (other than `.stage`) are skipped. Returned files
 * are sorted by `relPath` so consumers get stable iteration order.
 */
export async function discoverWorkspaceFiles(
  workspaceRoot: string,
): Promise<DiscoveryResult> {
  const readResult = await readStagedOrCanonical(workspaceRoot);

  const files: DiscoveredWorkspaceFile[] = [];
  const unclassified: string[] = [];

  for (const [relPath, raw] of Object.entries(readResult)) {
    const kind = classify(relPath);
    if (kind === null) {
      unclassified.push(relPath);
      continue;
    }
    const parsed: ParseResult = parse(kind, raw);
    files.push({
      relPath,
      kind,
      raw,
      ast: parsed.ast,
      diagnostics: parsed.diagnostics,
    });
  }

  return { files, unclassified };
}
