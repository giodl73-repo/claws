/**
 * @bic/openclaw-policy/trust-set — `fs.watch`-backed reloader (pulse 50 / P-04).
 *
 * Decouples `trust-set.json` reload from `onSnapshotPromoted`. Either signal
 * can trigger reload; they do not gate each other (CL-07 §1a). Parse failures
 * retain the prior in-memory snapshot and emit a `TrustSetReloadFailedEntry`
 * to the audit sink. After 30s of consecutive failures the snapshot is marked
 * `stale: true` so callers can fail closed.
 *
 * @module @bic/openclaw-policy/trust-set/loader
 */

import { readFileSync, watch as nodeFsWatch } from 'node:fs';
import type { TrustSetReloadFailedSink } from '@bic/openclaw-guardrails/audit';
import type {
  Clock,
  Disposable,
  TrustSetEntry,
  TrustSetLoader,
  TrustSetSnapshot,
} from './types.js';

/** Debounce window for `fs.watch` bursts — 50ms. */
const DEBOUNCE_MS = 50;
/** Staleness budget — 30 seconds without a successful reload. */
const STALENESS_BUDGET_MS = 30_000;

/** Factory signature for the underlying watcher. Tests inject a synthetic. */
export type FsWatcherFactory = (
  path: string,
  listener: (eventType: string, filename: string | null) => void,
) => { close(): void };

const DEFAULT_WATCHER_FACTORY: FsWatcherFactory = (path, listener) =>
  nodeFsWatch(path, { persistent: false }, listener);

/**
 * Extract a message from an unknown thrown value. Centralised so the two
 * audit-sink call sites share one branch instead of two.
 */
function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

/** Loader construction input. */
export interface CreateTrustSetLoaderOptions {
  /** Absolute path to `trust-set.json`. */
  readonly path: string;
  /** Full clock — production wires `Date.now` + native `setTimeout`. */
  readonly clock: Clock;
  /** Sink for `TrustSetReloadFailedEntry` events. */
  readonly auditSink: TrustSetReloadFailedSink;
  /** Optional watcher factory — defaults to `node:fs.watch`. */
  readonly watcherFactory?: FsWatcherFactory;
}

interface ParsedTrustSet {
  readonly entries: readonly TrustSetEntry[];
}

/** Parse raw JSON into `TrustSetEntry[]`. Throws on malformed input. */
function parseTrustSet(raw: string, nowMs: number): ParsedTrustSet {
  const parsed: unknown = JSON.parse(raw);
  if (!Array.isArray(parsed)) {
    throw new Error('trust-set: expected a JSON array at top level');
  }
  const entries: TrustSetEntry[] = [];
  for (let i = 0; i < parsed.length; i += 1) {
    const raw = parsed[i];
    if (raw === null || typeof raw !== 'object') {
      throw new Error(`trust-set: entry ${i} is not an object`);
    }
    const record = raw as Record<string, unknown>;
    const keyId = record['keyId'];
    const hmacSecret = record['hmacSecret'];
    const notAfter = record['notAfter'];
    if (typeof keyId !== 'string' || keyId.length === 0) {
      throw new Error(`trust-set: entry ${i} missing keyId`);
    }
    if (typeof hmacSecret !== 'string' || hmacSecret.length === 0) {
      throw new Error(`trust-set: entry ${i} missing hmacSecret`);
    }
    if (typeof notAfter !== 'number' || !Number.isFinite(notAfter)) {
      throw new Error(`trust-set: entry ${i} missing numeric notAfter`);
    }
    entries.push({
      keyId,
      hmacSecret,
      notAfter,
      expired: nowMs > notAfter,
    });
  }
  return { entries };
}

/**
 * Create a trust-set loader. The initial parse is synchronous and throws
 * on construction failure — malformed input must never silently pin callers
 * to an empty trust set.
 */
export function createTrustSetLoader(
  opts: CreateTrustSetLoaderOptions,
): TrustSetLoader {
  const factory = opts.watcherFactory ?? DEFAULT_WATCHER_FACTORY;

  const initialRaw = readFileSync(opts.path, 'utf8');
  const initialNow = opts.clock.now();
  const initial = parseTrustSet(initialRaw, initialNow);

  let currentEntries: readonly TrustSetEntry[] = initial.entries;
  let lastSuccessfulReloadAt = initialNow;
  let lastAttemptFailed = false;
  let closed = false;
  let pendingDebounce: Disposable | undefined;

  const performReload = (): void => {
    const attemptedAt = opts.clock.now();
    let raw: string;
    try {
      raw = readFileSync(opts.path, 'utf8');
    } catch (err) {
      lastAttemptFailed = true;
      opts.auditSink({
        type: 'trust-set-reload-failed',
        path: opts.path,
        error: errorMessage(err),
        lastSuccessfulReloadAt,
        attemptedAt,
        stale: attemptedAt - lastSuccessfulReloadAt > STALENESS_BUDGET_MS,
      });
      return;
    }
    try {
      const next = parseTrustSet(raw, attemptedAt);
      currentEntries = next.entries;
      lastSuccessfulReloadAt = attemptedAt;
      lastAttemptFailed = false;
    } catch (err) {
      lastAttemptFailed = true;
      opts.auditSink({
        type: 'trust-set-reload-failed',
        path: opts.path,
        error: errorMessage(err),
        lastSuccessfulReloadAt,
        attemptedAt,
        stale: attemptedAt - lastSuccessfulReloadAt > STALENESS_BUDGET_MS,
      });
    }
  };

  const onFsEvent = (): void => {
    if (closed) return;
    if (pendingDebounce !== undefined) {
      pendingDebounce.dispose();
    }
    pendingDebounce = opts.clock.setTimeout(() => {
      pendingDebounce = undefined;
      performReload();
    }, DEBOUNCE_MS);
  };

  const watcher = factory(opts.path, onFsEvent);

  return {
    get(): TrustSetSnapshot {
      const now = opts.clock.now();
      const stale =
        lastAttemptFailed && now - lastSuccessfulReloadAt > STALENESS_BUDGET_MS;
      return {
        entries: currentEntries,
        lastSuccessfulReloadAt,
        stale,
      };
    },
    close(): void {
      if (closed) return;
      closed = true;
      if (pendingDebounce !== undefined) {
        pendingDebounce.dispose();
        pendingDebounce = undefined;
      }
      watcher.close();
    },
  };
}
