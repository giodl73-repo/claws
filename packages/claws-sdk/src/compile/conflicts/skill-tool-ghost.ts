/**
 * SKILL-TOOL-GHOST conflict detector (CLAWS-C006).
 *
 * Detects when a skill references a tool not declared in TOOLS.md.
 * Uses fuzzy matching (Levenshtein distance <= 2) to suggest the
 * closest declared tool for phantom references.
 *
 * @module claws-sdk/compile/conflicts/skill-tool-ghost
 */

import type {
  GovernanceAST,
  ParsedManifest,
  ConflictEntry,
} from '../types.js';
import { levenshtein } from '../../util/levenshtein.js';

/**
 * Find the closest declared tool name for a phantom reference.
 *
 * Returns the match and distance if Levenshtein distance <= 2,
 * or undefined otherwise.
 */
function findClosestTool(
  phantomName: string,
  declaredTools: ReadonlySet<string>,
): { name: string; distance: number } | undefined {
  const normalized = phantomName.toLowerCase();
  let bestMatch: string | undefined;
  let bestDistance = 3; // threshold: distance must be <= 2

  for (const declared of declaredTools) {
    const distance = levenshtein(normalized, declared.toLowerCase());
    if (distance < bestDistance) {
      bestDistance = distance;
      bestMatch = declared;
    }
  }

  if (bestMatch !== undefined) {
    return { name: bestMatch, distance: bestDistance };
  }
  return undefined;
}

/**
 * Detect SKILL-TOOL-GHOST conflicts.
 *
 * For each skill's required tools, check if the tool is declared in
 * TOOLS.md. If not, emit a conflict with fuzzy match suggestion.
 */
export function detectSkillToolGhost(
  _ast: GovernanceAST,
  manifest: ParsedManifest,
): ConflictEntry[] {
  const entries: ConflictEntry[] = [];

  // Build set of declared tool names (normalized)
  const declaredTools = new Set<string>();
  const declaredToolNames = new Set<string>();
  for (const tool of manifest.tools) {
    declaredTools.add(tool.normalizedName);
    declaredToolNames.add(tool.name);
  }

  for (const skill of manifest.skills) {
    for (const requiredTool of skill.requiredTools) {
      const normalized = requiredTool.toLowerCase().replace(/\s+/g, '-');

      // Check if the tool is declared
      if (declaredTools.has(normalized)) continue;

      // Find closest match for suggestion
      const closest = findClosestTool(requiredTool, declaredToolNames);
      const suggestion = closest !== undefined
        ? ` — did you mean "${closest.name}"?`
        : '';

      entries.push({
        category: 'SKILL-TOOL-GHOST',
        code: 'CLAWS-C006',
        severity: 'Warning',
        locationA: { file: skill.source, line: skill.line },
        locationB: { file: 'TOOLS.md', line: 1 }, // Tool is missing from TOOLS.md
        explanation: `Skill "${skill.name}" references undeclared tool "${requiredTool}"${suggestion}`,
      });
    }
  }

  return entries;
}
