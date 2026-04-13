/**
 * SCHEDULE-NO-APPROVAL conflict detector (CLAWS-C007).
 *
 * Detects when HEARTBEAT.md schedules R4+ tool execution without
 * pre-authorization. Resolves transitively: schedule -> workflow -> tool.
 *
 * Also detects perpetual denial: scheduled R5 tools that always hit
 * deny constraints (P-054).
 *
 * @module claws-sdk/compile/conflicts/schedule-no-approval
 */

import type {
  GovernanceAST,
  ParsedManifest,
  ConflictEntry,
  ToolRiskClass,
} from '../types.js';

/**
 * Resolve tool references from schedule actions.
 *
 * Checks both direct tool references in action text and transitive
 * references through workflows.
 */
function resolveScheduleTools(
  actions: readonly string[],
  ast: GovernanceAST,
  manifest: ParsedManifest,
): Array<{ toolName: string; riskClass: ToolRiskClass; toolLine: number }> {
  const resolved: Array<{ toolName: string; riskClass: ToolRiskClass; toolLine: number }> = [];

  // Build tool lookup
  const toolMap = new Map<string, { riskClass: ToolRiskClass; line: number }>();
  for (const tool of manifest.tools) {
    toolMap.set(tool.normalizedName, { riskClass: tool.riskClass, line: tool.line });
    toolMap.set(tool.name.toLowerCase(), { riskClass: tool.riskClass, line: tool.line });
  }

  // Build workflow lookup (name -> step commands)
  const workflowSteps = new Map<string, string[]>();
  for (const group of ast.workflow) {
    for (const workflow of group.intents) {
      const commands = workflow.steps.map(s => s.command);
      workflowSteps.set(workflow.name.toLowerCase(), commands);
    }
  }

  for (const action of actions) {
    const actionLower = action.toLowerCase();

    // Direct tool reference check
    for (const [toolName, info] of toolMap) {
      if (actionLower.includes(toolName)) {
        resolved.push({ toolName, riskClass: info.riskClass, toolLine: info.line });
      }
    }

    // Workflow reference check (transitive resolution)
    for (const [wfName, commands] of workflowSteps) {
      if (actionLower.includes(wfName)) {
        // Resolve tools from workflow steps
        for (const command of commands) {
          const cmdLower = command.toLowerCase();
          for (const [toolName, info] of toolMap) {
            if (cmdLower.includes(toolName)) {
              resolved.push({ toolName, riskClass: info.riskClass, toolLine: info.line });
            }
          }
        }
      }
    }
  }

  // Deduplicate
  const seen = new Set<string>();
  return resolved.filter(r => {
    if (seen.has(r.toolName)) return false;
    seen.add(r.toolName);
    return true;
  });
}

/**
 * Check if a tool has pre-authorization in USER.md authority bounds.
 */
function hasPreAuthorization(toolName: string, riskClass: number, ast: GovernanceAST): boolean {
  for (const group of ast.authority) {
    for (const intent of group.intents) {
      for (const bound of intent.bounds) {
        const lowerBound = bound.toLowerCase();
        if (lowerBound.includes(toolName.toLowerCase())) return true;
        // Check risk class authorization (e.g., "Approve R4+ tool usage")
        if (lowerBound.includes(`r${riskClass}`) || lowerBound.includes(`r1-r${riskClass}`)) return true;
        // Check range patterns (e.g., "R1-R3")
        const rangeMatch = /r(\d)-r(\d)/i.exec(lowerBound);
        if (rangeMatch) {
          const low = parseInt(rangeMatch[1]!, 10);
          const high = parseInt(rangeMatch[2]!, 10);
          if (riskClass >= low && riskClass <= high) return true;
        }
      }
    }
  }
  return false;
}

/**
 * Detect SCHEDULE-NO-APPROVAL conflicts.
 *
 * For each schedule in HEARTBEAT.md, resolve the tools involved
 * (directly or transitively through workflows) and check if R4+
 * tools have pre-authorization.
 */
export function detectScheduleNoApproval(
  ast: GovernanceAST,
  manifest: ParsedManifest,
): ConflictEntry[] {
  const entries: ConflictEntry[] = [];

  for (const group of ast.schedule) {
    for (const schedule of group.intents) {
      const resolvedTools = resolveScheduleTools(schedule.actions, ast, manifest);

      for (const tool of resolvedTools) {
        if (tool.riskClass < 4) continue;

        if (!hasPreAuthorization(tool.toolName, tool.riskClass, ast)) {
          // Check for perpetual denial (P-054): scheduled R5 tool that hits deny constraint
          const hasDenyConstraint = manifest.tools.some(
            t => t.normalizedName === tool.toolName.toLowerCase() && t.denyConstraints.length > 0,
          );

          const isPerpetualDenial = tool.riskClass >= 5 && hasDenyConstraint;

          entries.push({
            category: 'SCHEDULE-NO-APPROVAL',
            code: 'CLAWS-C007',
            severity: 'Error',
            locationA: { file: group.source, line: schedule.line },
            locationB: { file: 'TOOLS.md', line: tool.toolLine },
            explanation: isPerpetualDenial
              ? `Schedule "${schedule.trigger}" invokes R${tool.riskClass} tool "${tool.toolName}" without pre-authorization AND tool hits deny constraint — perpetual denial`
              : `Schedule "${schedule.trigger}" invokes R${tool.riskClass} tool "${tool.toolName}" without pre-authorization`,
          });
        }
      }
    }
  }

  return entries;
}
