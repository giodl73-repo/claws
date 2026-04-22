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

/**
 * Where a tool argument's value originates. Consumers of `argsFrom` use this
 * to reason about compile-time escalation:
 *
 *  - `user_prompt`           — free-form user input, unclassified.
 *  - `{ tool_output: id }`   — another tool's output; `classification`
 *                              may mark the upstream output's sensitivity
 *                              so the generator can escalate the consuming
 *                              tool's effective tier.
 *  - `{ memory: Sensitivity }` — memory store tagged with its sensitivity.
 *  - `agent_literal`         — literal embedded in the agent authoring.
 *  - `RESTRICTED-classifier` — a compile-time provenance tag asserting the
 *                              value came from a RESTRICTED classifier /
 *                              data source. Triggers the SC-05 generator
 *                              escalation path directly.
 */
export type ProvenanceSource =
  | 'user_prompt'
  | { tool_output: string; optional?: boolean; classification?: Sensitivity }
  | { memory: Sensitivity }
  | 'agent_literal'
  | 'RESTRICTED-classifier';

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

export interface SourceLocation {
  path: string;
  line: number;
  column: number;
}

/**
 * Tier label used in `policy-ir.json` for cross-plane audit alignment.
 * Mirrors the `Tier` union in `test/e2e/harness/audit-types.ts` so a
 * `DecisionEntry.effectiveTier` read from an audit log can be compared
 * directly against `ToolSpec.effectiveTier` from the generated IR.
 */
export type PolicyTier = 'R0' | 'R1' | 'R2' | 'R3' | 'R4' | 'R5';

export interface ToolSpec {
  name: string;
  riskLevel: RiskLevel;
  capabilities: Capability[];
  argsFrom?: Record<string, ProvenanceSource[]>;
  failOpen?: boolean;
  sourceLocation?: SourceLocation;
  /**
   * Declared baseline sensitivity from the tool's TOOLS.md entry. Absent
   * when no declaration is present; G-CHAIN callers treat absence as
   * `'PUBLIC'` and may elevate the effective value via `args_from`
   * propagation (CL-07 §1a G-CHAIN, SC-15).
   */
  sensitivity?: Sensitivity;
  /**
   * Tier the tool author declared in TOOLS.md. Emitted to `policy-ir.json`
   * by the generator. Absent means the generator has not populated the
   * field; consumers should fall back to mapping `riskLevel` →
   * `R${riskLevel}`.
   */
  declaredTier?: PolicyTier;
  /**
   * Tier after compile-time escalation rules fire. When the generator
   * observes a `RESTRICTED-classifier` provenance on any `argsFrom` entry
   * it sets `effectiveTier: 'R5'` even if `declaredTier` was lower
   * (SC-05 axis). Absent means the generator has not populated the
   * field; consumers fall back to `declaredTier`.
   */
  effectiveTier?: PolicyTier;
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
  /**
   * Structured generator-level diagnostics (pulse 53, CP-6). Populated when
   * a declaration-lowering validator (e.g. r5-fail-open) rejects a tool.
   * The plain `diagnostics` array mirrors these as `severity: 'error'`
   * entries so existing consumers (strict flag, CLI handler) keep working.
   */
  generatorDiagnostics?: GeneratorDiagnosticEntry[];
}

export interface GeneratorDiagnosticEntry {
  kind: 'r5-fail-open';
  toolName: string;
  sourcePath: string;
  line: number;
  column: number;
  invalidReason: 'r5-fail-open-declared';
  message: string;
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
