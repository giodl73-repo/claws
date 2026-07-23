/**
 * @bic/openclaw-lkg/lkg-store — filesystem-backed `LKGStore` impl.
 *
 * Generalizes `openclaw-core/src/config/io.observe-recovery.ts` so any
 * plugin can register a per-file tracker and get the same auto-recovery
 * mechanics:
 *
 *   - `register(tracker)`           remember the path + validator + heuristics
 *   - `observe(path)`               read → parse → validate → promote-on-valid OR
 *                                   restore-on-invalid (preserve as
 *                                   `.clobbered.<ts>`, copy `.lkg` back, audit)
 *   - `readLastKnownGood(path)`     read the LKG bytes (for consumers that want
 *                                   to bypass the active file when it's
 *                                   suspicious-but-not-yet-recovered)
 *
 * @module @bic/openclaw-lkg/lkg-store
 */

import * as crypto from "node:crypto";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import type {
  LKGEntry,
  LKGFingerprint,
  LKGObservation,
  LKGStore,
  LKGTracker,
  ValidationIssue,
} from "@bic/v2-prototype";
import { LKGErrorImpl } from "@bic/v2-prototype";

import { makeFingerprint, hashRaw } from "./fingerprint.js";
import { clobberedPathFor, lkgPathFor } from "./paths.js";

export interface AuditRecord {
  readonly ts: string;
  readonly source: "lkg";
  readonly event: "observe";
  readonly trackerPath: string;
  readonly outcome: LKGObservation["outcome"];
  readonly current: LKGFingerprint | null;
  readonly lastKnownGood: LKGFingerprint | null;
  readonly clobberedPath: string | null;
  readonly suspicious: readonly string[];
  readonly issues: readonly ValidationIssue[];
}

export interface RecoveryNotice {
  readonly ts: string;
  readonly trackerPath: string;
  readonly reason: string;
  readonly clobberedPath: string;
  readonly restoredFrom: LKGFingerprint;
}

export interface LKGStoreOptions {
  /**
   * Audit sink. Called for every `observe`. Defaults to a no-op.
   * The store appends one record per observation.
   */
  readonly onAudit?: (record: AuditRecord) => void | Promise<void>;
  /**
   * Recovery-notice queue. Called only on outcome=recovered. The
   * host wires this to the next-agent-turn surface.
   */
  readonly onRecoveryNotice?: (notice: RecoveryNotice) => void | Promise<void>;
  /**
   * Override `Date.now()` for deterministic tests.
   */
  readonly now?: () => Date;
  /**
   * Override `crypto.randomBytes()` for deterministic tests of
   * the temp-file naming. Default uses real entropy.
   */
  readonly randomSuffix?: () => string;
}

interface RegisteredTracker<T = unknown> {
  readonly tracker: LKGTracker<T>;
  entry: LKGEntry;
}

async function writeAtomic(
  target: string,
  data: string | Uint8Array,
  randomSuffix: () => string,
): Promise<void> {
  const tmp = `${target}.tmp-${randomSuffix()}`;
  await fs.writeFile(tmp, data);
  try {
    await fs.rename(tmp, target);
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code === "ENOENT" || code === "EEXIST" || code === "EPERM") {
      try {
        await fs.unlink(tmp);
      } catch {
        /* ignore */
      }
      try {
        await fs.access(target);
        return;
      } catch {
        /* fall through */
      }
    }
    throw err;
  }
}

function makeSuspiciousSignature(current: LKGFingerprint, reasons: readonly string[]): string {
  return `${current.hash}:${[...reasons].sort().join(",")}`;
}

export function lkgStore(opts: LKGStoreOptions = {}): LKGStore {
  const trackers = new Map<string, RegisteredTracker>();
  const now = opts.now ?? (() => new Date());
  const randomSuffix = opts.randomSuffix ?? (() => crypto.randomBytes(8).toString("hex"));
  const onAudit = opts.onAudit;
  const onRecoveryNotice = opts.onRecoveryNotice;

  function lookup(filePath: string): RegisteredTracker {
    const normalized = path.normalize(filePath);
    const reg = trackers.get(normalized);
    if (reg === undefined) {
      throw new LKGErrorImpl(
        "LKG_TRACKER_PATH_INVALID",
        `No tracker registered for path: ${normalized}`,
      );
    }
    return reg;
  }

  async function statOrNull(p: string) {
    try {
      return await fs.stat(p);
    } catch {
      return null;
    }
  }

  async function emitAudit(record: AuditRecord): Promise<void> {
    if (onAudit !== undefined) {
      try {
        await onAudit(record);
      } catch {
        // Audit sinks must not break the recovery flow.
      }
    }
  }

  async function emitRecoveryNotice(notice: RecoveryNotice): Promise<void> {
    if (onRecoveryNotice !== undefined) {
      try {
        await onRecoveryNotice(notice);
      } catch {
        // Notice sinks must not break the recovery flow.
      }
    }
  }

  async function promote<T>(
    reg: RegisteredTracker<T>,
    raw: string,
    fingerprint: LKGFingerprint,
  ): Promise<void> {
    const lkgPath = lkgPathFor(reg.tracker.path);
    await writeAtomic(lkgPath, raw, randomSuffix);
    reg.entry = {
      ...reg.entry,
      lastKnownGood: fingerprint,
      lastPromotedGood: fingerprint,
      lastObservedSuspiciousSignature: null,
    };
  }

  async function recover<T>(
    reg: RegisteredTracker<T>,
    raw: string,
    fingerprint: LKGFingerprint,
    reason: string,
  ): Promise<{ clobberedPath: string; restoredFrom: LKGFingerprint } | null> {
    const promoted = reg.entry.lastPromotedGood;
    if (promoted === undefined) {
      return null; // no LKG to recover from
    }
    const lkgPath = lkgPathFor(reg.tracker.path);
    let lkgRaw: string;
    try {
      lkgRaw = await fs.readFile(lkgPath, "utf-8");
    } catch {
      return null;
    }
    if (hashRaw(lkgRaw) !== promoted.hash) {
      // LKG file on disk doesn't match our recorded fingerprint —
      // refuse to restore from a corrupted LKG.
      return null;
    }
    const observedAt = fingerprint.observedAt;
    const clobberedPath = clobberedPathFor(reg.tracker.path, observedAt);
    await writeAtomic(clobberedPath, raw, randomSuffix);
    await writeAtomic(reg.tracker.path, lkgRaw, randomSuffix);
    reg.entry = {
      ...reg.entry,
      lastObservedSuspiciousSignature: null,
    };
    return { clobberedPath, restoredFrom: promoted };
  }

  return {
    register<T>(tracker: LKGTracker<T>): void {
      const normalized = path.normalize(tracker.path);
      if (!path.isAbsolute(normalized)) {
        throw new LKGErrorImpl(
          "LKG_TRACKER_PATH_INVALID",
          `Tracker path must be absolute: ${tracker.path}`,
        );
      }
      if (trackers.has(normalized)) {
        throw new LKGErrorImpl(
          "LKG_TRACKER_PATH_COLLISION",
          `Tracker already registered for path: ${normalized}`,
        );
      }
      trackers.set(normalized, { tracker: tracker as LKGTracker<unknown>, entry: {} });
    },

    async observe(filePath: string): Promise<LKGObservation> {
      const reg = lookup(filePath);
      const observedAt = now().toISOString();

      let raw: string;
      try {
        raw = await fs.readFile(reg.tracker.path, "utf-8");
      } catch (err) {
        const issues: ValidationIssue[] = [
          { path: "", message: `read failed: ${(err as Error).message}`, code: "read-failed" },
        ];
        await emitAudit({
          ts: observedAt,
          source: "lkg",
          event: "observe",
          trackerPath: reg.tracker.path,
          outcome: "failed",
          current: null,
          lastKnownGood: reg.entry.lastKnownGood ?? null,
          clobberedPath: null,
          suspicious: [],
          issues,
        });
        return { outcome: "failed", reason: "read-failed", issues };
      }

      const stat = await statOrNull(reg.tracker.path);
      const fingerprint = makeFingerprint({ raw, stat, observedAt });

      let parsed: unknown;
      let parseFailed = false;
      try {
        parsed = (reg.tracker as LKGTracker<unknown>).parse(raw);
      } catch (err) {
        parseFailed = true;
        parsed = undefined;
        // Treat parse failure as invalid; let the validator surface
        // the issue if it can, otherwise synthesize one.
        const issues: ValidationIssue[] = [
          { path: "", message: `parse failed: ${(err as Error).message}`, code: "unparseable" },
        ];
        const validation = { valid: false, issues };
        const skip =
          reg.tracker.shouldRecover !== undefined &&
          reg.tracker.shouldRecover(validation) === false;
        if (skip) {
          await emitAudit({
            ts: observedAt,
            source: "lkg",
            event: "observe",
            trackerPath: reg.tracker.path,
            outcome: "skipped",
            current: fingerprint,
            lastKnownGood: reg.entry.lastKnownGood ?? null,
            clobberedPath: null,
            suspicious: [],
            issues,
          });
          return {
            outcome: "skipped",
            reason: "tracker-shouldRecover-false",
            issues,
          };
        }
        const recovery = await recover(reg, raw, fingerprint, "unparseable");
        if (recovery === null) {
          await emitAudit({
            ts: observedAt,
            source: "lkg",
            event: "observe",
            trackerPath: reg.tracker.path,
            outcome: "skipped",
            current: fingerprint,
            lastKnownGood: reg.entry.lastKnownGood ?? null,
            clobberedPath: null,
            suspicious: [],
            issues,
          });
          return { outcome: "skipped", reason: "no-lkg-available", issues };
        }
        await emitAudit({
          ts: observedAt,
          source: "lkg",
          event: "observe",
          trackerPath: reg.tracker.path,
          outcome: "recovered",
          current: fingerprint,
          lastKnownGood: reg.entry.lastKnownGood ?? null,
          clobberedPath: recovery.clobberedPath,
          suspicious: ["unparseable"],
          issues,
        });
        await emitRecoveryNotice({
          ts: observedAt,
          trackerPath: reg.tracker.path,
          reason: "unparseable",
          clobberedPath: recovery.clobberedPath,
          restoredFrom: recovery.restoredFrom,
        });
        return {
          outcome: "recovered",
          reason: "unparseable",
          clobberedPath: recovery.clobberedPath,
          restoredFrom: recovery.restoredFrom,
        };
      }

      // Parse succeeded — run validator.
      let validation;
      try {
        validation = (reg.tracker as LKGTracker<unknown>).validate(parsed);
      } catch (err) {
        throw new LKGErrorImpl(
          "LKG_VALIDATOR_THREW",
          `Validator threw for ${reg.tracker.path}: ${(err as Error).message}`,
          err,
        );
      }
      void parseFailed;

      // Suspicious-vs-LKG check (only applies if parseable + validator OK so far).
      const lkgFingerprint = reg.entry.lastKnownGood;
      let suspicious: readonly string[] = [];
      if (
        validation.valid &&
        lkgFingerprint !== undefined &&
        reg.tracker.suspiciousReasons !== undefined
      ) {
        suspicious = reg.tracker.suspiciousReasons({
          current: fingerprint,
          lastKnownGood: lkgFingerprint,
          parsed,
        });
      }

      if (validation.valid && suspicious.length === 0) {
        // Promote if the fingerprint differs from current LKG.
        if (
          reg.entry.lastPromotedGood === undefined ||
          reg.entry.lastPromotedGood.hash !== fingerprint.hash
        ) {
          await promote(reg, raw, fingerprint);
          await emitAudit({
            ts: observedAt,
            source: "lkg",
            event: "observe",
            trackerPath: reg.tracker.path,
            outcome: "promoted",
            current: fingerprint,
            lastKnownGood: fingerprint,
            clobberedPath: null,
            suspicious: [],
            issues: [],
          });
          return { outcome: "promoted", fingerprint };
        }
        await emitAudit({
          ts: observedAt,
          source: "lkg",
          event: "observe",
          trackerPath: reg.tracker.path,
          outcome: "valid",
          current: fingerprint,
          lastKnownGood: lkgFingerprint ?? fingerprint,
          clobberedPath: null,
          suspicious: [],
          issues: [],
        });
        return { outcome: "valid", fingerprint };
      }

      // Suspicious-vs-LKG: dedup by signature.
      if (validation.valid && suspicious.length > 0) {
        const sig = makeSuspiciousSignature(fingerprint, suspicious);
        if (reg.entry.lastObservedSuspiciousSignature === sig) {
          await emitAudit({
            ts: observedAt,
            source: "lkg",
            event: "observe",
            trackerPath: reg.tracker.path,
            outcome: "valid",
            current: fingerprint,
            lastKnownGood: lkgFingerprint ?? null,
            clobberedPath: null,
            suspicious,
            issues: [],
          });
          return { outcome: "valid", fingerprint };
        }
        // First time we see this suspicious signature: try to recover.
        reg.entry = { ...reg.entry, lastObservedSuspiciousSignature: sig };
        const recovery = await recover(reg, raw, fingerprint, "suspicious-vs-lkg");
        if (recovery === null) {
          await emitAudit({
            ts: observedAt,
            source: "lkg",
            event: "observe",
            trackerPath: reg.tracker.path,
            outcome: "skipped",
            current: fingerprint,
            lastKnownGood: lkgFingerprint ?? null,
            clobberedPath: null,
            suspicious,
            issues: [],
          });
          return { outcome: "skipped", reason: "no-lkg-available", issues: [] };
        }
        await emitAudit({
          ts: observedAt,
          source: "lkg",
          event: "observe",
          trackerPath: reg.tracker.path,
          outcome: "recovered",
          current: fingerprint,
          lastKnownGood: lkgFingerprint ?? null,
          clobberedPath: recovery.clobberedPath,
          suspicious,
          issues: [],
        });
        await emitRecoveryNotice({
          ts: observedAt,
          trackerPath: reg.tracker.path,
          reason: `suspicious:${suspicious.join(",")}`,
          clobberedPath: recovery.clobberedPath,
          restoredFrom: recovery.restoredFrom,
        });
        return {
          outcome: "recovered",
          reason: `suspicious:${suspicious.join(",")}`,
          clobberedPath: recovery.clobberedPath,
          restoredFrom: recovery.restoredFrom,
        };
      }

      // Invalid: check shouldRecover gate.
      const skip =
        reg.tracker.shouldRecover !== undefined &&
        reg.tracker.shouldRecover({
          valid: validation.valid,
          issues: validation.issues,
        }) === false;
      if (skip) {
        await emitAudit({
          ts: observedAt,
          source: "lkg",
          event: "observe",
          trackerPath: reg.tracker.path,
          outcome: "skipped",
          current: fingerprint,
          lastKnownGood: lkgFingerprint ?? null,
          clobberedPath: null,
          suspicious: [],
          issues: validation.issues,
        });
        return {
          outcome: "skipped",
          reason: "plugin-local-invalidity",
          issues: validation.issues,
        };
      }

      const recovery = await recover(reg, raw, fingerprint, "invalid");
      if (recovery === null) {
        await emitAudit({
          ts: observedAt,
          source: "lkg",
          event: "observe",
          trackerPath: reg.tracker.path,
          outcome: "skipped",
          current: fingerprint,
          lastKnownGood: lkgFingerprint ?? null,
          clobberedPath: null,
          suspicious: [],
          issues: validation.issues,
        });
        return {
          outcome: "skipped",
          reason: "no-lkg-available",
          issues: validation.issues,
        };
      }
      await emitAudit({
        ts: observedAt,
        source: "lkg",
        event: "observe",
        trackerPath: reg.tracker.path,
        outcome: "recovered",
        current: fingerprint,
        lastKnownGood: lkgFingerprint ?? null,
        clobberedPath: recovery.clobberedPath,
        suspicious: [],
        issues: validation.issues,
      });
      await emitRecoveryNotice({
        ts: observedAt,
        trackerPath: reg.tracker.path,
        reason: "invalid",
        clobberedPath: recovery.clobberedPath,
        restoredFrom: recovery.restoredFrom,
      });
      return {
        outcome: "recovered",
        reason: "invalid",
        clobberedPath: recovery.clobberedPath,
        restoredFrom: recovery.restoredFrom,
      };
    },

    async readLastKnownGood(filePath: string): Promise<Uint8Array> {
      const reg = lookup(filePath);
      const lkgPath = lkgPathFor(reg.tracker.path);
      try {
        const buf = await fs.readFile(lkgPath);
        return new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
      } catch (err) {
        throw new LKGErrorImpl(
          "LKG_STORE_UNAVAILABLE",
          `LKG not yet established for ${reg.tracker.path}`,
          err,
        );
      }
    },

    getEntry(filePath: string): LKGEntry | null {
      try {
        const reg = lookup(filePath);
        return { ...reg.entry };
      } catch {
        return null;
      }
    },
  };
}
