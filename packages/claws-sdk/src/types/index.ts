/**
 * Shared types for claws-sdk.
 *
 * @module claws-sdk/types
 */

export type { ClawsSidecarDir } from './sidecar.js';
export { initSidecar, CLAWS_SIDECAR_LAYOUT, CLAWS_CONFIG_FILE, CLAWS_SIDECAR_VERSION, CLAWS_GITIGNORE_DIRS } from './sidecar.js';
export type { Platform, EnforcementModel, PlatformCapability } from './platform.js';
export type { EnforcementCapabilityVector, LossMatrixEntry } from './loss-matrix.js';
