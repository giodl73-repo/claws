/**
 * Adapter layer — platform-specific adapters for governance output.
 *
 * @module claws-sdk/adapter
 */

export type {
  GovernanceHost,
  PolicyResult,
} from './governance-host.js';
export {
  GOVERNANCE_HOST_FACETS,
} from './governance-host.js';

export type {
  GovernanceConcept,
  OCEventName,
  HookMapping,
} from './hook-registry.js';
export {
  getAllMappings,
  getOCEvent,
  getMapping,
  getRequiredMappings,
  ALL_CONCEPTS,
} from './hook-registry.js';

export type {
  OCToolPolicy,
  OCHookConfig,
  RiskMapEntry,
} from './oc-data-adapter.js';
export {
  buildRiskMap,
  toOCToolPolicies,
  toOCDelegationMap,
} from './oc-data-adapter.js';
