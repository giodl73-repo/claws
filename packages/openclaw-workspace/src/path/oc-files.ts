/**
 * OC workspace file registry — the single authoritative list of files that
 * make up an OC workspace on disk for the **compile plane**.
 *
 * Invariants (enforced by `oc-files.unit.test.ts`):
 * - Exactly 9 entries.
 * - No duplicates.
 *
 * Note: the workspace **classifier** (`src/ast/classify.ts`) recognizes a
 * superset of these — including `BOOTSTRAP.md`, `SKILL.md` (per-skill
 * metadata), and `openclaw.json` — for editor / lint purposes. Those
 * additions do not yet have compile-plane readers, so they are not in
 * this registry. Adding a new entry HERE requires adding (1) a reader
 * module under `compiler/readers/` wired into `workspace-reader.ts`, and
 * (2) the corresponding field on `WorkspaceState` in `./types.ts`.
 *
 * @module @bic/openclaw-workspace/path/oc-files
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
