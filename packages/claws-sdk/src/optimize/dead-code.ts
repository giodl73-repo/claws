/**
 * Dead-code elimination — removes governance rules that are provably
 * inapplicable to the current compilation target.
 *
 * Two elimination criteria:
 * 1. **Absent tool rules** — rules governing tools not present in the
 *    skill's manifest are removed. If a skill doesn't use `send-email`,
 *    governance rules for email sending are dead code.
 * 2. **Explicitly disabled rules** — rules marked as disabled in the
 *    governance configuration (via `disabled_rules[]` or enforcement-plan
 *    suppression markers with active expiry) are removed.
 *
 * @module claws-sdk/optimize/dead-code
 */

import type { GovernanceIR } from '../ir/governance-ir.js';
import type { MechanicalIntent, DenyIntent, ElicitIntent } from '../ir/mechanical-intent.js';

/**
 * Options controlling which elimination criteria are applied.
 */
export interface DeadCodeOptions {
  /** Remove rules targeting tools absent from the manifest. Default: true. */
  readonly removeAbsentToolRules?: boolean;
  /** Remove explicitly disabled rules (suppression markers). Default: true. */
  readonly removeDisabledRules?: boolean;
  /** Additional rule IDs to force-disable. */
  readonly disabledRuleIds?: readonly string[];
}

/**
 * Result of dead-code elimination, including metrics.
 */
export interface DeadCodeResult {
  /** The optimized GovernanceIR with dead code removed. */
  readonly ir: GovernanceIR;
  /** Number of intents removed for absent tool rules. */
  readonly removedAbsentToolIntents: number;
  /** Number of intents removed for disabled rules. */
  readonly removedDisabledIntents: number;
  /** Total intents removed. */
  readonly totalRemoved: number;
  /** Number of R5 intents that were guarded (not removed despite disabledRuleIds). */
  readonly r5GuardedCount: number;
  /** Warning messages for R5 guard activations. */
  readonly r5Warnings: readonly string[];
}

/**
 * Determine whether an intent targets a specific tool by name.
 * Only `deny` and `elicit` intents have a `target` field that
 * represents a tool name.
 */
function getIntentToolTarget(intent: MechanicalIntent): string | undefined {
  if (intent.kind === 'deny' || intent.kind === 'elicit') {
    return (intent as DenyIntent | ElicitIntent).target;
  }
  return undefined;
}

/**
 * Eliminate dead code from a GovernanceIR.
 *
 * Returns a new GovernanceIR with inapplicable intents, delegation entries,
 * and enforcement plan entries removed, plus metrics about what was removed.
 */
export function eliminateDeadCode(
  ir: GovernanceIR,
  options: DeadCodeOptions = {},
): DeadCodeResult {
  const {
    removeAbsentToolRules = true,
    removeDisabledRules = true,
    disabledRuleIds = [],
  } = options;

  // Build set of tool names present in the manifest
  const manifestToolNames = new Set(ir.capabilities.tools.map((t) => t.name));

  // Build set of disabled rule IDs from suppression markers + explicit list
  const disabledIds = new Set<string>(disabledRuleIds);
  if (removeDisabledRules) {
    for (const marker of ir.analysis.enforcementPlan.ruleSuppressions) {
      // Only suppress if the marker has no expiry or hasn't expired
      if (marker.expiresAt === '' || new Date(marker.expiresAt) > new Date()) {
        disabledIds.add(marker.ruleId);
      }
    }
  }

  let removedAbsentToolIntents = 0;
  let removedDisabledIntents = 0;
  let r5GuardedCount = 0;
  const r5Warnings: string[] = [];
  const removedRuleIds = new Set<string>();

  // Build set of rule IDs from disabledRuleIds option (not ruleSuppressions)
  const optionDisabledIds = new Set<string>(disabledRuleIds);

  // Filter intents
  const keptIntents = ir.intents.filter((intent) => {
    // R5 guard: fail-closed intents (level 5) cannot be silently removed
    // via disabledRuleIds. ruleSuppressions from the IR are already validated
    // by validate-fail-modes.ts, so they are safe.
    if (intent.level === 5 && optionDisabledIds.has(intent.ruleId)) {
      r5GuardedCount++;
      r5Warnings.push(
        `R5 guard: intent '${intent.id}' (rule ${intent.ruleId}) is fail-closed (level 5) and cannot be removed via disabledRuleIds`,
      );
      return true; // Keep the intent
    }

    // Check disabled rules first
    if (removeDisabledRules && disabledIds.has(intent.ruleId)) {
      removedDisabledIntents++;
      removedRuleIds.add(intent.ruleId);
      return false;
    }

    // Check absent tool rules — R5 intents targeting absent tools are still
    // removed (the tool genuinely doesn't exist) but emit a warning
    if (removeAbsentToolRules) {
      const toolTarget = getIntentToolTarget(intent);
      if (toolTarget !== undefined && !manifestToolNames.has(toolTarget)) {
        if (intent.level === 5) {
          r5Warnings.push(
            `R5 absent-tool removal: intent '${intent.id}' (rule ${intent.ruleId}) removed because tool '${toolTarget}' is absent from manifest`,
          );
        }
        removedAbsentToolIntents++;
        removedRuleIds.add(intent.ruleId);
        return false;
      }
    }

    return true;
  });

  // Filter delegation map entries for removed rules
  const keptDelegations = ir.delegationMap.filter(
    (entry) => !removedRuleIds.has(entry.ruleId),
  );

  // Filter violations and warnings for removed rules
  const keptViolations = ir.analysis.violations.filter(
    (v) => !removedRuleIds.has(v.ruleId),
  );
  const keptWarnings = ir.analysis.warnings.filter(
    (w) => !removedRuleIds.has(w.ruleId),
  );

  // Filter enforcement plan entries
  const keptAuditOnlyRules = ir.analysis.enforcementPlan.auditOnlyRules.filter(
    (ruleId) => !removedRuleIds.has(ruleId),
  );

  const totalRemoved = removedAbsentToolIntents + removedDisabledIntents;

  const optimizedIR: GovernanceIR = {
    ...ir,
    intents: keptIntents,
    delegationMap: keptDelegations,
    analysis: {
      ...ir.analysis,
      violations: keptViolations,
      warnings: keptWarnings,
      enforcementPlan: {
        ...ir.analysis.enforcementPlan,
        auditOnlyRules: keptAuditOnlyRules,
      },
    },
  };

  return {
    ir: optimizedIR,
    removedAbsentToolIntents,
    removedDisabledIntents,
    totalRemoved,
    r5GuardedCount,
    r5Warnings,
  };
}
