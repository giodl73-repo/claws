/**
 * @bic/openclaw-snap — OpenClaw snapshot registry.
 *
 * HTTP-only surface per snap.md §Interface: a `SnapshotStore` interface
 * with two reference implementations (in-memory, filesystem) and a
 * `startServer` entry point that serves nine endpoints.
 *
 * No library-first working-tree API — `readWorkingTree` / `computeDraft`
 * / `applyCheckout` / `clearStage` were reverted from the spec (see
 * claws-pre-extraction-packaging plan §4). Consumers interact over HTTP.
 *
 * @module @bic/openclaw-snap
 */

export type {
  ListOpts,
  PromoteContext,
  ResolveResult,
  Snapshot,
  SnapshotMeta,
  SnapshotStatus,
  SnapshotStore,
  SnapError,
  SnapErrorCode,
} from './types.js';

export { inMemoryStore, filesystemStore } from './store/index.js';
export { startServer } from './server/index.js';
export type { ServerHandle, StartServerOptions } from './server/startServer.js';
