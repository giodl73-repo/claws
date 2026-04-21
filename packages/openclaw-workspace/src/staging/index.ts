/**
 * @bic/openclaw-workspace/staging — read/write pair for the snap pipeline.
 *
 * - `readStagedOrCanonical(root)` — read the working tree with `.stage/`
 *   overlay taking precedence.
 * - `writeAtomic(absPath, contents)` — tmp+rename file write.
 * - `writeSnapshotFiles(root, files)` — materialize a snapshot map onto
 *   disk atomically.
 * - `clearStage(root)` — remove `<root>/.stage/` entirely.
 *
 * @module @bic/openclaw-workspace/staging
 */

export { readStagedOrCanonical } from './readStagedOrCanonical.js';
export { writeAtomic, writeSnapshotFiles, clearStage } from './writeAtomic.js';
