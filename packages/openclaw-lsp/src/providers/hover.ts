/**
 * HoverProvider — risk classification cards for tool names in claws.json.
 *
 * When hovering over a tool name, displays an R1-R5 risk classification card
 * with OBO status, capability list, and classification. Uses the CompilationHost's
 * cached GovernanceIR to resolve tool metadata.
 *
 * @module openclaw-lsp/providers/hover
 */

import type { GovernanceIRLike } from '../compilation-host.js';

// ── Tool metadata extraction ─────────────────────────────────────────

/**
 * Full tool metadata for hover display.
 */
export interface ToolMeta {
  readonly name: string;
  readonly riskLevel: string;
  readonly description: string;
  readonly oboFlag: boolean;
  readonly classification: string;
  readonly capabilities?: readonly string[];
}

/**
 * Shape of a tool entry in the capabilities section of GovernanceIR.
 */
interface ToolEntry {
  readonly name: string;
  readonly riskLevel: string;
  readonly description?: string;
  readonly oboFlag?: boolean;
  readonly classification?: string;
  readonly capabilities?: readonly string[];
}

/**
 * Extract full tool metadata from a GovernanceIR-like object.
 */
export function extractToolMeta(ir: GovernanceIRLike): readonly ToolMeta[] {
  const caps = ir.capabilities as { tools?: readonly ToolEntry[] } | undefined;
  if (!caps?.tools) return [];

  return caps.tools.map((t): ToolMeta => ({
    name: t.name,
    riskLevel: t.riskLevel,
    description: t.description ?? '',
    oboFlag: t.oboFlag ?? false,
    classification: t.classification ?? 'unclassified',
    ...(t.capabilities ? { capabilities: t.capabilities } : {}),
  }));
}

/**
 * Look up a specific tool by name in the GovernanceIR.
 */
export function findTool(ir: GovernanceIRLike, toolName: string): ToolMeta | undefined {
  return extractToolMeta(ir).find((t) => t.name === toolName);
}

// ── Risk card rendering ──────────────────────────────────────────────

/**
 * Numeric risk level from the string (R1-R5 or descriptive names).
 */
export function riskToNumeric(riskLevel: string): number {
  const upper = riskLevel.toUpperCase();
  if (upper === 'R1' || upper === 'MINIMAL') return 1;
  if (upper === 'R2' || upper === 'LOW') return 2;
  if (upper === 'R3' || upper === 'MEDIUM') return 3;
  if (upper === 'R4' || upper === 'HIGH') return 4;
  if (upper === 'R5' || upper === 'CRITICAL') return 5;
  return 0;
}

/**
 * Map a numeric risk level to an R-level label.
 */
export function numericToRLabel(n: number): string {
  if (n >= 1 && n <= 5) return `R${n}`;
  return 'R?';
}

/**
 * Render a risk severity bar for markdown display.
 * Uses filled/empty blocks to show risk level visually.
 */
function renderSeverityBar(numericLevel: number): string {
  const filled = numericLevel;
  const empty = 5 - filled;
  return '[' + '\u2588'.repeat(filled) + '\u2591'.repeat(empty) + ']';
}

/**
 * A hover result with markdown content and the range it applies to.
 */
export interface HoverResult {
  /** Markdown-formatted hover content. */
  readonly contents: string;
}

/**
 * Build a risk card for a tool, formatted as markdown.
 *
 * Example output:
 * ```
 * **shell-exec** — R4 High Risk
 * [████░] Risk Level: R4
 *
 * **OBO Status:** Enabled
 * **Classification:** execution
 *
 * **Capabilities:**
 * - file-system
 * - process-management
 *
 * > Shell execution tool with elevated privileges.
 * ```
 */
export function buildRiskCard(tool: ToolMeta): HoverResult {
  const numeric = riskToNumeric(tool.riskLevel);
  const rLabel = numericToRLabel(numeric);
  const bar = renderSeverityBar(numeric);

  const lines: string[] = [];

  // Title line
  lines.push(`**${tool.name}** — ${rLabel} ${tool.riskLevel.charAt(0).toUpperCase() + tool.riskLevel.slice(1)} Risk`);
  lines.push(`${bar} Risk Level: ${rLabel}`);
  lines.push('');

  // OBO status
  const oboStatus = tool.oboFlag ? 'Enabled' : 'Disabled';
  lines.push(`**OBO Status:** ${oboStatus}`);

  // Classification
  lines.push(`**Classification:** ${tool.classification}`);

  // Capabilities list
  if (tool.capabilities && tool.capabilities.length > 0) {
    lines.push('');
    lines.push('**Capabilities:**');
    for (const cap of tool.capabilities) {
      lines.push(`- ${cap}`);
    }
  }

  // Description
  if (tool.description) {
    lines.push('');
    lines.push(`> ${tool.description}`);
  }

  return { contents: lines.join('\n') };
}

// ── Word detection ───────────────────────────────────────────────────

/**
 * Extract the word at a given character offset in a line.
 * Words are delimited by whitespace, quotes, brackets, commas, or colons.
 */
export function wordAt(lineText: string, character: number): string {
  if (character < 0 || character >= lineText.length) return '';

  const wordChars = /[^\s"',:\[\]{}()]/;

  // Expand left
  let start = character;
  while (start > 0 && wordChars.test(lineText[start - 1]!)) {
    start--;
  }

  // Expand right
  let end = character;
  while (end < lineText.length && wordChars.test(lineText[end]!)) {
    end++;
  }

  return lineText.slice(start, end);
}

// ── Hover provider ───────────────────────────────────────────────────

/**
 * Compute hover information for a position in a claws.json document.
 *
 * @param lineText - The full text of the line containing the cursor
 * @param character - The 0-based character offset of the cursor
 * @param ir - The cached GovernanceIR for tool metadata resolution
 * @returns A HoverResult with the risk card, or undefined if no tool match
 */
export function computeHover(
  lineText: string,
  character: number,
  ir: GovernanceIRLike,
): HoverResult | undefined {
  const word = wordAt(lineText, character);
  if (!word) return undefined;

  const tool = findTool(ir, word);
  if (!tool) return undefined;

  return buildRiskCard(tool);
}
