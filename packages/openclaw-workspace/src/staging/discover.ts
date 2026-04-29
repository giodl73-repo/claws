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
 * In addition to the parsed files, discovery emits workspace-level
 * diagnostics for paths that classified leniently or didn't classify at
 * all — `OC_WS_UNKNOWN_FILE` (with did-you-mean suggestion when one is
 * within edit-distance ≤3), `OC_WS_CASING_VIOLATION` (lowercase variant
 * of a canonical bootstrap basename), and `OC_WS_LEGACY_BASENAME`
 * (deprecated `memory.md` etc. that's still tolerated).
 *
 * @module @bic/openclaw-workspace/staging/discover
 */

import {
  canonicalBasenameFor,
  classifyDetail,
  suggestBasename,
} from '../ast/classify.js';
import { parse } from '../ast/parse.js';
import type {
  ParseResult,
  WorkspaceAst,
  WorkspaceFileKind,
} from '../ast/ast-types.js';

import { readStagedOrCanonical } from './readStagedOrCanonical.js';

export type DiscoveryDiagnosticCode =
  | 'OC_WS_UNKNOWN_FILE'
  | 'OC_WS_CASING_VIOLATION'
  | 'OC_WS_LEGACY_BASENAME';

export interface DiscoveryDiagnostic {
  readonly code: DiscoveryDiagnosticCode;
  readonly relPath: string;
  readonly message: string;
  readonly severity: 'warning' | 'info';
  /**
   * Suggested replacement basename or canonical form, when applicable.
   * E.g. `agents.md` → `AGENTS.md` (casing); `MY-CUSTOM.md` →
   * `MEMORY.md` (did-you-mean within edit-distance threshold). `null`
   * if no specific suggestion is available.
   */
  readonly suggestion: string | null;
}

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
  readonly diagnostics: readonly import('../ast/ast-types.js').Diagnostic[];
}

export interface DiscoveryResult {
  readonly files: readonly DiscoveredWorkspaceFile[];
  /**
   * Relative paths that were read from disk but did NOT classify to a
   * known `WorkspaceFileKind`. Each one also produces a corresponding
   * `OC_WS_UNKNOWN_FILE` entry in `diagnostics`. Kept as a separate
   * field for callers that want to enumerate just the unrecognized
   * paths without filtering the diagnostics list.
   */
  readonly unclassified: readonly string[];
  /** Workspace-level discovery diagnostics — see DiscoveryDiagnosticCode. */
  readonly diagnostics: readonly DiscoveryDiagnostic[];
}

/**
 * Discover + parse every classifiable file under `workspaceRoot`.
 *
 * Honors `.stage/` overlay precedence (same as `readStagedOrCanonical`).
 * Hidden directories (other than `.stage`) are skipped. Returned files
 * are sorted by `relPath` so consumers get stable iteration order.
 */
export async function discoverWorkspaceFiles(
  workspaceRoot: string,
): Promise<DiscoveryResult> {
  const readResult = await readStagedOrCanonical(workspaceRoot);

  const files: DiscoveredWorkspaceFile[] = [];
  const unclassified: string[] = [];
  const diagnostics: DiscoveryDiagnostic[] = [];

  for (const [relPath, raw] of Object.entries(readResult)) {
    const detail = classifyDetail(relPath);
    if (detail === null) {
      unclassified.push(relPath);
      const suggestion = suggestBasename(relPath);
      diagnostics.push({
        code: 'OC_WS_UNKNOWN_FILE',
        relPath,
        message:
          suggestion === null
            ? `unrecognized workspace file '${relPath}'; ignored. To register a new kind, see EXTENDING.md.`
            : `unrecognized workspace file '${relPath}'; did you mean '${suggestion}'?`,
        // Severity 'info' rather than 'warning' — unknown files are an
        // expected outcome of an evolving workspace (new file kinds get
        // added regularly); we should surface the observation without
        // crying wolf. Casing-violations and legacy-basenames stay at
        // 'warning' because they ARE actionable user mistakes.
        severity: 'info',
        suggestion,
      });
      continue;
    }

    if (detail.flavor === 'casing-variant') {
      const canonical = canonicalBasenameFor(detail.matched);
      diagnostics.push({
        code: 'OC_WS_CASING_VIOLATION',
        relPath,
        message: `'${detail.matched}' has the wrong casing; rename to '${canonical}'. Upstream loadWorkspaceBootstrapFiles only honors the canonical UPPERCASE form.`,
        severity: 'warning',
        suggestion: canonical,
      });
    } else if (detail.flavor === 'legacy-basename') {
      const canonical = canonicalBasenameFor(detail.matched);
      diagnostics.push({
        code: 'OC_WS_LEGACY_BASENAME',
        relPath,
        message: `'${detail.matched}' is a legacy basename; rename to '${canonical}' (still loaded for backward compatibility, but slated for removal).`,
        severity: 'warning',
        suggestion: canonical,
      });
    }

    const parsed: ParseResult = parse(detail.kind, raw);
    files.push({
      relPath,
      kind: detail.kind,
      raw,
      ast: parsed.ast,
      diagnostics: parsed.diagnostics,
    });
  }

  return { files, unclassified, diagnostics };
}

