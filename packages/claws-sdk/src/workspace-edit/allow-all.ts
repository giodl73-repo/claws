/**
 * Allow-all — bulk "enable every non-R5 tool" action for the CAP
 * Connections tab.
 *
 * The admin clicks a single button; the SDK enumerates every tool from the
 * compiled GovernanceIR, filters out the ones that must not be batch-enabled,
 * and builds a {@link ToggleEdit}(enabled: true) per remaining tool. Every
 * edit is routed through the same {@link ValidationPipeline} individual
 * PATCHes use, so the R5 fail-closed contract (P-282) is preserved even if
 * the caller forgets to skip R5 themselves.
 *
 * The "skipped" set carries both the tool name and the reason, so the route
 * can render a response summary and the audit trail records *why* each tool
 * was excluded. Skip reasons:
 *   - `r5`           — tool is classified `riskLevel: 'critical'`.
 *   - `fleet-locked` — fleet policy override requires approval.
 *   - `violation`    — system is DEGRADED and the tool is gated by a
 *                      pending violation (S05 DEGRADED semantics).
 *   - `unclassified` — tool has no risk classification (fail-closed).
 *
 * The module exports `planAllowAll` (pure planning, no I/O) and a builder
 * `toggleEditFor(toolName)` so the route and tests can share the edit shape
 * without re-computing it. Actual execution (pipeline validation, editor
 * apply, recompile) stays in the route — the SDK here is the planner +
 * filter, not an orchestrator.
 *
 * @module claws-sdk/workspace-edit/allow-all
 */

import type { GovernanceIR } from '../ir/governance-ir.js';
import type { ToolCapability } from '../ir/capability-manifest.js';
import type { FleetOverride } from '../emit/host-approval-policy-types.js';
import type { ToggleEdit } from './types.js';

/** Reason a tool was excluded from the allow-all batch. */
export type AllowAllSkipReason = 'r5' | 'fleet-locked' | 'violation' | 'unclassified';

/** One tool excluded from the batch, with its skip reason. */
export interface AllowAllSkippedTool {
  readonly tool: string;
  readonly reason: AllowAllSkipReason;
}

/** Output of {@link planAllowAll}. */
export interface AllowAllPlan {
  /** Edits to run through the ValidationPipeline (one per non-skipped tool). */
  readonly edits: readonly ToggleEdit[];
  /** Tools deliberately excluded, with skip reason for audit + response. */
  readonly skipped: readonly AllowAllSkippedTool[];
}

/**
 * Compilation state at planning time.
 *
 * The route inspects the CompilationHost (ok / stale / errored) and passes
 * this state in so the planner can exclude additional tools when the system
 * is degraded without touching the host directly.
 */
export type AllowAllCompileState = 'ok' | 'stale' | 'errored';

export interface AllowAllOptions {
  /** Fleet overrides (if a policy is loaded). Absent = no fleet constraints. */
  readonly fleetOverrides?: readonly FleetOverride[];
  /**
   * Compilation state. When `'stale'`, tools tied to pending violations are
   * skipped in addition to R5 and fleet-locked. `'errored'` callers should
   * short-circuit before calling this planner — the route returns 503.
   */
  readonly compileState?: AllowAllCompileState;
  /**
   * Set of tool names flagged by pending violations. Only consulted when
   * `compileState === 'stale'`. The route computes this from
   * `ir.analysis.violations` so the SDK doesn't need to re-interpret paths.
   */
  readonly violationTools?: ReadonlySet<string>;
}

/** Build the `ToggleEdit` shape used to enable a tool. */
export function toggleEditFor(toolName: string): ToggleEdit {
  return {
    kind: 'toggle',
    file: 'TOOLS.md',
    section: toolName,
    field: 'enabled',
    value: true,
  };
}

function isR5(tool: ToolCapability): boolean {
  return tool.riskLevel === 'critical';
}

function fleetLocksTool(
  tool: ToolCapability,
  overrides: readonly FleetOverride[] | undefined,
): boolean {
  if (overrides === undefined) return false;
  const match = overrides.find((o) => o.tool === tool.name);
  return match !== undefined && match.requires_approval === true;
}

/**
 * Plan an allow-all batch against the compiled IR.
 *
 * Pure function: no I/O, no mutation. The result is a list of edits the
 * caller runs through the ValidationPipeline + StructuredEditor, plus a
 * list of tools the planner excluded (with reasons).
 *
 * Tools without a `riskLevel` are treated as `'unclassified'` and skipped —
 * fail-closed matches the chunk-assembler's P-270 stance.
 */
export function planAllowAll(ir: GovernanceIR, options: AllowAllOptions = {}): AllowAllPlan {
  const edits: ToggleEdit[] = [];
  const skipped: AllowAllSkippedTool[] = [];
  const compileState = options.compileState ?? 'ok';
  const violationTools = options.violationTools;

  for (const tool of ir.capabilities.tools) {
    if (tool.riskLevel === undefined) {
      skipped.push({ tool: tool.name, reason: 'unclassified' });
      continue;
    }
    if (isR5(tool)) {
      skipped.push({ tool: tool.name, reason: 'r5' });
      continue;
    }
    if (fleetLocksTool(tool, options.fleetOverrides)) {
      skipped.push({ tool: tool.name, reason: 'fleet-locked' });
      continue;
    }
    if (
      compileState === 'stale' &&
      violationTools !== undefined &&
      violationTools.has(tool.name)
    ) {
      skipped.push({ tool: tool.name, reason: 'violation' });
      continue;
    }
    edits.push(toggleEditFor(tool.name));
  }

  return { edits, skipped };
}
