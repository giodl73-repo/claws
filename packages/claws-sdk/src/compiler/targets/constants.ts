/**
 * Canonical emit target constants -- single source of truth for the
 * free-tier platform list.
 *
 * This module has ZERO imports so both `validate/` and `emit/` can depend
 * on it without creating a cycle. Any code that needs to know "what
 * platforms can claws emit?" must import from here, never hardcode a list.
 *
 * Free tier: oc (OC Gateway plugin), claude-code (CLAUDE.md + plugin).
 * Paid-tier targets (cursor, copilot, crewai, langgraph, bedrock) are
 * intentionally NOT in this list -- they are rejected at both validate
 * and emit stages.
 *
 * @module claws-sdk/compiler/targets/constants
 */

/**
 * Allowed free-tier emit targets. The readonly tuple shape lets the
 * derived `EmitTarget` type be a precise string-literal union.
 */
export const FREE_TIER_TARGETS = ['oc', 'claude-code'] as const;

/**
 * Union of free-tier target strings. Derived from `FREE_TIER_TARGETS`
 * so the runtime list and type can never drift.
 */
export type EmitTarget = (typeof FREE_TIER_TARGETS)[number];

/**
 * Runtime membership test for an arbitrary string. Use at module
 * boundaries where the input type is `string` rather than `EmitTarget`.
 */
export function isFreeTierTarget(target: string): target is EmitTarget {
  return (FREE_TIER_TARGETS as readonly string[]).includes(target);
}
