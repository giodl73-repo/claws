/**
 * GovernanceCodeLensProvider — R-level and deny-rule code lenses (CL-10).
 *
 * Renders an inline lens above each tool declaration in TOOLS.md:
 *   "R1 READ"
 *   "R3 COMMUNICATE"
 *   "R5 TRANSACT (locked)"   ← when fleet lock is active
 *
 * And above each deny-rule intent in SOUL.md:
 *   "Deny Rule (user-authored)"
 *   "Deny Rule (compiler-injected)"
 *
 * Complements `providers/code-lens.ts` — the existing provider aggregates
 * at the section level, while this one annotates the individual declaration.
 *
 * @module openclaw-lsp/providers/governance-code-lens
 */

import type { GovernanceIRLike } from '../compilation-host.js';
import { classifyGovernanceFile, normalizeRiskLevel, type RiskLevel } from './governance-diagnostic.js';

/** The verb label shown alongside the R-level, e.g. "R1 READ". */
const RISK_LABELS: Readonly<Record<RiskLevel, string>> = {
  1: 'READ',
  2: 'OBSERVE',
  3: 'COMMUNICATE',
  4: 'MUTATE',
  5: 'TRANSACT',
};

interface ToolShape {
  readonly name: string;
  readonly riskLevel: string | number;
  readonly locked?: boolean;
}

interface IntentShape {
  readonly kind: string;
  readonly target: string;
  readonly source?: string;
}

interface CapabilitiesShape {
  readonly tools?: readonly ToolShape[];
}

/** A single code lens item — 0-based line number + display text. */
export interface GovernanceCodeLens {
  /** 0-based line of the declaration. */
  readonly line: number;
  /** Display text rendered by the client. */
  readonly display: string;
  /** Lens kind — useful for clients that style differently. */
  readonly kind: 'tool-risk' | 'deny-rule';
}

/** Format an R-level into the display string, handling the locked suffix. */
export function formatRiskLens(level: RiskLevel, locked: boolean): string {
  const base = `R${level} ${RISK_LABELS[level]}`;
  return locked ? `${base} (locked)` : base;
}

/** Format a deny-rule classification lens. */
export function formatDenyLens(source: string | undefined): string {
  const label = source === 'compiler' ? 'compiler-injected' : 'user-authored';
  return `Deny Rule (${label})`;
}

function findLine(content: string, needle: string): number {
  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    if (lines[i]!.includes(needle)) return i;
  }
  return 0;
}

/** Compute tool R-level lenses for TOOLS.md. */
export function computeToolLenses(ir: GovernanceIRLike, content: string): GovernanceCodeLens[] {
  const caps = ir.capabilities as CapabilitiesShape | undefined;
  const tools = caps?.tools ?? [];
  const out: GovernanceCodeLens[] = [];

  for (const tool of tools) {
    const level = normalizeRiskLevel(tool.riskLevel);
    if (level === undefined) continue;
    out.push({
      line: findLine(content, tool.name),
      display: formatRiskLens(level, tool.locked === true),
      kind: 'tool-risk',
    });
  }

  return out;
}

/** Compute deny-rule classification lenses for SOUL.md. */
export function computeDenyRuleLenses(ir: GovernanceIRLike, content: string): GovernanceCodeLens[] {
  const intents = (ir.intents as readonly IntentShape[] | undefined) ?? [];
  const out: GovernanceCodeLens[] = [];

  for (const intent of intents) {
    if (intent.kind !== 'deny') continue;
    out.push({
      line: findLine(content, intent.target),
      display: formatDenyLens(intent.source),
      kind: 'deny-rule',
    });
  }

  return out;
}

/** Entry point: compute governance lenses for the given URI. */
export function computeGovernanceCodeLenses(
  uri: string,
  ir: GovernanceIRLike,
  content: string,
): GovernanceCodeLens[] {
  const role = classifyGovernanceFile(uri);
  if (role === 'tools') return computeToolLenses(ir, content);
  if (role === 'soul') return computeDenyRuleLenses(ir, content);
  return [];
}
