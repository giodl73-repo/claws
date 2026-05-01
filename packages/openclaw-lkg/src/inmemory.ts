/**
 * @bic/openclaw-lkg/inmemory — in-memory `LKGStore` variant for tests.
 *
 * Same lifecycle as `lkgStore`, no filesystem. The "path" is treated
 * as an opaque key into the internal Maps. Useful for unit-testing
 * trackers' validators + suspicious heuristics without disk IO.
 *
 * @module @bic/openclaw-lkg/inmemory
 */

import type {
  LKGEntry,
  LKGFingerprint,
  LKGObservation,
  LKGStore,
  LKGTracker,
  ValidationIssue,
} from '@bic/v2-prototype';
import { LKGErrorImpl } from '@bic/v2-prototype';

import { hashRaw, makeFingerprint } from './fingerprint.js';

interface InMemoryRegistered<T = unknown> {
  readonly tracker: LKGTracker<T>;
  entry: LKGEntry;
  /** Current "active file" bytes. */
  active: string | null;
  /** LKG bytes (matches lastPromotedGood). */
  lkg: string | null;
  /** Map of clobbered observedAt → bytes. */
  clobbered: Map<string, string>;
}

export interface InMemoryLKGStoreOptions {
  readonly now?: () => Date;
}

export interface InMemoryLKGStore extends LKGStore {
  /**
   * Test seam: directly write to the "active" path bytes,
   * bypassing the LKG mechanics. Use this to simulate the agent
   * editing a tracked file.
   */
  setActive(path: string, content: string): void;
  /**
   * Read the current active bytes (whatever the last write left).
   */
  getActive(path: string): string | null;
  /**
   * Inspect what the LKG mechanism has stored as the recovery target.
   */
  getLKG(path: string): string | null;
  /**
   * Inspect clobbered bytes preserved for diagnosis. Keyed by
   * observedAt timestamp.
   */
  getClobbered(path: string): ReadonlyMap<string, string>;
}

function makeSuspiciousSignature(
  current: LKGFingerprint,
  reasons: readonly string[],
): string {
  return `${current.hash}:${[...reasons].sort().join(',')}`;
}

export function inMemoryLKGStore(opts: InMemoryLKGStoreOptions = {}): InMemoryLKGStore {
  const trackers = new Map<string, InMemoryRegistered>();
  const now = opts.now ?? (() => new Date());

  function lookup(filePath: string): InMemoryRegistered {
    const reg = trackers.get(filePath);
    if (reg === undefined) {
      throw new LKGErrorImpl(
        'LKG_TRACKER_PATH_INVALID',
        `No tracker registered for path: ${filePath}`,
      );
    }
    return reg;
  }

  function recoverFrom<T>(
    reg: InMemoryRegistered<T>,
    raw: string,
    observedAt: string,
  ): { clobberedPath: string; restoredFrom: LKGFingerprint } | null {
    const promoted = reg.entry.lastPromotedGood;
    if (promoted === undefined || reg.lkg === null) return null;
    if (hashRaw(reg.lkg) !== promoted.hash) return null;
    const clobberedPath = `${reg.tracker.path}.clobbered.${observedAt}`;
    reg.clobbered.set(observedAt, raw);
    reg.active = reg.lkg;
    reg.entry = { ...reg.entry, lastObservedSuspiciousSignature: null };
    return { clobberedPath, restoredFrom: promoted };
  }

  function promote<T>(
    reg: InMemoryRegistered<T>,
    raw: string,
    fingerprint: LKGFingerprint,
  ): void {
    reg.lkg = raw;
    reg.entry = {
      ...reg.entry,
      lastKnownGood: fingerprint,
      lastPromotedGood: fingerprint,
      lastObservedSuspiciousSignature: null,
    };
  }

  return {
    register<T>(tracker: LKGTracker<T>): void {
      if (trackers.has(tracker.path)) {
        throw new LKGErrorImpl(
          'LKG_TRACKER_PATH_COLLISION',
          `Tracker already registered for path: ${tracker.path}`,
        );
      }
      trackers.set(tracker.path, {
        tracker: tracker as LKGTracker<unknown>,
        entry: {},
        active: null,
        lkg: null,
        clobbered: new Map(),
      });
    },

    setActive(path: string, content: string): void {
      const reg = lookup(path);
      reg.active = content;
    },

    getActive(path: string): string | null {
      return lookup(path).active;
    },

    getLKG(path: string): string | null {
      return lookup(path).lkg;
    },

    getClobbered(path: string): ReadonlyMap<string, string> {
      return lookup(path).clobbered;
    },

    async observe(filePath: string): Promise<LKGObservation> {
      const reg = lookup(filePath);
      const observedAt = now().toISOString();
      const raw = reg.active;

      if (raw === null) {
        const issues: ValidationIssue[] = [
          { path: '', message: 'no active content', code: 'read-failed' },
        ];
        return { outcome: 'failed', reason: 'read-failed', issues };
      }

      const fingerprint = makeFingerprint({ raw, stat: null, observedAt });

      let parsed: unknown;
      try {
        parsed = (reg.tracker as LKGTracker<unknown>).parse(raw);
      } catch (err) {
        const issues: ValidationIssue[] = [
          { path: '', message: `parse failed: ${(err as Error).message}`, code: 'unparseable' },
        ];
        const skip =
          reg.tracker.shouldRecover !== undefined &&
          reg.tracker.shouldRecover({ valid: false, issues }) === false;
        if (skip) {
          return { outcome: 'skipped', reason: 'tracker-shouldRecover-false', issues };
        }
        const recovery = recoverFrom(reg, raw, observedAt);
        if (recovery === null) {
          return { outcome: 'skipped', reason: 'no-lkg-available', issues };
        }
        return {
          outcome: 'recovered',
          reason: 'unparseable',
          clobberedPath: recovery.clobberedPath,
          restoredFrom: recovery.restoredFrom,
        };
      }

      const validation = (reg.tracker as LKGTracker<unknown>).validate(parsed);

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
        if (
          reg.entry.lastPromotedGood === undefined ||
          reg.entry.lastPromotedGood.hash !== fingerprint.hash
        ) {
          promote(reg, raw, fingerprint);
          return { outcome: 'promoted', fingerprint };
        }
        return { outcome: 'valid', fingerprint };
      }

      if (validation.valid && suspicious.length > 0) {
        const sig = makeSuspiciousSignature(fingerprint, suspicious);
        if (reg.entry.lastObservedSuspiciousSignature === sig) {
          return { outcome: 'valid', fingerprint };
        }
        reg.entry = { ...reg.entry, lastObservedSuspiciousSignature: sig };
        const recovery = recoverFrom(reg, raw, observedAt);
        if (recovery === null) {
          return { outcome: 'skipped', reason: 'no-lkg-available', issues: [] };
        }
        return {
          outcome: 'recovered',
          reason: `suspicious:${suspicious.join(',')}`,
          clobberedPath: recovery.clobberedPath,
          restoredFrom: recovery.restoredFrom,
        };
      }

      const skip =
        reg.tracker.shouldRecover !== undefined &&
        reg.tracker.shouldRecover({
          valid: validation.valid,
          issues: validation.issues,
        }) === false;
      if (skip) {
        return {
          outcome: 'skipped',
          reason: 'plugin-local-invalidity',
          issues: validation.issues,
        };
      }

      const recovery = recoverFrom(reg, raw, observedAt);
      if (recovery === null) {
        return {
          outcome: 'skipped',
          reason: 'no-lkg-available',
          issues: validation.issues,
        };
      }
      return {
        outcome: 'recovered',
        reason: 'invalid',
        clobberedPath: recovery.clobberedPath,
        restoredFrom: recovery.restoredFrom,
      };
    },

    async readLastKnownGood(filePath: string): Promise<Uint8Array> {
      const reg = lookup(filePath);
      if (reg.lkg === null) {
        throw new LKGErrorImpl(
          'LKG_STORE_UNAVAILABLE',
          `LKG not yet established for ${reg.tracker.path}`,
        );
      }
      return new TextEncoder().encode(reg.lkg);
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
