/**
 * @bic/openclaw-policy/emit/lower — claws-internal rich PolicyIR
 *   → v2 (upstream-shaped) PolicyIR. Per `realigned-story.md` § "Cross-
 *   contract concerns surfaced during drafting":
 *
 *   > "Re-frame as a generic `Sensitivity` enum upstream and document the
 *   >  downstream R5-lowering: `claws-policy-generator/` emits PolicyIR
 *   >  where R5 actions appear as explicit `denyRules`, so even a non-
 *   >  claws guardrail enforces them."
 *
 * The upstream contract is generic; the downstream artifact carries
 * claws semantics via the rule encoding. R0–R4 collapse to the upstream
 * `RiskLevel` ordinal (`low`/`medium`/`high`/`critical`); R5 tools emit
 * an additional explicit `denyRule` so any conforming guardrail blocks
 * them without needing tier awareness.
 *
 * @module @bic/openclaw-policy/emit/lower
 */

import type {
  PolicyIR as V2PolicyIR,
  ToolSpec as V2ToolSpec,
  DenyRule as V2DenyRule,
  RiskLevel as V2RiskLevel,
  Sensitivity as V2Sensitivity,
  SnapshotId,
} from '@bic/v2-prototype';

import type {
  PolicyIR as RichPolicyIR,
  ToolSpec as RichToolSpec,
  PolicyTier,
  Sensitivity as RichSensitivity,
} from '../types/index.js';

const TIER_TO_RISK: Record<PolicyTier, V2RiskLevel> = {
  R0: 'low',
  R1: 'low',
  R2: 'medium',
  R3: 'medium',
  R4: 'high',
  R5: 'critical',
};

const SENSITIVITY_DOWN: Record<RichSensitivity, V2Sensitivity> = {
  PUBLIC: 'public',
  INTERNAL: 'internal',
  CONFIDENTIAL: 'confidential',
  RESTRICTED: 'restricted',
};

function effectiveTier(t: RichToolSpec): PolicyTier {
  // Prefer compile-time-escalated tier; fall back to declared tier; final
  // fall back to ordinal mapping from numeric riskLevel.
  return t.effectiveTier ?? t.declaredTier ?? (`R${t.riskLevel}` as PolicyTier);
}

function loweredTool(rich: RichToolSpec): V2ToolSpec {
  const tier = effectiveTier(rich);
  return {
    id: rich.name,
    capabilities: rich.capabilities.map((c) => c.toLowerCase()),
    risk: TIER_TO_RISK[tier],
    sensitivity: SENSITIVITY_DOWN[rich.sensitivity ?? 'PUBLIC'],
  };
}

/**
 * Per realigned-story §R5-lowering: every R5 tool also produces an
 * explicit deny rule so non-claws guardrails enforce the tier without
 * needing tier-awareness in their own logic. Upstream guardrails that
 * only understand `denyRules` will still block R5 actions correctly.
 */
function r5DenyRules(rich: readonly RichToolSpec[]): V2DenyRule[] {
  return rich
    .filter((t) => effectiveTier(t) === 'R5')
    .map<V2DenyRule>((t) => ({
      id: `r5-tier:${t.name}`,
      when: { tool: t.name },
      reason: 'r5-fail-closed (claws tier lowered to deny rule)',
    }));
}

function loweredSoulDenyRules(soul: RichPolicyIR['soul']): V2DenyRule[] {
  return soul.denyRules.map<V2DenyRule>((d) => ({
    id: d.id,
    when: { tag: d.pattern },
    reason: d.reason,
  }));
}

/**
 * Project a claws-internal rich `PolicyIR` to the upstream v2 shape.
 * `snapshotId` anchors the IR to the snapshot whose validated content
 * produced it (per v2 contract `generatedFrom`).
 *
 * `generatedAt` is normally `new Date().toISOString()` but the caller
 * can pin it via `opts.now` for byte-deterministic emit (used by
 * scope-parity tests and any caller that needs reproducible bytes —
 * regenerate from the same inputs ⇒ same bytes).
 */
export function toV2PolicyIR(
  rich: RichPolicyIR,
  snapshotId: SnapshotId,
  opts: { now?: () => Date } = {},
): V2PolicyIR {
  const tools = rich.tools.map(loweredTool);
  const denyRules = [...loweredSoulDenyRules(rich.soul), ...r5DenyRules(rich.tools)];
  const now = opts.now ?? (() => new Date());
  return {
    version: rich.version,
    policyId: rich.policyId,
    generatedAt: now().toISOString(),
    generatedFrom: snapshotId,
    tools,
    denyRules,
  };
}
