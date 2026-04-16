/**
 * CompletionProvider — RELAX expression completions, policy template snippets,
 * and tool name completion for claws.json policy fields.
 *
 * Uses the CompilationHost's cached GovernanceIR to resolve tool names and
 * RELAX expression context. Policy template snippets offer pre-built governance
 * patterns (e.g., deny-by-default, least-privilege tool set).
 *
 * @module claws-lsp/providers/completion
 */

import type { GovernanceIRLike } from '../compilation-host.js';

// ── RELAX operators and keywords ─────────────────────────────────────

/**
 * RELAX expression operators available in policy fields.
 */
export const RELAX_OPERATORS = [
  'allow',
  'deny',
  'require',
  'when',
  'unless',
  'if',
  'then',
  'else',
  'and',
  'or',
  'not',
] as const;

/**
 * RELAX built-in predicates for policy expressions.
 */
export const RELAX_PREDICATES = [
  'is_obo',
  'has_approval',
  'risk_level',
  'in_context',
  'has_label',
  'is_delegated',
] as const;

/**
 * Risk level constants used in RELAX expressions.
 */
export const RISK_LEVELS = ['R1', 'R2', 'R3', 'R4', 'R5'] as const;

// ── Completion item types ────────────────────────────────────────────

/**
 * CompletionItemKind mirrors LSP CompletionItemKind values.
 * We use numeric values to avoid a runtime import of vscode-languageserver.
 */
export const CompletionItemKind = {
  Keyword: 14,
  Function: 3,
  Variable: 6,
  Snippet: 15,
  Value: 12,
  EnumMember: 20,
} as const;

/**
 * A completion item returned by the provider.
 */
export interface CompletionItem {
  readonly label: string;
  readonly kind: number;
  readonly detail: string;
  readonly documentation?: string;
  /** Snippet-style insert text (e.g., with $1 placeholders). */
  readonly insertText?: string;
  /** 1 = PlainText, 2 = Snippet */
  readonly insertTextFormat?: number;
  /** Sort priority — lower sorts first. */
  readonly sortText?: string;
}

// ── Policy template snippets ─────────────────────────────────────────

/**
 * A policy template snippet — a pre-built governance pattern.
 */
export interface PolicyTemplate {
  readonly name: string;
  readonly description: string;
  readonly body: string;
}

/**
 * Built-in policy template snippets for governance patterns.
 */
export const POLICY_TEMPLATES: readonly PolicyTemplate[] = [
  {
    name: 'deny-by-default',
    description: 'Deny all tool access by default, require explicit allow rules',
    body: '{\n  "defaultPolicy": "deny",\n  "rules": [\n    { "action": "allow", "tools": ["${1:tool-name}"], "when": "${2:condition}" }\n  ]\n}',
  },
  {
    name: 'least-privilege',
    description: 'Grant minimum required tool access with OBO checks',
    body: '{\n  "defaultPolicy": "deny",\n  "rules": [\n    { "action": "allow", "tools": ["${1:tool-name}"], "require": "has_approval" },\n    { "action": "deny", "tools": ["*"], "when": "is_obo and not has_approval" }\n  ]\n}',
  },
  {
    name: 'risk-tiered',
    description: 'Apply different approval requirements per risk level',
    body: '{\n  "rules": [\n    { "action": "allow", "when": "risk_level <= R2" },\n    { "action": "require", "approval": "manager", "when": "risk_level == R3 or risk_level == R4" },\n    { "action": "deny", "when": "risk_level == R5", "unless": "has_approval(\\\"security-review\\\")" }\n  ]\n}',
  },
  {
    name: 'obo-guard',
    description: 'Block on-behalf-of operations without explicit elicitation',
    body: '{\n  "rules": [\n    { "action": "deny", "when": "is_obo and not has_approval", "tools": ["${1:*}"] },\n    { "action": "allow", "when": "not is_obo", "tools": ["${1:*}"] }\n  ]\n}',
  },
  {
    name: 'context-scoped',
    description: 'Restrict tool access to specific execution contexts',
    body: '{\n  "rules": [\n    { "action": "allow", "tools": ["${1:tool-name}"], "when": "in_context(\\\"${2:context-name}\\\")" },\n    { "action": "deny", "tools": ["${1:tool-name}"], "unless": "in_context(\\\"${2:context-name}\\\")" }\n  ]\n}',
  },
];

// ── Tool extraction ──────────────────────────────────────────────────

/**
 * Shape of a tool entry in the capabilities section of GovernanceIR.
 */
interface ToolEntry {
  readonly name: string;
  readonly riskLevel: string;
  readonly description?: string;
  readonly oboFlag?: boolean;
  readonly classification?: string;
}

/**
 * Extract tool entries from a GovernanceIR-like object.
 */
export function extractTools(ir: GovernanceIRLike): readonly ToolEntry[] {
  const caps = ir.capabilities as { tools?: readonly ToolEntry[] } | undefined;
  return caps?.tools ?? [];
}

// ── Completion context detection ─────────────────────────────────────

/**
 * Context detected at the cursor position in a claws.json document.
 */
export type CompletionContext =
  | { readonly type: 'relax-expression' }
  | { readonly type: 'tool-name' }
  | { readonly type: 'policy-template' }
  | { readonly type: 'risk-level' }
  | { readonly type: 'unknown' };

/**
 * Detect the completion context from the line text and cursor character offset.
 * Analyses the text before the cursor to determine what kind of completion
 * the user likely needs.
 */
export function detectContext(lineText: string, character: number): CompletionContext {
  const beforeCursor = lineText.slice(0, character);

  // Inside a "when", "unless", "if" value → RELAX expression
  if (/(?:"when"|"unless"|"if"|"require")\s*:\s*"[^"]*$/i.test(beforeCursor)) {
    return { type: 'relax-expression' };
  }

  // Inside a "tools" array → tool name
  if (/(?:"tools")\s*:\s*\[[^\]]*$/i.test(beforeCursor)) {
    return { type: 'tool-name' };
  }

  // Inside a "risk_level" comparison → risk level
  if (/risk_level\s*(?:==|<=|>=|!=|<|>)\s*$/i.test(beforeCursor)) {
    return { type: 'risk-level' };
  }

  // At top-level or inside "rules" → could be a policy template
  if (/^\s*\{?\s*$/.test(beforeCursor) || /(?:"rules")\s*:\s*\[\s*$/i.test(beforeCursor)) {
    return { type: 'policy-template' };
  }

  return { type: 'unknown' };
}

// ── Completion provider ──────────────────────────────────────────────

/**
 * Compute completion items for a position in a claws.json document.
 *
 * @param lineText - The full text of the line containing the cursor
 * @param character - The 0-based character offset of the cursor
 * @param ir - The cached GovernanceIR for tool name resolution (optional)
 * @returns An array of completion items
 */
export function computeCompletions(
  lineText: string,
  character: number,
  ir?: GovernanceIRLike,
): readonly CompletionItem[] {
  const ctx = detectContext(lineText, character);

  switch (ctx.type) {
    case 'relax-expression':
      return buildRelaxCompletions(ir);
    case 'tool-name':
      return buildToolNameCompletions(ir);
    case 'policy-template':
      return buildPolicyTemplateCompletions();
    case 'risk-level':
      return buildRiskLevelCompletions();
    case 'unknown':
      // Return combined RELAX + templates as a general suggestion set
      return [...buildRelaxCompletions(ir), ...buildPolicyTemplateCompletions()];
  }
}

/**
 * Build RELAX expression completions (operators, predicates, tool names).
 */
function buildRelaxCompletions(ir?: GovernanceIRLike): readonly CompletionItem[] {
  const items: CompletionItem[] = [];

  // RELAX operators
  for (const op of RELAX_OPERATORS) {
    items.push({
      label: op,
      kind: CompletionItemKind.Keyword,
      detail: `RELAX operator: ${op}`,
      documentation: `RELAX policy expression operator "${op}"`,
      sortText: `0-${op}`,
    });
  }

  // RELAX predicates
  for (const pred of RELAX_PREDICATES) {
    items.push({
      label: pred,
      kind: CompletionItemKind.Function,
      detail: `RELAX predicate: ${pred}`,
      documentation: `Built-in RELAX predicate "${pred}" for policy evaluation`,
      sortText: `1-${pred}`,
    });
  }

  // Tool names from IR
  if (ir) {
    const tools = extractTools(ir);
    for (const tool of tools) {
      items.push({
        label: tool.name,
        kind: CompletionItemKind.Variable,
        detail: `Tool: ${tool.name} (${tool.riskLevel})`,
        documentation: tool.description ?? `Tool "${tool.name}" at risk level ${tool.riskLevel}`,
        sortText: `2-${tool.name}`,
      });
    }
  }

  return items;
}

/**
 * Build tool name completions from the workspace manifest (GovernanceIR).
 */
function buildToolNameCompletions(ir?: GovernanceIRLike): readonly CompletionItem[] {
  if (!ir) return [];

  const tools = extractTools(ir);
  return tools.map((tool) => ({
    label: tool.name,
    kind: CompletionItemKind.Variable,
    detail: `Tool: ${tool.name} (${tool.riskLevel})`,
    documentation: tool.description ?? `Tool "${tool.name}" at risk level ${tool.riskLevel}`,
    sortText: `0-${tool.name}`,
  }));
}

/**
 * Build policy template snippet completions.
 */
function buildPolicyTemplateCompletions(): readonly CompletionItem[] {
  return POLICY_TEMPLATES.map((tpl, idx) => ({
    label: tpl.name,
    kind: CompletionItemKind.Snippet,
    detail: `Policy template: ${tpl.name}`,
    documentation: tpl.description,
    insertText: tpl.body,
    insertTextFormat: 2, // Snippet
    sortText: `0-${String(idx).padStart(2, '0')}`,
  }));
}

/**
 * Build risk level completions for RELAX expressions.
 */
function buildRiskLevelCompletions(): readonly CompletionItem[] {
  return RISK_LEVELS.map((level) => ({
    label: level,
    kind: CompletionItemKind.EnumMember,
    detail: `Risk level: ${level}`,
    documentation: `Risk classification level ${level}`,
    sortText: `0-${level}`,
  }));
}
