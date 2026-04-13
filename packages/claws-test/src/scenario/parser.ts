/**
 * SKILL.md scenario section parser.
 *
 * Extracts test cases from the ## Scenarios section of a SKILL.md file.
 * Each scenario has a given/when/then structure.
 *
 * @module @bic/claws-test/scenario/parser
 */

import type { ParsedScenario } from '../types.js';

/**
 * Parse the ## Scenarios section from SKILL.md content.
 *
 * Expected format:
 * ```markdown
 * ## Scenarios
 *
 * ### Scenario Name
 * - Given: precondition
 * - When: action
 * - Then: expected result
 * ```
 *
 * @param content - Full SKILL.md file content
 * @returns Array of parsed scenarios
 */
export function parseScenarios(content: string): readonly ParsedScenario[] {
  const scenarios: ParsedScenario[] = [];

  // Find the ## Scenarios section
  const scenariosMatch = content.match(/^## Scenarios\s*$/m);
  if (!scenariosMatch || scenariosMatch.index === undefined) {
    return scenarios;
  }

  // Extract content from ## Scenarios to the next ## heading or end of file
  const startIdx = scenariosMatch.index + scenariosMatch[0].length;
  const nextSectionMatch = content.slice(startIdx).match(/^## [^#]/m);
  const sectionContent = nextSectionMatch && nextSectionMatch.index !== undefined
    ? content.slice(startIdx, startIdx + nextSectionMatch.index)
    : content.slice(startIdx);

  // Split by ### headings to get individual scenarios
  const scenarioBlocks = sectionContent.split(/^### /m).filter(Boolean);

  for (const block of scenarioBlocks) {
    const lines = block.trim().split('\n');
    const name = lines[0]?.trim() ?? '';
    if (!name) continue;

    let given = '';
    let when = '';
    let then = '';

    for (const line of lines.slice(1)) {
      const trimmed = line.trim();
      const givenMatch = trimmed.match(/^-?\s*Given:\s*(.+)/i);
      const whenMatch = trimmed.match(/^-?\s*When:\s*(.+)/i);
      const thenMatch = trimmed.match(/^-?\s*Then:\s*(.+)/i);

      if (givenMatch?.[1]) given = givenMatch[1].trim();
      if (whenMatch?.[1]) when = whenMatch[1].trim();
      if (thenMatch?.[1]) then = thenMatch[1].trim();
    }

    scenarios.push({ name, given, when, then });
  }

  return scenarios;
}
