/**
 * CapabilityManifest — declares the agent capabilities subject to governance.
 *
 * @module claws-sdk/ir/capability-manifest
 */

import type { RuleLevel } from './fail-mode.js';

/**
 * Risk classification for a tool.
 */
export type ToolRiskLevel = 'critical' | 'high' | 'medium' | 'low';

/**
 * Tool classification category.
 */
export type ToolClassification =
  | 'filesystem'
  | 'network'
  | 'execution'
  | 'data'
  | 'communication'
  | 'custom';

/**
 * A tool declared in the agent workspace.
 */
export interface ToolCapability {
  readonly name: string;
  readonly description: string;
  /** Risk level assigned during governance analysis. */
  readonly riskLevel: ToolRiskLevel;
  /** Whether this tool operates on-behalf-of another principal. */
  readonly oboFlag: boolean;
  /** Functional classification of the tool. */
  readonly classification: ToolClassification;
  /** Trust labels for external content classification. When present, G-INPUT-02 is satisfied. */
  readonly trustLabels?: readonly string[];
}

/**
 * A skill declared in the agent workspace.
 */
export interface SkillCapability {
  readonly name: string;
  readonly description: string;
  /** Tools this skill may invoke internally. */
  readonly requiredTools: readonly string[];
  /** Minimum rule level that governs this skill. */
  readonly governanceLevel: RuleLevel;
}

/**
 * A delegation map entry — which agent can delegate to which target agents.
 */
export interface DelegationMapEntry {
  /** The delegating agent's name. */
  readonly from: string;
  /** The target agent that receives delegation. */
  readonly to: string;
  /** Scoped permissions the delegation carries. */
  readonly permissions: readonly string[];
}

/**
 * An agent declared in the agent workspace.
 */
export interface AgentCapability {
  readonly name: string;
  readonly description: string;
  /** Delegation map entries for this agent. */
  readonly delegations: readonly DelegationMapEntry[];
  /** Maximum rule level this agent may enforce autonomously. */
  readonly maxAutonomousLevel: RuleLevel;
}

/**
 * A workflow declared in the agent workspace.
 */
export interface WorkflowCapability {
  readonly name: string;
  readonly description: string;
  /** Ordered list of step names in the workflow. */
  readonly steps: readonly string[];
  /** Whether the workflow requires human approval gates. */
  readonly requiresApproval: boolean;
}

/**
 * CapabilityManifest — enumerates all agent capabilities that governance
 * rules may reference, constrain, or audit.
 */
export interface CapabilityManifest {
  readonly tools: readonly ToolCapability[];
  readonly skills: readonly SkillCapability[];
  readonly agents: readonly AgentCapability[];
  readonly workflows: readonly WorkflowCapability[];
}
