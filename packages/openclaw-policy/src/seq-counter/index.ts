/**
 * @bic/openclaw-policy/seq-counter — public barrel.
 *
 * The per-`(providerId, snapshotId)` sequence counter store is consumed by
 * the handle-issuer path: `appendSeq(n) → fsync → sign(handle with n) →
 * return`. Pulse 58 D1. The validator's `sequenceHighWaterMark` context
 * field is read from `store.read(providerId, snapshotId)`.
 *
 * @module @bic/openclaw-policy/seq-counter
 */

export { SeqCounterStore } from './store.js';
export type {
  IncrementResult,
  SeqCounterStoreOptions,
} from './store.js';
