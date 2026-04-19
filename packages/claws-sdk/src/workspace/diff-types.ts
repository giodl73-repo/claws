/**
 * Diff types — structured result of comparing two {@link GovernanceIR}
 * snapshots, addressable by oc:// path.
 *
 * Every change surfaces as a {@link DiffEntry} tagged with a change type
 * (`added` | `modified` | `removed`), the governed entity's oc:// path,
 * the before/after values, and provenance metadata. Downstream consumers
 * (diff route, audit correlation, upgrade report) read the structured
 * entries; the {@link DiffSummary} counts are derived for quick display.
 *
 * Type ownership: this module is the single source for diff surface
 * types. The computation lives in `governance-diff.ts` — the split keeps
 * the shape stable while the algorithm evolves.
 *
 * @module claws-sdk/workspace/diff-types
 */

/** Change type for a single diff entry. */
export type DiffChangeType = 'added' | 'modified' | 'removed';

/**
 * Provenance of a change — which mechanism produced the new IR state.
 *
 * - `patch` — user-initiated PATCH through the serve layer.
 * - `recompile` — derived during compilation (e.g. risk reclassification
 *   after a capability gained OBO), not a direct edit.
 * - `external` — the file changed outside the PATCH path (editor,
 *   script). Detected when the delta cannot be attributed to a known
 *   PATCH or recompile signal.
 * - `unknown` — the IR differs but no provenance signal is available;
 *   callers should not rely on attribution for this entry.
 */
export type DiffChangeSource = 'patch' | 'recompile' | 'external' | 'unknown';

/**
 * A single structured change between two IRs.
 *
 * `path` is the oc:// URI pointing at the governed entity. `field` names
 * the specific property that changed within an item (for `modified`
 * entries). `before` / `after` hold the raw values — they may be
 * primitives, objects, or arrays depending on the field; consumers
 * must narrow by field name.
 */
export interface DiffEntry {
  /** oc:// path identifying the entity (tool, rule, intent, etc.). */
  readonly path: string;
  /** Direction of the change. */
  readonly type: DiffChangeType;
  /**
   * The field within the entity that changed. Omitted for `added` /
   * `removed` entries where the whole item appeared or disappeared.
   * Required for `modified` entries.
   */
  readonly field?: string;
  /**
   * Value prior to the change. `null` for `added` entries (no prior
   * value) and populated for `modified` / `removed` entries.
   */
  readonly before: unknown;
  /**
   * Value after the change. `null` for `removed` entries and populated
   * for `added` / `modified` entries.
   */
  readonly after: unknown;
  /**
   * Version at which the change was observed — the `to` side of the
   * diff. `null` when `to` resolved via a snapshot that has no version
   * mapping (cross-installation snapshot).
   */
  readonly changedAt: number | null;
  /** Provenance classification for the change. */
  readonly changedBy: DiffChangeSource;
}

/** Aggregate counts over {@link DiffEntry} list. */
export interface DiffSummary {
  readonly added: number;
  readonly modified: number;
  readonly removed: number;
  /** Sum of added + modified + removed. */
  readonly total: number;
}

/** Complete diff between two IR snapshots. */
export interface DiffResult {
  /** Version on the `from` side; `null` when `from` was a snapshot. */
  readonly fromVersion: number | null;
  /** Version on the `to` side; `null` when `to` was a snapshot. */
  readonly toVersion: number | null;
  /** Compile timestamp of the `from` IR, when known. */
  readonly fromCompiledAt: string | null;
  /** Compile timestamp of the `to` IR, when known. */
  readonly toCompiledAt: string | null;
  /** Structured change list, in stable oc:// path order. */
  readonly entries: readonly DiffEntry[];
  /** Aggregate counts — always consistent with `entries`. */
  readonly summary: DiffSummary;
}
