/**
 * @bic/openclaw-lkg-git/git-lkg-store — git-backed `LKGStore` impl.
 *
 * Promote = `git commit`; recover = `git checkout HEAD -- <path>`;
 * `lastPromotedGood` = HEAD's blob sha for the tracker path. The
 * working tree is the active file; the LKG is whatever HEAD says.
 *
 * Same `LKGStore` contract as the FS-backed `lkgStore`. Consumers
 * that don't need git history can keep using the FS impl; consumers
 * that want diffs / multi-agent merge / git tooling can swap.
 *
 * @module @bic/openclaw-lkg-git/git-lkg-store
 */

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

import { git, gitBinary } from "./git-cmd.js";

export interface AuditRecord {
  readonly ts: string;
  readonly source: "lkg-git";
  readonly event: "observe";
  readonly trackerPath: string;
  readonly outcome: LKGObservation["outcome"];
  readonly current: LKGFingerprint | null;
  readonly lastKnownGood: LKGFingerprint | null;
  readonly clobberedPath: string | null;
  readonly suspicious: readonly string[];
  readonly issues: readonly ValidationIssue[];
  /** Commit SHA produced by a promote, when applicable. */
  readonly commitSha: string | null;
}

export interface RecoveryNotice {
  readonly ts: string;
  readonly trackerPath: string;
  readonly reason: string;
  readonly clobberedPath: string;
  readonly restoredFrom: LKGFingerprint;
}

export interface GitAuthorship {
  readonly name: string;
  readonly email: string;
}

export interface GitLKGStoreOptions {
  /** Absolute path to a git work tree (must already be `git init`-ed). */
  readonly repoRoot: string;
  /** Author identity for LKG-produced commits. */
  readonly authorship: GitAuthorship;
  /** Audit sink. Called for every `observe`. */
  readonly onAudit?: (record: AuditRecord) => void | Promise<void>;
  /** Recovery notice. Called only on outcome=recovered. */
  readonly onRecoveryNotice?: (notice: RecoveryNotice) => void | Promise<void>;
  /** Override `Date.now()` for deterministic tests. */
  readonly now?: () => Date;
}

interface RegisteredTracker<T = unknown> {
  readonly tracker: LKGTracker<T>;
  /** Path relative to repoRoot — what git operates on. */
  readonly relPath: string;
  /** In-memory dedup signal. */
  lastObservedSuspiciousSignature: string | null;
  /**
   * Cached entry shape — populated by `observe()` so synchronous
   * `getEntry()` callers (e.g. `policy-plugin-lkg`'s cache-key lookup)
   * can read `lastPromotedGood.hash` without shelling out to git.
   */
  cachedEntry: LKGEntry;
}

function makeSuspiciousSignature(current: LKGFingerprint, reasons: readonly string[]): string {
  return `${current.hash}:${[...reasons].sort().join(",")}`;
}

function clobberedPathFor(target: string, observedAt: string): string {
  const safe = observedAt.replaceAll(":", "-").replaceAll(".", "-");
  return `${target}.clobbered.${safe}`;
}

/**
 * Build a git-backed LKGStore.
 *
 * Pre-conditions:
 *   - `opts.repoRoot` exists and is a git work tree (run `git init`
 *     first if needed).
 *   - Tracker paths are under `repoRoot`.
 *   - Tracker paths are NOT gitignored.
 */
export function gitLKGStore(opts: GitLKGStoreOptions): LKGStore {
  const trackers = new Map<string, RegisteredTracker>();
  const now = opts.now ?? (() => new Date());
  const onAudit = opts.onAudit;
  const onRecoveryNotice = opts.onRecoveryNotice;
  const repoRoot = path.resolve(opts.repoRoot);

  async function gitConfig() {
    return {
      "user.name": opts.authorship.name,
      "user.email": opts.authorship.email,
    };
  }

  async function gitInRepo(args: readonly string[]) {
    const cfg = await gitConfig();
    return git(args, { cwd: repoRoot, config: cfg });
  }

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

  /** Read the blob sha for a path at HEAD, or null if not tracked. */
  async function blobShaAtHead(relPath: string): Promise<string | null> {
    const result = await git(["ls-tree", "-r", "HEAD", "--", relPath], {
      cwd: repoRoot,
      tolerateNonZero: true,
    });
    if (result.exitCode !== 0) return null;
    const line = result.stdout.split("\n").find((l) => l.trim().length > 0);
    if (line === undefined) return null;
    // Format: <mode> <type> <sha>\t<path>
    const parts = line.split("\t")[0]?.split(/\s+/);
    return parts?.[2] ?? null;
  }

  async function fingerprintFromHead(
    relPath: string,
    observedAt: string,
  ): Promise<LKGFingerprint | null> {
    const sha = await blobShaAtHead(relPath);
    if (sha === null) return null;
    const sizeResult = await git(["cat-file", "-s", sha], { cwd: repoRoot });
    const bytes = parseInt(sizeResult.stdout.trim(), 10);
    return {
      hash: sha,
      bytes: Number.isFinite(bytes) ? bytes : 0,
      mtimeMs: null,
      ctimeMs: null,
      dev: null,
      ino: null,
      mode: null,
      nlink: null,
      uid: null,
      gid: null,
      observedAt,
    };
  }

  async function fingerprintForActiveContent(
    relPath: string,
    raw: string,
    observedAt: string,
  ): Promise<LKGFingerprint> {
    // Compute the blob sha that *would* result from `git hash-object`
    // — this is the canonical content-address even if we haven't
    // committed yet.
    const result = await git(["hash-object", "--", relPath], {
      cwd: repoRoot,
      tolerateNonZero: true,
    });
    const sha = result.stdout.trim();
    return {
      hash: sha,
      bytes: Buffer.byteLength(raw, "utf-8"),
      mtimeMs: null,
      ctimeMs: null,
      dev: null,
      ino: null,
      mode: null,
      nlink: null,
      uid: null,
      gid: null,
      observedAt,
    };
  }

  async function isTrackedAndUnchanged(relPath: string): Promise<boolean> {
    // `git diff --quiet HEAD -- <path>` exits 0 when no diff, 1 when diff.
    // Returns true if file content equals HEAD's version.
    const result = await git(["diff", "--quiet", "HEAD", "--", relPath], {
      cwd: repoRoot,
      tolerateNonZero: true,
    });
    return result.exitCode === 0;
  }

  async function isGitIgnored(relPath: string): Promise<boolean> {
    const result = await git(["check-ignore", "-q", "--", relPath], {
      cwd: repoRoot,
      tolerateNonZero: true,
    });
    return result.exitCode === 0;
  }

  async function emitAudit(record: AuditRecord): Promise<void> {
    if (onAudit !== undefined) {
      try {
        await onAudit(record);
      } catch {
        /* ignore */
      }
    }
  }

  async function emitRecoveryNotice(notice: RecoveryNotice): Promise<void> {
    if (onRecoveryNotice !== undefined) {
      try {
        await onRecoveryNotice(notice);
      } catch {
        /* ignore */
      }
    }
  }

  async function commitPromote(
    reg: RegisteredTracker,
    fingerprint: LKGFingerprint,
  ): Promise<string> {
    await gitInRepo(["add", "--", reg.relPath]);
    const message = `lkg(promote): ${reg.tracker.path} @${fingerprint.hash}`;
    // `commit -- <relPath>` commits ONLY that path even if other paths
    // are pre-staged in the index. Without the path arg, an LKG promote
    // would sweep arbitrary staged work into the LKG commit — unsafe
    // for shared repos or multi-agent workflows.
    const commitResult = await gitInRepo(["commit", "-m", message, "--", reg.relPath]);
    void commitResult;
    const headResult = await gitInRepo(["rev-parse", "HEAD"]);
    return headResult.stdout.trim();
  }

  async function recoverFromHead(
    reg: RegisteredTracker,
    rawBeforeRecover: string,
    observedAt: string,
  ): Promise<{ clobberedPath: string; restoredFrom: LKGFingerprint } | null> {
    const lkgFingerprint = await fingerprintFromHead(reg.relPath, observedAt);
    if (lkgFingerprint === null) return null; // no LKG yet
    const clobberedPath = clobberedPathFor(reg.tracker.path, observedAt);
    await fs.writeFile(clobberedPath, rawBeforeRecover);
    await gitInRepo(["checkout", "HEAD", "--", reg.relPath]);
    reg.lastObservedSuspiciousSignature = null;
    reg.cachedEntry = { lastKnownGood: lkgFingerprint, lastPromotedGood: lkgFingerprint };
    return { clobberedPath, restoredFrom: lkgFingerprint };
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
      const rel = path.relative(repoRoot, normalized);
      if (rel.startsWith("..") || path.isAbsolute(rel)) {
        throw new LKGErrorImpl(
          "LKG_TRACKER_PATH_INVALID",
          `Tracker path must be inside repoRoot ${repoRoot}: ${normalized}`,
        );
      }
      if (trackers.has(normalized)) {
        throw new LKGErrorImpl(
          "LKG_TRACKER_PATH_COLLISION",
          `Tracker already registered for path: ${normalized}`,
        );
      }
      trackers.set(normalized, {
        tracker: tracker as LKGTracker<unknown>,
        relPath: rel.replaceAll(path.sep, "/"),
        lastObservedSuspiciousSignature: null,
        cachedEntry: {},
      });
    },

    async observe(filePath: string): Promise<LKGObservation> {
      const reg = lookup(filePath);
      const observedAt = now().toISOString();

      // Check gitignore at observe time (cheap; catches misconfigs).
      if (await isGitIgnored(reg.relPath)) {
        const issues: ValidationIssue[] = [
          { path: "", message: `path is gitignored: ${reg.relPath}`, code: "gitignored" },
        ];
        await emitAudit({
          ts: observedAt,
          source: "lkg-git",
          event: "observe",
          trackerPath: reg.tracker.path,
          outcome: "failed",
          current: null,
          lastKnownGood: null,
          clobberedPath: null,
          suspicious: [],
          issues,
          commitSha: null,
        });
        return { outcome: "failed", reason: "gitignored", issues };
      }

      // Read working-tree bytes.
      let raw: string;
      try {
        raw = await fs.readFile(reg.tracker.path, "utf-8");
      } catch (err) {
        const issues: ValidationIssue[] = [
          { path: "", message: `read failed: ${(err as Error).message}`, code: "read-failed" },
        ];
        await emitAudit({
          ts: observedAt,
          source: "lkg-git",
          event: "observe",
          trackerPath: reg.tracker.path,
          outcome: "failed",
          current: null,
          lastKnownGood: null,
          clobberedPath: null,
          suspicious: [],
          issues,
          commitSha: null,
        });
        return { outcome: "failed", reason: "read-failed", issues };
      }

      const lkgFingerprint = await fingerprintFromHead(reg.relPath, observedAt);
      const currentFingerprint = await fingerprintForActiveContent(reg.relPath, raw, observedAt);

      // Parse + validate.
      let parsed: unknown;
      try {
        parsed = (reg.tracker as LKGTracker<unknown>).parse(raw);
      } catch (err) {
        const issues: ValidationIssue[] = [
          { path: "", message: `parse failed: ${(err as Error).message}`, code: "unparseable" },
        ];
        const skip =
          reg.tracker.shouldRecover !== undefined &&
          reg.tracker.shouldRecover({ valid: false, issues }) === false;
        if (skip) {
          await emitAudit({
            ts: observedAt,
            source: "lkg-git",
            event: "observe",
            trackerPath: reg.tracker.path,
            outcome: "skipped",
            current: currentFingerprint,
            lastKnownGood: lkgFingerprint,
            clobberedPath: null,
            suspicious: [],
            issues,
            commitSha: null,
          });
          return { outcome: "skipped", reason: "tracker-shouldRecover-false", issues };
        }
        const recovery = await recoverFromHead(reg, raw, observedAt);
        if (recovery === null) {
          await emitAudit({
            ts: observedAt,
            source: "lkg-git",
            event: "observe",
            trackerPath: reg.tracker.path,
            outcome: "skipped",
            current: currentFingerprint,
            lastKnownGood: null,
            clobberedPath: null,
            suspicious: [],
            issues,
            commitSha: null,
          });
          return { outcome: "skipped", reason: "no-lkg-available", issues };
        }
        await emitAudit({
          ts: observedAt,
          source: "lkg-git",
          event: "observe",
          trackerPath: reg.tracker.path,
          outcome: "recovered",
          current: currentFingerprint,
          lastKnownGood: recovery.restoredFrom,
          clobberedPath: recovery.clobberedPath,
          suspicious: ["unparseable"],
          issues,
          commitSha: null,
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

      const validation = (reg.tracker as LKGTracker<unknown>).validate(parsed);

      // Suspicious-vs-LKG.
      let suspicious: readonly string[] = [];
      if (
        validation.valid &&
        lkgFingerprint !== null &&
        reg.tracker.suspiciousReasons !== undefined
      ) {
        suspicious = reg.tracker.suspiciousReasons({
          current: currentFingerprint,
          lastKnownGood: lkgFingerprint,
          parsed,
        });
      }

      // Valid + not suspicious.
      if (validation.valid && suspicious.length === 0) {
        const unchanged = lkgFingerprint !== null && (await isTrackedAndUnchanged(reg.relPath));
        if (unchanged) {
          reg.cachedEntry = { lastKnownGood: lkgFingerprint, lastPromotedGood: lkgFingerprint };
          await emitAudit({
            ts: observedAt,
            source: "lkg-git",
            event: "observe",
            trackerPath: reg.tracker.path,
            outcome: "valid",
            current: currentFingerprint,
            lastKnownGood: lkgFingerprint,
            clobberedPath: null,
            suspicious: [],
            issues: [],
            commitSha: null,
          });
          return { outcome: "valid", fingerprint: currentFingerprint };
        }
        const commitSha = await commitPromote(reg, currentFingerprint);
        const newHeadFingerprint =
          (await fingerprintFromHead(reg.relPath, observedAt)) ?? currentFingerprint;
        reg.cachedEntry = {
          lastKnownGood: newHeadFingerprint,
          lastPromotedGood: newHeadFingerprint,
        };
        await emitAudit({
          ts: observedAt,
          source: "lkg-git",
          event: "observe",
          trackerPath: reg.tracker.path,
          outcome: "promoted",
          current: newHeadFingerprint,
          lastKnownGood: newHeadFingerprint,
          clobberedPath: null,
          suspicious: [],
          issues: [],
          commitSha,
        });
        return { outcome: "promoted", fingerprint: newHeadFingerprint };
      }

      // Valid but suspicious.
      if (validation.valid && suspicious.length > 0) {
        const sig = makeSuspiciousSignature(currentFingerprint, suspicious);
        if (reg.lastObservedSuspiciousSignature === sig && lkgFingerprint !== null) {
          reg.cachedEntry = { lastKnownGood: lkgFingerprint, lastPromotedGood: lkgFingerprint };
          await emitAudit({
            ts: observedAt,
            source: "lkg-git",
            event: "observe",
            trackerPath: reg.tracker.path,
            outcome: "valid",
            current: currentFingerprint,
            lastKnownGood: lkgFingerprint,
            clobberedPath: null,
            suspicious,
            issues: [],
            commitSha: null,
          });
          return { outcome: "valid", fingerprint: currentFingerprint };
        }
        reg.lastObservedSuspiciousSignature = sig;
        const recovery = await recoverFromHead(reg, raw, observedAt);
        if (recovery === null) {
          await emitAudit({
            ts: observedAt,
            source: "lkg-git",
            event: "observe",
            trackerPath: reg.tracker.path,
            outcome: "skipped",
            current: currentFingerprint,
            lastKnownGood: null,
            clobberedPath: null,
            suspicious,
            issues: [],
            commitSha: null,
          });
          return { outcome: "skipped", reason: "no-lkg-available", issues: [] };
        }
        await emitAudit({
          ts: observedAt,
          source: "lkg-git",
          event: "observe",
          trackerPath: reg.tracker.path,
          outcome: "recovered",
          current: currentFingerprint,
          lastKnownGood: recovery.restoredFrom,
          clobberedPath: recovery.clobberedPath,
          suspicious,
          issues: [],
          commitSha: null,
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

      // Invalid.
      const skip =
        reg.tracker.shouldRecover !== undefined &&
        reg.tracker.shouldRecover({
          valid: validation.valid,
          issues: validation.issues,
        }) === false;
      if (skip) {
        await emitAudit({
          ts: observedAt,
          source: "lkg-git",
          event: "observe",
          trackerPath: reg.tracker.path,
          outcome: "skipped",
          current: currentFingerprint,
          lastKnownGood: lkgFingerprint,
          clobberedPath: null,
          suspicious: [],
          issues: validation.issues,
          commitSha: null,
        });
        return {
          outcome: "skipped",
          reason: "plugin-local-invalidity",
          issues: validation.issues,
        };
      }

      const recovery = await recoverFromHead(reg, raw, observedAt);
      if (recovery === null) {
        await emitAudit({
          ts: observedAt,
          source: "lkg-git",
          event: "observe",
          trackerPath: reg.tracker.path,
          outcome: "skipped",
          current: currentFingerprint,
          lastKnownGood: null,
          clobberedPath: null,
          suspicious: [],
          issues: validation.issues,
          commitSha: null,
        });
        return {
          outcome: "skipped",
          reason: "no-lkg-available",
          issues: validation.issues,
        };
      }
      await emitAudit({
        ts: observedAt,
        source: "lkg-git",
        event: "observe",
        trackerPath: reg.tracker.path,
        outcome: "recovered",
        current: currentFingerprint,
        lastKnownGood: recovery.restoredFrom,
        clobberedPath: recovery.clobberedPath,
        suspicious: [],
        issues: validation.issues,
        commitSha: null,
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
      const result = await gitBinary(["show", `HEAD:${reg.relPath}`], {
        cwd: repoRoot,
        tolerateNonZero: true,
      });
      if (result.exitCode !== 0) {
        throw new LKGErrorImpl(
          "LKG_STORE_UNAVAILABLE",
          `LKG not yet established (no HEAD blob for ${reg.relPath}): ${result.stderr.trim()}`,
        );
      }
      return result.stdout;
    },

    getEntry(filePath: string): LKGEntry | null {
      try {
        const reg = lookup(filePath);
        // The accessor is synchronous so we can't shell out to git
        // here. We return whatever `observe()` last cached. Callers
        // who need the freshest entry must `observe()` first.
        return { ...reg.cachedEntry };
      } catch {
        return null;
      }
    },
  };
}
