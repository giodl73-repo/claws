/**
 * @bic/openclaw-guardrails/openclaw-adapter — translate a claws-side
 * `GuardrailProvider` into upstream's `PluginTrustedToolPolicyRegistration`.
 *
 * Per `.craft/out/proposals/guardrails-adapter.md`. Stateless vocab
 * translator — no caching, no side effects. The cache layer + lifecycle
 * subscription that wraps this adapter into a registered policy plugin
 * lives at `./policy-runtime/policy-plugin.ts`.
 *
 * **Decision-vocabulary mapping**:
 *
 *   `AuthorizationDecision` (claws)        → `PluginToolPolicyDecision` (upstream)
 *   ─────────────────────────────────────────────────────────────────────────────
 *   `{ decision: 'allow' }`                → `undefined` (no-op; chain continues)
 *   `{ decision: 'deny', reason }`         → `{ block: true, blockReason: reason }`
 *   `{ decision: 'review', reason, ... }`  → `{ requireApproval: { title, description: reason, ... } }`
 *   `{ decision: 'modify', modifiedArguments, reason? }`  → `{ params: modifiedArguments, ... }`
 *
 * **Fail-closed on evaluator throw**: if `provider.preAuthorize(...)`
 * throws, the adapter returns `{ block: true, blockReason: 'evaluator-error' }`
 * rather than letting the exception propagate to upstream's runner
 * (where exception-handling semantics aren't yet contractually
 * fail-closed — see `policy-pre-rfc.md` Ask §5).
 *
 * @module @bic/openclaw-guardrails/openclaw-adapter
 */

import type { AuthorizationDecision, GuardrailProvider, ToolCallEvent } from "./types.js";

/**
 * Upstream `PluginTrustedToolPolicyRegistration` shape, mirrored locally
 * so this package doesn't have a hard dep on `@openclaw/plugin-sdk`.
 * When openclaw is consumed via npm, swap to:
 *
 *   import type {
 *     PluginTrustedToolPolicyRegistration,
 *     PluginToolPolicyDecision,
 *     PluginHookBeforeToolCallEvent,
 *     PluginHookToolContext,
 *   } from '@openclaw/plugin-sdk/host-hooks';
 *
 * Shape verified against `C:\src\openclaw-core\src\plugins\host-hooks.ts:58-72`
 * and `hook-types.ts:403-434` as of 2026-04-29.
 */
export interface UpstreamPluginToolPolicyDecision {
  readonly params?: Record<string, unknown>;
  readonly block?: boolean;
  readonly blockReason?: string;
  readonly requireApproval?: {
    readonly title: string;
    readonly description: string;
    readonly severity?: "info" | "warning" | "critical";
    readonly timeoutMs?: number;
    readonly timeoutBehavior?: "allow" | "deny";
    readonly pluginId?: string;
  };
}

export interface UpstreamPluginHookBeforeToolCallEvent {
  readonly toolName: string;
  readonly params: Record<string, unknown>;
  readonly runId?: string;
  readonly toolCallId?: string;
}

export interface UpstreamPluginHookToolContext {
  readonly agentId?: string;
  readonly sessionKey?: string;
  readonly sessionId?: string;
  readonly runId?: string;
  readonly toolCallId?: string;
  readonly toolName: string;
}

export interface UpstreamPluginTrustedToolPolicyRegistration {
  readonly id: string;
  readonly description: string;
  readonly evaluate: (
    event: UpstreamPluginHookBeforeToolCallEvent,
    ctx: UpstreamPluginHookToolContext,
  ) => UpstreamPluginToolPolicyDecision | void | Promise<UpstreamPluginToolPolicyDecision | void>;
}

/**
 * Translate a claws-side `GuardrailProvider` into upstream's
 * `PluginTrustedToolPolicyRegistration`. Pure function; no closure
 * over external state.
 *
 * The returned registration's `evaluate` is async; it calls
 * `provider.preAuthorize(toolCallEvent)` and translates the decision.
 * The translation is exhaustive — any future variant added to
 * `AuthorizationDecision` will surface as a TypeScript exhaustiveness
 * check failure (the `_exhaustive: never` lock at the bottom).
 */
export function toTrustedToolPolicy(
  provider: GuardrailProvider,
): UpstreamPluginTrustedToolPolicyRegistration {
  return {
    id: provider.name,
    description:
      provider.getCapabilities?.()?.description ?? `Claws guardrail provider: ${provider.name}`,
    evaluate: async (event, ctx) => {
      const toolCallEvent = upstreamEventToClawsEvent(event, ctx);
      let decision: AuthorizationDecision;
      try {
        decision = await provider.preAuthorize(toolCallEvent);
      } catch (err) {
        // Fail-closed on evaluator throw. Do not propagate; do not
        // fall through to allow.
        return {
          block: true,
          blockReason: `evaluator-error: ${err instanceof Error ? err.message : String(err)}`,
        };
      }
      return mapDecision(decision);
    },
  };
}

/**
 * Build a claws-side `ToolCallEvent` from upstream's hook shape. The
 * claws side uses richer context (`conversationId`, `agentId`,
 * `workspaceId`); we map from upstream's `(event, ctx)` pair.
 */
function upstreamEventToClawsEvent(
  event: UpstreamPluginHookBeforeToolCallEvent,
  ctx: UpstreamPluginHookToolContext,
): ToolCallEvent {
  // Read `snapshotId` off the upstream ctx (v2 PolicyIR contract Ask §4).
  // Until upstream lands the type extension this is a structural read with
  // a local cast; the wire shape is the same either way.
  const ctxWithSnap = ctx as UpstreamPluginHookToolContext & { snapshotId?: string };
  return {
    server: "gateway",
    tool: event.toolName,
    arguments: event.params,
    context: {
      conversationId: ctx.sessionId ?? ctx.sessionKey ?? "",
      ...(ctx.agentId !== undefined ? { agentId: ctx.agentId } : {}),
      ...(ctxWithSnap.snapshotId !== undefined ? { snapshotId: ctxWithSnap.snapshotId } : {}),
    },
  };
}

/**
 * Translate an `AuthorizationDecision` (claws-side discriminated union)
 * into upstream's `PluginToolPolicyDecision` shape. Exhaustive over the
 * 4 variants of `AuthorizationDecision`.
 */
function mapDecision(
  decision: AuthorizationDecision,
): UpstreamPluginToolPolicyDecision | undefined {
  switch (decision.decision) {
    case "allow":
      // No-op for the chain; upstream's runner moves to the next plugin.
      return undefined;
    case "deny":
      return {
        block: true,
        blockReason: decision.reason,
      };
    case "review":
      return {
        requireApproval: {
          title: "Approval required",
          description: decision.reason,
          severity:
            decision.riskLevel !== undefined && decision.riskLevel >= 4 ? "critical" : "warning",
        },
      };
    case "modify":
      return {
        params:
          typeof decision.modifiedArguments === "object" &&
          decision.modifiedArguments !== null &&
          !Array.isArray(decision.modifiedArguments)
            ? (decision.modifiedArguments as Record<string, unknown>)
            : { value: decision.modifiedArguments },
      };
    default: {
      // Exhaustiveness check — adding a new variant to AuthorizationDecision
      // without updating this switch produces a TypeScript error here.
      const _exhaustive: never = decision;
      void _exhaustive;
      return undefined;
    }
  }
}
