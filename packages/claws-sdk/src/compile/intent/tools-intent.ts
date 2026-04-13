/**
 * TOOLS.md intent extraction — R1-R5 classification and OBO detection.
 *
 * Extracts ToolManifestEntry from TOOLS.md using section-based parsing.
 * Each ## heading defines a tool. Content below is the tool description.
 *
 * R1-R5 classification heuristics from CL-02 G-CLASS:
 * - R5: production write access
 * - R4: production read access
 * - R3: external API calls
 * - R2: file system access
 * - R1: computation only
 *
 * @module claws-sdk/compile/intent/tools-intent
 */

import type {
  FileEntryPresent,
  ToolManifestEntry,
  ToolRiskClass,
  IntentResult,
} from '../types.js';

/**
 * Classify a tool's risk level based on its description.
 */
function classifyRisk(description: string): ToolRiskClass {
  const lower = description.toLowerCase();

  // Explicit Risk: R<N> declaration takes priority
  const explicitMatch = /[-*]\s*risk:\s*r(\d)/i.exec(description);
  if (explicitMatch) {
    const level = Math.min(5, Math.max(1, parseInt(explicitMatch[1]!, 10))) as ToolRiskClass;
    return level;
  }

  // R5: production write access, payment, financial operations
  if (/\b(production\s+write|prod\s+write|write\s+\S[^\n]*production|deploy\s+to\s+prod|modify\s+prod|payment|transact|wire\s+transfer|financial)/i.test(lower)) {
    return 5;
  }

  // R4: production read access
  if (/\b(production\s+read|prod\s+read|read\s+\S[^\n]*production|monitor\s+prod)/i.test(lower)) {
    return 4;
  }

  // R3: external API calls
  if (/\b(api|external|http|webhook|email|send\s+email|third[-.\s]?party|remote)/i.test(lower)) {
    return 3;
  }

  // R2: file system access
  if (/\b(file|directory|write|read|filesystem|disk|path)/i.test(lower)) {
    return 2;
  }

  // R1: computation only (default)
  return 1;
}

/**
 * Detect if a tool operates on-behalf-of another principal.
 */
function detectOBO(description: string): boolean {
  const lower = description.toLowerCase();
  // Explicit OBO: true declaration
  if (/[-*]\s*obo:\s*true/i.test(description)) return true;
  return /\b(on\s+behalf\s+of|obo|as\s+the\s+user|impersonat|delegat)/i.test(lower);
}

/**
 * Extract capability tags from a tool description.
 */
function extractCapabilities(description: string): string[] {
  const lower = description.toLowerCase();
  const caps: string[] = [];

  if (/\b(read)\b/.test(lower)) caps.push('read');
  if (/\b(write|create|modify|update|delete)\b/.test(lower)) caps.push('write');
  if (/\b(execute|run|invoke|call)\b/.test(lower)) caps.push('execute');
  if (/\b(send|email|message|notify)\b/.test(lower)) caps.push('communicate');
  if (/\b(audit|log|track|monitor)\b/.test(lower)) caps.push('audit');
  if (/\b(approve|approval|confirm)\b/.test(lower)) caps.push('approval');

  return caps;
}

/**
 * Extract tool manifest entries from a TOOLS.md file entry.
 *
 * Parses ## headings as tool names, body text as descriptions.
 */
export function extractToolsIntents(entry: FileEntryPresent): IntentResult<ToolManifestEntry> {
  const intents: ToolManifestEntry[] = [];
  const lines = entry.content.split('\n');

  let currentTool: string | undefined;
  let currentDescription: string[] = [];
  let currentLine = 0;

  function flushTool(): void {
    if (currentTool !== undefined) {
      const description = currentDescription.join('\n').trim();
      intents.push({
        name: currentTool,
        riskClass: classifyRisk(description),
        oboFlag: detectOBO(description),
        capabilities: extractCapabilities(description),
        description,
        line: currentLine,
      });
    }
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    const trimmed = line.trim();

    // H2 heading = new tool section
    const h2Match = /^##\s+(\S[^\n]*)$/.exec(trimmed);
    if (h2Match) {
      flushTool();
      currentTool = h2Match[1]!.trim();
      currentDescription = [];
      currentLine = i + 1;
      continue;
    }

    // H1 heading — skip (file title)
    if (trimmed.startsWith('# ')) {
      continue;
    }

    // Accumulate description lines for current tool
    if (currentTool !== undefined && trimmed.length > 0) {
      currentDescription.push(trimmed);
    }
  }

  // Flush last tool
  flushTool();

  return {
    source: entry.source,
    intents,
    diagnostics: [],
  };
}
