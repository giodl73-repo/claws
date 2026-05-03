/**
 * `@openclaw/lkg-fs` — reference filesystem-backed LKGStore impl.
 *
 * @module @openclaw/lkg-fs
 */

export { FsLKGStore, type FsLKGStoreOptions } from './store.js';
export {
  InMemoryAuditSink,
  type LKGAuditRecord,
  type LKGAuditSink,
} from './audit.js';
export {
  InMemoryRecoveryNoticeSink,
  type LKGRecoveryNotice,
  type LKGRecoveryNoticeSink,
} from './recovery-notice.js';
export { hashRaw, makeFingerprint } from './fingerprint.js';
export { clobberedPathFor, isCompanionPath, lkgPathFor } from './paths.js';
