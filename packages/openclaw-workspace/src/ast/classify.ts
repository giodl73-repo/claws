/**
 * classify(path) — map a filesystem path or basename to its
 * WorkspaceFileKind, or `null` if the path doesn't belong to the OC
 * workspace registry.
 *
 * Coverage matches what upstream `loadWorkspaceBootstrapFiles`
 * (agents/workspace.ts:602-667) actually consumes plus the `openclaw.json`
 * config file, plus three forward-reserved directory prefixes
 * (workflows / roles / governance) which our package can lint even
 * though upstream doesn't enumerate them yet.
 *
 * **Anchoring**: bootstrap basenames (SOUL.md, AGENTS.md, …, BOOTSTRAP.md,
 * MEMORY.md, IDENTITY.md, USER.md, HEARTBEAT.md), `openclaw.json`, and
 * `lobster.yaml` are **root-anchored** — they only match when the path
 * has no parent directory. This avoids false positives like
 * `node_modules/foo/openclaw.json` being classified as the workspace's
 * config file. `SKILL.md` is the exception: it's legitimately nested
 * under `skills/<name>/SKILL.md` and matches at any depth.
 *
 * Behavior:
 * - Canonical match (e.g. `AGENTS.md` at root, or `skills/foo/SKILL.md`)
 *   → returns the kind.
 * - Lowercase variant (e.g. `agents.md` at root) → returns the kind.
 *   Caller emits an `OC_WS_CASING_VIOLATION` diagnostic since upstream
 *   only honors the canonical casing.
 * - Legacy basename `memory.md` at root → returns 'memory'. Caller emits
 *   an `OC_WS_LEGACY_BASENAME` deprecation diagnostic.
 * - Directory-prefix paths (skills/, workflows/, roles/, governance/)
 *   → returns the corresponding kind.
 *
 * Returns `null` for genuinely unrecognized paths; the caller emits
 * `OC_WS_UNKNOWN_FILE` so users see a warning instead of silent drop.
 *
 * @module @bic/openclaw-workspace/ast/classify
 */

import type { WorkspaceFileKind } from './grammars.generated.js';

/**
 * Root-anchored canonical basenames — match only when the path has no
 * parent directory (after `.stage/` overlay normalization, which is
 * already done upstream of `classify`).
 */
const ROOT_BASENAME_MAP: Record<string, WorkspaceFileKind> = {
  'SOUL.md': 'soul',
  'TOOLS.md': 'tools',
  'AGENTS.md': 'agents',
  'MEMORY.md': 'memory',
  'IDENTITY.md': 'entities',
  'USER.md': 'entities',
  'HEARTBEAT.md': 'tasks',
  'BOOTSTRAP.md': 'bootstrap',
  'DREAMS.md': 'dreams', // memory-core dreaming-pipeline diary (extension-pattern-memory.md:181)
  'openclaw.json': 'config',
  'lobster.yaml': 'config', // claws-internal — dropped at upstream extraction
};

/** Basenames that match at any depth (legitimately nested). */
const ANYWHERE_BASENAME_MAP: Record<string, WorkspaceFileKind> = {
  'SKILL.md': 'skills',
  // Hook definitions live under .hooks/<id>/HOOK.md (workspace tier) and
  // also under ~/.openclaw/hooks/<id>/HOOK.md (managed tier). Per
  // design/openclaw/hook-engine-legacy.md:127-147.
  'HOOK.md': 'hook',
};

/**
 * Lowercase variants of root-anchored canonical basenames. Upstream
 * rejects lowercase, but we still classify leniently and emit
 * `OC_WS_CASING_VIOLATION` so users see the typo instead of a silent
 * drop. Same root-anchored constraint as the canonical map.
 */
const ROOT_CASING_VARIANT_MAP: Record<string, WorkspaceFileKind> = {
  'soul.md': 'soul',
  'tools.md': 'tools',
  'agents.md': 'agents',
  'identity.md': 'entities',
  'user.md': 'entities',
  'heartbeat.md': 'tasks',
  'bootstrap.md': 'bootstrap',
};

/** Anywhere-matching casing variants. */
const ANYWHERE_CASING_VARIANT_MAP: Record<string, WorkspaceFileKind> = {
  'skill.md': 'skills',
  'hook.md': 'hook',
};

/**
 * Legacy basenames — root-anchored. `memory.md` is the only known
 * lowercase historical alias upstream still tolerates (#43462).
 */
const LEGACY_BASENAME_MAP: Record<string, WorkspaceFileKind> = {
  'memory.md': 'memory',
};

/** Directory prefixes that imply a kind for any contained file. */
const DIRECTORY_PREFIX_MAP: Array<{
  readonly segment: string;
  readonly kind: WorkspaceFileKind;
}> = [
  { segment: 'skills', kind: 'skills' },
  { segment: 'workflows', kind: 'workflows' },
  { segment: 'roles', kind: 'roles' },
  { segment: 'governance', kind: 'governance' },
  // Hook directories — workspace tier `.hooks/` and managed tier `hooks/`.
  // Per design/openclaw/hook-engine-legacy.md:54.
  { segment: '.hooks', kind: 'hook' },
  { segment: 'hooks', kind: 'hook' },
  // Memory-core dreaming artifacts (extension-pattern-memory.md:253).
  { segment: '.dreams', kind: 'dreams' },
];

export type ClassificationFlavor =
  | 'canonical'
  | 'casing-variant'
  | 'legacy-basename'
  | 'directory-prefix';

export interface ClassificationDetail {
  readonly kind: WorkspaceFileKind;
  readonly flavor: ClassificationFlavor;
  /** The canonical basename or directory segment that matched. */
  readonly matched: string;
}

/**
 * Like `classify` but returns the match flavor so callers can emit casing
 * / legacy-basename diagnostics. Most callers want plain `classify`.
 */
export function classifyDetail(path: string): ClassificationDetail | null {
  const normalized = path.replace(/\\/g, '/');
  const lastSlash = normalized.lastIndexOf('/');
  const base = normalized.slice(lastSlash + 1);
  const isAtRoot = lastSlash === -1;

  // Anywhere-matching basenames — checked before directory-prefix so
  // skills/foo/SKILL.md returns 'canonical' (not 'directory-prefix').
  if (base in ANYWHERE_BASENAME_MAP) {
    return {
      kind: ANYWHERE_BASENAME_MAP[base]!,
      flavor: 'canonical',
      matched: base,
    };
  }
  if (base in ANYWHERE_CASING_VARIANT_MAP) {
    return {
      kind: ANYWHERE_CASING_VARIANT_MAP[base]!,
      flavor: 'casing-variant',
      matched: base,
    };
  }

  // Root-anchored basenames — only match when the path is just the
  // basename (no parent directory). This avoids false positives like
  // node_modules/foo/openclaw.json or vendored AGENTS.md fixtures.
  if (isAtRoot) {
    if (base in ROOT_BASENAME_MAP) {
      return {
        kind: ROOT_BASENAME_MAP[base]!,
        flavor: 'canonical',
        matched: base,
      };
    }
    if (base in ROOT_CASING_VARIANT_MAP) {
      return {
        kind: ROOT_CASING_VARIANT_MAP[base]!,
        flavor: 'casing-variant',
        matched: base,
      };
    }
    if (base in LEGACY_BASENAME_MAP) {
      return {
        kind: LEGACY_BASENAME_MAP[base]!,
        flavor: 'legacy-basename',
        matched: base,
      };
    }
  }

  for (const { segment, kind } of DIRECTORY_PREFIX_MAP) {
    if (
      normalized.includes(`/${segment}/`) ||
      normalized.startsWith(`${segment}/`)
    ) {
      return { kind, flavor: 'directory-prefix', matched: segment };
    }
  }
  return null;
}

export function classify(path: string): WorkspaceFileKind | null {
  return classifyDetail(path)?.kind ?? null;
}

/**
 * Map a non-canonical (lowercase / legacy) basename to its canonical
 * UPPERCASE form. Used by discovery diagnostics to suggest a rename.
 * Returns the input unchanged if no canonical mapping exists (defensive
 * fallback; in practice every casing-variant / legacy entry has one).
 */
export function canonicalBasenameFor(matched: string): string {
  const lower = matched.toLowerCase();
  // Inverse-search the canonical maps for an UPPERCASE match.
  for (const canonical of Object.keys(ROOT_BASENAME_MAP)) {
    if (canonical.toLowerCase() === lower) return canonical;
  }
  for (const canonical of Object.keys(ANYWHERE_BASENAME_MAP)) {
    if (canonical.toLowerCase() === lower) return canonical;
  }
  // Legacy basenames have specific canonical forms that are NOT a
  // simple uppercase of the lowercase (memory.md → MEMORY.md works,
  // but if a future legacy alias differs more, handle it here).
  if (lower === 'memory.md') return 'MEMORY.md';
  return matched.toUpperCase();
}

/**
 * Suggest the closest known basename for an unrecognized path, using
 * Levenshtein distance over canonical root + anywhere basenames.
 * Returns `null` if no candidate is within edit-distance ≤3.
 *
 * Tie-break: candidates are scored in declaration order (which is
 * stable across Node releases for object-literal `Object.keys`); on a
 * distance tie, the first-declared candidate wins. We sort the
 * candidate list explicitly first so the tie-break is alphabetical
 * regardless of map declaration order.
 */
export function suggestBasename(path: string): string | null {
  const normalized = path.replace(/\\/g, '/');
  const base = normalized.slice(normalized.lastIndexOf('/') + 1);
  if (base.length === 0) return null;
  // Case-fold for distance computation so 'Agents.md' (mixed-case typo)
  // suggests 'AGENTS.md' rather than scoring distance == 5 (one swap
  // per letter) and being rejected by the threshold. We still return
  // the canonical UPPERCASE form unchanged.
  const baseFold = base.toLowerCase();
  const candidates = [
    ...Object.keys(ROOT_BASENAME_MAP),
    ...Object.keys(ANYWHERE_BASENAME_MAP),
  ].sort(); // alphabetical tie-break
  let best: { name: string; distance: number } | null = null;
  for (const cand of candidates) {
    const d = levenshtein(baseFold, cand.toLowerCase());
    if (best === null || d < best.distance) best = { name: cand, distance: d };
  }
  if (best === null) return null;
  if (best.distance > 3) return null;
  return best.name;
}

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  let prev = new Array<number>(b.length + 1);
  let curr = new Array<number>(b.length + 1);
  for (let j = 0; j <= b.length; j++) prev[j] = j;
  for (let i = 1; i <= a.length; i++) {
    curr[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(
        curr[j - 1]! + 1,
        prev[j]! + 1,
        prev[j - 1]! + cost,
      );
    }
    [prev, curr] = [curr, prev];
  }
  return prev[b.length]!;
}
