/**
 * @bic/claws-skill-kit — skill factory and governance decorators for OC skills.
 *
 * @module @bic/claws-skill-kit
 */

export { skill } from './factory/skill.js';
export { obo, classify, audit, validate, budget, timeout } from './decorators/index.js';
export {
  GOVERNANCE_METADATA_KEY,
  getGovernanceMetadata,
  RISK_LEVEL_MAP,
  type OboBoundary,
  type RiskLevelCode,
  type GovernanceAnnotation,
  type SkillGovernanceMetadata,
  type SkillHandler,
} from './types.js';

// Mock infrastructure for testing governance-aware skills
export { MockGateway } from './mock/mock-gateway.js';
export type { GatewayDecision, BeforeToolCallEvent, MockGatewayConfig } from './mock/mock-gateway.js';
export { MockApproval } from './mock/mock-approval.js';
export type { ApprovalProvider, ApprovalResult, MockApprovalConfig } from './mock/mock-approval.js';
export { MockTools } from './mock/mock-tools.js';
export type { ToolCallRecord } from './mock/mock-tools.js';

// Schema — SKILL.md governance frontmatter validation
export { GovernanceAnnotationSchema, parseAnnotation } from './schema/annotation.js';
export { propagateToDecorators } from './schema/propagation.js';
export type { GovernanceFrontmatter, AnnotationError, AnnotationParseResult } from './schema/types.js';
export type { DecoratorArgMap } from './schema/propagation.js';
