/**
 * Runtime governance-rule application — the ops-side evaluator that runs
 * against a PolicyIR + a tool-call event to produce a decision plus a
 * violations list.
 *
 * The rule catalogue here is a thin, self-contained backend for the ops
 * code paths (evaluateCompliance dynamic checks, startMockGateway decision
 * loop). The generator half (P51) owns the build-time rule extraction;
 * this module is runtime-time evaluation only.
 *
 * @module @bic/openclaw-policy/governance/rule-apply
 */

import type {
  PolicyIR,
  Sensitivity,
  Capability,
} from '../types/index.js';

export type GovernanceDecision = 'allow' | 'deny' | 'review' | 'modify';

export interface GovernanceEvent {
  readonly toolName: string;
  readonly args: Record<string, unknown>;
  readonly provenance?: readonly ProvenanceTrace[];
}

export interface ProvenanceTrace {
  readonly source: 'user_prompt' | 'tool_output' | 'memory' | 'agent_literal';
  readonly sensitivity: Sensitivity;
}

export interface GovernanceViolation {
  readonly ruleId: string;
  readonly family: string;
  readonly message: string;
}

export interface ApplyResult {
  readonly decision: GovernanceDecision;
  readonly violations: readonly GovernanceViolation[];
  readonly requireApproval: boolean;
  readonly propagatedSensitivity: Sensitivity;
  readonly capabilityClamp: readonly Capability[];
}

const SENSITIVITY_ORDER: readonly Sensitivity[] = ['PUBLIC', 'INTERNAL', 'CONFIDENTIAL', 'RESTRICTED'];

function maxSensitivity(values: readonly Sensitivity[]): Sensitivity {
  if (values.length === 0) return 'PUBLIC';
  let highestIdx = 0;
  for (const v of values) {
    const idx = SENSITIVITY_ORDER.indexOf(v);
    if (idx > highestIdx) highestIdx = idx;
  }
  return SENSITIVITY_ORDER[highestIdx]!;
}

function isSticky(sensitivity: Sensitivity): boolean {
  return sensitivity === 'RESTRICTED';
}

/**
 * R5 invariant: a riskLevel=5 tool must route through review + require
 * approval. Fail-closed (deny) if the tool claims to bypass review.
 */
function checkR5FailClosed(
  ir: PolicyIR,
  event: GovernanceEvent,
): GovernanceViolation[] {
  const tool = ir.tools.find((t) => t.name === event.toolName);
  if (tool === undefined) return [];
  if (tool.riskLevel !== 5) return [];
  if (!tool.capabilities.includes('IRREVERSIBLE_EXTERNAL')) {
    return [{
      ruleId: `R5-${tool.name}`,
      family: 'G-OUTPUT',
      message: `R5 tool ${tool.name} missing IRREVERSIBLE_EXTERNAL capability`,
    }];
  }
  return [];
}

function checkDenyRules(ir: PolicyIR, event: GovernanceEvent): GovernanceViolation[] {
  const out: GovernanceViolation[] = [];
  for (const rule of ir.soul.denyRules) {
    let matches: boolean;
    try {
      matches = new RegExp(rule.pattern).test(event.toolName);
    } catch {
      matches = rule.pattern === event.toolName;
    }
    if (matches) {
      out.push({
        ruleId: rule.id,
        family: 'G-DENY',
        message: rule.reason,
      });
    }
  }
  return out;
}

function propagate(event: GovernanceEvent): Sensitivity {
  if (event.provenance === undefined || event.provenance.length === 0) return 'PUBLIC';
  return maxSensitivity(event.provenance.map((p) => p.sensitivity));
}

function capabilityClamp(ir: PolicyIR, event: GovernanceEvent): readonly Capability[] {
  const tool = ir.tools.find((t) => t.name === event.toolName);
  if (tool === undefined) return [];
  const propagated = propagate(event);
  if (isSticky(propagated)) {
    // Sticky RESTRICTED clamps away COMMUNICATE + IRREVERSIBLE_EXTERNAL.
    return tool.capabilities.filter(
      (c) => c !== 'COMMUNICATE' && c !== 'IRREVERSIBLE_EXTERNAL',
    );
  }
  return tool.capabilities;
}

export function applyRules(ir: PolicyIR, event: GovernanceEvent): ApplyResult {
  const violations: GovernanceViolation[] = [
    ...checkDenyRules(ir, event),
    ...checkR5FailClosed(ir, event),
  ];

  const tool = ir.tools.find((t) => t.name === event.toolName);
  const propagatedSensitivity = propagate(event);
  const clamp = capabilityClamp(ir, event);

  let decision: GovernanceDecision;
  let requireApproval = false;

  if (violations.some((v) => v.family === 'G-DENY')) {
    decision = 'deny';
  } else if (violations.some((v) => v.family === 'G-OUTPUT')) {
    decision = 'review';
    requireApproval = true;
  } else if (tool !== undefined && tool.riskLevel === 5) {
    decision = 'review';
    requireApproval = true;
  } else if (isSticky(propagatedSensitivity) && tool !== undefined) {
    decision = 'modify';
  } else if (tool === undefined) {
    decision = 'review';
    requireApproval = true;
  } else {
    decision = 'allow';
  }

  return {
    decision,
    violations,
    requireApproval,
    propagatedSensitivity,
    capabilityClamp: clamp,
  };
}
