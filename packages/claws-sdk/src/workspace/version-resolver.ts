/**
 * Resolve a `?at=` parameter into a historical {@link GovernanceIR}.
 *
 * Three addressing modes are supported:
 *
 * 1. **Version** — `v38` (or a bare integer `38`). Looked up in the
 *    in-memory {@link VersionStore} that rides on top of the compilation
 *    forest cache.
 * 2. **Named snapshot** — `snap:pre-upgrade`. Read from
 *    `.claws/snapshots/{name}/files/.claws/compiled/governance-ir.json`
 *    — the same location {@link import('../snapshot/save.js').save}
 *    writes to.
 * 3. **Time** — an ISO 8601 date or datetime, e.g. `2026-04-14` or
 *    `2026-04-14T12:00:00Z`. Resolves to the newest version whose
 *    compile timestamp is ≤ the requested instant.
 *
 * This module is the single entry point for historical lookups;
 * `claws-serve` middleware is a thin adapter that passes the raw string
 * plus a resolver bound to the live {@link VersionStore} / workspace
 * root and renders the structured result.
 *
 * @module claws-sdk/workspace/version-resolver
 */

import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { GovernanceIR } from '../ir/governance-ir.js';
import type { AutoSnapshotManager } from './auto-snapshot.js';
import {
  VersionStore,
  type AvailableRange,
  type VersionSnapshot,
} from './version-store.js';

/** Supported addressing modes for `?at=`. */
export type AtMode = 'version' | 'time' | 'snapshot' | 'auto';

/** Parsed `?at=` parameter prior to resolution against any backing store. */
export type ParsedAt =
  | { readonly mode: 'version'; readonly version: number; readonly raw: string }
  | { readonly mode: 'time'; readonly timestamp: string; readonly raw: string }
  | { readonly mode: 'snapshot'; readonly name: string; readonly raw: string }
  | { readonly mode: 'auto'; readonly timestamp: string; readonly raw: string };

/**
 * Structured failure returned by {@link parseAt} for a malformed value.
 * Callers map this to an HTTP 400.
 *
 * Two codes are emitted:
 * - `AT_MALFORMED` — structural: the value is missing, empty, or blank.
 *   Safe to echo back what the client sent (nothing sensitive to redact).
 * - `INVALID_AT_PARAM` — allow-list denial: the value exists but fails
 *   the hardened snapshot/version/time grammar (path separators, null
 *   bytes, Unicode, `snap:.`, `v<too many digits>`, unknown modes). The
 *   raw input is NEVER echoed in this branch — the error message is a
 *   stable non-specific string so an attacker cannot use the echo to
 *   confirm which control character reached the parser, and operator
 *   logs are the sole source of forensic detail. This is the K1
 *   hardening from CP-6 R2 review: `parseAt` now sits in the live
 *   read/write path (time-travel middleware is mounted on `/api`),
 *   so its rejection surface must not leak byte-level probe feedback.
 */
export interface AtParseError {
  readonly code: 'AT_MALFORMED' | 'INVALID_AT_PARAM';
  readonly message: string;
  readonly raw: string;
}

/**
 * Allow-list regex for snapshot names. Matches CP-6 R2 K1: ASCII
 * alphanumerics, underscore, and dash; 1-64 chars. No dots (rejects
 * `snap:.` and `snap:..`), no slashes, no null bytes, no Unicode.
 */
export const SNAPSHOT_NAME_ALLOW_LIST = /^[a-zA-Z0-9_-]{1,64}$/;

/**
 * Allow-list regex for version identifiers. Matches CP-6 R2 K1:
 * optional leading `v`, followed by 1-10 decimal digits. The 10-digit
 * cap blocks parseInt overflow probes (a 20-digit number that round-
 * trips to an unrelated integer) without constraining realistic
 * workspace version counters.
 */
export const VERSION_IDENTIFIER_ALLOW_LIST = /^v?(\d{1,10})$/;

/** Stable, non-specific message for allow-list denials (no raw echo). */
const INVALID_AT_PARAM_MESSAGE = 'invalid snapshot or version identifier';

/** Outcome of {@link parseAt}. */
export type AtParseResult =
  | { readonly ok: true; readonly parsed: ParsedAt }
  | { readonly ok: false; readonly error: AtParseError };

/**
 * Build the non-echoing INVALID_AT_PARAM rejection. Used for every
 * allow-list denial so the response never carries byte-level probe
 * feedback (no path echo, no class-of-reject detail, no raw input).
 */
function invalidAtParam(): AtParseResult {
  return {
    ok: false,
    error: { code: 'INVALID_AT_PARAM', message: INVALID_AT_PARAM_MESSAGE, raw: '' },
  };
}

/**
 * Parse an `?at=` string into a {@link ParsedAt}. Accepts:
 * - `v<digits>` or a bare non-negative integer (version mode); digits
 *   capped at 10 to block overflow probes.
 * - `snap:<name>` (snapshot mode, name must match
 *   {@link SNAPSHOT_NAME_ALLOW_LIST} — ASCII alphanumerics, `_`, `-`;
 *   1-64 chars).
 * - ISO 8601 date / datetime (time mode). Unicode, control chars, and
 *   null bytes are rejected before dispatch.
 *
 * Returns an `AT_MALFORMED` structural error for missing or blank
 * values (safe to echo), and `INVALID_AT_PARAM` for every allow-list
 * denial (no raw echo — the message is a stable "invalid snapshot or
 * version identifier" string so an attacker cannot use the response to
 * distinguish which byte was rejected).
 *
 * CP-6 R2 K1: `parseAt` is now in the live read/write path via the
 * time-travel middleware. The previous substring guard
 * (`includes('/') || includes('\\') || includes('..')`) accepted
 * `snap:.`, null bytes, and RTL markers; the allow-list closes that
 * attack surface at the parser.
 */
export function parseAt(raw: string | undefined | null): AtParseResult {
  if (raw === undefined || raw === null || raw === '') {
    return {
      ok: false,
      error: { code: 'AT_MALFORMED', message: '?at= requires a value', raw: String(raw ?? '') },
    };
  }
  const trimmed = raw.trim();
  if (trimmed.length === 0) {
    return {
      ok: false,
      error: { code: 'AT_MALFORMED', message: '?at= requires a non-blank value', raw },
    };
  }

  // Reject ANY control character (including null byte U+0000) or
  // non-ASCII Unicode before mode dispatch. This closes the W-4 gap at
  // the earliest point — every downstream branch can assume printable
  // ASCII input without re-checking.
  if (!/^[\x20-\x7E]+$/.test(trimmed)) {
    return invalidAtParam();
  }

  // Snapshot mode: snap:<name>
  if (trimmed.startsWith('snap:')) {
    const name = trimmed.slice('snap:'.length);
    if (!SNAPSHOT_NAME_ALLOW_LIST.test(name)) {
      return invalidAtParam();
    }
    return { ok: true, parsed: { mode: 'snapshot', name, raw } };
  }

  // Auto-snapshot mode: auto:<ISO timestamp>. Resolves via the
  // AutoSnapshotManager to the nearest auto-snapshot at-or-before the
  // requested instant. The timestamp grammar mirrors time-mode — any
  // Date.parse-recognised value after the printable-ASCII gate.
  if (trimmed.startsWith('auto:')) {
    const value = trimmed.slice('auto:'.length);
    if (value.length === 0) {
      return invalidAtParam();
    }
    const parsedTs = Date.parse(value);
    if (Number.isNaN(parsedTs)) {
      return invalidAtParam();
    }
    return {
      ok: true,
      parsed: { mode: 'auto', timestamp: new Date(parsedTs).toISOString(), raw },
    };
  }

  // Version mode: v<digits> or bare digits (max 10 digits).
  const versionMatch = VERSION_IDENTIFIER_ALLOW_LIST.exec(trimmed);
  if (versionMatch !== null) {
    const version = parseInt(versionMatch[1]!, 10);
    if (!Number.isFinite(version) || version < 0) {
      // Regex ensures 1-10 ASCII digits, so parseInt is always finite
      // and non-negative. Defensive branch retained in case the regex
      // is loosened in a future refactor; treated as a programmer
      // error (allow-list denial) rather than a structural malformed.
      return invalidAtParam();
    }
    return { ok: true, parsed: { mode: 'version', version, raw } };
  }

  // Time mode: any Date.parse-recognised value (ISO 8601 preferred).
  const parsed = Date.parse(trimmed);
  if (!Number.isNaN(parsed)) {
    return {
      ok: true,
      parsed: { mode: 'time', timestamp: new Date(parsed).toISOString(), raw },
    };
  }

  return invalidAtParam();
}

/** Structured error returned when a resolution fails. */
export type ResolveError =
  | { readonly code: 'VERSION_EVICTED'; readonly version: number; readonly message: string }
  | {
      readonly code: 'VERSION_OUT_OF_RANGE';
      readonly version: number;
      readonly available: AvailableRange;
      readonly message: string;
    }
  | {
      readonly code: 'TIME_OUT_OF_RANGE';
      readonly timestamp: string;
      readonly available: AvailableRange;
      readonly message: string;
    }
  | { readonly code: 'SNAPSHOT_NOT_FOUND'; readonly name: string; readonly message: string }
  | { readonly code: 'SNAPSHOT_IR_MISSING'; readonly name: string; readonly message: string }
  | {
      readonly code: 'AUTO_SNAPSHOT_NOT_CONFIGURED';
      readonly message: string;
    }
  | {
      readonly code: 'AUTO_SNAPSHOT_OUT_OF_RANGE';
      readonly timestamp: string;
      readonly message: string;
    }
  | {
      readonly code: 'AUTO_SNAPSHOT_IR_MISSING';
      readonly version: number;
      readonly timestamp: string;
      readonly message: string;
    };

/** Successful resolution — carries the IR plus resolution metadata. */
export interface ResolvedAt {
  readonly mode: AtMode;
  /** The GovernanceIR at that point in workspace history. */
  readonly governanceIR: GovernanceIR;
  /**
   * Resolved version number. Null for snapshot-mode resolutions that
   * cannot be mapped back onto a version counter (e.g. a snapshot
   * captured on a different installation).
   */
  readonly version: number | null;
  /** ISO 8601 timestamp of the compile that produced the IR, when known. */
  readonly compiledAt: string | null;
  /** The original `?at=` value, for logging and response echoing. */
  readonly raw: string;
}

/** Outcome of {@link resolveAt}. */
export type ResolveResult =
  | { readonly ok: true; readonly resolved: ResolvedAt }
  | { readonly ok: false; readonly error: ResolveError };

/** Dependencies for {@link resolveAt} — keeps the function pure-ish for tests. */
export interface ResolverContext {
  /** Live version-store that rides the compilation forest cache. */
  readonly store: VersionStore;
  /** Absolute workspace root for snapshot filesystem lookups. */
  readonly workspaceRoot: string;
  /**
   * Override the snapshot reader (tests inject in-memory fixtures). When
   * omitted, {@link resolveAt} reads from the on-disk snapshot directory.
   */
  readonly readSnapshotIR?: SnapshotIRReader;
  /**
   * Live auto-snapshot manager that rides the same compilation forest
   * cache. Optional so callers that do not enable the file-watcher
   * auto-snapshot pipeline can omit it — `?at=auto:...` requests then
   * fail with {@link ResolveError} code `AUTO_SNAPSHOT_NOT_CONFIGURED`.
   */
  readonly autoSnapshots?: AutoSnapshotManager;
}

/** Reads a snapshot's captured GovernanceIR; null when missing or unreadable. */
export type SnapshotIRReader = (
  workspaceRoot: string,
  name: string,
) => Promise<GovernanceIR | null>;

/** Relative path inside a snapshot where the compiled IR is written. */
const SNAPSHOT_IR_RELATIVE_PATH = '.claws/compiled/governance-ir.json';

/** Default snapshot reader — reads from `.claws/snapshots/{name}/files/...`. */
export const defaultSnapshotIRReader: SnapshotIRReader = async (
  workspaceRoot,
  name,
) => {
  const path = join(
    workspaceRoot,
    '.claws',
    'snapshots',
    name,
    'files',
    SNAPSHOT_IR_RELATIVE_PATH,
  );
  try {
    const raw = await readFile(path, 'utf-8');
    return JSON.parse(raw) as GovernanceIR;
  } catch {
    return null;
  }
};

/**
 * Resolve a parsed `?at=` value against the context's backing stores.
 *
 * Version-mode: delegates to {@link VersionStore.get}. Evicted versions
 * surface a {@link ResolveError} with `VERSION_EVICTED`; versions
 * outside the retained window surface `VERSION_OUT_OF_RANGE` with the
 * current available range.
 *
 * Time-mode: delegates to {@link VersionStore.findNearestByTimestamp};
 * nothing ≤ the requested time surfaces `TIME_OUT_OF_RANGE`.
 *
 * Snapshot-mode: reads via {@link ResolverContext.readSnapshotIR} (or
 * the default on-disk reader). Missing or unreadable snapshots surface
 * a `SNAPSHOT_NOT_FOUND` error.
 */
export async function resolveAt(
  parsed: ParsedAt,
  ctx: ResolverContext,
): Promise<ResolveResult> {
  if (parsed.mode === 'version') {
    const lookup = ctx.store.get(parsed.version);
    if (lookup.kind === 'found') {
      return {
        ok: true,
        resolved: {
          mode: 'version',
          governanceIR: lookup.snapshot.governanceIR,
          version: lookup.snapshot.version,
          compiledAt: lookup.snapshot.compiledAt,
          raw: parsed.raw,
        },
      };
    }
    if (lookup.kind === 'evicted') {
      return {
        ok: false,
        error: {
          code: 'VERSION_EVICTED',
          version: parsed.version,
          message: `version ${String(parsed.version)} has been evicted from the compilation forest cache`,
        },
      };
    }
    return {
      ok: false,
      error: {
        code: 'VERSION_OUT_OF_RANGE',
        version: parsed.version,
        available: lookup.available,
        message: describeOutOfRange(parsed.version, lookup.available),
      },
    };
  }

  if (parsed.mode === 'time') {
    const snapshot = ctx.store.findNearestByTimestamp(parsed.timestamp);
    if (snapshot === null) {
      return {
        ok: false,
        error: {
          code: 'TIME_OUT_OF_RANGE',
          timestamp: parsed.timestamp,
          available: ctx.store.available(),
          message: `no cached version is at or before ${parsed.timestamp}`,
        },
      };
    }
    return {
      ok: true,
      resolved: {
        mode: 'time',
        governanceIR: snapshot.governanceIR,
        version: snapshot.version,
        compiledAt: snapshot.compiledAt,
        raw: parsed.raw,
      },
    };
  }

  if (parsed.mode === 'auto') {
    if (ctx.autoSnapshots === undefined) {
      return {
        ok: false,
        error: {
          code: 'AUTO_SNAPSHOT_NOT_CONFIGURED',
          message: 'auto-snapshots are not enabled on this server',
        },
      };
    }
    const auto = ctx.autoSnapshots.findNearestByTimestamp(parsed.timestamp);
    if (auto === null) {
      return {
        ok: false,
        error: {
          code: 'AUTO_SNAPSHOT_OUT_OF_RANGE',
          timestamp: parsed.timestamp,
          message: `no auto-snapshot is at or before ${parsed.timestamp}`,
        },
      };
    }
    // An auto-snapshot names a version in the VersionStore by design
    // (captured from the same counter). Evicted/missing store entries
    // surface as AUTO_SNAPSHOT_IR_MISSING so the caller can distinguish
    // "never took an auto-snapshot" from "took one but the IR aged out".
    const lookup = ctx.store.get(auto.version);
    if (lookup.kind !== 'found') {
      return {
        ok: false,
        error: {
          code: 'AUTO_SNAPSHOT_IR_MISSING',
          version: auto.version,
          timestamp: auto.timestamp,
          message: `auto-snapshot at ${auto.timestamp} references version ${String(auto.version)} which is no longer cached`,
        },
      };
    }
    return {
      ok: true,
      resolved: {
        mode: 'auto',
        governanceIR: lookup.snapshot.governanceIR,
        version: auto.version,
        compiledAt: auto.timestamp,
        raw: parsed.raw,
      },
    };
  }

  const reader = ctx.readSnapshotIR ?? defaultSnapshotIRReader;
  const ir = await reader(ctx.workspaceRoot, parsed.name);
  if (ir === null) {
    return {
      ok: false,
      error: {
        code: 'SNAPSHOT_NOT_FOUND',
        name: parsed.name,
        message: `snapshot not found or missing compiled IR: ${parsed.name}`,
      },
    };
  }
  return {
    ok: true,
    resolved: {
      mode: 'snapshot',
      governanceIR: ir,
      version: null,
      compiledAt: null,
      raw: parsed.raw,
    },
  };
}

/** Pick a version snapshot from an {@link AvailableRange} into a helpful message. */
function describeOutOfRange(version: number, range: AvailableRange): string {
  if (range.count === 0 || range.min === null || range.max === null) {
    return `version ${String(version)} is not available (no versions retained)`;
  }
  return `version ${String(version)} is not available (retained range: ${String(range.min)}..${String(range.max)})`;
}
