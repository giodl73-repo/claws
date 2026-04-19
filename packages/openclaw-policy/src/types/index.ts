/**
 * @bic/openclaw-policy/types — type-only exports (zero runtime code).
 *
 * PolicyIR + per-field types. Consumers that only need to type-check against
 * the IR shape should import from this subpath to get the lightest footprint
 * (the build emits only `.d.ts` content for this module).
 *
 * @module @bic/openclaw-policy/types
 */

export type RiskLevel = 0 | 1 | 2 | 3 | 4 | 5;

export type Sensitivity =
  | 'PUBLIC'
  | 'INTERNAL'
  | 'CONFIDENTIAL'
  | 'RESTRICTED';

export type Capability =
  | 'READ'
  | 'WRITE'
  | 'COMMUNICATE'
  | 'IRREVERSIBLE_EXTERNAL'
  | 'FLEET_PRIVILEGED'
  | 'IDENTITY';

export type ProvenanceSource =
  | 'user_prompt'
  | { tool_output: string; optional?: boolean }
  | { memory: Sensitivity }
  | 'agent_literal';

export interface DenyRule {
  id: string;
  pattern: string;
  reason: string;
  severity: 'block' | 'review';
}

export interface AuthorityBound {
  scope: string;
  grants: string[];
}

export interface Boundary {
  from: string;
  to: string;
  kind: 'delegation' | 'isolation' | 'handoff';
}

export interface GovernanceRule {
  id: string;
  family: string;
  predicate: string;
  level: 'error' | 'warning' | 'info';
}

export interface Edge {
  from: string;
  to: string;
  sensitivity: Sensitivity;
}

export interface ToolSpec {
  name: string;
  riskLevel: RiskLevel;
  capabilities: Capability[];
  argsFrom?: Record<string, ProvenanceSource[]>;
}

export interface SkillSpec {
  path: string;
  riskLevel: RiskLevel;
  sensitivity: Sensitivity;
  declaredCapabilities: Capability[];
}

export interface PolicyIR {
  version: string;
  policyId: string;
  canonicalizerVersion: string;

  soul: {
    denyRules: DenyRule[];
    modelAllowlist: string[];
    tone: string;
  };

  user: {
    oboScope: string[];
    authorityBounds: AuthorityBound[];
  };

  agents: {
    delegationMap: Record<string, string[]>;
    architectureBoundaries: Boundary[];
  };

  tools: ToolSpec[];

  skills: SkillSpec[];

  governance: {
    rules: GovernanceRule[];
    sensitivityPropagation: Edge[];
    governanceSurface: string[];
  };

  identity: { name: string; emoji?: string };
}

export interface Diagnostic {
  code: string;
  severity: 'error' | 'warning' | 'info';
  message: string;
  path?: string;
  line?: number;
  column?: number;
}

export interface GenerateOptions {
  workspaceRoot: string;
  strict?: boolean;
}

export interface GenerateResult {
  workspaceRoot: string;
  writtenFiles: string[];
  diagnostics: Diagnostic[];
}

export interface CheckResult {
  ok: boolean;
  diagnostics: Diagnostic[];
}

export interface WatchHandle {
  close(): Promise<void>;
}

export interface DiffResult {
  from: string;
  to: string;
  changed: boolean;
  added: string[];
  removed: string[];
  modified: string[];
}
