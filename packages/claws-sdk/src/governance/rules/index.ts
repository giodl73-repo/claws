/**
 * Governance rules — individual rule definitions and evaluation.
 *
 * @module claws-sdk/governance/rules
 */

export {
  classifyTool,
  classifyManifest,
  normalizeCapability,
  createGClassRules,
  CAPABILITY_RISK_MAP,
  PLATFORM_DEFAULTS,
  type ClassificationResult,
  type ClassificationOverride,
  type Capability,
} from './g-class.js';
export { createGPermRules } from './g-perm.js';
export {
  createGA2ARules,
  type A2AConfig,
  type SubagentDeclaration,
  type SensitivityLabel as A2ASensitivityLabel,
} from './g-a2a.js';
export {
  createGElicitRules,
  type ElicitConfig,
  type ElicitToolEntry,
} from './g-elicit.js';
export {
  createGDataRules,
  SENSITIVITY_ORDER,
  type DataConfig,
  type DataFlowEntry,
  type SensitivityLabel as DataSensitivityLabel,
} from './g-data.js';
export { createGInputRules } from './g-input.js';
export { createGContextRules } from './g-context.js';
export { createGOutputRules } from './g-output.js';
export { createGBoundRules } from './g-bound.js';
export { createGSupplyRules } from './g-supply.js';
