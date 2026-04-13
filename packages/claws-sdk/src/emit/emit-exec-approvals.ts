/**
 * exec-approvals.json emitter — generates L4 host backup approval
 * entries from GovernanceIR.
 *
 * Produces a JSON document with entries for every R5 tool in the
 * manifest, with approval requirements, custom overrides, and
 * built-in tool inclusion. Output validates against the frozen
 * OC platform exec-approvals schema.
 *
 * Key constraints:
 * - Every R5 tool from the manifest must have an entry
 * - Schema must match the OC platform spec exactly (snake_case fields)
 * - Custom overrides take precedence over derived entries
 * - Built-in tools included with is_builtin flag
 * - Platform field name mapping: snake_case, not camelCase
 *
 * @module claws-sdk/emit/emit-exec-approvals
 */

import type { GovernanceIR } from '../ir/governance-ir.js';
import type { DenyIntent } from '../ir/mechanical-intent.js';
import { riskLevelFromClassification } from '../compile/manifest.js';

/**
 * An entry in the exec-approvals.json tools array.
 * Uses OC platform snake_case field naming.
 */
export interface ExecApprovalEntry {
  /** Tool name (OC platform field: tool_name). */
  readonly tool_name: string;
  /** Whether the tool requires approval before execution. */
  readonly requires_approval: boolean;
  /** Risk level (1-5). */
  readonly risk_level?: number;
  /** Reason for the approval requirement. */
  readonly reason?: string;
  /** Originating rule ID. */
  readonly rule_id?: string;
  /** Whether this is a built-in platform tool. */
  readonly is_builtin?: boolean;
}

/**
 * The top-level exec-approvals.json document structure.
 */
export interface ExecApprovalsDocument {
  /** Schema version for the exec-approvals format. */
  readonly schema_version: number;
  /** Tool approval entries. */
  readonly tools: readonly ExecApprovalEntry[];
}

/**
 * Options for exec-approvals generation.
 */
export interface EmitExecApprovalsOptions {
  /** Custom approval overrides — takes precedence over derived entries. */
  readonly customOverrides?: ReadonlyMap<
    string,
    { requires_approval: boolean; reason: string }
  >;
  /** Built-in tool names to include with is_builtin flag. */
  readonly builtinTools?: readonly string[];
}

/**
 * Result of exec-approvals.json generation.
 */
export interface ExecApprovalsResult {
  /** The generated JSON string. */
  readonly content: string;
  /** Warnings produced during generation. */
  readonly warnings: readonly string[];
}

/**
 * Frozen OC exec-approvals.json schema definition.
 * Used for validation in tests and at generation time.
 */
export const OC_EXEC_APPROVALS_SCHEMA = {
  type: 'object' as const,
  properties: {
    schema_version: { type: 'number' as const },
    tools: {
      type: 'array' as const,
      items: {
        type: 'object' as const,
        required: ['tool_name', 'requires_approval'] as const,
        properties: {
          tool_name: { type: 'string' as const },
          requires_approval: { type: 'boolean' as const },
          risk_level: { type: 'number' as const, minimum: 1, maximum: 5 },
          reason: { type: 'string' as const },
          rule_id: { type: 'string' as const },
          is_builtin: { type: 'boolean' as const },
        },
      },
    },
  },
  required: ['schema_version', 'tools'] as const,
} as const;

/**
 * Current schema version for exec-approvals.json.
 */
const SCHEMA_VERSION = 1;

/**
 * Generate exec-approvals.json from a GovernanceIR.
 *
 * @param ir - The compiled GovernanceIR
 * @param options - Generation options
 * @returns JSON content with approval entries and warnings
 */
export function emitExecApprovals(
  ir: GovernanceIR,
  options: EmitExecApprovalsOptions = {},
): ExecApprovalsResult {
  const warnings: string[] = [];
  const entries = new Map<string, ExecApprovalEntry>();

  // 1. Derive entries from R5 deny intents
  const denyIntents = ir.intents.filter(
    (i): i is DenyIntent => i.kind === 'deny',
  );
  for (const intent of denyIntents) {
    entries.set(intent.target, {
      tool_name: intent.target,
      requires_approval: true,
      risk_level: intent.level,
      reason: intent.reason,
      rule_id: intent.ruleId,
    });
  }

  // 2. Add entries from capability manifest tools
  for (const tool of ir.capabilities.tools) {
    if (entries.has(tool.name)) continue;
    const riskLevel = riskLevelFromClassification(tool.riskLevel);
    const requiresApproval = riskLevel >= 4 || tool.oboFlag;
    const entry: ExecApprovalEntry = requiresApproval
      ? {
          tool_name: tool.name,
          requires_approval: true,
          risk_level: riskLevel,
          reason: `R${riskLevel} tool — ${tool.riskLevel} risk`,
        }
      : {
          tool_name: tool.name,
          requires_approval: false,
          risk_level: riskLevel,
        };
    entries.set(tool.name, entry);
  }

  // 3. Add entries from enforcement plan (required approvals)
  for (const toolName of ir.analysis.enforcementPlan.requiredApprovals) {
    const existing = entries.get(toolName);
    if (existing && !existing.requires_approval) {
      // Upgrade to require approval
      entries.set(toolName, {
        ...existing,
        requires_approval: true,
        reason: existing.reason ?? 'Required by enforcement plan',
      });
    }
  }

  // 4. Apply custom overrides (highest precedence)
  if (options.customOverrides) {
    for (const [toolName, override] of options.customOverrides) {
      const existing = entries.get(toolName);
      const overrideEntry: ExecApprovalEntry = {
        tool_name: toolName,
        requires_approval: override.requires_approval,
        reason: override.reason,
        ...(existing?.risk_level !== undefined ? { risk_level: existing.risk_level } : {}),
        ...(existing?.rule_id !== undefined ? { rule_id: existing.rule_id } : {}),
      };
      entries.set(toolName, overrideEntry);
    }
  }

  // 5. Include built-in tools
  if (options.builtinTools) {
    for (const name of options.builtinTools) {
      if (!entries.has(name)) {
        entries.set(name, {
          tool_name: name,
          requires_approval: false,
          is_builtin: true,
        });
      } else {
        const existing = entries.get(name)!;
        entries.set(name, {
          ...existing,
          is_builtin: true,
        });
      }
    }
  }

  // Build the document
  const doc: ExecApprovalsDocument = {
    schema_version: SCHEMA_VERSION,
    tools: Array.from(entries.values()),
  };

  // Validate R5 entries have requires_approval = true — safety-critical override
  const correctedTools = doc.tools.map((entry) => {
    if (entry.risk_level === 5 && !entry.requires_approval) {
      warnings.push(
        `R5 tool "${entry.tool_name}" has requires_approval=false — overriding to true`,
      );
      return { ...entry, requires_approval: true, reason: entry.reason ?? 'R5 tool — requires approval (safety override)' };
    }
    return entry;
  });

  const correctedDoc: ExecApprovalsDocument = {
    ...doc,
    tools: correctedTools,
  };

  const content = JSON.stringify(correctedDoc, null, 2);
  return { content, warnings };
}
