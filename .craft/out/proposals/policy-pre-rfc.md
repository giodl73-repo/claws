# pre-RFC: PolicyIR contract for OpenClaw

**Status**: pre-RFC, seeking directional feedback before any PR opens
**Target channel**: `#clawtributors`
**Author**: giodl@microsoft.com (claws monorepo / Microsoft)
**Date**: 2026-04-29
**AI-assisted**: yes (planning agents for upstream-fit audit + drafting); per upstream PR rules
**Revision**: R1-amended 2026-04-29 (ctx.snapshotId ask, canonicalization reference, fail-closed, OcPath/SnapshotInternalPath split, gateway-as-signer model); R1-follow-on 2026-04-29 (audit stays downstream, `claws-guardrails` rename, `OC_WORKSPACE_FILES` registry awareness)

## TL;DR

Proposing a tiny upstream addition: a `PolicyIR` contract in `src/plugin-sdk/policy-ir.ts` (~80–150 LoC) defining the artifact shape that flows from edit → validate → generate → snapshot → enforce, plus an optional companion `src/plugin-sdk/policy-ir-runtime.ts` (~50 LoC) with four lock-point helpers for emitted plugins, plus **a small extension to `PluginHookToolContext`** to add `snapshotId?: SnapshotId` so policy decisions can be anchored to a specific snapshot. **Types-only upstream — no daemon, no storage, no distribution, no CLI, no reference generator.** Storage and distribution are solved by the snap contract; enforcement is solved by the existing upstream `registerTrustedToolPolicy` runner. The missing pieces are the artifact-shape contract and the snapshot-id thread-through. Combined with the snap pre-RFC and existing trusted-tool-policy registration, OpenClaw gets a complete edit→validate→generate→snapshot→consume→enforce pipeline with **~380–520 LoC of new upstream surface across all four contracts**.

## Problem

OpenClaw consumers want governance-as-data: declare "tool X requires capability Y, sensitivity tier T" once, compile it to a stable artifact, distribute it with a workspace snapshot, and have any conforming guardrail evaluate it identically. Today every consumer rolls their own — claws alone has parallel impls across `openclaw-policy/` (~6.2k LoC), `claws-sdk/src/governance/` (~1.7k LoC), and `claws-sdk/src/compliance/` (~3.1k LoC). Without a shared artifact-shape contract, governance drifts per-consumer and policy-bearing snapshots can't cross ecosystem boundaries.

## Why upstream — and why so small

Load-bearing insight: **policy is a generated artifact that lives INSIDE snapshots, not a separate API surface.** Flow: edit (lobster-web / language services) → fileingest validate → gateway generates PolicyIR from validated content → PolicyIR included in a snapshot at a conventional snapshot-internal path → snap distributes to consumers → guardrails read PolicyIR from snapshot at runtime → enforce via `registerTrustedToolPolicy`.

The implication is decisive: **policy upstream needs no daemon, no storage, no distribution, no evaluation runtime**. Snap solves storage + distribution. The existing upstream `PluginTrustedToolPolicyRegistration` at `src/plugins/host-hooks.ts:65-72` plus `runTrustedToolPolicies` at `src/plugins/trusted-tool-policy.ts:8` already solves enforcement. Policy upstream is just the **artifact-shape contract** (so two generators can produce policies a single guardrail can consume) plus a **generator interface signature** (so consumers wire up generation consistently) plus a **`snapshotId` thread-through on `PluginHookToolContext`** (so the guardrail's `evaluate` knows which snapshot's PolicyIR to consult; see "Asks" §4 below). Matches the contract-first precedent in `docs/plugins/architecture.md:262-282` and the snap pre-RFC's shape.

## Why NOT a daemon, NOT a generator plugin upstream

**Daemon-shape**: policy doesn't need a runtime. It's data carried by snap, evaluated by an existing upstream runner. No new process, no new port, no new package.

**Generator plugin upstream**: convention-bound and per-consumer. Claws's generator parses SOUL.md / TOOLS.md / AGENTS.md (~1900 LoC of opinionated parse/extract/canonicalize tied to claws). OPA users write `.rego → PolicyIR`; CEL users write `.cel → PolicyIR`; yaml users write `yaml → PolicyIR`. Only the **target shape** is universal; the **input convention** is not. Per `CONTRIBUTING.md:89` ("most features should be third-party plugins"), bundling a reference generator upstream would lock in a convention most consumers won't share.

**CLI verb**: claws's `claws policy generate/check/evaluate/...` stays downstream; other consumers will have different UX.

## Proposed shape

### 1. The contract — `src/plugin-sdk/policy-ir.ts` (~80–150 LoC)

```ts
import type { SnapshotId, SnapshotInternalPath } from './snapshot';

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';
export type Sensitivity = 'public' | 'internal' | 'confidential' | 'restricted';

export interface ToolSpec {
  readonly id: string;
  readonly capabilities: readonly string[];
  readonly risk: RiskLevel;
  readonly sensitivity: Sensitivity;
}
export interface DenyRule {
  readonly id: string;
  readonly when: { tool?: string; capability?: string; tag?: string };
  readonly reason: string;
}
export type Decision =
  | { kind: 'allow' }
  | { kind: 'deny'; reason: string; rule?: string }
  | { kind: 'requires-approval'; reason: string }
  | { kind: 'params'; mutate: Readonly<Record<string, unknown>> };
export interface PolicyIR {
  readonly version: string;
  readonly policyId: string;             // sha256(jcs(this body)); see "Canonicalization" below
  readonly generatedAt: string;          // ISO-8601
  readonly generatedFrom: SnapshotId;    // snapshot whose validated content produced this IR
  readonly tools: readonly ToolSpec[];
  readonly denyRules: readonly DenyRule[];
}
export interface PolicyGenerator<TValidated> {
  /**
   * Generate a PolicyIR from validated content. Runs against a known snapshot
   * (the one whose validated content produced this IR); the snapshot ID is
   * threaded through so `generatedFrom` is bound at generation time.
   */
  generate(content: TValidated, snapshotId: SnapshotId): Promise<PolicyIR>;
}

/**
 * Conventional snapshot-internal path where guardrails look for the active
 * PolicyIR. NOT an OcPath (OcPath addresses live workspace files via the
 * `oc://{file}/...` scheme, where `file` MUST be one of the 9 entries in
 * `OC_WORKSPACE_FILES`; PolicyIR lives INSIDE a snapshot, not as a workspace
 * file). Typed as the `SnapshotInternalPath` brand from the snap contract.
 */
export const POLICY_IR_PATH: SnapshotInternalPath = '.openclaw/policy/policy-ir.json';
```

That's it. Validated content is generic (`TValidated`) so each generator declares its own input shape (markdown, .rego, .cel, yaml). The `policyId` is content-addressed via the same canonicalization rule as snap's `SnapshotId` (RFC 8785 JCS; see below). The `POLICY_IR_PATH` constant is the conventional snapshot-internal path within a snapshot where guardrails look for the active PolicyIR.

### Canonicalization (R1 amendment 2026-04-29 addressing M-CANONICALIZATION-IMPLICIT)

PolicyIR's `policyId` is computed as:

```
policyId := lower-hex(sha256(jcs(policy-ir-body)))
```

where `jcs(...)` is RFC 8785 (JSON Canonicalization Scheme) and `policy-ir-body` is the PolicyIR object **excluding** the `policyId` field itself (you cannot include a hash inside its own hash input).

This is the same rule used by snap for `SnapshotId`; see `snap-pre-rfc.md` "Snapshot ID generation" section. Two generators producing semantically-identical PolicyIR (same fields, same values, possibly different field-order or formatting) MUST produce the same `policyId`.

PolicyIR is content INSIDE a snapshot. Its hash is computed independently and the value lands in the snapshot's manifest as a `{ path: POLICY_IR_PATH, sha256: <hex> }` entry. The snapshot's own `SnapshotId` covers this manifest entry, so a tampered PolicyIR would either change `policyId` (detectable by recomputing) or change the snapshot's manifest hash (detectable by recomputing `SnapshotId`).

Conformance test: given a fixed validated input, two independent `PolicyGenerator` impls of the same dialect MUST produce identical `policyId` values. The `policy-snap-policyid-conformance` test in `snap-pre-rfc.md` is the cross-contract evidence that the canonicalization rule is the same on both sides.

### Failure semantics (R1 amendment 2026-04-29 addressing M-FAIL-CLOSED-UNSPECIFIED)

Every failure path on the PolicyIR contract is **fail-closed at the policy enforcement layer**. Specifically:

| Failure | Required behavior |
|---|---|
| `PolicyGenerator.generate(...)` throws | The capture-or-edit operation that triggered generation fails; no PolicyIR is written into the snapshot; gateway emits an audit event and the dependent flow (e.g., snapshot capture) MUST fail-closed |
| PolicyIR missing from snapshot at `POLICY_IR_PATH` | Consumer's `evaluate(event, ctx)` MUST return `{ kind: 'deny', reason: 'policy-ir-missing' }` (or equivalent block) — no tool calls allowed |
| PolicyIR present but malformed (fails `validatePolicyIR`) | Consumer MUST return `{ kind: 'deny', ... }` — treat as missing |
| PolicyIR present but `policyId` does not match `sha256(jcs(body))` | MUST treat as tampered; deny |
| PolicyIR's `generatedFrom` does not match the snapshot the consumer loaded it from | MUST deny |
| Consumer's `evaluate(event, ctx)` itself throws | Upstream `runTrustedToolPolicies` runner SHOULD treat this as block (fail-closed); we ask Peter to confirm or extend the runner accordingly (see "Asks" §5) |

Rationale: the alternative (silent fail-open when PolicyIR is unreadable, malformed, or stale) is the OWASP Agentic Top 10 #5/#10 failure mode. Production deployments are expected to colocate snap with the gateway in-process, with PolicyIR cached at `onSnapshotPromoted`, so the read-path latency is sub-millisecond and the fail-closed default does not become a chronic outage source.

### 2. Companion runtime helpers — `src/plugin-sdk/policy-ir-runtime.ts` (~50 LoC, optional)

Four lock-point helpers used by emitted gateway plugins to bridge a PolicyIR-driven decision to the gateway's hook-result shape:

- `loadPolicyIR(store: SnapshotStore, snap: SnapshotId): Promise<PolicyIR>` — reads from `POLICY_IR_PATH` inside a snapshot
- `readPolicyIR(snapshot: Snapshot): PolicyIR` — synchronous variant given an already-fetched Snapshot
- `validatePolicyIR(ir: unknown): asserts ir is PolicyIR` — schema check + policyId hash round-trip (using the same RFC 8785 JCS canonicalization rule)
- `getCurrentPolicyIR(state): PolicyIR | null` — reads from plugin-private state for cached lookup during evaluation

**Optional** — if maintainers prefer types-only, every consumer ships their own one-line copies (claws does today). If upstream takes them, every PolicyIR-aware plugin gets a stable ABI.

### What's NOT in the contract (deliberate)

- **Generator implementation.** Convention-bound; per-consumer. Claws ships its impl downstream.
- **Rule definitions.** Specific governance families (G-A2A, G-CONTEXT, etc.) are claws-specific tooling, not contract.
- **CLI verbs.** `claws policy generate/check/evaluate` stays downstream.
- **Storage.** Snap solves it.
- **Distribution.** Snap solves it.
- **Signing.** PolicyIR is content INSIDE a signed snapshot; the gateway signs the snapshot at capture time, which (via the manifest) cryptographically covers the PolicyIR. PolicyIR itself does not carry its own signature; see `realigned-story.md` "Gateway-as-signer model."
- **Evaluation logic.** The existing upstream `runTrustedToolPolicies` runner already accepts `PluginTrustedToolPolicyRegistration` impls; PolicyIR is just the data they evaluate against.
- **Compliance rubrics.** SOC2/HIPAA/EU-AI-Act content is downstream regulatory tooling.
- **Audit-chain emission.** Gateway-emitted (see `snap-pre-rfc.md` and `realigned-story.md`); consumer-private state has no audit obligation. **R1-follow-on 2026-04-29**: audit format itself is consumer responsibility in v2 — claws emits via `claws-policy-generator/emit/`; not in this proposal's scope. There is no `@openclaw/audit` package in v2; future v3 may propose one. See `realigned-story.md` "Why audit is not in v2 scope" for the full rationale.

**Total upstream surface**: ~80–150 LoC types + optional ~50 LoC helpers + ~5 LoC `ctx.snapshotId` extension = **~135–205 LoC** vs. the ~6200-LoC `openclaw-policy` package today.

## Open questions for the channel

1. **"Policy lives in snapshots" framing** — does Peter agree PolicyIR is a generated artifact riding the snap contract, or does he see policy living on a separate surface (e.g., a dedicated registry plugin)? Load-bearing premise; if it doesn't match, the contract design differs significantly.
2. **Generator interface upstream or downstream?** — should `PolicyGenerator<TValidated>` be upstream (forces consistency on input shape) or just the `PolicyIR` type (consumer freedom; OPA/CEL/yaml shims compose freely)? **Recommendation: upstream** — a function-signature interface is small and useful without forcing any particular input convention.
3. **Capability-table membership** — does PolicyIR earn a row in `docs/plugins/architecture.md:34-50`? **Recommendation: no row for v1**; types-only SDK module; revisit if a `registerPolicyArtifactProvider` verb earns its place.
4. **Naming confirmation** — `PolicyIR` (recommended) vs `WorkspacePolicy` vs `ToolGovernancePolicy`. Upstream already has `ssrf-policy.ts` / `bluebubbles-policy.ts` / `channel-policy.ts`. **`PolicyIR`** disambiguates and signals "compiled-down form, not authoring source."
5. **Path convention** — `.openclaw/policy/policy-ir.json` as the conventional snapshot-internal path. Confirm or propose alternative.
6. **Registry evolution awareness (R1-follow-on amendment 2026-04-29).** `OcPath.file` is constrained to the 9-entry `OC_WORKSPACE_FILES` registry. `POLICY_IR_PATH` lives at `.openclaw/policy/policy-ir.json` and is typed as `SnapshotInternalPath` (NOT `OcPath`), so `POLICY_IR_PATH` itself is NOT subject to the registry constraint — this is an awareness note, not a constraint on PolicyIR. **The constraint applies upstream** of PolicyIR: validated source files (the `TValidated` content fed into `PolicyGenerator.generate`) typically include workspace files addressed by `OcPath` (e.g., `oc://TOOLS.md`, `oc://AGENTS.md`, etc.), so consumers that need to widen the source-input set beyond the 9 registry entries will need the registry to grow before their generator can address those new files. This proposal does not propose any registry changes; flagging for awareness so the channel knows the dependency exists.

## Adoption story

- **claws** ships its `PolicyGenerator` impl downstream (the existing ~1900 LoC parse/extract/canonicalize/emit pipeline, renamed `claws-policy-generator/`). Reads validated content from fileingest → produces `PolicyIR` → writes it into the snapshot at `POLICY_IR_PATH`. The snapshot is then captured by the gateway, which signs it.
- **lobster-web** reads PolicyIR via `snap.read(snap, POLICY_IR_PATH)` for policy-preview UI; doesn't care which generator produced it.
- **`claws-guardrails`** (downstream adapter package, no upstream contract; renamed from `openclaw-guardrails` per R1-follow-on for naming consistency with `claws-sdk`/`claws-serve`/`claws-snap-server`/`claws-policy-generator`) uses upstream `api.registerTrustedToolPolicy({ id, evaluate })` with a closure over the loaded PolicyIR — `evaluate(event, ctx)` reads `ctx.snapshotId` to know which snapshot's PolicyIR drives this decision, emits `Decision` → adapter converts to `PluginToolPolicyDecision`.
- **future consumer** writes their own `PolicyGenerator<TInput>` impl against whatever input convention they prefer; their PolicyIR rides any conforming snapshot through any conforming guardrail.

## Sequencing

The four contracts compose at the type level (mostly independent), align at runtime:

| Contract | LoC | Status | Depends on |
|---|---:|---|---|
| **oc-path** (workspace) | small | in-flight (in `@openclaw/workspace` package; bundled with PR-1 in Hapi wave per current `wave.yaml`) | — |
| **snap** | ~280 | yankee's pre-RFC | oc-path (for the workspace-file-addressing distinction); independent of PolicyIR types |
| **PolicyIR** (this) | ~135–205 | this pre-RFC | imports `SnapshotId` and `SnapshotInternalPath` from snap |
| **`ctx.snapshotId` extension** | ~5 | this pre-RFC (Ask §4) | none (extends existing `PluginHookToolContext`) |
| **`claws-guardrails` adapter** | 0 upstream | bandit's audit | PolicyIR + existing `registerTrustedToolPolicy` + `ctx.snapshotId` |

PolicyIR's contract imports `SnapshotId` and `SnapshotInternalPath` from snap's contract, so PolicyIR's PR must land **after** snap's PR (or both in one PR). The `ctx.snapshotId` extension (Ask §4) is a separate small upstream change to the existing `PluginHookToolContext` shape — it has no contract-cycle dependency. Guardrails has no upstream contribution at all — it composes the existing upstream `registerTrustedToolPolicy` slot with a downstream adapter that loads PolicyIR from a snap.

**Realistic upstream timeline**: per `realigned-story.md` "Calendar honesty," the upstream chain is a 6–10 week window, not "1–2 weeks." See `realigned-story.md` for the per-PR cadence math.

## What I'm NOT asking for in this PR

- Not asking to land a generator implementation upstream.
- Not asking for a reference `extensions/policy-from-markdown/` plugin — convention lock-in, premature.
- Not asking for compliance rubrics (SOC2/HIPAA/EU-AI-Act) in the contract.
- Not asking for an upstream CLI verb (`openclaw policy ...`) — `claws policy ...` stays downstream.
- Not asking to extend `PluginTrustedToolPolicyRegistration` with PolicyIR-specific fields — the existing slot is sufficient; PolicyIR rides via plugin-private state, anchored by `ctx.snapshotId`.
- Not asking for evaluation/decision-resolution logic in the contract — `runTrustedToolPolicies` already runs.
- Not asking for a signing API on PolicyIR — the snapshot signs it transitively (gateway-as-signer model).

## Related work / prior art

- **`PluginTrustedToolPolicyRegistration`** at `src/plugins/host-hooks.ts:65-72` and **`runTrustedToolPolicies`** at `src/plugins/trusted-tool-policy.ts:8` — the existing upstream policy-evaluation surface. PolicyIR is the artifact-shape that conforming `evaluate()` implementations evaluate against.
- **`PluginHookToolContext`** at `src/plugins/hook-types.ts:393-401` — currently carries `agentId, sessionKey, sessionId, runId, trace, toolName, toolCallId`. The `ctx.snapshotId` extension (Ask §4) adds one optional field; backward-compatible.
- **Domain-specific policies** at `src/plugin-sdk/{ssrf,bluebubbles,channel,direct-dm-guard,runtime-group}-policy.ts` — per-domain hand-coded; PolicyIR is the missing general-purpose artifact-shape complementing these.
- **Snap pre-RFC** — sister contract; PolicyIR is the canonical example of what a snap carries as a non-source artifact. PolicyIR's `policyId` shares snap's RFC 8785 JCS canonicalization rule (see `snap-pre-rfc.md` "Snapshot ID generation").
- **Internal claws monorepo** has a reference impl (renamed `claws-policy-generator`); upstream contribution is the ~135–205 LoC types extract.

## Asks

1. **Directional read** — does the contract-only, types-only shape work? Specifically: does Peter agree with "policy is an artifact inside snapshots" framing, or see policy as living on a separate surface?
2. **Naming guidance** — `PolicyIR` vs alternatives (question 4).
3. **Capability table** — does PolicyIR earn a row at `docs/plugins/architecture.md:34-50` (question 3)? Pre-answered: recommend no.
4. **Extend `PluginHookToolContext` with `snapshotId?: SnapshotId`** (R1-amended 2026-04-29 addressing M-CTX-SNAPSHOTID-TOCTOU). The `PolicyGenerator` runs against a known snapshot; the `evaluate(event, ctx)` needs to know which snapshot's PolicyIR drives this decision so policy decisions are anchored to a specific point in time. Without `ctx.snapshotId`, the policy plugin must resolve "current snapshot" from plugin-private state via `onSnapshotPromoted`, which has known TOCTOU race conditions, multi-tenant policy bleed, and promotion-observation skew across plugin replicas (see gateway-eng R1 review §1, ciso R1 review §7, platform-eng R1 review M2). This is a small additional contract change (~5 LoC: one optional field on `PluginHookToolContext`) and unlocks correct multi-process / multi-tenant behavior. **The PolicyIR pre-RFC depends on this extension landing as part of the same contribution wave.**
5. **Confirm fail-closed semantics for `runTrustedToolPolicies`** when an `evaluate(event, ctx)` throws. Either (a) confirm the runner already fails closed (and we document the contract guarantee), or (b) accept a small upstream change to enforce fail-closed on `evaluate` exceptions. Without one of these, half the consumers will fail open on evaluator exceptions; that's a security regression vs. claws's current posture.
6. **Confirm RFC 8785 JCS** as the canonicalization rule for `policyId` (see `snap-pre-rfc.md` for the matching snapshot rule).
7. **PR slot + sequencing** — a small focused PR (~150 LoC types + optional ~50 LoC helpers + ~5 LoC ctx.snapshotId), opened after snap's pre-RFC settles. Open to either landing alongside snap or in a follow-on PR. Note: PolicyIR imports `SnapshotId` / `SnapshotInternalPath` from snap, so snap's contract must land first OR both ship in one PR.

## Footer

Authored 2026-04-29. R1-amended 2026-04-29 to address consolidated panel review (`ctx.snapshotId` ask elevated, canonicalization referenced, fail-closed spec'd, OcPath vs SnapshotInternalPath split, gateway-as-signer model). R1-follow-on 2026-04-29 (audit format stays downstream — no `@openclaw/audit` in v2; `claws-guardrails` rename for naming consistency; `OC_WORKSPACE_FILES` registry-evolution awareness note added — distinguishing that `POLICY_IR_PATH` is a `SnapshotInternalPath` not an `OcPath`). AI-assisted (planning agents for upstream-fit audit + drafting). Internal architecture audit notes available on request.
