# Guardrails × OpenClaw design fit — Peter's lens

**Date**: 2026-04-28
**Branch**: `feature/isis-the-weaver`
**Scope**: read-only quick architectural audit of `packages/openclaw-guardrails/` reframed through Peter Steinberger's design philosophy. Question: **if Peter wanted runtime governance/guardrails in OpenClaw, how would he do it — and how does that compare to what already exists upstream and what we ship today?**
**Inputs**: `C:/src/claws/packages/openclaw-guardrails/` (claws-side); `C:/src/openclaw-core/src/{plugins, plugin-sdk, gateway, infra}/` (upstream); yankee's prior audit at `.craft/out/audits/snap-openclaw-design-fit.md` (for shape reference).

---

## TL;DR

**Upstream openclaw already has the guardrails contract — `registerTrustedToolPolicy(policy)` with `evaluate(event, ctx) → { allow, block, blockReason, params, requireApproval }`** (`src/plugins/host-hooks.ts:65-72`, hot-path at `src/plugins/trusted-tool-policy.ts:8-54`). It runs on the `before_tool_call` plugin hook, lives in-process inside the gateway's plugin runtime, and is already registered through the standard `registerHostHookFixture` shape. There is also a parallel exec-approval pipe (`src/gateway/exec-approval-manager.ts`) for user-in-the-loop confirmation, and `~/.openclaw/exec-approvals.json` as the file-backed approvals store. **Peter's guardrails surface is not a future to design — it's already there**, and our `ShellExecProvider` (which wraps `exec-approvals.json`) is essentially re-implementing what upstream already does natively.

This means **`@bic/openclaw-guardrails` (3,127 LoC across 42 files) is structurally close to upstream-shape but parallels, rather than implements, the upstream contract.** Our `GuardrailProvider.preAuthorize → AuthorizationDecision` is morally identical to upstream's `TrustedToolPolicy.evaluate → PluginToolPolicyDecision`, but the surfaces don't currently align — different decision vocabularies (`allow|deny|review|modify` vs `allow|block` + `params` + `requireApproval`), different event shapes, different lifecycle (no `init(HostContext)` upstream — context is injected via the second `evaluate` arg + `OpenClawPluginApi`), and a different composition story (we ship `composeDecisions`; upstream chains policies in sequence and short-circuits on first block).

**The package is library-shaped today — `package.json:11-43` is type/runtime exports across 7 subpaths, no `bin`, no server, no port. That's the right shape for upstream.** What it lacks is alignment with the upstream contract surface, so the package would not slot in as-is.

**Recommendation: Option A — align our peer interfaces with upstream's existing `TrustedToolPolicy`/`PluginToolPolicyDecision` rather than upstreaming a parallel contract.** Six runtime subpaths (audit, approvals, budget, identity, siem, secrets) **stay downstream as a claws governance bundle**; only the alignment shim + a small number of decision-shape additions move upstream. This is much smaller than yankee's snap recommendation because the contract already exists — we're conforming to it, not creating it.

---

## Method

1. Walked `C:/src/claws/packages/openclaw-guardrails/{package.json, src/}` — sized files, classified content (contract types vs runtime).
2. Searched upstream `C:/src/openclaw-core/src/` for `guardrail|enforce|preAuthor|trustedToolPolicy|exec-approval` patterns. Found dense existing infrastructure.
3. Read the existing upstream contract surface: `src/plugins/host-hooks.ts:58-72` (`PluginTrustedToolPolicyRegistration`, `PluginToolPolicyDecision`), `src/plugins/trusted-tool-policy.ts:8-54` (composition / hot-path), `src/plugins/types.ts:2347` (`registerTrustedToolPolicy` on `OpenClawPluginApi`), `src/plugins/contracts/host-hook-fixture.ts:62-74` (registration example), `src/gateway/exec-approval-manager.ts:53-150` (approval lifecycle).
4. Confirmed claws-side import surface — 25+ files import from `@bic/openclaw-guardrails/{audit,handle-binding}`; consumers include `openclaw-snap`, `openclaw-policy`, and e2e approval-flow scenarios.
5. Read yankee's `snap-openclaw-design-fit.md` for shape and to keep the methodology consistent.

No source files modified.

---

## Claws-side guardrails today

### Package shape

- **42 source files, 3,127 LoC** in `src/` (`wc -l` summary, `node_modules`-excluded).
- **`package.json` exports**: `.` (default — peer interfaces, decision types, capabilities, supporting types, `ProviderRegistryImpl`, `composeDecisions`, `ShellExecProvider`, `validateHandle`) + 7 subpaths: `./audit`, `./approvals`, `./budget`, `./identity`, `./siem`, `./secrets`, `./handle-binding`.
- **No `bin`, no listener, no port, no daemon process.** Pure library — `package.json:6-9` declares ESM `dist/index.js` only, `sideEffects: false`.
- **Runtime model**: imported as a library; consumers wire providers + a `HostContext` and call `registry.preAuthorize(event)`. The "host" is the consumer process (claws-serve, ingest pipeline, e2e harness), not a separate daemon.

### Public surface — `src/index.ts:16-62` + `src/types.ts:23-231`

- **Decision vocabulary**: `AuthorizationDecision = allow | deny | review | modify` (`types.ts:63-73`); `IngestDecision = allow | deny | review | modify` (`types.ts:79-83`).
- **Peer interfaces**: `GuardrailProvider { preAuthorize, postAudit, getCapabilities }` (`types.ts:110-115`); `FileIngestProvider { beforeIngest, afterIngest, getCapabilities }` (`types.ts:117-122`).
- **Lifecycle**: `ProviderLifecycle { init?(HostContext), shutdown?(), onSnapshotPromoted?, onStageModeChanged? }` (`types.ts:226-231`).
- **Host-injected context**: `HostContext { auditSink, identityBridge, approvalHandleSigner, snapshot, stageMode, logger }` (`types.ts:217-224`).
- **Composition engine**: `ProviderRegistryImpl` + `composeDecisions(decisions)` enforcing `deny > review > modify > allow` priority + R5 force-external-approval (`registry.ts:48-192`).
- **Risk taxonomy**: `RiskLevel = 0..5` (R0–R5: UNCLASSIFIED → READ → WRITE → COMMUNICATE → EXECUTE → TRANSACT) (`types.ts:23`).
- **Reference impl**: `ShellExecProvider` wrapping `exec-approvals.json` (`shell-exec-provider.ts:26-78`).

### Subpath runtime modules (LoC)

| Subpath | LoC | Concern |
|---------|-----|---------|
| `audit/` | ~767 | Hash-chained JSONL audit log + WAL + verify + CEF/syslog export. Imports `canonicalize` from `@bic/openclaw-workspace`. |
| `approvals/` | ~293 | Approval-handle issuance, validation guards, types. |
| `budget/` | ~263 | Token + cost meter for budget enforcement. |
| `handle-binding/` | ~338 | Field-level handle validation (provider-id, content-hash, nonce, ttl, signature, sequence-number, approver-principal, key-id) + first-failing evaluation order. |
| `identity/` | ~436 | OIDC/SAML token validation + `IdentityBridge` impl + RBAC. |
| `secrets/` | ~283 | Pattern-based credential scanner + entropy heuristic. |
| `siem/` | ~182 | CEF/NDJSON/syslog formatters + emitter. |
| `index.ts` + `registry.ts` + `shell-exec-provider.ts` + `types.ts` | ~562 | Default-export contract surface + composition. |

### Imports — who depends on this in claws

25+ files across:
- `packages/openclaw-snap/{src/server/audit.ts, tests/}` — imports `AuditEvent` from `/audit` (uses our chained-audit format for snapshot promote/rollback events).
- `packages/openclaw-policy/tests/` — imports verify + `TrustSetReloadFailedEntry` from `/audit`.
- `test/e2e/scenarios/approval-flows/*` — imports validators + binding fields from `/handle-binding`, `NonceEvictionEntry` from `/audit`.
- `test/e2e/harness/{canonicalizer-check.ts, audit-chain.ts}` — imports canonicalize + audit primitives.

**Coupling assessment**: low to upstream openclaw concerns (no imports from `openclaw/plugin-sdk/*` anywhere); high coherence within claws (audit chain backs both snap and policy + approval flows).

### Architectural classification

**Library, not daemon.** No HTTP server, no port-binding, no process supervision. This is the **upstream-friendly shape** at the package level — closer to upstream's `packages/plugin-sdk/` (types + small runtime helpers) than to a daemon. Yankee's snap audit found `packages/openclaw-snap/` 85-90% daemon-shaped; `openclaw-guardrails` is the inverse — already library-shaped.

---

## Upstream openclaw — guardrails-shaped concepts today

### What already exists (this is the load-bearing finding)

Upstream **already has a guardrails contract**, in production, registered through the plugin SDK:

#### `src/plugins/host-hooks.ts:58-72` — the contract
```ts
export type PluginToolPolicyDecision =
  | PluginHookBeforeToolCallResult                         // { block?, blockReason?, params?, requireApproval? }
  | { allow?: boolean; reason?: string };                  // simpler "deny" shorthand

export type PluginTrustedToolPolicyRegistration = {
  id: string;
  description: string;
  evaluate: (
    event: PluginHookBeforeToolCallEvent,                  // { toolName, params, sessionKey, ... }
    ctx: PluginHookToolContext,                            // { sessionKey, sessionId, ... }
  ) => PluginToolPolicyDecision | void | Promise<PluginToolPolicyDecision | void>;
};
```

#### `src/plugins/types.ts:2347` — the registration verb
```ts
registerTrustedToolPolicy: (policy: PluginTrustedToolPolicyRegistration) => void;
```

#### `src/plugins/trusted-tool-policy.ts:8-54` — the hot-path composer
```ts
export async function runTrustedToolPolicies(event, ctx): Promise<PluginHookBeforeToolCallResult | undefined> {
  const policies = getActivePluginRegistry()?.trustedToolPolicies ?? [];
  let adjustedParams = event.params;
  let approval;
  for (const registration of policies) {
    const decision = await registration.policy.evaluate({...event, params: adjustedParams}, ctx);
    if (decision?.allow === false) return { block: true, blockReason: decision.reason ?? `blocked by ${id}` };
    if (decision?.block === true) return { ...decision, blockReason: ... };
    if (decision.params) adjustedParams = decision.params;        // modify-equivalent
    if (decision.requireApproval && !approval) approval = decision.requireApproval;  // review-equivalent
  }
  return ...;
}
```

#### `src/plugins/contracts/host-hook-fixture.ts:64-73` — registration example
```ts
api.registerTrustedToolPolicy({
  id: "budget-policy",
  description: "Generic budget/workspace policy gate fixture",
  evaluate(event) {
    if (event.toolName === "blocked_fixture_tool") {
      return { block: true, blockReason: "blocked by fixture policy" };
    }
    return undefined;
  },
});
```

### Adjacent enforcement primitives upstream

- **`src/gateway/exec-approval-manager.ts`** — full lifecycle for human-in-the-loop approval: `create(request, timeoutMs)`, `register(record, timeoutMs) → Promise<Decision|null>`, `resolve(id, decision)`. Idempotent IDs, prefix lookup, cleanup grace. This is morally our `/approvals` subpath, already upstream.
- **`src/infra/exec-approval-{forwarder, channel-runtime}.ts`** — wires approval prompts onto chat channels (e.g., Matrix reactions seed `✅`/`❌`/`♾️`).
- **`src/plugin-sdk/{command-auth.ts, command-gating.ts, approval-auth-helpers.ts, approval-renderers.ts, approval-client-helpers.ts, approval-native-helpers.ts}`** — public SDK seams for plugins doing their own auth/approval flows.
- **`docs/tools/exec-approvals.md`** — `~/.openclaw/exec-approvals.json` is the documented user-facing approvals file. **This is exactly what `ShellExecProvider` wraps.** Upstream consumes this file directly via the gateway, not through a `GuardrailProvider` shim.
- **`src/plugins/contracts/plugin-sdk-runtime-api-guardrails.test.ts`** — already named "guardrails." This is a contract test that bundled-plugin runtime-API surfaces don't drift; the word "guardrail" is upstream vocabulary.
- **`before_tool_call` is one of 30+ documented plugin hooks** (`src/plugins/hook-types.ts:70-105`) — `before_agent_start`, `before_compaction`, `tool_result_persist`, `subagent_spawning`, `gateway_start`, etc. Plugins extend the gateway via these named seams.

### Pattern alignment

The existing upstream evidence is unambiguous:

- **Guardrails are PLUGINS** that register against `before_tool_call` via `registerTrustedToolPolicy`, NOT a separate package or daemon.
- **The hook system is the seam** — the same vocabulary that yankee's snap audit identified for "daemon-shape extensions" applies here. Plugins call `api.registerXxx(...)` at module load; the gateway's plugin runtime calls them on the appropriate hook.
- **Sequential composition with short-circuit on first block** — upstream's `runTrustedToolPolicies` uses early-return on first `block`/`allow:false`, accumulating params/approvals along the way. Our `composeDecisions` uses priority-based merging (`deny > review > modify > allow`) over a collected `decisions[]` array. Different semantics — upstream is fail-fast; ours composes all results then picks the strongest.
- **No `init(HostContext)` upstream.** Context flows via the second arg of `evaluate(event, ctx)` and the `OpenClawPluginApi` injected at `register(api)` time. Our richer lifecycle (`init`, `shutdown`, `onSnapshotPromoted`, `onStageModeChanged`) is claws-specific.

---

## Forward-design — what would Peter's guardrails look like?

### The contract is already there

Peter's contract is **`PluginTrustedToolPolicyRegistration` + `PluginToolPolicyDecision`** as already defined at `src/plugins/host-hooks.ts:58-72`. There is **nothing to design**, only to align to.

### Runtime integration

- **In-process inside gateway** via `before_tool_call` hook.
- **Per-policy `evaluate(event, ctx)`** receives the full tool-call event and can:
  - return `undefined` → no-op (chain continues),
  - return `{ block: true, blockReason }` → terminal deny,
  - return `{ allow: false, reason }` → terminal deny (alternate shorthand),
  - return `{ params }` → modify params (chain continues, later policies see modified params),
  - return `{ requireApproval }` → triggers exec-approval-manager (chain continues, approval flow starts).
- **No separate process, no HTTP, no port.** Just plugin registration.

### What's NOT (and shouldn't be) upstream

- **Specific rule definitions** (R0–R5 risk taxonomy with exact mapping, ISO 27001 sensitivity labels, RBAC role definitions) — these are claws-policy choices, not openclaw-universal.
- **OIDC/SAML token validation specifics** (`identity/bridge.ts`) — ecosystem-wide auth abstractions don't live in OpenClaw; upstream uses a different auth model (gateway-authenticated callers, paired-node trust extension per `docs/tools/exec-approvals.md:56-60`).
- **CEF/NDJSON/syslog SIEM emitters** — claws-specific compliance plumbing; OpenClaw stays SIEM-agnostic.
- **HMAC-signed approval handles with sequence-number anti-replay** — this is a claws security model that goes beyond upstream's `exec-approval-manager`'s simpler `id`-based registration.
- **Hash-chained audit log + WAL + canonicalizer** — backed by claws's `@bic/openclaw-workspace/canonicalize`. Upstream has `src/control-plane-audit.ts` for its audit pipe; we'd be duplicating, not contributing.
- **Budget/credit metering** — usage tracking is a deployment concern, not a contract.
- **Secret-pattern scanner** — useful, but a third-party plugin per `CONTRIBUTING.md:89` ("Most features are not accepted and should be third party plugins instead").

---

## Comparing with `packages/openclaw-guardrails/` today

### Upstream-fit fraction

| Region | LoC | Upstream-fit |
|--------|-----|--------------|
| Decision vocabulary (`types.ts:63-83`) | ~40 | **Conflicts with upstream** — `allow/deny/review/modify` vs `block/allow/params/requireApproval`. Could be extension; cannot replace. |
| `GuardrailProvider`/`FileIngestProvider` interfaces (`types.ts:110-122`) | ~30 | **Parallels upstream** `PluginTrustedToolPolicyRegistration`. Cannot upstream as-is — would shadow existing surface. |
| `HostContext` + `ProviderLifecycle` (`types.ts:217-231`) | ~20 | **No upstream analog** — upstream uses `register(api)` + per-call `ctx`. This shape is consumer-specific lifecycle. |
| `composeDecisions` (`registry.ts:108-192`) | ~80 | **Different semantics** from upstream's `runTrustedToolPolicies`. Not a drop-in replacement. |
| `ProviderRegistryImpl` (`registry.ts:48-106`) | ~60 | **Duplicates** upstream's plugin-registry trustedToolPolicies collection + dispatch. |
| `ShellExecProvider` (`shell-exec-provider.ts:26-78`) | ~80 | **Duplicates** native upstream `~/.openclaw/exec-approvals.json` consumer. Wrapping is unnecessary if we use the upstream contract. |
| `RiskLevel` taxonomy + `Sensitivity` (`types.ts:23-26`) | ~5 | **Could be upstream** as an optional vocabulary extension — but probably claws-specific (R0–R5 mapping is opinionated). |
| `audit/` subpath | ~767 | **Stays downstream.** Upstream has its own audit pipe. |
| `approvals/handle-binding/` (HMAC handles + sequence-number anti-replay) | ~631 | **Stays downstream.** Goes well beyond upstream `exec-approval-manager`. |
| `identity/` (OIDC/SAML + RBAC) | ~436 | **Stays downstream.** Upstream auth model is different. |
| `budget/`, `secrets/`, `siem/` | ~728 | **Stays downstream.** Domain-specific governance plumbing. |

**Summary**: of 3,127 LoC, **maybe 50–150 LoC is contract-shaped** (the peer interfaces + decision vocabulary). And critically: that 50–150 LoC **conflicts with what's already upstream**. So it's not a clean lift.

### What carves out cleanly

Almost nothing for a fresh upstream contribution. The tractable extraction is **the other direction**:

- A small **alignment shim** that lets a `GuardrailProvider` implementation register as a `TrustedToolPolicy` (`adapter.ts`, ~50 LoC):
  - Wraps `provider.preAuthorize(event)` in an `evaluate(event, ctx)`.
  - Translates `AuthorizationDecision` (`allow|deny|review|modify`) → `PluginToolPolicyDecision` (`block|allow|params|requireApproval`).
  - Stays downstream as a claws-side utility — does not need to be in openclaw.

### What stays downstream

Everything in the package, with internal alignment work to make our peer interfaces map onto upstream's `TrustedToolPolicy` so a single `GuardrailProvider` can be registered into either:
1. our `ProviderRegistryImpl` (when running in claws-serve / ingest), or
2. an OpenClaw plugin's `register(api)` via the alignment shim (when running inside a real OpenClaw gateway).

---

## Recommendations

### Option A: Align to upstream's existing contract; keep guardrails downstream (RECOMMENDED)

- **No upstream PR for a guardrails contract** — the contract is already there.
- **Downstream**:
  - Keep `@bic/openclaw-guardrails` as a claws governance bundle. It's already library-shaped.
  - Add a `src/openclaw-adapter.ts` that exports `toTrustedToolPolicy(provider: GuardrailProvider): PluginTrustedToolPolicyRegistration` — translates our decision vocabulary to upstream's, registers via `api.registerTrustedToolPolicy(...)`.
  - Document the mapping: `deny → block`, `review → requireApproval`, `modify → params`, `allow → undefined` (no-op chain continuation).
  - Audit `ShellExecProvider`: it duplicates upstream's native `exec-approvals.json` consumer. Either delete it (claws-serve consumes upstream directly when running inside the gateway) or label it explicitly as "for environments without the OpenClaw gateway."
- **Pros**:
  - Zero upstream coordination.
  - Our guardrails plug into a real OpenClaw deployment via the existing seam.
  - Decision vocabulary mismatch is a translation concern, not a contract negotiation.
- **Cons**:
  - We lose the `review` and `modify` distinction at the upstream wire (both project onto `requireApproval`/`params`); fine, claws preserves richer semantics internally before translation.
  - Our richer `HostContext` (audit-sink, identity-bridge, signer, snapshot, stage-mode) is supplied differently from upstream's `register(api)` pattern. The adapter has to bridge or expose the claws-side context to the policy at construction time, not registration time.

### Option B: Upstream a richer decision vocabulary

- Open a PR to widen `PluginToolPolicyDecision` with explicit `review` and `modify` variants matching our `AuthorizationDecision`.
- Ship a new helper `registerToolPolicyV2` or extend the existing one.
- **Pros**: cleaner mapping; arguably better semantics (review-with-handle is more expressive than "requireApproval bool").
- **Cons**:
  - Upstream already solved this with `requireApproval` — there's a working surface; we'd be re-litigating it.
  - Probable Peter response: "what does this give the ecosystem that `requireApproval` doesn't?" Hard to win without showing two non-claws consumers.
  - Adds upstream coordination cost for marginal expressivity.

### Option C: Don't contribute — keep claws-internal

- Same as Option A minus the adapter shim.
- Acceptable if claws never runs inside an upstream OpenClaw gateway. If we always run claws-serve as the host, guardrails just stay an internal library.
- **Pros**: zero coordination, zero shim maintenance.
- **Cons**: locks us out of "drop our guardrails into a community OpenClaw deployment" — if that's never a goal, fine.

### Recommended: Option A

The contract is already there. Our package is already library-shaped. The only outstanding work is alignment, and that's a downstream task (~50 LoC adapter). Option B is wrong because we'd be reinventing what upstream already ships; Option C is fine but forecloses a future deployment shape we may want.

**Concretely**: this is the smaller-than-snap recommendation. Yankee's snap audit recommended ~25-LoC contract upstream + ~100-LoC reference plugin + ~150-LoC CLI verb. Guardrails recommendation is **~0 LoC upstream + ~50 LoC downstream adapter**. Faster, lower coordination, lower risk.

---

## Connection to snap + policy story

**Snapshot → Policy → Guardrail decision** is the architectural axis the user described. Concretely, in our world:

- **Snapshot** carries `policyIrPath` (`types.ts:189-194`, our `SnapshotMeta`) — a pointer to compiled policy IR contained in (or referenced by) the snapshot.
- **Policy** is the generated artifact — what `openclaw-policy` package compiles from OC source files. Policy IR encodes which tools require approval, what risk levels apply, what sensitivity labels gate ingest, etc.
- **Guardrail** is the runtime evaluator — given a `ToolCallEvent` + the active snapshot's policy, return an `AuthorizationDecision`.

### Contract surface

```
GuardrailProvider {
  preAuthorize(event: ToolCallEvent): AuthorizationDecision  // ← needs Policy access, indirectly
}
```

The provider gets the active snapshot via `HostContext.snapshot: SnapshotMeta | null` (`types.ts:217-224`) and the lifecycle hook `onSnapshotPromoted(meta)` for hot-reload (`types.ts:229`). It loads/parses policy IR from `meta.policyIrPath` (currently a string path). Policy IR shape is owned by `openclaw-policy` (downstream); guardrails consume it but don't own its format.

### Dependency on policy contract

If we land an upstream `Policy` type, guardrails-side wiring would adjust to consume that type instead of an opaque path. **This means: the policy upstream contribution (if any) gates the guardrails alignment**, not the other way around. Order:

1. Settle the policy contract first (task #32, sister audit).
2. Snap contract aligns to reference policy by ID/IR shape (yankee's audit covered the snap-policy edge).
3. Guardrails align to upstream's existing `TrustedToolPolicy` contract — and consume policy via whatever surface the policy package ends up exposing.

**Sequencing favors guardrails as the latest of the three to align**, but it's also the smallest change because the upstream contract is already done.

---

## Asks for #clawtributors

1. **Are `before_tool_call` + `registerTrustedToolPolicy` the seams Peter wants new governance plugins to register against?** Or is there a roadmap for a unified governance/policy plugin API that supersedes `trustedToolPolicies` (e.g., a generalized `before_action` hook covering tool calls + file ingest + subagent spawning + dispatch)? Our `FileIngestProvider` shape doesn't have an upstream analog today — would Peter want one?
2. **Does Peter see value in widening `PluginToolPolicyDecision` with explicit `review` (with bound approval handle) and `modify` (with reason) variants — or is that already covered by `requireApproval` + `params`?** (Drives Option A vs Option B.)
3. **Is there an upstream plan for a richer `HostContext` injected at plugin `register(api)` time (audit-sink, identity-bridge, signer)?** Today the `OpenClawPluginApi` provides registration verbs but not host-supplied service handles; our governance providers need them at construction.

---

## Verification

Files / commands used:

- `wc -l C:/src/claws/packages/openclaw-guardrails/src/**/*.ts` — 3,127 total LoC.
- Read `C:/src/claws/packages/openclaw-guardrails/{package.json, src/{index.ts, types.ts, registry.ts, shell-exec-provider.ts, audit/index.ts, identity/bridge.ts}}`.
- Grep `@bic/openclaw-guardrails` across `C:/src/claws/` — 25+ files in `openclaw-snap`, `openclaw-policy`, `test/e2e/`.
- Read `C:/src/openclaw-core/src/plugins/{host-hooks.ts:58-72, trusted-tool-policy.ts:8-54, types.ts:2347, contracts/host-hook-fixture.ts:62-74}`.
- Read `C:/src/openclaw-core/src/gateway/exec-approval-manager.ts:1-150`.
- Read `C:/src/openclaw-core/src/plugins/hook-types.ts:70-105` (PluginHookName enum).
- Read `C:/src/openclaw-core/docs/tools/exec-approvals.md:1-80`.
- Grep `trustedToolPolicies|TrustedToolPolicy|registerTrustedToolPolicy` in `C:/src/openclaw-core/src/` — 25+ hits across plugin-sdk, plugins, gateway test helpers, contract tests.
- Reference: `C:/src/claws/.craft/out/audits/snap-openclaw-design-fit.md` (yankee).
- Memory: `MEMORY.md`, `project_openclaw_upstream.md`.

No source files modified.
