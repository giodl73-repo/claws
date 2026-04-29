/**
 * @bic/openclaw-snap — content-addressable snapshot store + ref/pointer layer.
 *
 * **Two layers** (see `types.ts`):
 *
 *   Layer 1 — `SnapshotStore`  immutable bundles. capture/read/list.
 *                              The v2 contract being proposed upstream.
 *
 *   Layer 2 — `RefStore`        mutable per-workspace pointers (HEAD,
 *                              STAGE, history). Downstream-only; not
 *                              part of the upstream PR.
 *
 * Lifecycle verbs (promote, rollback, stage, discard) compose these two
 * primitives in the claws CLI — see `packages/claws/src/commands/snap-*.ts`.
 *
 * @module @bic/openclaw-snap
 */

export type {
  ListOpts,
  RefStore,
  Snapshot,
  SnapshotError,
  SnapshotErrorCode,
  SnapshotId,
  SnapshotInternalPath,
  SnapshotStore,
  WorkspaceId,
} from './types.js';
export { SnapshotErrorImpl } from './types.js';

export { inMemoryStore, filesystemStore } from './store/index.js';
export type {
  InMemorySnapshotStore,
  InMemoryStoreOptions,
} from './store/inMemoryStore.js';
export type { FilesystemStoreOptions } from './store/filesystemStore.js';

export { workspaceRefStore, inMemoryRefStore } from './refs/index.js';
export type {
  WorkspaceRefStoreOptions,
  InMemoryRefStoreOptions,
} from './refs/index.js';

export {
  canonicalize,
  canonicalHash,
  CANONICALIZER_VERSION,
  canonicalizerAlgorithmVersion,
  CanonicalizeError,
  CanonicalizerVersionMismatchError,
} from '@bic/openclaw-workspace/canonicalize';
export {
  computeSnapshotId,
  computePolicyId,
  POLICY_IR_PATH,
} from './canonical.js';
