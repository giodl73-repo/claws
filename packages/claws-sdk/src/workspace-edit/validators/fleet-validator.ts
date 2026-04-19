/**
 * Fleet validator — fail-closed gate for fleet-locked fields (P-272).
 *
 * If the fleet policy file is missing, unreadable, or JSON-corrupt, every
 * edit is denied with `FLEET_LOCKED`. No silent fallback to permissive.
 * This mirrors the claws "drift is the enemy" stance: absent policy is a
 * policy to deny, not a policy to allow.
 *
 * When the policy loads cleanly, the validator checks whether the target
 * tool has an explicit fleet override that locks the field. The matching
 * rules follow the chunk-assembler's `FleetPolicy.overrides` convention.
 *
 * @module claws-sdk/workspace-edit/validators/fleet-validator
 */

import { readFile, access, stat } from 'node:fs/promises';

import type { FleetOverride } from '../../emit/host-approval-policy-types.js';
import type { FleetLockedError } from '../errors.js';
import { buildPatchError } from '../error-messages.js';
import type { EditOperation } from '../types.js';
import type { Validator, ValidatorResult } from './validator.js';

/**
 * Lightweight fleet policy bundle. Matches `chunk-assembler.FleetPolicy`.
 * Kept minimal so fleet-validator has no reverse dependency on `workspace/`.
 */
export interface LoadedFleetPolicy {
  readonly overrides: readonly FleetOverride[];
}

/** Result of a fleet policy load attempt. */
export type FleetPolicyLoadResult =
  | { readonly state: 'ok'; readonly policy: LoadedFleetPolicy }
  | { readonly state: 'missing' }
  | { readonly state: 'corrupt'; readonly cause: string };

/**
 * Default loader — reads JSON from `absolutePath`, returns `{ overrides }`.
 * Missing file → `missing`; parse/shape error → `corrupt`.
 *
 * The loader treats any I/O error other than ENOENT as `corrupt`; absent
 * permission equals broken policy equals fail-closed.
 */
export async function loadFleetPolicy(absolutePath: string): Promise<FleetPolicyLoadResult> {
  try {
    await access(absolutePath);
  } catch {
    return { state: 'missing' };
  }
  let raw: string;
  try {
    raw = await readFile(absolutePath, 'utf-8');
  } catch (err) {
    /* c8 ignore next -- readFile always rejects with an Error; the String(err) arm is a defensive fallback. */
    return { state: 'corrupt', cause: err instanceof Error ? err.message : String(err) };
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    /* c8 ignore next -- JSON.parse always throws SyntaxError; the String(err) arm is a defensive fallback. */
    return { state: 'corrupt', cause: err instanceof Error ? err.message : String(err) };
  }
  if (parsed === null || typeof parsed !== 'object') {
    return { state: 'corrupt', cause: 'fleet policy must be a JSON object' };
  }
  const overrides = (parsed as { overrides?: unknown }).overrides;
  if (!Array.isArray(overrides)) {
    return { state: 'corrupt', cause: 'fleet policy is missing `overrides` array' };
  }
  return { state: 'ok', policy: { overrides: overrides as readonly FleetOverride[] } };
}

/** Source controlling when/how the fleet policy is re-read. */
export type FleetPolicyLoader = () => Promise<FleetPolicyLoadResult>;

/** mtime probe — returns the policy file's last-modified time in ms. */
export type FleetPolicyStat = () => Promise<{ readonly mtimeMs: number }>;

/**
 * Statistics surface for the cached loader — useful for tests and
 * for operational visibility (how many hits vs reads per batch).
 */
export interface CachedFleetPolicyLoader {
  readonly load: FleetPolicyLoader;
  readonly stats: {
    /** Count of loader invocations (cache hits + misses). */
    readonly invocations: () => number;
    /** Count of full `readFile` passes through the underlying loader. */
    readonly reads: () => number;
  };
}

export interface CachedFleetPolicyLoaderOptions {
  /** Underlying loader — defaults to `() => loadFleetPolicy(policyFile)`. */
  readonly baseLoader?: FleetPolicyLoader;
  /** mtime probe — defaults to `fs.stat(policyFile).mtimeMs`. */
  readonly statProbe?: FleetPolicyStat;
  /** Absolute path of the policy file (used by default loaders). */
  readonly policyFile: string;
}

/**
 * Build a loader that reads the fleet policy once and re-reads only when
 * the policy file's mtime advances. This caps a 20-op batch at a single
 * full read (plus 20 cheap `stat` probes).
 *
 * Fail-closed semantics are preserved at both the initial load *and* at
 * cache refresh time:
 *   - stat failure → re-load (so the underlying loader can return missing)
 *   - stat says same mtime → cache hit (even if the cached entry is a
 *     `missing`/`corrupt` state — a known-bad state stays bad until the
 *     policy changes)
 *   - loader error after stat advanced → result is `corrupt` and gets
 *     cached against the new mtime until mtime advances again
 *
 * Cache invalidation is keyed on the file's mtime. If an operator repairs
 * the policy, the next stat picks up the new mtime and a fresh read runs.
 */
export function createCachedFleetPolicyLoader(
  options: CachedFleetPolicyLoaderOptions,
): CachedFleetPolicyLoader {
  const baseLoader = options.baseLoader ?? (() => loadFleetPolicy(options.policyFile));
  const statProbe = options.statProbe ?? (async () => {
    const s = await stat(options.policyFile);
    return { mtimeMs: s.mtimeMs };
  });

  let cached: FleetPolicyLoadResult | undefined;
  let cachedMtimeMs: number | undefined;
  let invocations = 0;
  let reads = 0;

  const load: FleetPolicyLoader = async () => {
    invocations++;

    let currentMtimeMs: number | undefined;
    try {
      const s = await statProbe();
      currentMtimeMs = s.mtimeMs;
    } catch (err) {
      // stat failure (ENOENT, EBUSY from antivirus, EPERM) is a fail-
      // closed signal in its own right. Do NOT serve the cached entry —
      // the policy file state is unknown, and the fleet invariant is
      // "absent/unreadable policy → deny every edit". Drop the cache so
      // the next call re-checks, and return `corrupt` with the stat cause.
      cached = undefined;
      cachedMtimeMs = undefined;
      const cause = err instanceof Error ? err.message : String(err);
      return { state: 'corrupt', cause: `fleet policy stat failed: ${cause}` };
    }

    if (cached !== undefined && cachedMtimeMs === currentMtimeMs) {
      return cached;
    }

    reads++;
    try {
      const fresh = await baseLoader();
      cached = fresh;
      cachedMtimeMs = currentMtimeMs;
      return fresh;
    } catch (loaderErr) {
      const cause = loaderErr instanceof Error ? loaderErr.message : String(loaderErr);
      const result: FleetPolicyLoadResult = { state: 'corrupt', cause };
      cached = result;
      cachedMtimeMs = currentMtimeMs;
      return result;
    }
  };

  return {
    load,
    stats: {
      invocations: () => invocations,
      reads: () => reads,
    },
  };
}

export interface FleetValidatorOptions {
  /** Absolute path of the fleet policy file (used in error surfaces). */
  readonly policyFile: string;
  /** Loader; defaults to `loadFleetPolicy(policyFile)`. Override for hot-reload tests. */
  readonly loader?: FleetPolicyLoader;
}

/**
 * Fields that, when mutated on a fleet-locked tool, weaken governance
 * posture. Mirrors `R5_GUARDED_FIELDS` in r5-validator.ts — a fleet lock
 * should give R1-R4 tools the same field-level protection that R5 gives
 * critical tools. `oboFlag` is an alias the compiler sometimes emits in
 * place of `obo`; both must be guarded.
 */
const FLEET_GUARDED_FIELDS: ReadonlySet<string> = new Set([
  'enabled',
  'risk',
  'obo',
  'oboFlag',
]);

function matchOverride(
  overrides: readonly FleetOverride[],
  op: EditOperation,
): FleetOverride | undefined {
  if (op.file !== 'TOOLS.md') return undefined;
  return overrides.find((o) => o.tool === op.section);
}

function isGuardedEdit(op: EditOperation): boolean {
  // set / toggle on a guarded field weakens posture.
  if (op.kind === 'toggle' || op.kind === 'set') {
    return FLEET_GUARDED_FIELDS.has(op.field);
  }
  // append / remove on a fleet-locked tool section touches the tool's
  // lists (allowlist membership, deny membership). Any such mutation
  // can weaken posture — require fleet approval.
  return op.kind === 'append' || op.kind === 'remove';
}

/**
 * Build the fleet validator. On every invocation, the validator asks the
 * loader for the current fleet policy — when wired with
 * `createCachedFleetPolicyLoader`, that becomes a cheap mtime probe with
 * a cached result; when wired with the raw `loadFleetPolicy`, it's a
 * full re-read (matching the P-272 fail-closed contract under
 * hot-reload scenarios).
 */
export function createFleetValidator(options: FleetValidatorOptions): Validator {
  const loader: FleetPolicyLoader = options.loader ?? (() => loadFleetPolicy(options.policyFile));

  const denyOcPath = (op: EditOperation): string =>
    `oc://${op.file}/${op.section}${(op.kind === 'toggle' || op.kind === 'set') ? `/${op.field}` : ''}`;

  return {
    name: 'fleet',
    async validate(op: EditOperation): Promise<ValidatorResult> {
      const loaded = await loader();
      if (loaded.state === 'missing') {
        const error = buildPatchError<FleetLockedError>({
          code: 'FLEET_LOCKED',
          ocPath: denyOcPath(op),
          reason: 'policy-missing',
          policyFile: options.policyFile,
          lockSource: 'fleet',
        });
        return { ok: false, error };
      }
      if (loaded.state === 'corrupt') {
        const error = buildPatchError<FleetLockedError>({
          code: 'FLEET_LOCKED',
          ocPath: denyOcPath(op),
          reason: 'policy-corrupt',
          policyFile: options.policyFile,
          lockSource: 'fleet',
        });
        return { ok: false, error };
      }

      const match = matchOverride(loaded.policy.overrides, op);
      if (match !== undefined && match.requires_approval && isGuardedEdit(op)) {
        // Fleet-lock: the policy holds this tool under fleet approval and
        // the edit touches a guarded field (or is an append/remove on
        // the tool's lists). Deny with FLEET_LOCKED regardless of kind.
        const error = buildPatchError<FleetLockedError>({
          code: 'FLEET_LOCKED',
          ocPath: denyOcPath(op),
          reason: 'field-locked',
          policyFile: options.policyFile,
          lockSource: 'fleet',
        });
        return { ok: false, error };
      }
      return { ok: true };
    },
  };
}
