/**
 * OBO-WITHOUT-ELICIT conflict detector (CLAWS-C003).
 *
 * Detects when a tool is configured for on-behalf-of (OBO) execution
 * without a user elicitation gate. Checks three sources:
 * - TOOLS.md (oboFlag)
 * - SOUL.md (deny/elicit constraints)
 * - USER.md (authority bounds)
 *
 * Severity is risk-conditional: Error for R4-R5, Warning for R3.
 *
 * @module claws-sdk/compile/conflicts/obo-without-elicit
 */

import type {
  GovernanceAST,
  ParsedManifest,
  ConflictEntry,
  ConflictLevel,
} from '../types.js';

/**
 * Check if a tool has an elicitation gate defined in the AST.
 *
 * An elicitation gate exists if:
 * - SOUL.md has an 'elicit' intent kind referencing the tool
 * - USER.md authority bounds explicitly mention the tool or its risk class
 */
function hasElicitationGate(toolName: string, riskClass: number, ast: GovernanceAST): boolean {
  const normalizedName = toolName.toLowerCase();

  // Check SOUL.md for elicit intents targeting this tool
  for (const group of ast.deny) {
    for (const intent of group.intents) {
      if (intent.intentKind === 'elicit' && intent.pattern.toLowerCase().includes(normalizedName)) {
        return true;
      }
    }
  }

  // Check USER.md authority bounds
  for (const group of ast.authority) {
    for (const intent of group.intents) {
      for (const bound of intent.bounds) {
        const lowerBound = bound.toLowerCase();
        if (lowerBound.includes(normalizedName)) return true;
        // Check risk class approval (e.g., "Approve R1-R5 tool usage")
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
 * Detect OBO-WITHOUT-ELICIT conflicts.
 *
 * For each tool with oboFlag=true, check if there's an elicitation gate.
 * If not, emit a conflict with severity based on risk class.
 */
export function detectOboWithoutElicit(
  ast: GovernanceAST,
  manifest: ParsedManifest,
): ConflictEntry[] {
  const entries: ConflictEntry[] = [];

  for (const tool of manifest.tools) {
    if (!tool.oboFlag) continue;
    if (tool.riskClass < 3) continue; // Only R3+ OBO tools are relevant

    if (!hasElicitationGate(tool.name, tool.riskClass, ast)) {
      // R4-R5: Error (fail-closed), R3: Warning (user confirmation recommended)
      const severity: ConflictLevel = tool.riskClass >= 4 ? 'Error' : 'Warning';

      entries.push({
        category: 'OBO-WITHOUT-ELICIT',
        code: 'CLAWS-C003',
        severity,
        locationA: { file: tool.source, line: tool.line },
        locationB: { file: 'USER.md', line: 1 }, // USER.md missing elicitation gate
        explanation: `Tool "${tool.name}" (R${tool.riskClass}) has OBO flag but no elicitation gate — ${severity === 'Error' ? 'R4+ fail-closed' : 'R3 requires user confirmation'}`,
      });
    }
  }

  return entries;
}
