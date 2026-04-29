# Policy × OpenClaw design fit — Peter's lens

**Date**: 2026-04-28
**Branch**: `feature/isis-the-weaver`
**Scope**: read-only architectural audit of `packages/openclaw-policy/` through Peter Steinberger's design philosophy. Question: **if Peter wanted policy generation to be part of OpenClaw for everyone, how would he do it?** — under the user's clarified framing that **policy is a generated artifact that rides INSIDE snapshots, not a separate API surface**.
**Inputs**: `C:/src/claws/packages/openclaw-policy/` (main target, 6.2k LoC); `C:/src/claws/packages/claws-sdk/src/{governance,compliance,protect,audit}/` (parallel-implementation candidates); `C:/src/openclaw-core/{src/plugin-sdk, src/plugins, extensions}/` (upstream surface); yankee's `.craft/out/audits/snap-openclaw-design-fit.md`; whiskey's `.craft/out/audits/claws-surface-audit.md`.

---

## TL;DR

**The user's "policy lives in snapshots" framing collapses the upstream surface to almost nothing — and importantly, the load-bearing primitives are *already upstream* in a different shape.** The flow `edit → fileingest validate → gateway generate policy → snapshot carries policy → guardrails read policy from snapshot → enforce` doesn't need a new contract package; it needs a thin **type layer** so the artifact riding inside the snapshot has a stable shape, and a **registration helper** for plugins that want to evaluate against it. Upstream already has `before_tool_call`/`after_tool_call` hooks (`src/plugins/hooks.ts`), `PluginTrustedToolPolicyRegistration` (`src/plugins/host-hooks.ts:65-72` — `{id, description, evaluate(event, ctx)}`), and the `api.registerHttpRoute` + `api.registerService` plugin model. **The decision/enforcement primitive is already there**; the missing piece is "what is the *generated* artifact that informs those decisions." That artifact is **PolicyIR** in our world, and it's the only thing that needs an upstream type.

The current `packages/openclaw-policy/` is **a kitchen-sink package** (6211 LoC across 55 TS files, 14 subdirectories, 8 named subpath exports). It mixes: PolicyIR types (~220 LoC), a generator (~1200 LoC: parse/extract/analyze/canonicalize/emit), a runtime ABI for emitted plugins (~170 LoC), an evaluator (~160 LoC: governance/rule-apply.ts), an ops layer (~1100 LoC: evaluate-compliance, mock-gateway, scenarios, render-report), CLI handlers (~1200 LoC across 14 verbs), and three operational stores (nonce, seq-counter, trust-set, ~770 LoC). Under the user's framing, almost none of this is upstream-shaped. The **PolicyIR type** + a small **generator-signature contract** (~80–150 LoC total) is the entire upstream surface; everything else is consumer policy authoring + claws-specific operational machinery.

**Strong recommendation: Option A — types-only contract upstream (~80–150 LoC).** Land `src/plugin-sdk/policy-ir.ts` defining `PolicyIR`, `Decision`, `PolicyGenerator` (a function-signature interface, not a registration), and the four runtime-ABI helper signatures (`asHookResult`, `issueHandle`, `propagatedSensitivity`, `matchDenyRules`) so emitted gateway plugins can compile against a stable upstream surface. **The generator stays downstream** — claws, future consumers, and ecosystem implementers each generate their own PolicyIR shape that matches their workspace conventions; the contract just guarantees the artifact has the same shape on the wire and in the snapshot. **Option B (don't contribute upstream)** is the safe fallback. **Option C (full generator + runtime upstream as a reference plugin)** is feasible but premature given (1) the generator is 1200+ LoC of opinionated parse/extract logic tied to claws's SOUL/TOOLS/AGENTS convention, and (2) yankee's parallel snap audit recommends contract-only for snap; matching that pattern keeps the upstream story consistent.

This answers the **policy-upstream-deferred** decision in `claws-surface-audit.md:215`: *the package contributes ~80–150 LoC upstream as types; the remaining ~6k LoC stays downstream and is the deletion target for the parallel `claws-sdk/src/governance/` (1726 LoC) + `claws-sdk/src/compliance/` (3107 LoC) implementations*. **Net delete from claws-sdk: ~4.8k LoC**, fully consumed by the surviving `openclaw-policy` (renamed `claws-policy-generator/` to drop the `openclaw-` brand).

---

## Method

Walked `packages/openclaw-policy/src/` — 14 subdirs, 55 TS files, 6211 LoC, ran `wc -l` per file. Read `index.ts`, `generator.ts`, `types/index.ts`, `runtime/index.ts`, `governance/rule-apply.ts`, `compile/extract.ts`, `emit/emit-plugin.ts`, `fs-pipeline.ts`, `ops/evaluate-compliance.ts` — established responsibility boundaries. Searched upstream `src/plugin-sdk/` for policy-shaped concepts (found only domain-specific: ssrf, bluebubbles, channel, dm-guard, runtime-group — **no general-purpose framework**). Searched upstream for hooks (found mature pipeline at `src/plugins/hooks.ts`, runner at `trusted-tool-policy.ts:8`, registration at `host-hooks.ts:65-72`). Cross-walked claws-sdk for parallel impls: `governance/` (1726 LoC, 10 G-* families), `compliance/` (3107 LoC, SOC2/HIPAA/EU-AI-Act), `protect/` (~1k), `audit/` (~1.5k). Read yankee's snap audit + whiskey's surface audit. Tested user's "policy lives in snapshots" framing against `emit/emit-plugin.ts:99-101` (already emits `import POLICY_IR from './policy-ir.json'` — the artifact-in-snapshot model exists in our pipeline). No source files modified.

---

## Architectural insight: policy lives in snapshots

The user's framing, restated concretely:

```
1. User edits OC files (SOUL.md, TOOLS.md, AGENTS.md) via lobster-web → claws-serve language services.
2. fileingest validates the edit (workspace-edit + parser).
3. Gateway calls `generatePolicy(validatedContent) → PolicyIR` after the edit settles.
4. PolicyIR + emitted gateway-plugin.ts + audit-manifest.json land in `.openclaw/policy/` of the snapshot.
5. Snapshot is content-addressed, signed, distributed to consumers.
6. Consumers `snapshot.read(snap, "/.openclaw/policy/policy-ir.json")` to get the active PolicyIR.
7. Guardrails consume the PolicyIR + an event → Decision → enforce.
```

This breaks the upstream surface into four pieces, each with a clear home:

| Piece | Home | Why |
|---|---|---|
| **PolicyIR shape** (the artifact's type) | **Upstream contract** (~80–150 LoC) | If two generators want to produce policies that ride in the same snapshot format and be read by the same guardrails, they must agree on the shape. This is the only thing that *must* be shared. |
| **`generatePolicy(content) → PolicyIR`** (the generator) | **Downstream / per-consumer** | Each ecosystem decides what counts as "validated content" and which conventions (SOUL.md? OPA Rego? CEL?) compile down to the IR. Claws's generator is one impl; others can exist. |
| **PolicyIR storage + distribution** | **Snap contract** (yankee's audit) | The snapshot already does content-addressing, signing, distribution. Policy doesn't need its own. |
| **Decision evaluation** (PolicyIR + event → Decision) | **Guardrails contract** (bandit's parallel audit) | The runtime that reads PolicyIR and emits decisions for the gateway hook pipeline. Already partially exists upstream as `PluginTrustedToolPolicyRegistration`. |

**Key architectural consequence**: policy is **the artifact whose type the snapshot needs to know about**, so the snapshot contract and the policy contract are coupled at the type level. If snap defines `Snapshot.files: Record<string, string>`, then the policy contract just adds a convention: "the file at `/.openclaw/policy/policy-ir.json` deserializes to a `PolicyIR`." The snap contract doesn't need to know what a PolicyIR is; the policy contract doesn't need to know how snapshots are stored. They compose.

**Why this is even smaller than snap's upstream surface**: snap had to define operations (`put`, `get`, `promote`, `rollback`). Policy doesn't — it's just data that flows through. The only operation surface for policy is the generator function, and that's per-consumer. Net: **policy upstream = types** + **a documented filename convention**.

---

## Claws-side policy today

### Package shape

`packages/openclaw-policy/`, package name `@bic/openclaw-policy`, version 0.2.0. **6211 LoC across 55 TS files in 14 subdirectories.** 8 named subpath exports beyond the root: `/runtime`, `/types`, `/cli-handlers`, `/nonce-store`, `/seq-counter`, `/trust-set`. The root index re-exports 8 categorized banners (generator lifecycle, in-memory helpers, emitters, analyze, types, ops, migration, compliance, governance, seq-counter, trust-set).

`peerDependencies`: `@bic/openclaw-workspace` (required), `@bic/openclaw-guardrails` (required, optional: false in `peerDependenciesMeta`). The hard guardrails dep is unusual for what's labeled a "generator" — it implies the runtime ABI consumers expect guardrails types resolvable in their own dep tree.

### LoC by responsibility

| Area | LoC | Files | Note |
|---|---:|---:|---|
| **Types** (`types/index.ts`) | 220 | 1 | PolicyIR + per-field types. **Upstream-shaped.** |
| **Runtime ABI** (`runtime/`) | 172 | 2 | 4 lock-point helpers (`asHookResult`, `issueHandle`, `propagatedSensitivity`, `matchDenyRules`) + `.runtime-abi.d.ts` snapshot. **Upstream-candidate.** |
| **Generator: parse + extract + analyze + canonicalize** (`compile/`) | 605 | 8 | Reads SOUL/TOOLS/AGENTS markdown blocks, lifts to PolicyIR, hashes. **Downstream — claws-convention-bound.** |
| **Generator: emit** (`emit/`) | 469 | 6 | Renders policy-ir.json, gateway-plugin.ts, audit-manifest.json. **Downstream — emits TS source for our gateway-plugin shape.** |
| **Generator: fs-pipeline + top-level lifecycle** (`fs-pipeline.ts`, `generator.ts`, `migrate.ts`, `index.ts`) | 755 | 4 | Wires generate/check/watch/diff over the workspace package. **Downstream.** |
| **Generator validators** (`generator/`) | 84 | 2 | r5-fail-open declaration check + diagnostics. **Downstream.** |
| **Evaluator (runtime governance rule application)** (`governance/rule-apply.ts`) | 159 | 2 | Runtime evaluator: PolicyIR + event → ApplyResult. **Belongs in guardrails, not policy.** |
| **Ops** (`ops/`) | 1107 | 7 | evaluateCompliance, runScenarios, renderReport, mockGateway, verifyAudit. **Downstream — claws-specific compliance + sim tooling.** |
| **CLI handlers** (`cli-handlers/`) | 1186 | 14 | check, generate, watch, diff, comply, doctor, report, sim, test, upgrade, verify, etc. **Downstream — CLI verb impls.** |
| **Compliance** (`compliance/`) | 174 | 3 | Rubric loader + builtin rubric IDs. **Downstream — paired with ops.** |
| **Operational stores** (`nonce-store/`, `seq-counter/`, `trust-set/`) | 768 | 6 | Persistent stores supporting runtime concerns. **Downstream — runtime-host concern, not contract.** |
| **Total** | **5699 LoC** | **55** | (Discrepancy with 6211 total: tests/test-helpers + index file shells.) |

### What it does today (the four hats `openclaw-policy` wears)

The package wears four hats. Peter would unbundle them.

1. **Generator** (~1900 LoC: `compile/`, `emit/`, `fs-pipeline.ts`, `generator.ts`, `generator/`, `migrate.ts`) — reads workspace files, emits artifacts. **Downstream-bound. Per-consumer.**
2. **Runtime ABI** (~170 LoC: `runtime/index.ts`) — 4 helper functions consumed by emitted gateway-plugin.ts. **Upstream-candidate** (small, locked-version, narrow surface).
3. **Evaluator** (~160 LoC: `governance/rule-apply.ts`) — runtime PolicyIR + event → decision. **Belongs in guardrails, not policy** — it's the consumer side, not the artifact side.
4. **Ops platform** (~2300 LoC: `ops/`, `compliance/`, `cli-handlers/`, `nonce-store/`, `seq-counter/`, `trust-set/`) — compliance evaluation, scenario sim, mock gateway, CLI dispatch, persistent stores. **Downstream — these are claws-specific tooling and runtime-host concerns.**

### Imports — who consumes policy today?

- `packages/claws/src/cli.ts:39` — `runRouter as runPolicyRouter` from `@bic/openclaw-policy/cli-handlers`. The CLI delegates `claws policy <verb>` to the package's router. **CLI surface.**
- `packages/openclaw-snap/src/canonical.ts` + `src/cli-handlers/diff.ts` + tests — snap reads policy types for canonical comparison and policyId conformance. **Cross-package coupling.**
- `packages/openclaw-workspace/tests/canonicalize/*.unit.test.ts` — workspace tests reference policy canonicalization. **Test-only.**
- `packages/openclaw-policy/.openclaw/policy/gateway-plugin.ts` — a generator-output artifact under the package itself. **Self-emitted reference.**
- **Notably: claws-serve does NOT import `@bic/openclaw-policy`.** The policy generator is only run via the CLI today. claws-serve's runtime governance comes from the parallel `claws-sdk/src/governance/` implementation.

### Architectural classification

Library + CLI + runtime ABI + persistent stores = **kitchen sink**. Three of the four pieces (generator, evaluator, ops platform) could each be their own package; one (runtime ABI) is the contract piece that survives.

---

## Upstream openclaw — policy-shaped concepts today

### Existing primitives

- **Domain-specific policy modules** in `src/plugin-sdk/`: `ssrf-policy.ts` (370 LoC, network egress), `bluebubbles-policy.ts`, `channel-policy.ts`, `direct-dm-guard-policy.ts`, `runtime-group-policy.ts`. Each is per-domain, none defines a PolicyIR-style central artifact. **No general-purpose policy framework upstream.** "PolicyIR" returns 0 upstream hits; "GovernanceRule" returns 0.
- **Mature hooks pipeline**: `src/plugins/hooks.ts` (lifecycle runner), `hook-types.ts` (events/results), `host-hooks.ts` (registration types). The natural slot for a PolicyIR-derived plugin.
- **`PluginTrustedToolPolicyRegistration`** at `src/plugins/host-hooks.ts:65-72`: `{id, description, evaluate(event, ctx) → PluginToolPolicyDecision}`. `PluginToolPolicyDecision = PluginHookBeforeToolCallResult | {allow?, reason?}`. The runner `runTrustedToolPolicies` at `trusted-tool-policy.ts:8` iterates registered policies, short-circuits on block/deny, accumulates approvals.

**This is the existing upstream policy surface.** It's not "what's the policy file format" — it's "how does a plugin contribute a policy-evaluation function the gateway calls before each tool call."

### The gateway's role today

The gateway already runs the hook pipeline. A plugin registers via `api.registerTrustedToolPolicy({id, description, evaluate})`. **Today's policies are hand-coded TS functions inside plugin source — no existing slot for "policy loaded from a generated artifact in a snapshot."** Claws's `emit-plugin.ts:99-101` solves this by emitting plugin source with `import POLICY_IR from './policy-ir.json'`; IR is bundled with the emitted plugin file, both written into the snapshot.

The missing primitive upstream is the **PolicyIR type itself** — so multiple generators can produce conforming artifacts that any conforming evaluator-plugin can consume. Without it, every consumer bundles its own policy format with its own plugin (fine until two consumers want shared artifacts).

### Pattern alignment

Yankee's snap audit settled on: contract-types-only upstream, daemon stays downstream. Policy follows the same pattern even more strongly:

| Aspect | Snap | Policy |
|---|---|---|
| Upstream-bound | Types + error envelope (~50–150 LoC) | Types + filename convention (~80–150 LoC) |
| Downstream-bound | HTTP daemon, CLI client, store impls (~1500 LoC) | Generator, emit, evaluator, ops, CLI (~5500 LoC) |
| Operations needed in contract | put/get/list/promote/rollback/resolveOcPath | **None** — policy doesn't have operations, it's an artifact in a snapshot |
| Existing upstream slot | Plugin via `registerService` + `registerHttpRoute` | Plugin via `registerTrustedToolPolicy` (already exists!) |

**Policy is even simpler than snap.** Snap's contract had to define an operations interface; policy's contract is just a data type.

---

## Forward-design — what would Peter's policy contract look like?

### The contract (upstream)

A single new file `src/plugin-sdk/policy-ir.ts`, re-exported via `packages/plugin-sdk/src/policy-ir.ts`. ~80 LoC defining: `PolicyIR` (with `version`, `policyId`, `canonicalizerVersion`, `soul`, `tools`, `governance`, `identity`), `ToolSpec`, `DenyRule`, `RiskLevel`, `Sensitivity`, `Capability`, `ProvenanceSource`, `Decision` (allow/deny/review), `PolicyGenerator<TValidated>` interface (single `generate(content) → Promise<PolicyIR>`), and `POLICY_IR_PATH = '.openclaw/policy/policy-ir.json'` constant. **Validated content is intentionally `unknown` / generic** — generators define what they accept (markdown, .rego, .cel, yaml), not the contract.

Optional companion `src/plugin-sdk/policy-ir-runtime.ts` (~70 LoC) — the four lock-point helpers from our current `runtime/index.ts`: `asHookResult(decision) → HookResult`, `issueHandle(ctx, event) → Promise<string>`, `propagatedSensitivity(provenance, ir) → Sensitivity`, `matchDenyRules(event, rules) → DenyRule | null`. These bridge a PolicyIR-driven plugin's decision-shape to the gateway's hook-result shape. The "lock-point" comment in our current `runtime/index.ts:1-11` already labels these as the locked ABI. **If they land upstream, every PolicyIR-aware plugin gets them free**; if they don't, every consumer ships their own copies (claws's current behavior, fine either way).

### Runtime integration — the unified flow

`Authoring` (lobster-web edit → claws-serve language services → fileingest validate → workspace-edit) → `Generation` (gateway calls registered `PolicyGenerator` → writes `.openclaw/policy/{policy-ir.json, gateway-plugin.ts, audit-manifest.json}` to snapshot) → `Distribution` (snap contract — yankee's audit owns this) → `Consumption` (gateway loads snapshot, reads `policy-ir.json` via snap.read, loads emitted plugin which registers via `api.registerTrustedToolPolicy({id, evaluate})`) → `Enforcement` (`before_tool_call` event → registered policies evaluated → Decision → gateway hook runner converts to HookResult → gates the call).

**Five contracts compose** at the type level (independent), runtime (aligned): oc-path (workspace), snap (yankee), policy-ir (this audit), `registerTrustedToolPolicy` (already upstream), guardrails (bandit).

### What's NOT upstream (under any option)

- **The generator implementation.** `compile/extract.ts` (266 LoC) parses SOUL.md/TOOLS.md/AGENTS.md headings — that's a claws-convention. OPA users would write a `.rego → PolicyIR` shim; CEL users would write `.cel → PolicyIR`; hand-config users would write `yaml → PolicyIR`. **Each consumer owns its generator.**
- **The CLI verbs.** `claws policy generate/check/watch/diff/comply/doctor/report/sim/test/upgrade/verify` are claws's authoring UX. Other consumers will have different UX.
- **The compliance machinery.** SOC2/HIPAA/EU-AI-Act rubrics + evaluator (~3000+ LoC across `compliance/` + `ops/`) is a downstream-bound regulatory tooling layer. Not a contract.
- **The persistent stores.** `nonce-store/`, `seq-counter/`, `trust-set/` (768 LoC) are runtime-host concerns — they support replay protection, anti-rollback, and trust-tier resolution at execution time. They're not part of the policy artifact.
- **The evaluator (`governance/rule-apply.ts`).** This is consumer code that lives behind `api.registerTrustedToolPolicy` — it's a plugin, not a contract. (Also: it should arguably live inside `openclaw-guardrails` rather than `openclaw-policy`; see below.)
- **The audit-manifest emit + chain.** `emit/emit-audit-manifest.ts` + `emit/emit-audit-chain.ts` (210 LoC) generate signed audit chains alongside the policy. That's a claws compliance affordance; the contract doesn't need it.

### Reference impl

Per `CONTRIBUTING.md:89` (Peter's "most features should be third-party plugins"), Peter is unlikely to want a *bundled* generator upstream. The generator is convention-bound by design. **No `extensions/policy-generator/` plugin under any option** — generators are downstream.

A small **conformance test harness** at `packages/plugin-sdk/src/policy-ir/testing.ts` (~30–60 LoC) — "given a PolicyIR, assert canonicalization + policyId hash round-trip" — *might* earn its place upstream as part of the contract, but only if maintainers ask for it. Otherwise it stays downstream.

---

## Comparing with `packages/openclaw-policy/` today

### Upstream-fit fraction

| Bucket | LoC | Files | Fraction | Note |
|---|---:|---:|---:|---|
| **Upstream-fit (contract)** — `types/index.ts` minus the diagnostic + watch types | ~150 | 1 | **2.4%** | The PolicyIR + per-field types lift cleanly. Diagnostic/Watch types are generator concerns; stay downstream. |
| **Upstream-candidate (runtime ABI)** — `runtime/index.ts` 4 helpers | ~110 | 1 | **1.8%** | Small, pure, locked. Could land upstream alongside the types or stay claws-side. Maintainer-pref decision. |
| **Generator + emit (downstream)** — `compile/`, `emit/`, `fs-pipeline.ts`, `generator.ts`, `migrate.ts`, `generator/` | ~2070 | 21 | **33.4%** | Pure consumer logic. Stays downstream regardless. |
| **Evaluator (relocation candidate)** — `governance/` | ~165 | 2 | **2.7%** | **Belongs in guardrails**, not policy. Bandit's audit owns this decision. |
| **Ops + compliance + CLI (downstream)** — `ops/`, `compliance/`, `cli-handlers/` | ~2467 | 23 | **39.7%** | Compliance authoring UX + scenario sim. Stays downstream. |
| **Operational stores (downstream)** — `nonce-store/`, `seq-counter/`, `trust-set/` | ~768 | 6 | **12.4%** | Runtime-host concerns supporting handle binding, replay protection, trust resolution. Stays downstream. |
| **Misc (index, glue)** | ~480 | 1 | **7.7%** | Index re-exports + tests scaffolding. Trims with the rest. |
| **Total** | **6211** | 55 | 100% | |

**The upstream-shaped fraction is roughly 4–5%** of the package. The remaining 95% is either generator-specific (33%), ops/compliance/CLI (40%), evaluator-mislocated (3%), or runtime-host stores (12%).

This is consistent with yankee's finding for snap (10–15% upstream-fit). **Policy is even more downstream-heavy than snap** because the generator is much larger than snap's HTTP server.

### What carves out cleanly

- `src/types/index.ts` — lifts almost line-for-line into `src/plugin-sdk/policy-ir.ts`. Drop the `Diagnostic`, `WatchHandle`, `WatchOptions`, `GeneratorDiagnosticEntry` types (those are generator concerns).
- `src/runtime/index.ts` — lifts as a single optional file `src/plugin-sdk/policy-ir-runtime.ts`. The `.runtime-abi.d.ts` snapshot we keep for ABI lock can stay claws-side or move with the helpers.

### What stays downstream

Concretely, in the renamed `packages/claws-policy-generator/` (or whatever the surviving package is called), all of:
- `src/compile/{parse, extract, analyze, canonicalize, gchain, governance-ast, diff}.ts` (605 LoC)
- `src/emit/{emit-plugin, emit-policy-ir, emit-audit-chain, emit-audit-manifest, scope}.ts` (469 LoC)
- `src/generator.ts` + `src/fs-pipeline.ts` + `src/migrate.ts` + `src/generator/{diagnostics, validators}.ts` (839 LoC)
- `src/ops/*` (1107 LoC)
- `src/compliance/*` (174 LoC)
- `src/cli-handlers/*` (1186 LoC)
- `src/nonce-store/*` + `src/seq-counter/*` + `src/trust-set/*` (768 LoC)

**Total downstream-staying: ~5150 LoC.** The package shrinks by the upstream-bound types only.

---

## Comparing with `claws-sdk/` policy/governance fragments

The user flagged in priors that claws has parallel implementations. Confirmed:

| claws-sdk subdir | LoC | Files | Overlap with `openclaw-policy` |
|---|---:|---:|---|
| `claws-sdk/src/governance/` | **1726** | 13 | **High overlap** — 10 G-* rule families (`g-a2a`, `g-bound`, `g-class`, `g-context`, `g-data`, `g-elicit`, `g-input`, `g-output`, `g-perm`, `g-supply`) implement runtime governance in claws-serve's process. Parallels `openclaw-policy/src/governance/rule-apply.ts` but at much greater fidelity. |
| `claws-sdk/src/compliance/` | **3107** | 12 | **Total overlap** — `eu-ai-act.ts` (549), `hipaa.ts` (529), `soc2.ts` (387), `audit-chain.ts`, `artifact-signer.ts`, `manifest-types.ts`. Parallels `openclaw-policy/src/ops/evaluate-compliance.ts` + `compliance/load-rubric.ts`. |
| `claws-sdk/src/protect/` | ~1000 | 5 | Partial overlap — `secrets.ts` (543), `budget.ts`, `identity.ts`. Some overlap with policy's runtime-host concerns. |
| `claws-sdk/src/audit/` | ~1500 | 7 | Partial overlap — `chain.ts`, `verify.ts`, `wal.ts`, `witness.ts`, `export.ts`. Parallels `openclaw-policy/src/emit/emit-audit-chain.ts`. |

**The parallel-implementation problem is real and large.** Total parallel-bound LoC: ~7300 LoC across claws-sdk that overlaps responsibilities already in `openclaw-policy` (or that *should* be there). Whiskey's surface audit (`claws-surface-audit.md:215, 222-227`) calls this out as the UPSTREAM-DEFERRED bucket; today's audit confirms the move target.

### Reconciliation plan (sequenced after this audit's recommendation lands)

1. **`claws-sdk/src/governance/` rule definitions (~1300 LoC)** → fold into `openclaw-policy/src/governance/` (or — better — into `openclaw-guardrails/`, since they're runtime evaluators). The 10 G-* rule families are the highest-quality version of what `openclaw-policy/governance/rule-apply.ts` is partial of.
2. **`claws-sdk/src/compliance/` (~3107 LoC)** → fold into `openclaw-policy/src/compliance/`. The package already has the directory and the rubric loader.
3. **`claws-sdk/src/audit/` audit-chain machinery (~1500 LoC)** → fold into the surviving policy/emit pipeline OR a new `openclaw-audit/` package. (This is whiskey's open question.)
4. **`claws-sdk/src/protect/` (~1000 LoC)** → split: secrets/identity → guardrails; budget → claws-side runtime concern.

**Net delete from claws-sdk after consolidation: ~6900 LoC** (governance + compliance + audit). Combined with snap's 1400 LoC delete from `claws-sdk/src/snapshot/`, the trim wave's claws-sdk shrinkage exceeds 8000 LoC.

---

## Recommendations

### Option A: Types-only contract upstream (RECOMMENDED, ~80–150 LoC)

- **Upstream change**: a single PR adding `src/plugin-sdk/policy-ir.ts` with `PolicyIR`, `ToolSpec`, `DenyRule`, `Decision`, `PolicyGenerator<TValidated>` interface, `POLICY_IR_PATH = '.openclaw/policy/policy-ir.json'` constant. Re-exported via `packages/plugin-sdk/src/policy-ir.ts` (one-line shell). Optionally accompanied by `src/plugin-sdk/policy-ir-runtime.ts` with the 4 lock-point helpers.
- **Claws side**:
  - Rename `packages/openclaw-policy/` → `packages/claws-policy-generator/` (clarifies "this is the claws-side generator, not the contract").
  - Re-target the package's `src/types/index.ts` to consume `@openclaw/plugin-sdk/policy-ir` once it lands. Re-export claws-specific extensions (Diagnostic, GeneratorDiagnosticEntry, Watch types) from a separate downstream-only types module.
  - The generator, emit, ops, CLI, and stores all stay. They consume the upstream types.
  - **Consolidation**: fold `claws-sdk/src/governance/` (1726 LoC), `claws-sdk/src/compliance/` (3107 LoC), and overlapping audit machinery (1500 LoC) **into the renamed claws-policy-generator package** as the deliberate downstream home for these.
- **Conformance claim**: `claws-policy-generator` produces `PolicyIR`-typed artifacts conforming to the upstream type. `claws-sdk/src/governance/`'s rules are a `PolicyGenerator<CapabilityManifest>` impl when reframed.
- **Pros**:
  - Tiny upstream surface (~80–150 LoC vs the ~6200 LoC current package).
  - Aligned with Peter's pattern (contracts-only at the package layer).
  - Aligned with yankee's snap recommendation (consistent upstream story).
  - Zero coordination cost on the generator — claws moves at its own pace.
  - Future-compatible: OPA/CEL/yaml shims can produce conforming PolicyIRs without touching the contract.
- **Cons**:
  - Contract-only feels minimal. Maintainers may push back with "where's the reference impl?" — answer: the generator is convention-bound, ecosystem authors implement their own (precedent: each LLM provider implements its own auth flow against `provider-auth-types.ts`).
  - PolicyIR shape needs to be **opinionated enough** to be useful but **general enough** not to embed claws-specific assumptions. The current 220-LoC types file leans claws-specific (e.g., `R0`-`R5` tier labels mirror claws's audit format). Some pruning needed before submission.

### Option B: Don't contribute upstream at all

- Policy stays purely internal to the claws monorepo as `packages/claws-policy-generator/`.
- OpenClaw doesn't define a policy artifact format; consumers solve it themselves (each ecosystem ships its own format and own evaluator plugin).
- The `claws-sdk/src/governance/` + `compliance/` consolidation into `claws-policy-generator/` still happens.
- **Pros**:
  - Zero upstream coordination cost.
  - We move at our own pace.
  - Gives the ecosystem time to surface organic demand for a shared policy artifact format before locking in a shape.
- **Cons**:
  - If a peer consumer wants policy-bearing snapshots, they reinvent it without a shared shape — fragmentation risk (mitigated by the fact that snap's contract under yankee's Option A doesn't define what *type* of artifact rides inside; consumers can fragment within snap).
  - We bear the full design + maintenance cost without amortizing.
  - Slightly out of step with snap's Option A (asymmetric: snap upstream, policy downstream-only).

### Option C: Types + reference generator plugin upstream (~150–300 LoC additional)

- Above + `extensions/policy-from-markdown/` — a bundled plugin that compiles a default markdown convention (SOUL.md/TOOLS.md) to PolicyIR.
- **Pros**:
  - Gateway has a default policy story.
  - Ecosystem consistency.
- **Cons** (decisive):
  - **Convention lock-in**. The markdown convention is opinionated; embedding it as the default upstream forces every consumer to reckon with it. Most won't want to.
  - **Generator scope creep**. A reference impl is ~300 LoC minimum; that grows over time. Per CONTRIBUTING.md:89 ("most features should be third-party plugins"), Peter is unlikely to take a generator upstream that's only beneficial to one consumer's authoring style.
  - **Premature**. Wait for ecosystem demand before promoting a reference generator.

### Recommended

**Option A**, with sequencing aligned to yankee's snap audit.

The reasoning: the user's "policy lives in snapshots" framing makes upstream surface vanishingly small (one type file). Every other piece — the generator, the evaluator, the ops, the CLI, the stores — has a clear downstream home. Upstream gets the artifact shape; consumers compose around it.

**B is the safe fallback** if maintainers want to defer entirely. A's PR is small enough that proposing it via #clawtributors first (a 50-line gist + RFC) carries minimal risk; if Peter pushes back, downgrade to B with zero pivot cost.

**C is wrong for now** because it bundles a convention that most consumers won't share. Revisit C only if cross-ecosystem demand for the markdown convention emerges.

---

## Sequencing with other contracts

The four-contract chain Whiskey + Yankee + this audit + Bandit's parallel work imply:

| Contract | LoC | Status | Depends on |
|---|---:|---|---|
| **oc-path** (workspace) | small | in-flight (PR-2 in Hapi wave) | — |
| **snap** | ~50–150 | Yankee's pre-RFC | oc-path |
| **policy-ir** (this audit) | ~80–150 | recommended pre-RFC | snap (filename convention assumes snap addressing) |
| **guardrails** | ?? (bandit's audit pending) | parallel | policy-ir (Decision/Event types likely refer to PolicyIR) |
| **registerTrustedToolPolicy** | already upstream | shipped | — |

**Total upstream contract LoC across all four claws contributions: ~250–500 LoC.** Tiny vs. the ~87k current claws monorepo. Each contract is small enough to land in a single focused PR, per `CONTRIBUTING.md:122` ("Keep PRs focused").

**Sequencing concerns**:
1. **Policy-ir depends on snap only loosely**: it references snap's filename convention (`.openclaw/policy/policy-ir.json`) but doesn't import snap types. They can land in either order, though landing snap first lets policy-ir's docs reference it concretely.
2. **Guardrails depends on policy-ir at the type level**: a `Decision` references the `PolicyIR` that produced it. Policy-ir must land first.
3. **`registerTrustedToolPolicy` is already in `host-hooks.ts`** — no upstream blocker for the registration slot. Bandit's guardrails audit needs to verify whether the `evaluate(event, ctx)` signature is rich enough (`ctx` may not carry the snapshot id needed to load PolicyIR; might need extension).

**Wave-level recommendation**: open Option A's PR for snap first (yankee's recommendation), then policy-ir's PR ~1 sprint later when our `claws-policy-generator` already produces conforming artifacts. The two PRs together establish the artifact-bearing-snapshot pattern; bandit's guardrails contract follows.

---

## What this means for the trim wave

The Hapi wave's policy work was treated as a single chunky PR-6 (per `claws-surface-audit.md:215` and prior Hapi planning). This audit reframes it as:

1. **PR-6a (upstream)**: ~80–150 LoC adding `src/plugin-sdk/policy-ir.ts` (+ optionally `policy-ir-runtime.ts`). Tiny, focused, low-coordination.
2. **Claws-side internal consolidation (parallel, no upstream blocker)**:
   - Rename `packages/openclaw-policy/` → `packages/claws-policy-generator/` (or similar).
   - Fold `claws-sdk/src/governance/` (1726 LoC), `claws-sdk/src/compliance/` (3107 LoC), `claws-sdk/src/audit/` chain machinery (~1500 LoC) into the renamed package.
   - Re-target type imports to upstream `@openclaw/plugin-sdk/policy-ir` once PR-6a lands.
   - Delete the parallel implementations from claws-sdk.
3. **Net delete from claws-sdk**: ~6300 LoC (just from policy/governance/compliance/audit; not counting snap's 1400 LoC).

**Net effect on the trim**: aggressive shrinkage of claws-sdk (almost 8k LoC across snap + policy lines together), tiny upstream surface, no daemon-shape architectural battles. Consistent with yankee's snap recommendation and the user's "policy lives in snapshots" framing.

**The policy-upstream-deferred decision in `claws-surface-audit.md:215`**: answered. **Policy upstream contribution is GO under Option A** (small types-only PR), or **STAY** (Option B) if the team prefers no upstream surface. Either way, the parallel implementations in `claws-sdk/{governance,compliance,audit}/` collapse into `openclaw-policy/` (renamed).

---

## Open questions for #clawtributors

1. **Does the gateway-generates-policy-into-snapshot flow match Peter's intuition, or does he see policy as living elsewhere?** Worth surfacing the user's framing as the first question — it's the load-bearing premise. If Peter sees policy living on a separate API surface (e.g., a registry plugin), the contract design differs.
2. **Should the generator interface be upstream (forced consistency) or just the PolicyIR type (consumer freedom)?** Option A picks freedom; Option C picks consistency. Maintainer call.
3. **Naming collision risk**. `Policy` is generic. Upstream already has `ssrf-policy.ts`, `bluebubbles-policy.ts`, `channel-policy.ts`. Concrete: name the contract type `PolicyIR` (not `Policy`) and the file `policy-ir.ts` to disambiguate from per-domain policies. The "IR" suffix also signals "this is the compiled-down form, not authoring source."
4. **Does PolicyIR earn a row in `docs/plugins/architecture.md:34-50`'s capability table?** If yes, what's the canonical capability name — "policy"? "policy-ir"? "tool-governance"?
5. **`PluginTrustedToolPolicyRegistration` reuse vs new**. The existing upstream slot at `host-hooks.ts:65-72` has `id`, `description`, `evaluate(event, ctx)`. Is that enough for a PolicyIR-driven plugin, or do we need a new registration type that ties a registered policy to a specific PolicyIR (e.g., loading from a snapshot)? Likely answer: existing slot is sufficient; the PolicyIR comes via plugin-private state.
6. **Should the four runtime-ABI helpers ship upstream alongside the types, or stay claws-side?** Tradeoff: upstream = every PolicyIR-aware plugin gets them free; claws-side = smaller upstream PR, one-line copy in each consumer.

## Asks

1. **Reaction to the user's "policy lives in snapshots" framing.** Does it match Peter's mental model? If yes, proceed with PR-6a. If no, this audit needs revisiting.
2. **Confirmation that PolicyIR-shaped types are welcome upstream** (vs. "we don't define policy formats; consumers do" — a valid stance). A 30-min #clawtributors thread should resolve it.
3. **Naming guidance**. `PolicyIR` vs `WorkspacePolicy` vs `ToolGovernancePolicy` — Peter's house style preference matters here.
4. **Approval to fold `claws-sdk/src/governance/` + `claws-sdk/src/compliance/` into the renamed `claws-policy-generator/`** as the deliberate downstream home, even before any upstream PR lands. This is internal-to-claws cleanup with no upstream blocker.

---

## Verification

Files / commands used:

- `ls C:/src/claws/packages/openclaw-policy/{src,tests}/` — 14 subdirs, 55 TS files, 6211 LoC total.
- `wc -l` over every TS file in `packages/openclaw-policy/src/` — full distribution captured.
- Read `packages/openclaw-policy/{package.json, src/index.ts, src/types/index.ts, src/runtime/index.ts, src/generator.ts, src/governance/rule-apply.ts, src/compile/extract.ts, src/emit/emit-plugin.ts, src/fs-pipeline.ts, src/ops/evaluate-compliance.ts}` — sufficient sample to establish responsibility boundaries.
- `ls` + `wc -l` over `claws-sdk/src/{governance, compliance, protect, audit}/` — confirmed the parallel implementations and their sizes (governance 1726 LoC, compliance 3107 LoC, audit ~1500 LoC, protect ~1000 LoC).
- Grep `policy|guardrail|governance|capability` in `C:/src/openclaw-core/src/plugin-sdk/` — found only domain-specific policies (ssrf, bluebubbles, channel, dm-guard, runtime-group); no general-purpose framework.
- Grep `before_tool_call|after_tool_call|registerHook` in upstream — found mature hook pipeline at `src/plugins/hooks.ts`, `src/plugins/trusted-tool-policy.ts`.
- Read `src/plugins/host-hooks.ts:50-80` — confirmed `PluginTrustedToolPolicyRegistration` and `PluginToolPolicyDecision` types already exist upstream.
- Read `src/plugins/trusted-tool-policy.ts` — confirmed `runTrustedToolPolicies` runner that iterates registered policies.
- Grep `@bic/openclaw-policy` across `packages/` — confirmed CLI consumer at `claws/src/cli.ts:39, 567`; cross-package coupling at `openclaw-snap/src/canonical.ts`; no claws-serve consumer.
- Read `.craft/out/audits/snap-openclaw-design-fit.md` (yankee's full audit, 423 lines) — adopted Peter-lens framework.
- Read `.craft/out/audits/claws-surface-audit.md` (whiskey's surface bucketing, sampled lines 1-40, 92-104, 213-227, 265-273) — confirmed the policy-upstream-deferred decision and the ~12.5k LoC delete target.
- Memory: `MEMORY.md`, `project_openclaw_upstream.md` (claws-OpenClaw upstream relationship; 2-week train / LTS cadence).
