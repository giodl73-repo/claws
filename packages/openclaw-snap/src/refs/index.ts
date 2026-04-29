/**
 * @bic/openclaw-snap/refs — RefStore implementations (layer 2).
 *
 * `workspaceRefStore` for local-mode (file-backed under a workspace dir).
 * `inMemoryRefStore` for tests and single-process e2e.
 *
 * Production gateways targeting a shared backend should ship a separate
 * `RefStore` impl (e.g. S3 with conditional PUT, or a row-locked DB).
 *
 * @module @bic/openclaw-snap/refs
 */

export { workspaceRefStore } from './workspaceRefStore.js';
export type { WorkspaceRefStoreOptions } from './workspaceRefStore.js';
export { inMemoryRefStore } from './inMemoryRefStore.js';
export type { InMemoryRefStoreOptions } from './inMemoryRefStore.js';
