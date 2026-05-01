/**
 * @bic/v2-prototype — temporary local fork of the v2 upstream openclaw
 * contract types being proposed in the Hapi-the-Bringer wave.
 *
 * **TEMPORARY — DELETE WHEN UPSTREAM LANDS.** When the upstream PRs
 * (`v2-snap-contract.md`, `v2-policy-ir.md`) merge at `openclaw/openclaw`,
 * downstream consumers swap their imports:
 *
 *   - `@bic/v2-prototype/snapshot` → `@openclaw/plugin-sdk/snapshot`
 *   - `@bic/v2-prototype/policy-ir` → `@openclaw/plugin-sdk/policy-ir`
 *   - `@bic/v2-prototype/policy-ir-runtime` → `@openclaw/plugin-sdk/policy-ir-runtime`
 *   - `@bic/v2-prototype/hook-types-extension` → upstream `PluginHookToolContext`
 *      (the field becomes part of the upstream type; the extension shim
 *      becomes redundant)
 *
 * The package is deletable in one git commit; nothing in this package's
 * runtime persists after upstream lands.
 *
 * Why a separate package (rather than inlining in each consumer): we
 * want every downstream package to reference the SAME `SnapshotId` and
 * `PolicyIR` types. Inlining would let `openclaw-snap`'s `SnapshotId`
 * drift from `openclaw-policy`'s; the package keeps them aligned.
 *
 * @module @bic/v2-prototype
 */

export type {
  CanonicalManifest,
  Snapshot,
  SnapshotError,
  SnapshotErrorCode,
  SnapshotId,
  SnapshotInternalPath,
  SnapshotStore,
  WorkspaceId,
} from './snapshot.js';

export type {
  Decision,
  DenyRule,
  PolicyGenerator,
  PolicyIR,
  RiskLevel,
  Sensitivity,
  ToolSpec,
} from './policy-ir.js';

export { POLICY_IR_PATH } from './policy-ir.js';

export {
  getCurrentPolicyIR,
  loadPolicyIR,
  readPolicyIR,
  validatePolicyIR,
} from './policy-ir-runtime.js';

export type { PluginHookToolContextExtension } from './hook-types-extension.js';

export type {
  LKGEntry,
  LKGError,
  LKGErrorCode,
  LKGFingerprint,
  LKGObservation,
  LKGStore,
  LKGTracker,
  ValidationIssue,
  ValidationResult,
} from './lkg.js';
export { LKGErrorImpl } from './lkg.js';
