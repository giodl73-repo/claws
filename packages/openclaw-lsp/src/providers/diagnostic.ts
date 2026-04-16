/**
 * DiagnosticProvider — maps 10 governance diagnostic categories to LSP
 * diagnostics with severity, code, file:line locations. Supports cross-file
 * tension diagnostics: editing TOOLS.md triggers reanalysis of SOUL.md deny
 * intents, AGENTS.md delegation graphs, and MEMORY.md data labels.
 *
 * @module claws-lsp/providers/diagnostic
 */

import type { Diagnostic, DiagnosticSeverity } from 'vscode-languageserver';
import type { GovernanceIRLike } from '../compilation-host.js';

// ── Diagnostic Categories ─────────────────────────────────────────────

/**
 * The 10 governance diagnostic categories. Each maps to a governance rule
 * domain and carries a default LSP severity.
 */
export type DiagnosticCategory =
  | 'tool-risk'
  | 'obo-conflict'
  | 'deny-intent'
  | 'delegation-scope'
  | 'approval-required'
  | 'fail-mode'
  | 'capability-gap'
  | 'context-violation'
  | 'label-missing'
  | 'suppression-expired';

/**
 * Metadata for each diagnostic category.
 */
export interface CategoryMeta {
  readonly code: string;
  readonly severity: DiagnosticSeverity;
  readonly source: string;
}

/**
 * Map of all 10 categories to their metadata.
 * DiagnosticSeverity values: Error=1, Warning=2, Information=3, Hint=4.
 */
export const CATEGORY_META: Readonly<Record<DiagnosticCategory, CategoryMeta>> = {
  'tool-risk':           { code: 'CLAWS-D001', severity: 1 /* Error */,       source: 'claws' },
  'obo-conflict':        { code: 'CLAWS-D002', severity: 1 /* Error */,       source: 'claws' },
  'deny-intent':         { code: 'CLAWS-D003', severity: 1 /* Error */,       source: 'claws' },
  'delegation-scope':    { code: 'CLAWS-D004', severity: 2 /* Warning */,     source: 'claws' },
  'approval-required':   { code: 'CLAWS-D005', severity: 2 /* Warning */,     source: 'claws' },
  'fail-mode':           { code: 'CLAWS-D006', severity: 1 /* Error */,       source: 'claws' },
  'capability-gap':      { code: 'CLAWS-D007', severity: 2 /* Warning */,     source: 'claws' },
  'context-violation':   { code: 'CLAWS-D008', severity: 3 /* Information */, source: 'claws' },
  'label-missing':       { code: 'CLAWS-D009', severity: 3 /* Information */, source: 'claws' },
  'suppression-expired': { code: 'CLAWS-D010', severity: 2 /* Warning */,     source: 'claws' },
};

/**
 * All 10 category keys in a stable order.
 */
export const ALL_CATEGORIES: readonly DiagnosticCategory[] = Object.keys(CATEGORY_META) as DiagnosticCategory[];

// ── Range helper ──────────────────────────────────────────────────────

/**
 * Build a zero-based range for a given line number (1-based) in content.
 * Falls back to the first line if the line is out of range.
 */
function lineRange(content: string, line1Based: number): { start: { line: number; character: number }; end: { line: number; character: number } } {
  const lines = content.split('\n');
  const idx = Math.max(0, Math.min(line1Based - 1, lines.length - 1));
  const lineText = lines[idx] ?? '';
  return {
    start: { line: idx, character: 0 },
    end:   { line: idx, character: lineText.length },
  };
}

/**
 * Find the first line (1-based) in `content` that contains `needle`.
 * Returns 1 if not found.
 */
function findLine(content: string, needle: string): number {
  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    if (lines[i]!.includes(needle)) return i + 1;
  }
  return 1;
}

// ── Core diagnostic extraction ────────────────────────────────────────

/**
 * A single extracted diagnostic before LSP conversion.
 */
export interface RawDiagnostic {
  readonly category: DiagnosticCategory;
  readonly message: string;
  /** Target string to locate in the file (for line resolution). */
  readonly target: string;
}

/**
 * Extract raw diagnostics from a GovernanceIR-like object.
 * Maps violations, warnings, conflicts, intents, delegation,
 * enforcement, and suppressions to the 10 categories.
 */
export function extractDiagnostics(ir: GovernanceIRLike): readonly RawDiagnostic[] {
  const result: RawDiagnostic[] = [];
  const analysis = ir.analysis as AnalysisShape | undefined;
  const conflicts = ir.conflicts as ConflictsShape | undefined;
  const intents = ir.intents as readonly IntentShape[];
  const delegationMap = ir.delegationMap as readonly DelegationShape[];
  const capabilities = ir.capabilities as CapabilitiesShape | undefined;

  // 1. tool-risk: high/critical tools from capabilities
  if (capabilities?.tools) {
    for (const tool of capabilities.tools) {
      if (tool.riskLevel === 'critical' || tool.riskLevel === 'high') {
        result.push({
          category: 'tool-risk',
          message: `Tool "${tool.name}" has ${tool.riskLevel} risk level`,
          target: tool.name,
        });
      }
    }
  }

  // 2. obo-conflict: from conflict report
  if (conflicts?.oboConflicts) {
    for (const c of conflicts.oboConflicts) {
      result.push({
        category: 'obo-conflict',
        message: c.description || `OBO conflict on tool "${c.toolName}": ${c.grantRuleId} vs ${c.denyRuleId}`,
        target: c.toolName,
      });
    }
  }

  // 3. deny-intent: from intents array
  for (const intent of intents) {
    if (intent.kind === 'deny') {
      result.push({
        category: 'deny-intent',
        message: `Deny intent: ${intent.description || intent.reason || intent.target}`,
        target: intent.target,
      });
    }
  }

  // 4. delegation-scope: from delegation map entries
  for (const entry of delegationMap) {
    if (typeof entry === 'object' && entry !== null && 'ruleId' in entry && 'target' in entry) {
      result.push({
        category: 'delegation-scope',
        message: `Delegation rule ${(entry as DelegationShape).ruleId} targets "${(entry as DelegationShape).target}"`,
        target: (entry as DelegationShape).target,
      });
    }
  }

  // 5. approval-required: from enforcement plan
  if (analysis?.enforcementPlan?.requiredApprovals) {
    for (const approval of analysis.enforcementPlan.requiredApprovals) {
      result.push({
        category: 'approval-required',
        message: `Approval required: ${approval}`,
        target: approval,
      });
    }
  }

  // 6. fail-mode: from violations with fail-mode diagnosticCode prefix
  if (analysis?.violations) {
    for (const v of analysis.violations) {
      if (v.diagnosticCode?.startsWith('CLAWS-E001') || v.level === 5) {
        result.push({
          category: 'fail-mode',
          message: v.message,
          target: v.target,
        });
      }
    }
  }

  // 7. capability-gap: violations referencing missing capabilities
  if (analysis?.violations) {
    for (const v of analysis.violations) {
      if (v.diagnosticCode && !v.diagnosticCode.startsWith('CLAWS-E001') && v.level !== 5) {
        result.push({
          category: 'capability-gap',
          message: v.message,
          target: v.target,
        });
      }
    }
  }

  // 8. context-violation: from warnings with G-CONTEXT or G-INPUT category
  if (analysis?.warnings) {
    for (const w of analysis.warnings) {
      if (w.category === 'G-CONTEXT' || w.category === 'G-INPUT') {
        result.push({
          category: 'context-violation',
          message: w.message,
          target: w.subRuleDiagnosticCode || w.ruleId,
        });
      }
    }
  }

  // 9. label-missing: from intents with kind=label
  for (const intent of intents) {
    if (intent.kind === 'label' && intent.key) {
      result.push({
        category: 'label-missing',
        message: `Label required: ${intent.key}=${intent.value}`,
        target: intent.key,
      });
    }
  }

  // 10. suppression-expired: from enforcement plan suppressions
  if (analysis?.enforcementPlan?.ruleSuppressions) {
    for (const s of analysis.enforcementPlan.ruleSuppressions) {
      if (s.expiresAt && new Date(s.expiresAt) < new Date()) {
        result.push({
          category: 'suppression-expired',
          message: `Suppression for rule "${s.ruleId}" expired at ${s.expiresAt}`,
          target: s.ruleId,
        });
      }
    }
  }

  return result;
}

/**
 * Convert raw diagnostics to LSP Diagnostic objects, resolving line
 * locations from file content.
 */
export function toLspDiagnostics(
  rawDiags: readonly RawDiagnostic[],
  content: string,
): Diagnostic[] {
  return rawDiags.map((raw) => {
    const meta = CATEGORY_META[raw.category];
    const line = findLine(content, raw.target);
    const range = lineRange(content, line);
    return {
      range,
      severity: meta.severity,
      code: meta.code,
      source: meta.source,
      message: raw.message,
    };
  });
}

// ── Cross-file tension analysis ───────────────────────────────────────

/**
 * Governance file role — determines what cross-file tensions a change triggers.
 */
export type GovernanceFileRole = 'tools' | 'soul' | 'agents' | 'memory' | 'rules' | 'other';

/**
 * Determine the governance role of a file from its URI.
 */
export function classifyFile(uri: string): GovernanceFileRole {
  const lower = uri.toLowerCase();
  if (lower.endsWith('/tools.md') || lower.endsWith('\\tools.md')) return 'tools';
  if (lower.endsWith('/soul.md') || lower.endsWith('\\soul.md')) return 'soul';
  if (lower.endsWith('/agents.md') || lower.endsWith('\\agents.md')) return 'agents';
  if (lower.endsWith('/memory.md') || lower.endsWith('\\memory.md')) return 'memory';
  if (lower.endsWith('/rules.md') || lower.endsWith('\\rules.md')) return 'rules';
  return 'other';
}

/**
 * A cross-file tension diagnostic — emitted on the *target* file, not the
 * edited file. E.g., editing TOOLS.md produces a tension diagnostic on SOUL.md.
 */
export interface TensionDiagnostic {
  /** URI of the file that should display the diagnostic. */
  readonly targetUri: string;
  /** The LSP diagnostic to display. */
  readonly diagnostic: Diagnostic;
}

/**
 * Given the URI of the file that changed and all known file URIs in the
 * workspace, compute cross-file tension diagnostics.
 *
 * Returns diagnostics to emit on *other* files, not the changed file.
 */
export function computeTensions(
  changedUri: string,
  workspaceFiles: ReadonlyMap<string, { content: string; ir: GovernanceIRLike }>,
): readonly TensionDiagnostic[] {
  const role = classifyFile(changedUri);
  const result: TensionDiagnostic[] = [];

  if (role === 'tools') {
    // TOOLS.md change → reanalyze SOUL.md deny intents
    for (const [uri, { content, ir }] of workspaceFiles) {
      if (classifyFile(uri) === 'soul') {
        const intents = ir.intents as readonly IntentShape[];
        for (const intent of intents) {
          if (intent.kind === 'deny') {
            const line = findLine(content, intent.target);
            const range = lineRange(content, line);
            result.push({
              targetUri: uri,
              diagnostic: {
                range,
                severity: 2, // Warning
                code: 'CLAWS-T001',
                source: 'claws-tension',
                message: `Tension: TOOLS.md changed — deny intent for "${intent.target}" may need review`,
              },
            });
          }
        }
      }
    }
  }

  if (role === 'agents') {
    // AGENTS.md change → reanalyze delegation graphs
    for (const [uri, { content, ir }] of workspaceFiles) {
      if (uri === changedUri) continue;
      const delegationMap = ir.delegationMap as readonly DelegationShape[];
      for (const entry of delegationMap) {
        if (typeof entry === 'object' && entry !== null && 'target' in entry) {
          const line = findLine(content, entry.target);
          const range = lineRange(content, line);
          result.push({
            targetUri: uri,
            diagnostic: {
              range,
              severity: 2, // Warning
              code: 'CLAWS-T002',
              source: 'claws-tension',
              message: `Tension: AGENTS.md changed — delegation to "${entry.target}" may need review`,
            },
          });
        }
      }
    }
  }

  if (role === 'tools' || role === 'soul') {
    // Tool or soul change → reanalyze MEMORY.md data labels
    for (const [uri, { content, ir }] of workspaceFiles) {
      if (classifyFile(uri) === 'memory') {
        const intents = ir.intents as readonly IntentShape[];
        for (const intent of intents) {
          if (intent.kind === 'label' && intent.key) {
            const line = findLine(content, intent.key);
            const range = lineRange(content, line);
            result.push({
              targetUri: uri,
              diagnostic: {
                range,
                severity: 3, // Information
                code: 'CLAWS-T003',
                source: 'claws-tension',
                message: `Tension: ${role.toUpperCase()}.md changed — data label "${intent.key}" may need review`,
              },
            });
          }
        }
      }
    }
  }

  return result;
}

// ── Internal type shapes for safe casting ─────────────────────────────

interface AnalysisShape {
  violations?: readonly {
    ruleId: string;
    level: number;
    message: string;
    target: string;
    diagnosticCode?: string;
  }[];
  warnings?: readonly {
    ruleId: string;
    message: string;
    category?: string;
    subRuleDiagnosticCode?: string;
  }[];
  enforcementPlan?: {
    requiredApprovals?: readonly string[];
    ruleSuppressions?: readonly {
      ruleId: string;
      expiresAt: string;
    }[];
  };
}

interface ConflictsShape {
  oboConflicts?: readonly {
    toolName: string;
    grantRuleId: string;
    denyRuleId: string;
    description?: string;
  }[];
}

interface IntentShape {
  kind: string;
  target: string;
  description?: string;
  reason?: string;
  key?: string;
  value?: string;
}

interface DelegationShape {
  ruleId: string;
  target: string;
}

interface CapabilitiesShape {
  tools?: readonly {
    name: string;
    riskLevel: string;
  }[];
}
