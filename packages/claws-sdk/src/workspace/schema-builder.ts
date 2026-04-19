/**
 * buildWorkspaceSchema — project a parsed WorkspaceState + runtime context
 * into the introspection response served at `GET /api/oc/`.
 *
 * Pure function: no I/O, no ambient state. Every input is explicit so the
 * builder can be unit-tested without a compilation host or serve layer.
 * The HTTP route is a thin adapter (SDK-owns-logic rule).
 *
 * Mapping strategy (S02):
 * - File → primary chunk tab is defined by `FILE_PRIMARY_CHUNK`.
 * - Each parsed H2 section either carries its own chunk mapping via
 *   `SECTION_CHUNK_OVERRIDES` (e.g. IDENTITY.md §RBAC → preferences/prefs)
 *   or inherits the file's primary chunk tab with a heading-derived section.
 * - CP-5 M01: IDENTITY.md holds three CAP subsections whose data used to
 *   live in standalone files. Those subsections route to their downstream
 *   chunk via the override map: §Knowledge Sources → memory/knowledge,
 *   §Entitlements → entitlements/grants (read-only), §Deny Rules →
 *   governance-only (no chunk, not editable).
 *
 * Missing file (S16): returns `exists: false` with `sections: []` — never
 * a 404. Partners use this to skip the associated TUI screen.
 *
 * The schema surfaces the 7 markdown files (`OC_PARSED_FILES`). The
 * compiler-plane-only entries `skills/` and `lobster.yaml` are part of
 * `OC_WORKSPACE_FILES` but are not markdown documents with H2 sections,
 * so they are not included in the schema response.
 *
 * @module claws-sdk/workspace/schema-builder
 */

import type {
  ChunkTab,
  OcParsedFile,
  SectionBase,
  WorkspaceState,
} from '@bic/openclaw-workspace/path';
import { OC_PARSED_FILES } from '@bic/openclaw-workspace/path';
import type {
  CompilationStatus,
  FileSchema,
  SectionSchema,
  ViolationState,
  WorkspaceSchema,
  WorkspaceSessionInfo,
} from './schema-types.js';

/** Primary chunk tab for each OC file surfaced in the schema. */
const FILE_PRIMARY_CHUNK: Record<OcParsedFile, ChunkTab | null> = {
  'SOUL.md': 'preferences',
  'MEMORY.md': 'memory',
  'IDENTITY.md': 'general',
  'TOOLS.md': 'connections',
  'AGENTS.md': 'general',
  'USER.md': 'general',
  'HEARTBEAT.md': 'schedule',
};

/**
 * Section-level chunk overrides keyed by `{file, heading}`. When a section
 * heading matches an override, it binds that section to a specific chunk
 * endpoint instead of the file's primary chunk.
 *
 * IDENTITY.md now carries CAP subsections that used to be standalone files:
 *   - Knowledge Sources → memory/knowledge (editable)
 *   - Entitlements → entitlements/grants (read-only)
 *   - Deny Rules → no chunk, not editable (governance-only, like the old
 *                  DENY.md file primary)
 */
const SECTION_CHUNK_OVERRIDES: ReadonlyMap<string, SectionOverride> = new Map([
  [overrideKey('IDENTITY.md', 'Organization'), { kind: 'chunk', tab: 'general', section: 'identity', editable: true }],
  [overrideKey('IDENTITY.md', 'RBAC'), { kind: 'chunk', tab: 'preferences', section: 'prefs', editable: true }],
  [overrideKey('IDENTITY.md', 'M365'), { kind: 'chunk', tab: 'groups', section: 'membership', editable: true }],
  [overrideKey('IDENTITY.md', 'Security'), { kind: 'chunk', tab: 'groups', section: 'membership', editable: true }],
  [overrideKey('IDENTITY.md', 'On-Premise'), { kind: 'chunk', tab: 'groups', section: 'membership', editable: true }],
  [overrideKey('IDENTITY.md', 'Knowledge Sources'), { kind: 'chunk', tab: 'memory', section: 'knowledge', editable: true }],
  [overrideKey('IDENTITY.md', 'Entitlements'), { kind: 'chunk', tab: 'entitlements', section: 'grants', editable: false }],
  [overrideKey('IDENTITY.md', 'Deny Rules'), { kind: 'no-chunk', editable: false }],
]);

type SectionOverride =
  | { readonly kind: 'chunk'; readonly tab: ChunkTab; readonly section: string; readonly editable: boolean }
  | { readonly kind: 'no-chunk'; readonly editable: boolean };

function overrideKey(file: OcParsedFile, heading: string): string {
  return `${file}::${heading}`;
}

/** Options controlling the schema build — all optional and side-effect free. */
export interface BuildWorkspaceSchemaOptions {
  /** Live sessions from the OC runtime. Defaults to an empty list. */
  readonly sessions?: readonly WorkspaceSessionInfo[];
  /** Compilation status. Defaults to `uncompiled`. */
  readonly compilation?: CompilationStatus;
  /** Violation state. Defaults to `{ kind: 'clean', pendingViolations: [] }`. */
  readonly violationState?: ViolationState;
}

const DEFAULT_COMPILATION: CompilationStatus = {
  kind: 'uncompiled',
  compiledAt: null,
  hash: null,
};

const DEFAULT_VIOLATION_STATE: ViolationState = {
  kind: 'clean',
  pendingViolations: [],
};

/**
 * Project a `WorkspaceState` (plus runtime context) into a `WorkspaceSchema`.
 *
 * Every markdown OC file produces a `FileSchema` entry — the order matches
 * `OC_PARSED_FILES`. Missing files are represented with `exists: false` and
 * `sections: []` (never omitted). The response is deterministic for a given
 * input.
 */
export function buildWorkspaceSchema(
  workspace: WorkspaceState,
  options: BuildWorkspaceSchemaOptions = {},
): WorkspaceSchema {
  const sessions = options.sessions ?? [];
  const compilation = options.compilation ?? DEFAULT_COMPILATION;
  const violationState = options.violationState ?? DEFAULT_VIOLATION_STATE;
  const violationSet = new Set<string>(violationState.pendingViolations);

  const files: FileSchema[] = OC_PARSED_FILES.map((name) =>
    buildFileSchema(name, pickSection(workspace, name), violationSet.has(name)),
  );

  return {
    workspaceRoot: workspace.workspaceRoot,
    schemaVersion: 1,
    files,
    sessions,
    compilation,
    violationState,
  };
}

/**
 * Extract the `SectionBase | null` slice for a given file name from
 * `WorkspaceState`. Centralized here so the builder doesn't thread the
 * 7 field names through every call site.
 */
function pickSection(workspace: WorkspaceState, name: OcParsedFile): SectionBase | null {
  switch (name) {
    case 'SOUL.md':
      return workspace.soul;
    case 'MEMORY.md':
      return workspace.memory;
    case 'IDENTITY.md':
      return workspace.identity;
    case 'TOOLS.md':
      return workspace.tools;
    case 'AGENTS.md':
      return workspace.agents;
    case 'USER.md':
      return workspace.user;
    case 'HEARTBEAT.md':
      return workspace.heartbeat;
  }
}

function buildFileSchema(
  name: OcParsedFile,
  section: SectionBase | null,
  hasViolation: boolean,
): FileSchema {
  if (section === null) {
    return { name, exists: false, sections: [], hasViolation };
  }
  const primaryTab = FILE_PRIMARY_CHUNK[name];
  const sections: SectionSchema[] = section.sections.map((parsed) =>
    buildSectionSchema(name, parsed.heading, primaryTab),
  );
  return { name, exists: true, sections, hasViolation };
}

function buildSectionSchema(
  file: OcParsedFile,
  heading: string,
  primaryTab: ChunkTab | null,
): SectionSchema {
  const override = SECTION_CHUNK_OVERRIDES.get(overrideKey(file, heading));
  if (override !== undefined) {
    if (override.kind === 'no-chunk') {
      return { heading, editable: override.editable };
    }
    return {
      heading,
      chunk: { tab: override.tab, section: override.section },
      editable: override.editable,
    };
  }
  if (primaryTab === null) {
    return { heading, editable: false };
  }
  return {
    heading,
    chunk: { tab: primaryTab, section: slugifyHeading(heading) },
    editable: true,
  };
}

/**
 * Section slug — lowercase, hyphenated, ASCII-only. Used as the `section`
 * component of a chunk endpoint when the file's primary chunk is used.
 *
 * Empty or symbol-only headings fall back to `'_'` so the chunk URL stays
 * well-formed. The assembler's own section names (e.g. `'identity'`,
 * `'prefs'`) come from `SECTION_CHUNK_OVERRIDES` and are not routed here.
 */
function slugifyHeading(heading: string): string {
  const trimmed = heading.trim().toLowerCase();
  const slug = trimmed
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug.length > 0 ? slug : '_';
}
