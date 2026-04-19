/**
 * EditOperation types for structured, lossless OC file edits.
 *
 * The workspace-edit module handles USER-initiated chunk writes through the
 * CAP settings UI. It is separate from `amend/apply.ts`, which handles
 * COMPILER-driven OC transforms and preserves the OC_PROTECTED_FILES
 * invariant for the compile pipeline.
 *
 * EDITABLE_FILES restricts the files the workspace-edit path may touch.
 * The chunk write path (CAP settings) targets TOOLS.md, SETTINGS.md, and
 * CONNECTIONS.md only. SOUL.md and MEMORY.md appear in this list for the
 * Loop sync path used by pulses 35-36 — they are editable through dedicated
 * endpoints, not through this module's chunk editor.
 *
 * @module claws-sdk/workspace-edit/types
 */

/**
 * Files the workspace-edit path is allowed to modify.
 *
 * The chunk write path (CAP settings edits) may only touch TOOLS.md,
 * SETTINGS.md, and CONNECTIONS.md. SOUL.md and MEMORY.md are listed here
 * for Loop sync endpoints (pulses 35-36), which write through their own
 * call sites — not through the StructuredEditor chunk path.
 *
 * The compiler's OC_PROTECTED_FILES invariant in `amend/apply.ts` is a
 * separate concern: that list protects against COMPILER writes, while
 * EDITABLE_FILES scopes API writes.
 */
export const EDITABLE_FILES = [
  'TOOLS.md',
  'SETTINGS.md',
  'CONNECTIONS.md',
  'SOUL.md',
  'MEMORY.md',
] as const;

export type EditableFile = (typeof EDITABLE_FILES)[number];

/**
 * Files the chunk write path (StructuredEditor) may modify.
 *
 * SOUL.md and MEMORY.md are NOT included — they flow through the Loop
 * sync endpoints in pulses 35-36, not through the structured chunk editor.
 */
export const CHUNK_EDITABLE_FILES = [
  'TOOLS.md',
  'SETTINGS.md',
  'CONNECTIONS.md',
] as const;

export type ChunkEditableFile = (typeof CHUNK_EDITABLE_FILES)[number];

/**
 * Toggle a boolean flag on an item within a section (e.g. enable/disable a tool).
 */
export interface ToggleEdit {
  readonly kind: 'toggle';
  readonly file: ChunkEditableFile;
  /** H2 section heading containing the item (e.g. "send-email"). */
  readonly section: string;
  /** Field name to toggle on the item (e.g. "enabled"). */
  readonly field: string;
  /** New boolean value. */
  readonly value: boolean;
}

/**
 * Set a scalar field value on an item within a section.
 */
export interface SetEdit {
  readonly kind: 'set';
  readonly file: ChunkEditableFile;
  readonly section: string;
  readonly field: string;
  readonly value: string;
}

/**
 * Append an item to a list within a section.
 */
export interface AppendEdit {
  readonly kind: 'append';
  readonly file: ChunkEditableFile;
  readonly section: string;
  /** Raw list item line (without the leading `- `). */
  readonly item: string;
}

/**
 * Remove an item from a list within a section.
 *
 * The match is performed against the trimmed item text after the `- ` prefix.
 */
export interface RemoveEdit {
  readonly kind: 'remove';
  readonly file: ChunkEditableFile;
  readonly section: string;
  readonly item: string;
}

/** Discriminated union of all edit operations. */
export type EditOperation = ToggleEdit | SetEdit | AppendEdit | RemoveEdit;

/** SHA-256-style hash (hex) for before/after attestation. */
export type ContentHash = string;

/**
 * Result of applying an edit operation.
 *
 * `before` and `after` are the raw file contents hashed so callers can
 * attest to byte-for-byte behaviour without needing to diff full files.
 */
export interface EditResult {
  readonly success: boolean;
  readonly file: ChunkEditableFile;
  readonly before: ContentHash;
  readonly after: ContentHash;
  readonly error?: string;
}

/** Shallow diff structure for `preview`. */
export interface Diff {
  readonly file: ChunkEditableFile;
  readonly before: string;
  readonly after: string;
  readonly changedLines: ReadonlyArray<{ readonly line: number; readonly from: string; readonly to: string }>;
}

/** Validation outcome for an edit operation. */
export interface ValidationResult {
  readonly ok: boolean;
  readonly code?: string;
  readonly message?: string;
}

/**
 * Error thrown when an edit targets a file outside `EDITABLE_FILES` or when
 * the StructuredEditor is asked to chunk-edit a file outside
 * `CHUNK_EDITABLE_FILES`.
 */
export class EditableFilesError extends Error {
  readonly code: string;

  constructor(message: string, code = 'EDITABLE_FILES_VIOLATION') {
    super(message);
    this.name = 'EditableFilesError';
    this.code = code;
  }
}

/**
 * Error thrown when the lossless writer cannot locate the target section
 * or item to apply the edit against.
 */
export class EditTargetError extends Error {
  readonly code: string;

  constructor(message: string, code = 'EDIT_TARGET_NOT_FOUND') {
    super(message);
    this.name = 'EditTargetError';
    this.code = code;
  }
}
