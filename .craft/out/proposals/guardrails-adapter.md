# guardrails adapter — downstream design

**Status**: internal design doc (not a pre-RFC — net upstream surface is 0 LoC)
**Target audience**: claws + lobster team
**Author**: giodl@microsoft.com
**Date**: 2026-04-29
**Revision**: R1-amended 2026-04-29 (gateway-as-signer + ctx.snapshotId + fail-closed alignment); R1-follow-on 2026-04-29 (`claws-guardrails` rename for naming consistency)

## TL;DR

Upstream OpenClaw already has the guardrails contract: `registerTrustedToolPolicy(policy)` with `evaluate(event, ctx) → { allow|block|params|requireApproval }` (`src/plugins/host-hooks.ts:65-72`). Our `packages/claws-guardrails/` (renamed from `openclaw-guardrails` per R1-follow-on for naming consistency with `claws-sdk`/`claws-serve`/`claws-snap-server`/`claws-policy-generator`) is already library-shaped (3,127 LoC, 7 subpaths, no daemon). The mismatch is purely vocabulary + lifecycle + composition. Wire a ~50-LoC adapter at `src/openclaw-adapter.ts` that translates `GuardrailProvider` → `PluginTrustedToolPolicyRegistration`; delete `ShellExecProvider` (78 LoC) since it duplicates upstream's native `~/.openclaw/exec-approvals.json` consumer. All 7 runtime subpaths stay downstream as the claws governance bundle.

## Why no upstream PR

The contract exists. We're conforming, not creating. Bandit's audit (`.craft/out/audits/guardrails-openclaw-design-fit.md`, Option A) established that Peter's preferred shape — `PluginTrustedToolPolicyRegistration` with sequential short-circuit composition over the `before_tool_call` hook — already ships at `src/plugins/host-hooks.ts:65-72`, with its hot-path composer at `src/plugins/trusted-tool-policy.ts:8-54` and registration verb at `src/plugins/types.ts:2347`. Anything we'd add would shadow what's already there.

## The mismatch we're translating

### Vocabulary

| claws `GuardrailProvider` | upstream `TrustedToolPolicy` |
|---|---|
| `allow` | `allow` (or `undefined` no-op) |
| `deny` | `block` (with `blockReason`) |
| `review` | `requireApproval` |
| `modify` | `params` |

### Lifecycle

- **claws**: `init(HostContext)` at startup (audit-sink, identity-bridge, signer, snapshot, stage-mode, logger); per-call `preAuthorize(event) → AuthorizationDecision`.
- **upstream**: `register(api)` at module load (registration verbs only); per-call `evaluate(event, ctx)` where `ctx` is `PluginHookToolContext` (`sessionKey`, `sessionId`).

The richer claws `HostContext` is captured by the `GuardrailProvider` closure at construction; the adapter does not try to translate it upstream-side.

### Composition

- **claws**: `composeDecisions` priority-merges across providers (`deny > review > modify > allow`, R5 force-external-approval).
- **upstream**: `runTrustedToolPolicies` iterates sequentially, short-circuits on first `block`/`allow:false`, accumulates `params` and the first `requireApproval`.

We compose on the claws side (`ProviderRegistryImpl.preAuthorize`) and expose a single composed `GuardrailProvider` to the adapter — the adapter wraps that one chain as one `TrustedToolPolicy`. We do not register N upstream policies.

## The adapter

### Location

`packages/claws-guardrails/src/openclaw-adapter.ts` (~50 LoC).

### Signature

```ts
import type { PluginTrustedToolPolicyRegistration } from "@openclaw/plugin-sdk/host-hooks";
import type { GuardrailProvider } from "./types.js";

export function toTrustedToolPolicy(
  provider: GuardrailProvider,
): PluginTrustedToolPolicyRegistration {
  return {
    id: provider.id,
    description: provider.description,
    evaluate: async (event, ctx) => mapDecision(
      await provider.preAuthorize(eventToToolCallEvent(event, ctx)),
    ),
  };
}
```

### Decision mapping

| `AuthorizationDecision`               | `PluginToolPolicyDecision`                          |
|---------------------------------------|-----------------------------------------------------|
| `{ kind: "allow" }`                   | `undefined` (no-op, chain continues)                |
| `{ kind: "deny", reason }`            | `{ block: true, blockReason: reason }`              |
| `{ kind: "review", handle }`          | `{ requireApproval: { id: handle.id, ... } }`       |
| `{ kind: "modify", params }`          | `{ params }`                                        |

`review` drops the approval-handle's signature/sequence-number metadata at the wire — those stay claws-internal and re-bind when the approval resolves via `HostContext.approvalHandleSigner`. The upstream flow goes through `exec-approval-manager` for human-in-the-loop confirmation.

### Composition handling

Providers register into `ProviderRegistryImpl` on the claws side; the registry priority-merges per call. We expose a single `composedProvider: GuardrailProvider` whose `preAuthorize` delegates to `registry.preAuthorize(event)`. The adapter wraps that one composed provider as ONE upstream `TrustedToolPolicy`. Net: upstream sees one registration; our priority semantics are preserved unchanged downstream.

## What stays downstream

The 7 runtime subpaths stay in `packages/claws-guardrails/` as the claws governance bundle:

- `audit/` (~767 LoC) — hash-chained JSONL audit log + WAL + verify + CEF/syslog export
- `approvals/` (~293 LoC) — approval-handle issuance, validation guards, types
- `budget/` (~263 LoC) — token + cost meter for budget enforcement
- `identity/` (~436 LoC) — OIDC/SAML token validation + `IdentityBridge` + RBAC
- `siem/` (~182 LoC) — CEF/NDJSON/syslog formatters + emitter
- `secrets/` (~283 LoC) — pattern-based credential scanner + entropy heuristic
- `handle-binding/` (~338 LoC) — field-level handle validation (provider-id, content-hash, nonce, ttl, signature, sequence-number, approver-principal, key-id)

Upstream's auth model, audit pipe (`src/control-plane-audit.ts`), and exec-approval-manager are deliberately simpler and serve a different ecosystem.

## What gets deleted

`src/shell-exec-provider.ts` (~78 LoC) duplicates upstream's native `~/.openclaw/exec-approvals.json` consumer (`src/gateway/exec-approval-manager.ts`). When claws-serve runs inside an OpenClaw gateway, the upstream consumer wins; when claws-serve runs standalone, we don't need a `GuardrailProvider` shim around the same file. Delete the wrapper.

## Connection to PolicyIR + snap

```
ctx.snapshotId (R1: per-evaluate, threaded by gateway via PluginHookToolContext)
  → snap.read(snap=ctx.snapshotId, POLICY_IR_PATH) → PolicyIR
  → GuardrailProvider closure(PolicyIR, HostContext)
  → ProviderRegistryImpl (claws-side priority-merge)
  → toTrustedToolPolicy(composedProvider)   ← THIS adapter (~50 LoC)
  → api.registerTrustedToolPolicy(...)      ← upstream verb (already exists)
  → gateway `before_tool_call` → evaluate(event, ctx) → enforce
```

Snap (yankee) and PolicyIR (pundit) feed the closure; the gateway owns the hook pipeline AND threads `ctx.snapshotId` through (R1 amendment per `policy-pre-rfc.md` Ask §4). The adapter is the final translation layer.

### Fail-closed on adapter boundaries (R1 amendment 2026-04-29 addressing M-FAIL-CLOSED-UNSPECIFIED)

The adapter's `toTrustedToolPolicy` translation MUST preserve fail-closed semantics:

- If `provider.preAuthorize(...)` throws, the adapter MUST return `{ block: true, blockReason: 'evaluator-error' }` rather than allowing the exception to propagate to upstream's runner (whose exception-handling we're asking Peter to confirm fail-closed; see `policy-pre-rfc.md` Ask §5).
- If the upstream `ctx.snapshotId` is missing (transitional state, before the extension lands), the adapter MUST treat as deny — block the call until `ctx` carries the snapshot anchor.
- If the loaded PolicyIR is missing, malformed, or has a `policyId` mismatch, the closure MUST emit `deny` (per `policy-pre-rfc.md` "Failure semantics").

### Audit emission (R1 amendment 2026-04-29 addressing M-AUDIT-EMISSION-BYPASSABLE)

Audit emission for policy decisions is **gateway-emitted**, not adapter-decorated. The gateway emits a hash-chained audit entry on every `evaluate(event, ctx)` invocation: block, allow, params, requires-approval. The adapter's job is only the decision-vocabulary translation; it does not own audit. This is the same posture as snap's audit emission (see `snap-pre-rfc.md` "Audit emission") — single audit-emitting layer (the gateway), no decorators that consumers can skip.

## Implementation order

1. Wire adapter at `packages/claws-guardrails/src/openclaw-adapter.ts`; export `toTrustedToolPolicy` from package root.
2. Update claws-serve gateway-lifecycle wiring: alongside the existing `ProviderRegistryImpl`, call `api.registerTrustedToolPolicy(toTrustedToolPolicy(composedProvider))` when running embedded in an OpenClaw gateway.
3. Delete `src/shell-exec-provider.ts` and its export from `src/index.ts`; update tests and stale consumers.
4. Confirm lobster-web's audit + governance hooks consume PolicyIR via `snap.read(snap, POLICY_IR_PATH)` (plumb-through, same wave).

## What we'd ask Peter (FYI, not gating)

Three forward-looking questions from bandit's audit, if we open a `#clawtributors` thread later:

1. Are `before_tool_call` + `registerTrustedToolPolicy` the canonical seams, or is a unified `before_action` hook (tool + file ingest + subagent spawning + dispatch) on the roadmap? Our `FileIngestProvider` has no upstream analog today.
2. Would Peter widen `PluginToolPolicyDecision` with explicit `review` (bound approval handle) and `modify` (with reason) variants, or is `requireApproval` + `params` enough?
3. Is there an upstream plan for richer `HostContext` injected at `register(api)` time (audit-sink, identity-bridge, signer)?

None of these gate the adapter work.
