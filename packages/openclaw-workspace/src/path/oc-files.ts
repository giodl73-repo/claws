/**
 * OC workspace file registry — the single authoritative list of files that
 * make up an OC workspace on disk.
 *
 * Invariants (enforced by `oc-files.unit.test.ts`):
 * - Exactly 9 entries.
 * - No duplicates.
 *
 * @module @bic/openclaw-workspace/path/oc-files
 */

/**
 * The single authoritative OC workspace file list. Adding a new file
 * requires adding (1) a reader module under `compiler/readers/` wired
 * into `workspace-reader.ts`, and (2) the corresponding field on
 * `WorkspaceState` in `./types.ts`.
 */
export const OC_WORKSPACE_FILES = [
  'SOUL.md',
  'TOOLS.md',
  'AGENTS.md',
  'MEMORY.md',
  'IDENTITY.md',
  'USER.md',
  'HEARTBEAT.md',
  'skills/',
  'lobster.yaml',
] as const;

export type OcWorkspaceFile = (typeof OC_WORKSPACE_FILES)[number];
