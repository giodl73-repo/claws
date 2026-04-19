/**
 * Workspace schema types — the discovery/introspection response shape for
 * `GET /api/oc/` (Layer 1 root).
 *
 * Partners consume `WorkspaceSchema` to learn which OC files exist, what
 * sections each file declares, where to fetch the corresponding chunk,
 * which sessions are live, and the current compilation status.
 *
 * Pure types — no runtime code. Excluded from coverage via vitest config.
 *
 * @module claws-sdk/workspace/schema-types
 */

import type { ChunkTab, OcParsedFile } from '@bic/openclaw-workspace/path';

/** Compilation status reported alongside the workspace schema. */
export type CompilationStatusKind = 'clean' | 'stale' | 'error' | 'uncompiled';

/**
 * Whole-system violation state — CL-10 §DEGRADED "last-good IR" model.
 *
 * `kind: 'clean'` is the healthy default. `kind: 'degraded'` indicates
 * that compilation succeeded but yielded violations; `pendingViolations`
 * lists the OC file basenames that triggered them. `kind: 'error'` means
 * compilation itself failed (e.g. SOUL.md is unparseable) and the
 * last-good IR continues to serve.
 */
export interface ViolationState {
  readonly kind: 'clean' | 'degraded' | 'error';
  readonly pendingViolations: readonly OcParsedFile[];
}

/** Compilation status block surfaced to the TUI / partners. */
export interface CompilationStatus {
  readonly kind: CompilationStatusKind;
  /** ISO-8601 timestamp of the last successful compile, or null when uncompiled. */
  readonly compiledAt: string | null;
  /** Content hash of the cached IR, or null when uncompiled. */
  readonly hash: string | null;
}

/** Parsed section entry on a `FileSchema`. */
export interface SectionSchema {
  /** H2 heading text. */
  readonly heading: string;
  /**
   * Chunk endpoint this section maps to, if any. Shape:
   * `{ tab: 'preferences', section: 'prefs' }`. Absent when the section is
   * not backed by a chunk (e.g. IDENTITY.md §Deny Rules is governance-only).
   */
  readonly chunk?: {
    readonly tab: ChunkTab;
    readonly section: string;
  };
  /**
   * Whether this section is writable through the chunk PATCH API. `false`
   * for introspection-only / read-only sections (e.g. IDENTITY.md
   * §Entitlements, §Deny Rules).
   */
  readonly editable: boolean;
}

/** Per-file schema entry — one per surfaced OC workspace file. */
export interface FileSchema {
  /** OC file name (e.g. `SOUL.md`). */
  readonly name: OcParsedFile;
  /** Whether the file exists on disk. */
  readonly exists: boolean;
  /**
   * Parsed H2 sections. Empty when the file is missing OR the file has
   * no H2 headings (preamble-only files).
   */
  readonly sections: readonly SectionSchema[];
  /** `true` when this file is listed in the current `pendingViolations`. */
  readonly hasViolation: boolean;
}

/**
 * Minimal live-session descriptor emitted on the workspace schema.
 *
 * Populated from the OC runtime (injected per-request). When the runtime
 * supplies no sessions, the schema carries an empty list — never omitted.
 */
export interface WorkspaceSessionInfo {
  readonly id: string;
  /** Optional human-readable session label (e.g. `cron:daily`). */
  readonly label?: string;
  /** Optional ISO-8601 timestamp when the session started. */
  readonly startedAt?: string;
}

/**
 * Workspace schema — the root introspection response served at `GET /api/oc/`.
 *
 * Partners and the TUI call this endpoint first to decide which screens to
 * render: if `heartbeat.exists === false`, skip the Schedule screen; if no
 * IDENTITY.md §Entitlements subsection, skip the Entitlements screen, etc.
 * This is the discovery surface for every downstream Layer 1 / Layer 2 call.
 */
export interface WorkspaceSchema {
  /** Absolute workspace root that was introspected. */
  readonly workspaceRoot: string;
  /** Schema contract version — bump on breaking changes. */
  readonly schemaVersion: 1;
  /** The surfaced OC files in canonical order with their per-file schema. */
  readonly files: readonly FileSchema[];
  /** Live sessions known to the OC runtime at call time. */
  readonly sessions: readonly WorkspaceSessionInfo[];
  /** Current compilation status. */
  readonly compilation: CompilationStatus;
  /** Whole-system violation state (CL-10 degraded/error model). */
  readonly violationState: ViolationState;
}
