/**
 * `FsLKGStore` — the reference filesystem-backed `LKGStore` impl.
 *
 * Lifecycle per `observe(path, opts)`:
 *
 *   1. Read bytes from disk + stat.
 *   2. Compute fingerprint.
 *   3. parse + validate via the registered tracker.
 *   4. Branch on outcome:
 *        valid     → if fingerprint != lastPromotedGood, PROMOTE
 *                    (write `.lkg` companion). Return outcome:
 *                    'promoted' on first valid; 'valid' on no-change.
 *        invalid   → if shouldRecover() returns false: outcome
 *                    'skipped' / 'plugin-local-invalidity'.
 *                    Else if no LKG: outcome 'skipped' /
 *                    'no-lkg-available'.
 *                    Else RECOVER: write bad bytes to
 *                    `.clobbered.<ts>`, copy `.lkg` back to active
 *                    path, audit, enqueue recovery notice.
 *
 * Multi-tenant: instantiate one `FsLKGStore` per tenant scope. The
 * store rejects tracker paths outside its configured root.
 *
 * @module @openclaw/lkg-fs/store
 */

import { promises as fs } from 'node:fs';
import { dirname, isAbsolute, normalize, relative, resolve, sep } from 'node:path';
import { REDACTED_SENTINEL, formatOcPath } from '@openclaw/oc-path';
import type {
  LKGEntry,
  LKGFingerprint,
  LKGObservation,
  LKGObserveOptions,
  LKGTracker,
  ValidationIssue,
} from '../../plugin-sdk/lkg/types.js';
import { LKGError } from '../../plugin-sdk/lkg/types.js';
import type { LKGStore } from '../../plugin-sdk/lkg/api.js';
import { InMemoryAuditSink, type LKGAuditSink } from './audit.js';
import { makeFingerprint, hashRaw } from './fingerprint.js';
import { clobberedPathFor, lkgPathFor } from './paths.js';
import {
  InMemoryRecoveryNoticeSink,
  type LKGRecoveryNoticeSink,
} from './recovery-notice.js';

export interface FsLKGStoreOptions {
  /** Absolute filesystem root the store manages. Trackers must register paths inside this root. */
  readonly root: string;
  /** Reject tracker paths outside `root` (default: true). */
  readonly forbidPathsOutsideRoot?: boolean;
  readonly auditSink?: LKGAuditSink;
  readonly recoveryNoticeSink?: LKGRecoveryNoticeSink;
  /**
   * For deterministic tests: override the "now" timestamp generator.
   * Production passes `() => new Date().toISOString()` (the default).
   */
  readonly nowIso?: () => string;
}

export class FsLKGStore implements LKGStore {
  private readonly trackers = new Map<string, LKGTracker<unknown, ValidationIssue>>();
  private readonly entries = new Map<string, LKGEntry>();
  private readonly root: string;
  private readonly forbidOutside: boolean;
  private readonly auditSink: LKGAuditSink;
  private readonly noticeSink: LKGRecoveryNoticeSink;
  private readonly nowIso: () => string;

  constructor(opts: FsLKGStoreOptions) {
    this.root = resolve(opts.root);
    this.forbidOutside = opts.forbidPathsOutsideRoot ?? true;
    this.auditSink = opts.auditSink ?? new InMemoryAuditSink();
    this.noticeSink = opts.recoveryNoticeSink ?? new InMemoryRecoveryNoticeSink();
    this.nowIso = opts.nowIso ?? (() => new Date().toISOString());
  }

  register<TParsed, TIssue = ValidationIssue>(
    tracker: LKGTracker<TParsed, TIssue>,
  ): void {
    const normalized = this.normalizePath(tracker.path);
    if (this.trackers.has(normalized)) {
      throw new LKGError(
        'LKG_TRACKER_PATH_COLLISION',
        `tracker already registered for path: ${normalized}`,
        normalized,
      );
    }
    this.trackers.set(normalized, tracker as unknown as LKGTracker<unknown, ValidationIssue>);
  }

  async observe(path: string, opts?: LKGObserveOptions): Promise<LKGObservation> {
    const normalized = this.normalizePath(path);
    const tracker = this.trackers.get(normalized);
    if (tracker === undefined) {
      throw new LKGError(
        'LKG_TRACKER_PATH_INVALID',
        `no tracker registered for path: ${normalized}`,
        normalized,
      );
    }

    // Workspace-relative URI for audit-event correlation. Synthesized
    // once per observe; passed into outcome shapes via `withOcPath`.
    const ocPath = trackerOcPathString(tracker);

    // Abort-check helper — checks the signal at every I/O boundary.
    // Returns the abort outcome (audit-recorded) when cancelled.
    const checkAbort = async (): Promise<LKGObservation | null> => {
      if (opts?.signal?.aborted !== true) return null;
      const obs: LKGObservation = withOcPath({
        outcome: 'failed',
        reason: 'aborted: observe cancelled via signal',
        issues: [],
      }, ocPath);
      await this.audit(normalized, obs);
      return obs;
    };

    const aborted0 = await checkAbort();
    if (aborted0 !== null) return aborted0;

    let raw: Buffer;
    let stat;
    try {
      raw = await fs.readFile(normalized);
      stat = await fs.stat(normalized);
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      const obs: LKGObservation = withOcPath({
        outcome: 'failed',
        reason: `read failed: ${reason}`,
        issues: [],
      }, ocPath);
      await this.audit(normalized, obs);
      return obs;
    }

    // Sentinel guard (mirrors @openclaw/oc-path's emit-time
    // guard, applied at the LKG observe boundary).
    if (containsSentinel(raw)) {
      const obs: LKGObservation = withOcPath({
        outcome: 'failed',
        reason: 'sentinel-detected: refusing to LKG-track redacted-view bytes',
        issues: [],
      }, ocPath);
      await this.audit(normalized, obs);
      return obs;
    }

    const observedAt = this.nowIso();
    const current = makeFingerprint({ raw, stat, observedAt });

    let parsed;
    try {
      parsed = tracker.parse(raw.toString('utf-8'));
    } catch (err) {
      // Scrub the err.message: parse failures on secret-bearing
      // bytes can leak the secret through the diagnostic. Same
      // posture as oc-paths-lint's error-message scrubber.
      const obs: LKGObservation = withOcPath({
        outcome: 'failed',
        reason: `parse threw: ${scrubErrorMessage(err)}`,
        issues: [],
      }, ocPath);
      await this.audit(normalized, obs);
      return obs;
    }

    let result;
    try {
      result = tracker.validate(parsed);
    } catch (err) {
      // Validator failures on secret-bearing parsed values can leak
      // secrets through err.message; scrub before audit-recording.
      const obs: LKGObservation = withOcPath({
        outcome: 'failed',
        reason: `validate threw: ${scrubErrorMessage(err)}`,
        issues: [],
      }, ocPath);
      await this.audit(normalized, obs);
      return obs;
    }

    const aborted1 = await checkAbort();
    if (aborted1 !== null) return aborted1;

    if (result.valid) {
      return await this.promote(normalized, current, raw, ocPath);
    }

    return await this.recover(normalized, current, raw, result.issues, tracker, parsed, opts ?? {}, ocPath);
  }

  async readLastKnownGood(path: string, opts?: LKGObserveOptions): Promise<Uint8Array> {
    if (opts?.signal?.aborted === true) {
      throw new LKGError(
        'LKG_ABORTED',
        `readLastKnownGood aborted via signal: ${path}`,
        path,
      );
    }
    const normalized = this.normalizePath(path);
    const lkgPath = lkgPathFor(normalized);
    try {
      return await fs.readFile(lkgPath);
    } catch (err) {
      throw new LKGError(
        'LKG_STORE_UNAVAILABLE',
        `no LKG available for ${normalized}: ${err instanceof Error ? err.message : String(err)}`,
        normalized,
      );
    }
  }

  getEntry(path: string): LKGEntry | null {
    return this.entries.get(this.normalizePath(path)) ?? null;
  }

  // ---------- internal -----------------------------------------------------

  private normalizePath(p: string): string {
    if (!isAbsolute(p)) {
      throw new LKGError('LKG_TRACKER_PATH_INVALID', `tracker path must be absolute: ${p}`, p);
    }
    const normalized = normalize(p);
    if (this.forbidOutside) {
      const rel = relative(this.root, normalized);
      if (rel.startsWith('..') || (sep === '\\' && rel.startsWith(`..\\`))) {
        throw new LKGError(
          'LKG_TRACKER_PATH_INVALID',
          `tracker path outside store root (${this.root}): ${normalized}`,
          normalized,
        );
      }
    }
    return normalized;
  }

  private async promote(
    path: string,
    current: LKGFingerprint,
    raw: Buffer,
    ocPath: string | undefined,
  ): Promise<LKGObservation> {
    const entry = this.entries.get(path);
    const lastPromotedHash = entry?.lastPromotedGood?.hash;
    if (lastPromotedHash === current.hash) {
      // No change — pure observe outcome.
      const obs: LKGObservation = withOcPath({ outcome: 'valid', fingerprint: current }, ocPath);
      await this.audit(path, obs);
      return obs;
    }

    // Atomic-ish promote: write to `.lkg.tmp`, fsync, rename.
    const lkgPath = lkgPathFor(path);
    const tmpPath = `${lkgPath}.tmp-${process.pid}-${Date.now().toString(36)}`;
    await fs.mkdir(dirname(lkgPath), { recursive: true });
    await fs.writeFile(tmpPath, raw);
    await fs.rename(tmpPath, lkgPath);

    this.entries.set(path, {
      ...entry,
      lastKnownGood: current,
      lastPromotedGood: current,
    });

    const obs: LKGObservation = withOcPath({ outcome: 'promoted', fingerprint: current }, ocPath);
    await this.audit(path, obs);
    return obs;
  }

  private async recover(
    path: string,
    current: LKGFingerprint,
    badRaw: Buffer,
    issues: readonly ValidationIssue[],
    tracker: LKGTracker<unknown, ValidationIssue>,
    parsed: unknown,
    opts: LKGObserveOptions,
    ocPath: string | undefined,
  ): Promise<LKGObservation> {
    // shouldRecover now receives the tracker's parsed AST so it can
    // run kind-specific or oc-paths queries inside the heuristic.
    if (tracker.shouldRecover && tracker.shouldRecover({ valid: false, issues, parsed }) === false) {
      const obs: LKGObservation = withOcPath({
        outcome: 'skipped',
        reason: 'plugin-local-invalidity',
        issues,
      }, ocPath);
      await this.audit(path, obs);
      return obs;
    }

    const entry = this.entries.get(path);
    const lkg = entry?.lastPromotedGood;
    if (!lkg) {
      const obs: LKGObservation = withOcPath({
        outcome: 'skipped',
        reason: 'no-lkg-available',
        issues,
      }, ocPath);
      await this.audit(path, obs);
      return obs;
    }

    // Verify LKG companion still matches recorded hash; refuse to
    // restore from a tampered companion.
    const lkgPath = lkgPathFor(path);
    let lkgRaw: Buffer;
    try {
      lkgRaw = await fs.readFile(lkgPath);
    } catch (err) {
      const obs: LKGObservation = withOcPath({
        outcome: 'failed',
        reason: `read .lkg failed: ${err instanceof Error ? err.message : String(err)}`,
        issues,
      }, ocPath);
      await this.audit(path, obs);
      return obs;
    }
    const companionHash = hashRaw(lkgRaw);
    if (companionHash !== lkg.hash) {
      const obs: LKGObservation = withOcPath({
        outcome: 'failed',
        reason: 'lkg-companion-tampered: hash mismatch',
        issues,
      }, ocPath);
      await this.audit(path, obs);
      return obs;
    }

    // Defense-in-depth: even if the .lkg hash matches, refuse to
    // restore bytes carrying the redaction sentinel. Catches a
    // pathological case where a hash-stable .lkg companion was
    // poisoned at promote time before this guard existed.
    if (containsSentinel(lkgRaw)) {
      const obs: LKGObservation = withOcPath({
        outcome: 'failed',
        reason: 'lkg-companion-poisoned: contains redaction sentinel',
        issues,
      }, ocPath);
      await this.audit(path, obs);
      return obs;
    }

    // Preserve bad bytes; restore from .lkg.
    const observedAt = this.nowIso();
    const clobberedPath = clobberedPathFor(path, observedAt);
    await fs.writeFile(clobberedPath, badRaw);
    const clobberedFileHash = hashRaw(badRaw);

    const tmpPath = `${path}.restoring-${process.pid}-${Date.now().toString(36)}`;
    await fs.writeFile(tmpPath, lkgRaw);
    await fs.rename(tmpPath, path);

    const obs: LKGObservation = withOcPath({
      outcome: 'recovered',
      reason: issues[0]?.message ?? 'validation failed',
      clobberedPath,
      clobberedFileHash,
      restoredFrom: lkg,
      replacedFingerprint: current,
      ...(opts.actor !== undefined ? { actor: opts.actor } : {}),
      ...(opts.correlationEventId !== undefined
        ? { correlationEventId: opts.correlationEventId }
        : {}),
    }, ocPath);
    await this.audit(path, obs);
    await this.noticeSink.enqueue({
      path,
      clobberedPath,
      restoredFromHash: lkg.hash,
      replacedFingerprint: current,
      reason: obs.reason,
      ...(opts.actor !== undefined ? { actor: opts.actor } : {}),
      ...(opts.correlationEventId !== undefined
        ? { correlationEventId: opts.correlationEventId }
        : {}),
      observedAt,
    });

    return obs;
  }

  private async audit(path: string, obs: LKGObservation): Promise<void> {
    const observedAt = this.nowIso();
    const base = {
      event: 'lkg.observe' as const,
      path,
      outcome: obs.outcome,
      observedAt,
      // Workspace-relative URI for cross-substrate audit correlation.
      // Absent if the tracker didn't declare an ocPath.
      ...(obs.ocPath !== undefined ? { ocPath: obs.ocPath } : {}),
    };
    if (obs.outcome === 'recovered') {
      await this.auditSink.append({
        ...base,
        clobberedPath: obs.clobberedPath,
        clobberedFileHash: obs.clobberedFileHash,
        replacedFingerprintHash: obs.replacedFingerprint?.hash ?? null,
        reason: obs.reason,
        actor: obs.actor ?? null,
        correlationEventId: obs.correlationEventId ?? null,
      });
      return;
    }
    if (obs.outcome === 'valid' || obs.outcome === 'promoted') {
      await this.auditSink.append({ ...base, fingerprintHash: obs.fingerprint.hash });
      return;
    }
    await this.auditSink.append({ ...base, reason: obs.reason });
  }
}

/**
 * Substring scan for the redaction sentinel. Bytes-or-string input;
 * we use the same literal as the substrate's `REDACTED_SENTINEL` so
 * no copy-paste drift is possible.
 */
function containsSentinel(buf: Buffer | string): boolean {
  if (typeof buf === 'string') return buf.includes(REDACTED_SENTINEL);
  return buf.includes(REDACTED_SENTINEL);
}

/**
 * Scrub a thrown error's message before placing it in an audit
 * record. Mirrors the oc-paths-lint error-message scrubber:
 *
 *   - Refuse to echo the redaction sentinel — replace wholesale.
 *   - Strip ASCII control chars (preserve \t and printable bytes).
 *   - Cap length at 256 bytes to bound leak surface.
 *
 * A validator that crashed on a secret-bearing parsed value could
 * otherwise leak the secret through the audit envelope. Audit
 * records persist to disk + flow into observability pipelines, so
 * the leak surface is wide if unguarded.
 */
const ERR_MESSAGE_MAX_LEN = 256;
function scrubErrorMessage(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err);
  if (raw.includes(REDACTED_SENTINEL)) {
    return '[scrubbed: validator/parser message contained redaction sentinel]';
  }
  const CONTROL_CHARS = new RegExp('[\\x00-\\x08\\x0B-\\x1F\\x7F]', 'g');
  const stripped = raw.replace(CONTROL_CHARS, '');
  if (stripped.length <= ERR_MESSAGE_MAX_LEN) return stripped;
  return stripped.slice(0, ERR_MESSAGE_MAX_LEN - 3) + '...';
}

/**
 * Synthesize the workspace-relative `oc://` URI string for a tracker.
 * Returns `undefined` if the tracker didn't declare an `ocPath` —
 * audit events fall back to filesystem path only.
 */
function trackerOcPathString(
  tracker: LKGTracker<unknown, ValidationIssue>,
): string | undefined {
  if (tracker.ocPath === undefined) return undefined;
  return formatOcPath(tracker.ocPath);
}

/**
 * Attach `ocPath` to an observation outcome only if defined. Avoids
 * `ocPath: undefined` appearing in audit envelopes (which downstream
 * JSON serializers handle differently than absent keys).
 */
function withOcPath<T extends LKGObservation>(obs: T, ocPath: string | undefined): T {
  if (ocPath === undefined) return obs;
  return { ...obs, ocPath };
}
