/**
 * CodeLensProvider — per-section aggregate governance summaries.
 *
 * Annotates each markdown section in TOOLS.md (and other governance files)
 * with an at-a-glance summary: tool count, risk breakdown, OBO boundary
 * count, and tension count. Display format:
 *   "{N} tools: {risk breakdown} | {OBO count} OBO boundaries | {tension count} tension"
 *
 * @module claws-lsp/providers/code-lens
 */

import type { GovernanceIRLike } from '../compilation-host.js';
import type { TensionDiagnostic } from './diagnostic.js';

// ── Section types ────────────────────────────────────────────────────

/**
 * A parsed markdown section with its header line and content range.
 */
export interface Section {
  /** Section heading text (without leading #). */
  readonly title: string;
  /** 0-based start line of the heading. */
  readonly startLine: number;
  /** 0-based end line (exclusive) — start of next section or EOF. */
  readonly endLine: number;
}

/**
 * Aggregate governance summary for a single section.
 */
export interface SectionAggregate {
  /** The section this aggregate describes. */
  readonly section: Section;
  /** Number of tools declared in this section. */
  readonly toolCount: number;
  /** Risk breakdown as a map from R-level label to count. */
  readonly riskBreakdown: Readonly<Record<string, number>>;
  /** Number of OBO boundaries (delegation entries) in this section. */
  readonly oboCount: number;
  /** Number of cross-file tensions targeting this section. */
  readonly tensionCount: number;
}

/**
 * A code lens annotation positioned above a section heading.
 */
export interface CodeLensItem {
  /** 0-based line of the section heading (lens appears above). */
  readonly line: number;
  /** Display text for the code lens. */
  readonly display: string;
  /** The underlying aggregate data. */
  readonly aggregate: SectionAggregate;
}

// ── Internal IR shapes ──────────────────────────────────────────────

interface ToolEntry {
  readonly name: string;
  readonly riskLevel: string;
}

interface DelegationEntry {
  readonly target: string;
}

// ── Section parsing ─────────────────────────────────────────────────

/**
 * Parse markdown content into sections delimited by headings (# or ##).
 */
export function parseSections(content: string): readonly Section[] {
  const lines = content.split('\n');
  const sections: Section[] = [];
  let current: { title: string; startLine: number } | undefined;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    const headingMatch = line.match(/^(#{1,3})\s+(.+)/);
    if (headingMatch) {
      if (current) {
        sections.push({ title: current.title, startLine: current.startLine, endLine: i });
      }
      current = { title: headingMatch[2]!, startLine: i };
    }
  }

  if (current) {
    sections.push({ title: current.title, startLine: current.startLine, endLine: lines.length });
  }

  return sections;
}

// ── Risk level normalization ────────────────────────────────────────

const RISK_MAP: Record<string, string> = {
  r1: 'R1', r2: 'R2', r3: 'R3', r4: 'R4', r5: 'R5',
  minimal: 'R1', low: 'R2', medium: 'R3', high: 'R4', critical: 'R5',
  '1': 'R1', '2': 'R2', '3': 'R3', '4': 'R4', '5': 'R5',
};

function normalizeRisk(riskLevel: string): string {
  return RISK_MAP[riskLevel.toLowerCase()] ?? 'R?';
}

// ── Aggregate computation ───────────────────────────────────────────

/**
 * Check whether a tool name appears within a section's content lines.
 */
function toolInSection(toolName: string, lines: readonly string[], section: Section): boolean {
  for (let i = section.startLine; i < section.endLine; i++) {
    if (lines[i]!.includes(toolName)) return true;
  }
  return false;
}

/**
 * Check whether a delegation target appears within a section's content lines.
 */
function delegationInSection(target: string, lines: readonly string[], section: Section): boolean {
  for (let i = section.startLine; i < section.endLine; i++) {
    if (lines[i]!.includes(target)) return true;
  }
  return false;
}

/**
 * Count tensions whose diagnostic range falls within a section.
 */
function tensionsInSection(tensions: readonly TensionDiagnostic[], section: Section, uri: string): number {
  let count = 0;
  for (const t of tensions) {
    if (t.targetUri !== uri) continue;
    const line = t.diagnostic.range.start.line;
    if (line >= section.startLine && line < section.endLine) {
      count++;
    }
  }
  return count;
}

/**
 * Compute per-section aggregates from file content, GovernanceIR, and tensions.
 *
 * @param content - The full document text.
 * @param ir - The compiled GovernanceIR for this file.
 * @param tensions - Cross-file tensions targeting this file's URI.
 * @param uri - The document URI (for filtering tensions).
 * @returns One aggregate per section that has at least one metric > 0.
 */
export function computeAggregates(
  content: string,
  ir: GovernanceIRLike,
  tensions: readonly TensionDiagnostic[],
  uri: string,
): readonly SectionAggregate[] {
  const sections = parseSections(content);
  if (sections.length === 0) return [];

  const lines = content.split('\n');
  const caps = ir.capabilities as { tools?: readonly ToolEntry[] } | undefined;
  const tools = caps?.tools ?? [];
  const delegationMap = ir.delegationMap as readonly unknown[];

  const results: SectionAggregate[] = [];

  for (const section of sections) {
    let toolCount = 0;
    const riskBreakdown: Record<string, number> = {};

    for (const tool of tools) {
      if (toolInSection(tool.name, lines, section)) {
        toolCount++;
        const rLabel = normalizeRisk(tool.riskLevel);
        riskBreakdown[rLabel] = (riskBreakdown[rLabel] ?? 0) + 1;
      }
    }

    let oboCount = 0;
    for (const entry of delegationMap) {
      if (typeof entry === 'object' && entry !== null && 'target' in entry) {
        const delEntry = entry as DelegationEntry;
        if (delegationInSection(delEntry.target, lines, section)) {
          oboCount++;
        }
      }
    }

    const tensionCount = tensionsInSection(tensions, section, uri);

    // Only include sections that have at least one non-zero metric
    if (toolCount > 0 || oboCount > 0 || tensionCount > 0) {
      results.push({ section, toolCount, riskBreakdown, oboCount, tensionCount });
    }
  }

  return results;
}

// ── Display formatting ──────────────────────────────────────────────

/**
 * Format a risk breakdown map into a compact string like "1xR3, 2xR5".
 * Sorted by risk level ascending.
 */
export function formatRiskBreakdown(breakdown: Readonly<Record<string, number>>): string {
  const entries = Object.entries(breakdown);
  if (entries.length === 0) return '';

  entries.sort((a, b) => a[0].localeCompare(b[0]));
  return entries.map(([label, count]) => `${count}x${label}`).join(', ');
}

/**
 * Format a section aggregate into the spec display string:
 *   "{N} tools: {risk breakdown} | {OBO count} OBO boundaries | {tension count} tension"
 */
export function formatCodeLens(aggregate: SectionAggregate): string {
  const parts: string[] = [];

  if (aggregate.toolCount > 0) {
    const riskStr = formatRiskBreakdown(aggregate.riskBreakdown);
    parts.push(`${aggregate.toolCount} tools: ${riskStr}`);
  }

  if (aggregate.oboCount > 0) {
    parts.push(`${aggregate.oboCount} OBO boundaries`);
  }

  if (aggregate.tensionCount > 0) {
    parts.push(`${aggregate.tensionCount} tension`);
  }

  return parts.join(' | ');
}

// ── Code lens provider ──────────────────────────────────────────────

/**
 * Compute code lens items for a document.
 *
 * @param content - The full document text.
 * @param ir - The compiled GovernanceIR for this file.
 * @param tensions - Cross-file tensions targeting this file's URI.
 * @param uri - The document URI.
 * @returns Code lens items to display, one per non-empty section.
 */
export function computeCodeLenses(
  content: string,
  ir: GovernanceIRLike,
  tensions: readonly TensionDiagnostic[],
  uri: string,
): readonly CodeLensItem[] {
  const aggregates = computeAggregates(content, ir, tensions, uri);

  return aggregates.map((agg) => ({
    line: agg.section.startLine,
    display: formatCodeLens(agg),
    aggregate: agg,
  }));
}
