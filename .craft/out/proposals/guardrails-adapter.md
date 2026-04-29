# guardrails adapter — downstream design

**Status**: internal design doc (not a pre-RFC — net upstream surface is 0 LoC)
**Target audience**: claws + lobster team
**Author**: giodl@microsoft.com
**Date**: 2026-04-29
**Revision**: R1-amended 2026-04-29 (gateway-as-signer + ctx.snapshotId + fail-closed alignment); R1-follow-on 2026-04-29 (`claws-guardrails` rename for naming consistency); R2 amendment 2026-04-29 (policy-plugin runtime: lazy cache replacing aspirational `onSnapshotPromoted`, fail-closed-on-missing-`ctx.snapshotId` with diagnostic shape, per-session bounded-LRU eviction; implementation order revised to surface the cache module as a separate work item)

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

### Policy plugin runtime — cache + fail-closed-on-missing-snap (R2 amendment 2026-04-29)

Three runtime decisions for the policy plugin shell (the registered upstream `PluginTrustedToolPolicyRegistration` that wraps `composedProvider` via this adapter). These are downstream concerns — no contract change — but pinning them now keeps the carve work coherent.

#### 1. Lazy cache (no `onSnapshotPromoted` dependency)

PolicyIR is fetched on first `evaluate(event, ctx)` per snapshot ID, not pre-warmed via a lifecycle hook. **`onSnapshotPromoted` does NOT exist in upstream today** (verified 2026-04-29 by grep against `C:\src\openclaw-core\src\plugins/`, `src/plugin-sdk/`, `src/gateway/`); earlier draft references to it described aspiration, not existing surface. Lazy-load works fine because `claws-snap-server` is colocated in-process with the gateway in the v2 deployment shape — `snap.read(...)` is sub-millisecond hot-path.

```ts
const cache = new Map<SessionKey, Map<SnapshotId, PolicyIR>>();

async function evaluate(event: PluginToolPolicyEvent, ctx: PluginHookToolContext)
    : Promise<PluginToolPolicyDecision | undefined> {
  if (ctx.snapshotId === undefined) {
    return failClosedMissingSnap(); // see (2)
  }
  const sessionCache = cache.get(ctx.sessionKey) ?? new Map();
  let ir = sessionCache.get(ctx.snapshotId);
  if (ir === undefined) {
    const bytes = await store.read(ctx.snapshotId, POLICY_IR_PATH);
    ir = JSON.parse(new TextDecoder().decode(bytes)) as PolicyIR;
    validatePolicyIR(ir); // throws on hash mismatch / generatedFrom mismatch
    sessionCache.set(ctx.snapshotId, ir);
    cache.set(ctx.sessionKey, sessionCache);
  }
  const decision = await composedProvider.preAuthorize(
    eventToToolCallEvent(event, ctx, ir),
  );
  return mapDecision(decision);
}
```

The cache is plugin-private state (per-process); it is NOT shared across plugin replicas. Consumers running multiple gateway instances accept that each instance pays one cold-cache `snap.read(...)` per `(sessionKey, snapshotId)` pair on first hit. This is intentional — shared cache would require a coordination layer that's out of scope.

#### 2. Fail-closed on missing `ctx.snapshotId`

When `ctx.snapshotId` is `undefined`, `evaluate()` returns:

```ts
function failClosedMissingSnap(): PluginToolPolicyDecision {
  return {
    block: true,
    blockReason:
      "policy plugin received evaluate() without ctx.snapshotId. " +
      "Gateway must thread ctx.snapshotId at hook invocation time. " +
      "See https://docs.openclaw.ai/plugin-sdk/policy-ir#ctx-snapshot-id",
  };
}
```

**Rationale**:

- **The whole point of `ctx.snapshotId` is closing the TOCTOU window.** Falling back to plugin-private "last-seen-snapshot" reintroduces exactly the multi-tenant policy bleed and promotion-observation skew the field was added to prevent. Asking upstream for the field and then routing around it when absent makes the ask undefendable.
- **Fail-closed is scoped, not catastrophic.** `runTrustedToolPolicies` runs ALL registered policies in the chain; this plugin's deny is one denial among them, not a global block. Other registered policies still contribute decisions and the chain merger (after PR-4's conjunctive fix) collects them.
- **Sequencing is safe.** `ctx.snapshotId` ships in the same upstream PR as the PolicyIR types (`v2-policy-ir.md` bundles them). When `claws-guardrails` consumes the real `@openclaw/plugin-sdk` types, the gateway is already threading the field. There's no chicken-and-egg gap to bridge.

**Two caveats** for downstream operators:

- **Tests must mock `ctx.snapshotId`.** Any integration test exercising the policy plugin needs to thread a valid snapshot ID. Documented in the package README.
- **Startup ordering**: register the policy plugin AFTER the first snapshot exists. If a tool call fires before any `snap.capture(...)` has run, the plugin denies (correctly — there is no policy in force yet). Wave plan should note "snap.capture-first" as part of the gateway boot order.

The configurable-fallback escape hatch (`policy.allowMissingSnapshotAnchor: true`) is tempting but adds complexity for a vanishingly rare scenario. Skip it. If a downstream user wants legacy-compat behavior, they wire a different `PluginTrustedToolPolicyRegistration` that doesn't use PolicyIR — the existing per-domain `ssrf-policy.ts` / `channel-policy.ts` etc. continue to enforce per-domain rules without snapshot anchoring.

#### 3. Cache eviction — per-session bounded LRU

The cache is `Map<SessionKey, Map<SnapshotId, PolicyIR>>`. Eviction policy:

- **Inner map (per session)**: bounded LRU at 8 snapshot IDs. Sessions cycle through snapshots faster than memory leaks become a concern; 8 covers a few rapid-edit cycles plus a recent baseline. On overflow, evict the least-recently-used `(snapshotId, PolicyIR)` entry.
- **Outer map (session-scoped)**: evict on `onSessionEnded` if upstream provides such a lifecycle hook (verify before carving — same caveat as `onSnapshotPromoted`); else evict on a periodic sweep (every 60s, drop sessions whose last `evaluate()` was >15 min ago).
- **Memory cap**: each PolicyIR is bounded by its size on disk (typically <100 KB; very large workspaces could push into the low-MB range). Worst-case unbounded sessions × 8 snapshots × 1 MB = a low-tens-of-MB ceiling that doesn't justify aggressive optimization. If a tenant pushes past that, they hit the per-session LRU cap and the periodic sweep cleans up idle sessions.
- **Invalidation**: not required. PolicyIR is content-addressable via `policyId` (RFC 8785 JCS hash); a new snapshot promotion produces a different `SnapshotId` which produces a different cache key. Stale entries are naturally orphaned, never returned by mistake.

These numbers (8, 60s, 15min) are starting defaults. Tunable via downstream config if a deployment shape demands it; not contract concerns.

## Implementation order

1. Wire adapter at `packages/claws-guardrails/src/openclaw-adapter.ts`; export `toTrustedToolPolicy` from package root. Stateless translator; ~50 LoC.
2. Build the policy plugin shell at `packages/claws-guardrails/src/policy-runtime/policy-plugin.ts`. This is the listening piece that registers via `api.registerTrustedToolPolicy` and owns the plugin-private cache + `evaluate(event, ctx)` lifecycle. ~120 LoC including the lazy-cache + fail-closed-on-missing-snap + LRU eviction logic from the runtime decisions section above.
3. Build the cache module at `packages/claws-guardrails/src/policy-runtime/cache.ts`. Implements `Map<SessionKey, Map<SnapshotId, PolicyIR>>` with the bounded LRU eviction documented above. ~60 LoC.
4. Update claws-serve gateway-lifecycle wiring: alongside the existing `ProviderRegistryImpl`, instantiate the policy plugin shell with `composedProvider` and call `api.registerTrustedToolPolicy(plugin)` when running embedded in an OpenClaw gateway.
5. Delete `src/shell-exec-provider.ts` and its export from `src/index.ts`; update tests and stale consumers.
6. Confirm lobster-web's audit + governance hooks consume PolicyIR via `snap.read(snap, POLICY_IR_PATH)` (plumb-through, same wave).
7. Update package README with the test-side caveats: mocking `ctx.snapshotId`; "snap.capture-first" startup ordering; cache-eviction tuning knobs.

## What we'd ask Peter (FYI, not gating)

Three forward-looking questions from bandit's audit, if we open a `#clawtributors` thread later:

1. Are `before_tool_call` + `registerTrustedToolPolicy` the canonical seams, or is a unified `before_action` hook (tool + file ingest + subagent spawning + dispatch) on the roadmap? Our `FileIngestProvider` has no upstream analog today.
2. Would Peter widen `PluginToolPolicyDecision` with explicit `review` (bound approval handle) and `modify` (with reason) variants, or is `requireApproval` + `params` enough?
3. Is there an upstream plan for richer `HostContext` injected at `register(api)` time (audit-sink, identity-bridge, signer)?

None of these gate the adapter work.
