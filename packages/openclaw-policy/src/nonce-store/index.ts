/**
 * @bic/openclaw-policy/nonce-store — public barrel.
 *
 * The persistent nonce store is consumed by pulse 49's handle-binding
 * validator via the injected `validateNonce` predicate. Production wiring
 * constructs a single `PersistentNonceStore`, calls `replayOnStartup()`
 * before the server accepts traffic, and passes
 *
 *   validateNonce(nonce, scopeString) =>
 *     store.accept(nonce, parse(scopeString)).ok
 *
 * as the validator dep.
 *
 * @module @bic/openclaw-policy/nonce-store
 */

export {
  DEFAULT_MAX_NONCES_PER_SCOPE,
  PersistentNonceStore,
} from './persistent-store.js';
export type {
  AcceptResult,
  PersistentNonceStoreOptions,
} from './persistent-store.js';
