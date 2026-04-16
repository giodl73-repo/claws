/**
 * Risk-change audit — compares tool risk classifications between
 * compilations and emits audit events for any changes.
 *
 * Per CISO M3: when a tool's risk classification changes between
 * compilations, emit an audit event with old/new risk + policy delta.
 *
 * @module claws-sdk/governance/risk-change-audit
 */

import type { GovernanceIR } from '../ir/governance-ir.js';
import type { ToolRiskLevel } from '../ir/capability-manifest.js';

/**
 * A single risk-change audit event.
 */
export interface RiskChangeEvent {
  /** Tool name whose risk changed. */
  readonly tool: string;
  /** MCP server hosting the tool (if known). */
  readonly server?: string | undefined;
  /** Previous risk level. */
  readonly oldRisk: ToolRiskLevel;
  /** New risk level. */
  readonly newRisk: ToolRiskLevel;
  /** Numeric delta (positive = escalation, negative = de-escalation). */
  readonly riskDelta: number;
  /** Whether the approval policy changed as a result. */
  readonly policyChanged: boolean;
  /** Old approval requirement (based on default policy mapping). */
  readonly oldRequiresApproval: boolean;
  /** New approval requirement (based on default policy mapping). */
  readonly newRequiresApproval: boolean;
  /** ISO 8601 timestamp of the new compilation. */
  readonly timestamp: string;
  /** Compiler version that produced the new IR. */
  readonly compilerVersion: string;
}

/**
 * Result of risk-change audit comparison.
 */
export interface RiskChangeAuditResult {
  /** Risk-change events (one per changed tool). */
  readonly events: readonly RiskChangeEvent[];
  /** Tools that were added in the new IR (not present in old). */
  readonly addedTools: readonly string[];
  /** Tools that were removed in the new IR (present in old, not in new). */
  readonly removedTools: readonly string[];
  /** Total number of tools compared. */
  readonly totalCompared: number;
}

/** Map ToolRiskLevel to numeric value for delta calculation. */
const RISK_NUMERIC: Record<ToolRiskLevel, number> = {
  low: 2,
  medium: 3,
  high: 4,
  critical: 5,
};

/** Map ToolRiskLevel to default approval requirement. */
function defaultApproval(risk: ToolRiskLevel): boolean {
  return risk !== 'low'; // R3+ requires approval by default
}

/**
 * Compare two GovernanceIRs and emit risk-change audit events for any
 * tools whose risk classification changed between compilations.
 *
 * @param oldIR - The previous compilation's GovernanceIR
 * @param newIR - The new compilation's GovernanceIR
 * @returns Audit result with change events, added/removed tools
 */
export function emitRiskChangeEvents(
  oldIR: GovernanceIR,
  newIR: GovernanceIR,
): RiskChangeAuditResult {
  const oldToolMap = new Map(
    oldIR.capabilities.tools.map(t => [t.name, t]),
  );
  const newToolMap = new Map(
    newIR.capabilities.tools.map(t => [t.name, t]),
  );

  const events: RiskChangeEvent[] = [];
  const addedTools: string[] = [];
  const removedTools: string[] = [];
  let totalCompared = 0;

  // Check tools present in both IRs for risk changes
  for (const [name, newTool] of newToolMap) {
    const oldTool = oldToolMap.get(name);

    if (!oldTool) {
      addedTools.push(name);
      continue;
    }

    totalCompared++;

    if (oldTool.riskLevel !== newTool.riskLevel) {
      const oldNumeric = RISK_NUMERIC[oldTool.riskLevel];
      const newNumeric = RISK_NUMERIC[newTool.riskLevel];
      const oldApproval = defaultApproval(oldTool.riskLevel);
      const newApproval = defaultApproval(newTool.riskLevel);

      events.push({
        tool: name,
        server: newTool.mcpServer,
        oldRisk: oldTool.riskLevel,
        newRisk: newTool.riskLevel,
        riskDelta: newNumeric - oldNumeric,
        policyChanged: oldApproval !== newApproval,
        oldRequiresApproval: oldApproval,
        newRequiresApproval: newApproval,
        timestamp: newIR.compiler.compiledAt,
        compilerVersion: newIR.compiler.compilerVersion,
      });
    }
  }

  // Check for removed tools
  for (const name of oldToolMap.keys()) {
    if (!newToolMap.has(name)) {
      removedTools.push(name);
    }
  }

  return { events, addedTools, removedTools, totalCompared };
}
