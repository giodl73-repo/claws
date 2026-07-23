/**
 * @bic/openclaw-guardrails — ProviderRegistryImpl + composeDecisions.
 *
 * Composition engine that chains multiple GuardrailProviders with deterministic
 * priority ordering (deny > review > modify > allow), enforces the R5
 * "force external approval" invariant, OR-reduces `requiresExternalApproval`
 * across all providers, and runs `postAudit` fire-and-forget so one provider's
 * audit failure cannot block another's.
 *
 * Ported from the governance orphan `spec/src/guardrail-provider.ts` into the
 * absorbed `@bic/openclaw-guardrails` default export, per guardrails.md §12
 * ("shared composition rules, fail-closed defaults, decision vocabulary").
 */

import type {
  AuthorizationDecision,
  GuardrailCapabilities,
  GuardrailProvider,
  RiskLevel,
  ToolCallEvent,
} from "./types.js";

/** Decision priority for composition: higher index wins. */
const DECISION_PRIORITY: Record<AuthorizationDecision["decision"], number> = {
  allow: 0,
  modify: 1,
  review: 2,
  deny: 3,
};

/**
 * Chains multiple GuardrailProviders with deterministic priority ordering.
 *
 * Priority: deny > review > modify > allow
 *
 * When multiple providers return different decisions for the same tool call:
 * - Any deny -> deny (strongest wins, first deny's reason used)
 * - No deny + any review -> review
 * - No deny/review + any modify -> modify (last modify wins)
 * - All allow -> allow
 *
 * R5 enforcement: if ANY provider reports riskLevel 5, requiresExternalApproval
 * is forced to true. This is enforced by the registry, not individual providers.
 *
 * Empty registry: returns allow with a WARNING log, alerting operators to
 * missing configuration.
 */
export class ProviderRegistryImpl {
  private readonly providers = new Map<string, GuardrailProvider>();

  /** Register a provider. Throws on duplicate name. */
  register(provider: GuardrailProvider): void {
    if (this.providers.has(provider.name)) {
      throw new Error(`Provider "${provider.name}" is already registered`);
    }
    this.providers.set(provider.name, provider);
  }

  /** Remove a provider by name. */
  unregister(name: string): void {
    this.providers.delete(name);
  }

  /**
   * Pre-authorize a tool call through all registered providers.
   * Returns the composed decision (deny > review > modify > allow).
   */
  async preAuthorize(event: ToolCallEvent): Promise<AuthorizationDecision> {
    if (this.providers.size === 0) {
      // Empty registry — warn loudly, default to allow so the host can still
      // run the call. Operators who wanted deny-by-default must register one.
      console.warn(
        "WARNING: ProviderRegistry has no providers registered. " +
          "Defaulting to allow-all. Configure at least one GuardrailProvider.",
      );
      return { decision: "allow" };
    }

    const decisions: AuthorizationDecision[] = [];
    for (const provider of this.providers.values()) {
      const decision = await provider.preAuthorize(event);
      decisions.push(decision);
    }
    return composeDecisions(decisions);
  }

  /**
   * Post-audit to all registered providers. Fire-and-forget per provider —
   * one failing audit sink MUST NOT block the rest.
   */
  async postAudit(event: ToolCallEvent, decision: AuthorizationDecision): Promise<void> {
    const promises = Array.from(this.providers.values()).map(async (provider) => {
      try {
        await provider.postAudit(event, decision);
      } catch {
        // Fire-and-forget: individual provider failures are swallowed.
      }
    });
    await Promise.all(promises);
  }

  /** List all registered providers and their capabilities. */
  listProviders(): GuardrailCapabilities[] {
    return Array.from(this.providers.values()).map((p) => p.getCapabilities());
  }
}

/**
 * Compose multiple authorization decisions using
 * deny > review > modify > allow priority.
 *
 * Also enforces:
 * - R5 enforcement: any riskLevel 5 forces requiresExternalApproval = true.
 * - requiresExternalApproval is OR'd across all providers.
 */
export function composeDecisions(
  decisions: readonly AuthorizationDecision[],
): AuthorizationDecision {
  if (decisions.length === 0) {
    return { decision: "allow" };
  }

  let anyR5 = false;
  let anyRequiresExternal = false;
  let highestRisk: RiskLevel | undefined;

  for (const d of decisions) {
    const risk = getRiskLevel(d);
    if (risk !== undefined) {
      if (risk === 5) anyR5 = true;
      if (highestRisk === undefined || risk > highestRisk) highestRisk = risk;
    }
    if (getRequiresExternalApproval(d)) {
      anyRequiresExternal = true;
    }
  }

  if (anyR5) {
    anyRequiresExternal = true;
  }

  let winner = decisions[0]!;
  for (let i = 1; i < decisions.length; i++) {
    const d = decisions[i]!;
    if (DECISION_PRIORITY[d.decision] > DECISION_PRIORITY[winner.decision]) {
      winner = d;
    }
  }

  switch (winner.decision) {
    case "deny":
      return {
        decision: "deny",
        reason: winner.reason,
        ...(highestRisk !== undefined && { riskLevel: highestRisk }),
      };
    case "review":
      return {
        decision: "review",
        reason: winner.reason,
        ...(winner.approvalHandle !== undefined && { approvalHandle: winner.approvalHandle }),
        ...(highestRisk !== undefined && { riskLevel: highestRisk }),
      };
    case "modify":
      return {
        decision: "modify",
        modifiedArguments: winner.modifiedArguments,
        ...(winner.reason !== undefined && { reason: winner.reason }),
        ...(highestRisk !== undefined && { riskLevel: highestRisk }),
        ...(anyRequiresExternal && { requiresExternalApproval: true }),
      };
    case "allow":
      return {
        decision: "allow",
        ...(anyRequiresExternal && { requiresExternalApproval: true }),
        ...(highestRisk !== undefined && { riskLevel: highestRisk }),
      };
  }
}

function getRiskLevel(d: AuthorizationDecision): RiskLevel | undefined {
  return "riskLevel" in d ? d.riskLevel : undefined;
}

function getRequiresExternalApproval(d: AuthorizationDecision): boolean {
  if (d.decision === "deny") return false;
  if (d.decision === "review") return true;
  if (d.decision === "allow") return d.requiresExternalApproval === true;
  // modify variant carries the flag to preserve R5 force-external-approval
  // when a modify winner composes with an allow-R5 peer
  return d.requiresExternalApproval === true;
}
