/**
 * @bic/openclaw-policy/trust-set — public barrel.
 *
 * Consumed by pulse 49's `handle-binding` validator via the `trustSet`
 * dependency: `deps.trustSet = getTrustSet()` where `getTrustSet` is the
 * accessor returned from a live `createTrustSetLoader` instance.
 *
 * @module @bic/openclaw-policy/trust-set
 */

export { createTrustSetLoader } from './loader.js';
export type {
  CreateTrustSetLoaderOptions,
  FsWatcherFactory,
} from './loader.js';
export type {
  Clock,
  Disposable,
  TrustSetEntry,
  TrustSetLoader,
  TrustSetSnapshot,
} from './types.js';
