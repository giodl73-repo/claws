/**
 * AGENTS.md intent extraction — delegation graph extraction.
 *
 * Parses agent sections (## headings) and extracts delegation edges
 * from "Delegates to:" lines. Produces a graph structure suitable
 * for cycle detection in Pulse 12.
 *
 * @module claws-sdk/compile/intent/agents-intent
 */

import type {
  FileEntryPresent,
  DelegationIntent,
  IntentResult,
} from '../types.js';

/**
 * Parse an agent section and extract its tools and delegation targets.
 */
interface AgentSection {
  name: string;
  tools: string[];
  delegatesTo: string[];
  line: number;
}

/**
 * Extract delegation intents from an AGENTS.md file entry.
 *
 * Parses ## headings as agent names, extracts "Delegates to:" and
 * "Tools:" lines for building the delegation graph.
 */
export function extractAgentsIntents(entry: FileEntryPresent): IntentResult<DelegationIntent> {
  const intents: DelegationIntent[] = [];
  const lines = entry.content.split('\n');
  const sections: AgentSection[] = [];

  let current: AgentSection | undefined;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    const trimmed = line.trim();

    // H2 heading = new agent section
    const h2Match = /^##\s+(\S[^\n]*)$/.exec(trimmed);
    if (h2Match) {
      if (current !== undefined) {
        sections.push(current);
      }
      current = {
        name: h2Match[1]!.trim(),
        tools: [],
        delegatesTo: [],
        line: i + 1,
      };
      continue;
    }

    if (current === undefined) continue;

    // Parse "- Tools: X, Y, Z" or "Tools: X, Y, Z" line
    const toolsMatch = /^(?:[-*+]\s+)?Tools:\s*(\S[^\n]*)$/i.exec(trimmed);
    if (toolsMatch) {
      current.tools = toolsMatch[1]!.split(',').map(t => t.trim()).filter(t => t.length > 0);
      continue;
    }

    // Parse "- Delegates to: AgentName" or "Delegates to: AgentName" line
    const delegateMatch = /^(?:[-*+]\s+)?Delegates\s+to:\s*(\S[^\n]*)$/i.exec(trimmed);
    if (delegateMatch) {
      current.delegatesTo = delegateMatch[1]!.split(',').map(t => t.trim()).filter(t => t.length > 0);
    }
  }

  // Flush last section
  if (current !== undefined) {
    sections.push(current);
  }

  // Build delegation edges
  for (const section of sections) {
    for (const target of section.delegatesTo) {
      // Find the target section to get its tools
      const targetSection = sections.find(s => s.name === target);
      const tools = targetSection !== undefined ? targetSection.tools : [];

      intents.push({
        from: section.name,
        to: target,
        tools,
        line: section.line,
      });
    }
  }

  return {
    source: entry.source,
    intents,
    diagnostics: [],
  };
}
