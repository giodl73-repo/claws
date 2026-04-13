/**
 * Emit layer — template-driven code generation for governance artifacts.
 *
 * @module claws-sdk/emit
 */

export {
  emitPlugin,
  verifyNoForbiddenImports,
  verifyCatchClauses,
  type EmitPluginOptions,
  type EmitPluginResult,
} from './emit-plugin.js';

export {
  invertWorkflow,
  governanceStepName,
  type WorkflowDAG,
  type WorkflowStepNode,
  type CompiledWorkflow,
  type ToolRiskMap,
  type GovernanceStepType,
} from './emit-workflow.js';

export {
  emitSkill,
  type EmitSkillOptions,
  type EmitSkillResult,
} from './emit-skill.js';

export {
  emitExecApprovals,
  OC_EXEC_APPROVALS_SCHEMA,
  type EmitExecApprovalsOptions,
  type ExecApprovalsResult,
  type ExecApprovalEntry,
  type ExecApprovalsDocument,
} from './emit-exec-approvals.js';

export {
  buildLossMatrix,
  platformLossScore,
  featureLoss,
  canEnforceAtL2,
  type LossMatrix,
  type LossMatrixCell,
  type GovernanceFeature,
} from './loss-matrix.js';

export {
  routeAndEmit,
  type PlatformRouterOptions,
  type PlatformRouteResult,
  type MultiPlatformEmitResult,
  type StrictLossBlockedPlatform,
} from './platform-router.js';

export {
  getAdapter,
  getAllAdapters,
  type PlatformAdapter,
  type PlatformEmitResult,
  type EmittedArtifact,
} from './platforms/index.js';
