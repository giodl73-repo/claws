/**
 * GovernanceDiagnosticProvider — write-time validation diagnostics (CL-10).
 *
 * Activates the LSP diagnostics surface against GovernanceIR produced by
 * `claws serve`. Unlike `providers/diagnostic.ts` — which maps the 10
 * diagnostic categories to fixed severities — this provider is keyed by
 * risk level, so a developer editing TOOLS.md sees the squiggly colour
 * matching the R-level that shipped in governance.
 *
 * Severity mapping (pulse 56):
 *   R1–R2 → Information (subtle blue info icon)
 *   R3–R4 → Warning     (yellow squiggly)
 *   R5    → Error       (red squiggly)
 *
 * In addition:
 *   - Missing elicitation gates on R5 tools → Information.
 *   - Deny-rule warnings in SOUL.md → Warning.
 *
 * @module openclaw-lsp/providers/governance-diagnostic
 */

import type { Diagnostic, DiagnosticSeverity } from 'vscode-languageserver';
import type { GovernanceIRLike } from '../compilation-host.js';

/** Risk level 1–5 as used by claws governance. */
export type RiskLevel = 1 | 2 | 3 | 4 | 5;

/** Internal shape for the GovernanceIR pieces we read. */
interface ToolShape {
  readonly name: string;
  readonly riskLevel: string | number;
  readonly elicitationGate?: boolean;
  readonly locked?: boolean;
}

interface IntentShape {
  readonly kind: string;
  readonly target: string;
  readonly ruleId?: string;
  readonly description?: string;
  readonly source?: string;
}

interface CapabilitiesShape {
  readonly tools?: readonly ToolShape[];
}

/** Normalize a raw risk level (string label, R1 token, or number) into 1–5. */
export function normalizeRiskLevel(raw: string | number): RiskLevel | undefined {
  const map: Record<string, RiskLevel> = {
    r1: 1, r2: 2, r3: 3, r4: 4, r5: 5,
    minimal: 1, low: 2, medium: 3, high: 4, critical: 5,
    '1': 1, '2': 2, '3': 3, '4': 4, '5': 5,
  };
  const key = typeof raw === 'number' ? String(raw) : raw.toLowerCase();
  return map[key];
}

/** Map a risk level to the LSP diagnostic severity requested by pulse 56. */
export function riskLevelToSeverity(level: RiskLevel): DiagnosticSeverity {
  if (level >= 5) return 1 satisfies DiagnosticSeverity; // Error
  if (level >= 3) return 2 satisfies DiagnosticSeverity; // Warning
  return 3 satisfies DiagnosticSeverity; // Information
}

function findLine(content: string, needle: string): number {
  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    if (lines[i]!.includes(needle)) return i;
  }
  return 0;
}

function rangeForTarget(content: string, target: string): Diagnostic['range'] {
  const line = findLine(content, target);
  const lines = content.split('\n');
  const text = lines[line] ?? '';
  return {
    start: { line, character: 0 },
    end: { line, character: text.length },
  };
}

/** Governance file role (restricted to files this provider touches). */
export type GovernanceFileRole = 'tools' | 'soul' | 'other';

/** Classify a URI into the governance roles this provider cares about. */
export function classifyGovernanceFile(uri: string): GovernanceFileRole {
  const lower = uri.toLowerCase();
  if (lower.endsWith('/tools.md') || lower.endsWith('\\tools.md')) return 'tools';
  if (lower.endsWith('/soul.md') || lower.endsWith('\\soul.md')) return 'soul';
  return 'other';
}

/**
 * Compute diagnostics for TOOLS.md: one per tool, severity by risk level,
 * plus an Information diagnostic whenever an R5 tool is missing its
 * elicitation gate.
 */
export function computeToolDiagnostics(ir: GovernanceIRLike, content: string): Diagnostic[] {
  const caps = ir.capabilities as CapabilitiesShape | undefined;
  const tools = caps?.tools ?? [];
  const out: Diagnostic[] = [];

  for (const tool of tools) {
    const level = normalizeRiskLevel(tool.riskLevel);
    if (level === undefined) continue;

    const severity = riskLevelToSeverity(level);
    const range = rangeForTarget(content, tool.name);
    const lockSuffix = tool.locked ? ' (locked)' : '';
    out.push({
      range,
      severity,
      code: `CLAWS-G-R${level}`,
      source: 'claws-governance',
      message: `Tool "${tool.name}" is R${level}${lockSuffix}`,
    });

    if (level === 5 && tool.elicitationGate === false) {
      out.push({
        range,
        severity: 3 satisfies DiagnosticSeverity, // Information
        code: 'CLAWS-G-ELICIT',
        source: 'claws-governance',
        message: `R5 tool "${tool.name}" is missing an elicitation gate`,
      });
    }
  }

  return out;
}

/**
 * Compute diagnostics for SOUL.md: one Warning diagnostic per deny-rule
 * intent. This surfaces to developers that the rule is present before
 * compilation catches enforcement conflicts on the TOOLS side.
 */
export function computeSoulDiagnostics(ir: GovernanceIRLike, content: string): Diagnostic[] {
  const intents = (ir.intents as readonly IntentShape[] | undefined) ?? [];
  const out: Diagnostic[] = [];

  for (const intent of intents) {
    if (intent.kind !== 'deny') continue;
    const range = rangeForTarget(content, intent.target);
    const label =
      intent.source === 'compiler'
        ? 'compiler-injected'
        : 'user-authored';
    out.push({
      range,
      severity: 2 satisfies DiagnosticSeverity, // Warning
      code: 'CLAWS-G-DENY',
      source: 'claws-governance',
      message: `Deny rule on "${intent.target}" (${label})`,
    });
  }

  return out;
}

/**
 * Top-level entry point: produce governance diagnostics for the given URI.
 * Returns empty array for non-governance files.
 */
export function computeGovernanceDiagnostics(
  uri: string,
  ir: GovernanceIRLike,
  content: string,
): Diagnostic[] {
  const role = classifyGovernanceFile(uri);
  if (role === 'tools') return computeToolDiagnostics(ir, content);
  if (role === 'soul') return computeSoulDiagnostics(ir, content);
  return [];
}
