# Panel Review: claws:platform-eng on v2-proposal — Round 2

**Type**: plan
**Role**: claws:platform-eng (Operator; Cluster D; "Fleet consistency > Workspace autonomy")
**Round**: 2
**Files reviewed**:
- `C:\src\claws\.craft\out\proposals\snap-pre-rfc.md`
- `C:\src\claws\.craft\out\proposals\policy-pre-rfc.md`
- `C:\src\claws\.craft\out\proposals\guardrails-adapter.md`
- `C:\src\claws\.craft\out\proposals\realigned-story.md`
**Date**: 2026-04-29
**Lens**: contract-chain composition, sequencing/circularity, upstream-shape conformance, multi-tenant/multi-binary, drift surface, fleet-broadcast / drift / doctor reachability.
**Prior round**: `R1-claws-platform-eng.md` (3 Majors, 9 Warnings, 8 Notes)

---

## TL;DR — verdict up top

**APPROVE-WITH-WARNINGS.** All three R1 Majors (M1, M2, M3) are RESOLVED in the amended docs. R1 Warnings W1–W9 are mostly resolved or explicitly scoped; a small number remain partial. The amendments introduced one new Major (M11 — trim-arithmetic prose says "~700–1,500 LoC overlap" but the computation uses 1,689 LoC, which is internally inconsistent and visible to reviewers) and a handful of new Warnings (M11 detail, W10–W14) about residual fleet/multi-tenant gaps and a few tightening opportunities. None block opening the pre-RFCs once M11 is reconciled with a 30-second edit.

The architectural framing held up under amendment, the type-level chain now composes cleanly, and the headline LoC is now defensible — modulo the M11 prose bug. **The proposal is ready to share to channel after M11 is fixed and W10/W11 are explicitly scoped.**

---

## R1 Majors — resolution status

### M1 (RESOLVED) — `POLICY_IR_PATH` divergence + `OcPath` type misuse

**Status**: **RESOLVED.**

The amendments cleanly separate two addressing schemes:

- **`OcPath`** (structured interface, `{file, section?, item?, field?, session?}`, `file` ∈ `OC_WORKSPACE_FILES` 9-entry registry) — addresses files in a **live** workspace.
- **`SnapshotInternalPath`** (string brand, POSIX-style, no registry constraint) — addresses files **inside** a captured snapshot bundle.

Verified at:
- `snap-pre-rfc.md:31-33` (explicit non-import note: "this contract does NOT import OcPath")
- `snap-pre-rfc.md:46-52` (`SnapshotInternalPath` defined)
- `snap-pre-rfc.md:62` (`read(snap: SnapshotId, path: SnapshotInternalPath)` — correct typing)
- `policy-pre-rfc.md:37` (`import type { SnapshotId, SnapshotInternalPath } from './snapshot'`)
- `policy-pre-rfc.md:74-82` (`POLICY_IR_PATH: SnapshotInternalPath = '.openclaw/policy/policy-ir.json'`)
- `realigned-story.md:139-145` (oc-path explicitly described as live-workspace-only; snapshot-internal path explicitly different)
- `realigned-story.md:153` (PolicyIR contract description references the typed split)

The path is now consistent: `.openclaw/policy/policy-ir.json` everywhere, and it is typed as `SnapshotInternalPath` not `OcPath`. R1's "three different paths" issue and the "string assigned to structured interface" type error are both gone.

**Note**: this also resolves W2 (the `capture(workspace: OcPath)` confusion). `snap-pre-rfc.md:38-44,61` introduces a separate `WorkspaceId` brand for `capture/list` arguments — distinct from both `OcPath` and `SnapshotInternalPath`. Three crisp addressing types now: `WorkspaceId` (root scope), `OcPath` (live file), `SnapshotInternalPath` (file inside a captured bundle).

### M2 (RESOLVED) — `evaluate(event, ctx)` snapshot-ID workaround in multi-process

**Status**: **RESOLVED.**

The fix landed as the user-decided "ctx.snapshotId threaded through as upstream contract extension." Verified at:

- `policy-pre-rfc.md:194-198` (Ask §4 explicitly proposes extending `PluginHookToolContext` with `snapshotId?: SnapshotId`, citing R1 reviewers by name)
- `policy-pre-rfc.md:165-171` (sequencing table includes the ctx extension as a separate row, ~5 LoC)
- `realigned-story.md:155-157` (the extension promoted to a 4th contract entry alongside oc-path/snap/PolicyIR; rationale documented)
- `realigned-story.md:80-135` (architectural-flow diagram shows the gateway threading `ctx.snapshotId` through `before_tool_call`)
- `realigned-story.md:182` ("`ctx.snapshotId` is tiny but unlocks correct multi-process / multi-tenant behavior")
- `guardrails-adapter.md:102-112` (adapter explicitly reads `ctx.snapshotId` and translates; missing-`snapshotId` is a fail-closed condition per `:119-120`)

The proposal now resolves the multi-process correctness gap at the contract layer rather than papering over it with a downstream callback workaround. The closure-captured `onSnapshotPromoted` register is still used as a **cache-population trigger** (acceptable when keyed by `(sessionKey, snapshotId)` per `realigned-story.md:323`), but the **anchor for "which snapshot drives this evaluate"** now comes from `ctx.snapshotId` — which is what R1 demanded.

### M3 (RESOLVED-WITH-NEW-MAJOR) — trim-arithmetic double-count

**Status**: **RESOLVED at the headline; INTERNAL INCONSISTENCY introduced — see M11 below.**

The amendments pin the headline at 6,200 LoC firm (no range) per the user's R1 follow-on decision, and explicitly document the destination of `claws-sdk/src/audit/` as `claws-policy-generator/emit/` (downstream, not a fourth `@openclaw/audit` package). Verified at:

- `realigned-story.md:189-202` ("What this replaces" section, with explicit derivation: 7,889 gross − 1,689 overlap = 6,200 net)
- `realigned-story.md:198` (`claws-sdk/src/audit/` → `claws-policy-generator/emit/emit-audit-chain.ts`)
- `realigned-story.md:64-76` ("Why audit is not in v2 scope" — three-reason argument; future v3 may revisit)
- `realigned-story.md:281` ("the destination is now firm — audit stays downstream in v2; no `@openclaw/audit` carve-out is in scope")
- `snap-pre-rfc.md:156` (audit-stays-downstream in snap pre-RFC's audit-emission section)
- `policy-pre-rfc.md:139` (audit-stays-downstream in policy pre-RFC's "What's NOT in the contract")

The destination ambiguity is gone: one source (`claws-sdk/src/audit/`), one destination (`claws-policy-generator/emit/`), one trim figure (6,200 LoC firm).

**However**, the amendment introduced a fresh internal inconsistency in the *prose* of the trim-arithmetic section. See **M11** below.

---

## R1 Warnings — resolution status

| ID | Status | Where it landed (or didn't) |
|---|---|---|
| **W1** (`auth: 'gateway'` claim) | **PARTIALLY-RESOLVED** | `snap-pre-rfc.md:71` still says "auth: 'gateway' — uses the gateway's existing auth chain, no new model" without acknowledging the embedded-mode case. The R1 fix asked for a separate auth-mode note for claws-serve embedded; not present. **Carried forward as W10.** |
| **W2** (`capture(workspace: OcPath)` overload) | **RESOLVED** | `snap-pre-rfc.md:38-44,61` introduces `WorkspaceId` brand; `capture(workspace: WorkspaceId)`, `read(snap, path: SnapshotInternalPath)`. Three distinct types now. |
| **W3** (sequencing circularity) | **RESOLVED-VIA-DIFFERENT-MECHANISM** | The amendment did NOT reverse the order to land PolicyIR types first. Instead it broke the conformance-test coupling by pinning **RFC 8785 JCS in both contracts**, so the conformance test becomes "test against the standard" rather than "test against a moving cross-PR target." `realigned-story.md:322` explicitly explains this: "naming RFC 8785 JCS in both contracts uncouples the conformance test from the cross-PR handshake — both sides reference the same standard, so the test becomes a unit test against the standard, not a moving-target cross-PR negotiation." Different fix than R1 proposed, but resolves the core concern. |
| **W4** (fleet-broadcast / drift / doctor reachability) | **NOT-RESOLVED-BUT-ACKNOWLEDGED-BY-OMISSION** | None of the four documents adds a `current(workspace)` method or addresses `claws drift` / `claws doctor` / `claws comply --fleet`. The contract surface still has no "active snapshot per workspace" resolution. **Carried forward as W11** — gateway-eng or release-eng may also flag, but my role specifically owns drift/doctor/fleet-comply. The amendments didn't make it worse, but didn't address it. |
| **W5** (snap's lost `current()`) | **RESOLVED-OPERATIONALLY-NOT-CONTRACTUALLY** | The `ctx.snapshotId` thread-through (M2 fix) means consumers no longer need a `current()` method on the contract — the gateway is responsible for resolving "current snapshot for this session" and threading it through `ctx`. This is a different shape than R1 proposed but is internally consistent: the contract stays minimal, the resolution responsibility moves to the gateway. `realigned-story.md:113-114` makes this explicit ("on tool call: gateway resolves 'current snapshot for this session' and threads it through ctx.snapshotId"). The "where does the gateway get it from" question is now downstream (gateway has its own session→snapshot mapping); contract is clean. Acceptable resolution. |
| **W6** (tenant scoping) | **NOT-RESOLVED** | No tenant-scoping discussion added to any of the four docs. `realigned-story.md:182` mentions "multi-process / multi-tenant" once in passing as benefiting from `ctx.snapshotId`, but no `tenantId` is in `ctx`, no tenant-aware `WorkspaceId` convention is documented. **Carried forward as W12.** |
| **W7** (priority-merge collapses to one upstream policy) | **PARTIALLY-RESOLVED** | `guardrails-adapter.md:80` retains the "we expose a single composed `GuardrailProvider` to the adapter — one upstream `TrustedToolPolicy`" framing. The "limits of the adapter" multi-tenant note R1 asked for is not added. Still works for v1 single-tenant. **Carried forward as W13.** |
| **W8** (capability-table membership pre-answer) | **RESOLVED** | Both pre-RFCs now pre-answer "no row v1" (`snap-pre-rfc.md:232,264`; `policy-pre-rfc.md:147,197`). |
| **W9** (Rust-port estimate downstream of trim) | **RESOLVED** | `realigned-story.md:293-295` retracts the "2-3 weeks" claim, makes the Rust port conditional on (a) trim landing, (b) rust-port-plan-R1 findings closing, (c) post-trim contract stability, and re-scopes to "5-6 weeks at sustainable pace." The fantasy is gone; the dependency on M3 is now explicit. |

Tally: of 9 R1 Warnings, **5 fully resolved** (W2, W3, W5, W8, W9), **3 partially resolved or carried forward as renumbered** (W1→W10, W7→W13), **2 not resolved and carried forward** (W4→W11, W6→W12). None of the unresolved Warnings is contract-keystone-blocking — they are residual scoping questions for v1.

---

## New findings (R2)

### Major (M)

| # | File | Line/Section | Finding | Suggested fix |
|---|------|-------------|---------|---------------|
| **M11** | `realigned-story.md` | 191, 198, 200 | **Trim arithmetic prose contradicts itself: "700–1,500 LoC overlap" vs computed 1,689 LoC.** Line 191 says "double-counted ~700–1,500 LoC of overlap between `claws-sdk/src/snapshot/` and `claws-sdk/src/audit/`." Line 198 says "(and partially overlaps the snapshot machinery's audit-chain hooks; this is the source of the ~700–1,500 LoC double-count)." Line 200 then computes "gross sum 7,889 (1,556 + 1,726 + 3,107 + 1,500) − ~1,689 LoC of audit×snapshot overlap that's actually double-listed = ~6,200 LoC." The numbers don't reconcile: the prose says 700–1,500 LoC overlap (range), the computation uses 1,689 LoC overlap (point value, above the range's upper bound). Either the overlap-prose is wrong (it's actually 1,689 LoC, exceeds the "1,500 LoC upper bound"), or the computation is wrong (should subtract within 700–1,500 and net should be 6,389–7,189 LoC, not 6,200). Since the user pinned 6,200 LoC firm per the follow-on decision, the **prose** is what's wrong: replace "~700–1,500 LoC" with "~1,689 LoC" in lines 191 and 198. This is exactly the kind of headline-LoC-doesn't-match-the-math discrepancy that bot reviewers will flag immediately when the realigned-story (or any externally-shareable derivation) is referenced. **30-second edit.** A reviewer (Peter, Greptile, or any of the bot trio) will see the inconsistency on first read; arithmetic that doesn't reconcile undermines the credibility of the whole trim narrative. | Replace "~700–1,500 LoC" with "~1,689 LoC" at `realigned-story.md:191` and `:198`. Optionally add a one-line breakdown of where the 1,689 comes from inside the audit×snapshot subdirs (e.g., "audit-chain wraps that snapshot machinery already exports as the canonical writer, plus the WAL/witness machinery the snapshot pipeline already exposes"). |

### Warning (W)

| # | File | Line/Section | Finding | Suggested fix |
|---|------|-------------|---------|---------------|
| **W10** | `snap-pre-rfc.md` | 71 | **`auth: 'gateway'` still under-specified for the embedded-mode case** (R1 W1 carryover). `snap-pre-rfc.md:71` says "auth: 'gateway' — uses the gateway's existing auth chain, no new model." The reference plugin is fine, but the proposal also describes (`snap-pre-rfc.md:79`) the `openclaw snap serve --port N --store-dir D` mode for local dev — which is NOT inside an OpenClaw gateway and therefore not subject to `auth: 'gateway'`. The proposal does not say what `snap serve` does for auth (open? bearer-token? mTLS?). Same gap exists for claws-serve's eventual embedded `SnapshotStore` impl, which may or may not run in-gateway. | Add a one-line note at `snap-pre-rfc.md:71` or in the "Conformance" section: "`auth: 'gateway'` applies in the gateway-mounted reference plugin only. The standalone `openclaw snap serve` mode (dev) provides no auth in v1 (dev-only; not for production); production deployments embedding `SnapshotStore` outside a gateway must wire their own auth on the wire layer." Resolves the dev-vs-prod auth ambiguity. |
| **W11** | (none — gap) | — | **Fleet-scope absence persists** (R1 W4 carryover). `claws drift` / `claws doctor --fleet` / `claws comply --fleet` need a "give me the active PolicyIR per workspace" surface. With `ctx.snapshotId` resolution sitting at the gateway (W5 resolution), there is now a clear story for **runtime** (request-time) snapshot resolution — but no story for **out-of-band** (fleet-scan-time) resolution. From a fleet-broadcast / drift-detection / doctor-fleet perspective: how does workspace-scanner-N enumerate "the active PolicyIR for workspace N" without going through a tool-call? Today (pre-trim) drift reads the workspace's own files; post-trim, the active PolicyIR is at `snap.read(snap=???, POLICY_IR_PATH)` — and the `???` is "ask the gateway, but via what?" The proposal does not say. This is **fleet-scope, not request-scope**, and it's mine to flag. | Either (a) add a downstream-only `ActiveSnapshotResolver` interface in claws-side docs (no upstream contract surface) describing how `claws drift` / `claws doctor --fleet` / `claws comply --fleet` query the gateway for "active snapshot per workspace" (separate from `ctx.snapshotId` which is request-scoped), OR (b) document explicitly in `realigned-story.md` "Fleet-scope is downstream of the contract chain — `claws drift` and friends use the gateway's session→snapshot mapping API directly, which is a claws-internal surface not in `plugin-sdk`." Either is fine; silence is what's wrong. |
| **W12** | (none — gap) | — | **Tenant-scope absence persists** (R1 W6 carryover). The four documents collectively use the word "tenant" exactly twice (`realigned-story.md:182` "multi-process / multi-tenant," `snap-pre-rfc.md:41` "tenant-scoped namespace"). No tenant-id is in `WorkspaceId` (it's `string`), no tenant-id is in `ctx` (per R1 verified hook-types.ts), no tenant-id is in PolicyIR. A multi-tenant gateway has no contract surface for "this PolicyIR is for tenant T1" vs "this PolicyIR is for tenant T2." This is a v1-scope question more than a v2-blocking issue, but it should be explicit. | Add a "What's NOT in v1" line in `realigned-story.md` after the "Cross-contract concerns" section: "Multi-tenancy is downstream of the contract chain in v1. Tenant-scoping rides via `WorkspaceId` convention (e.g., `tenant-A/workspace-1`) or via gateway-side multi-binary deployment (one binary per tenant). Future v3 may propose a `tenantId?: string` field on `ctx` if multi-tenant single-binary deployments emerge." Sets expectations; doesn't block. |
| **W13** | `guardrails-adapter.md` | 80 | **One-composed-policy-upstream limitation still undocumented** (R1 W7 carryover). The adapter still composes N claws-side providers into ONE upstream `TrustedToolPolicy`. The R1 ask was a "limits of the adapter" note; not added. This is fine for single-tenant v1 but loses claws's R5-force-external semantic when a future deployment registers N tenant-specific upstream policies. | Add to `guardrails-adapter.md` after the "Composition handling" section: "**Adapter limit**: priority-merge semantics (`deny > review > modify > allow`, R5-force-external) are preserved iff exactly one composed `GuardrailProvider` is registered upstream. Multi-tenant deployments registering N policies upstream lose the priority-merge guarantee — they collapse to upstream's sequential-short-circuit semantic. This is acceptable for v1; revisit if multi-tenant single-binary becomes a deployment shape." |
| **W14** | `realigned-story.md` | 141 | **Hapi PR coordination steps are documented but explicitly out-of-scope; sequencing risk is real but unaddressed.** `realigned-story.md:18-27` lists 5 concrete next-action steps for the hapi worktree (wave.yaml absorption section, PROGRESS.md row, pulse supersession, PR-draft archival, new PR-drafts). The doc says these are "out-of-scope for this docs-only fix-pass" and "the concrete next action when this proposal package is ratified." That's correct scoping — but if the v2 proposal package goes to channel **before** the hapi-worktree amendments land, channel readers see one v2 narrative while the actual upstream PR-drafts still contradict it. From an operational/contract-chain consistency standpoint, the v2 channel-share and the hapi-amendment should be temporally close, or the hapi-amendment should land first. | Add a one-line gating note to `realigned-story.md` or each pre-RFC: "Channel-share of this pre-RFC is gated on hapi-wave amendment landing first (see `realigned-story.md` 'Hapi wave coordination' for the 5-step list)." Or move the gating into a separate scheduling doc. Either way, make the temporal ordering explicit. |

### Notes (N)

| # | File | Line/Section | Finding |
|---|------|-------------|---------|
| **N9** | `snap-pre-rfc.md` | 173-214 | The new `SnapshotErrorCode` enum + HTTP-status-mapping table is well-shaped. Nine codes is the right granularity — coarse enough for consumers to switch on, fine enough to disambiguate the failure modes that matter (`SNAP_NOT_FOUND` vs `SNAP_INVALID_PATH` vs `SNAP_CHECKSUM_MISMATCH`). The HTTP-mapping is conventional. The note that `message` is human-readable-only and `cause` is implementation-defined is correct API hygiene. Good amendment. |
| **N10** | `policy-pre-rfc.md` | 198 | The Ask §4 narrative explicitly cites R1 reviewer findings ("see gateway-eng R1 review §1, ciso R1 review §7, platform-eng R1 review M2"). This is the right citation discipline — channel readers can trace the rationale to its three independent surfacings. Keep this pattern. |
| **N11** | `realigned-story.md` | 64-76 | The "Why audit is not in v2 scope" three-reason argument is convincing on its own merits, not just deferential to user decision. The "no meaningful consumer choice variation" argument is the strongest of the three (audit format is more like "RFC 8785" — there's a right answer; nobody's going to fork it three ways) and matches Peter's contract-first instinct. Good rationale. |
| **N12** | `realigned-story.md` | 206-245 | "Calendar honesty" section is the right shape: explicitly lists the 8 friction sources (10-PR cap, 2-PR concurrency, 2-week LTS, bot trio, AI-disclosure, refactor rejection, one-thing-per-PR, pre-submit gates), gives a per-PR median, derives the chain math, surfaces the implications. This is what a release-eng-aware narrative looks like; matches my fleet-operations sensibility (the upstream chain is itself a fleet operation, with its own cadence and failure modes). |
| **N13** | `realigned-story.md` | 322 | The RFC-8785-as-uncouple insight is genuinely clever — by naming a public standard in both contracts, the cross-PR conformance test becomes a unit test, not a 2-PR negotiation. This is the right kind of architectural simplification: it uses the type system + a published standard to do what otherwise would need explicit cross-PR coordination. Keep this framing in any externally-shareable derivation. |
| **N14** | `snap-pre-rfc.md` | 31-33 | The "this contract does NOT import OcPath" opening comment is the right kind of explicit-non-import discipline. It signals to bot reviewers (and Peter) that the addressing-scheme separation is intentional, not an oversight. Anti-pattern: future readers would assume "this is missing an import" without that comment. |
| **N15** | `realigned-story.md` | 286-291 | The naming-convention paragraph (`claws-snap-server` / `claws-policy-generator` / `claws-guardrails`) is the right cleanup — `openclaw-` prefix reserved for upstream contract packages, `claws-` prefix for downstream consumer packages. Symmetric across the three. Resolves repo-steward HC-BLOCK 3 cleanly. |

---

## Lens Checklist

| Verify item | Pass? | Notes |
|-------------|-------|-------|
| Does `claws broadcast` reliably push this to 47 workspaces? | **No** (W11 carryover) | Same as R1: no fleet-broadcast surface across the contract chain. The `ctx.snapshotId` resolution is request-scope, not fleet-scope. |
| Does `claws drift` detect when a workspace diverges from fleet policy? | **Not without W11 fixed** | Drift detection needs a "give me the active PolicyIR per workspace" surface. The amendment moved active-snapshot resolution to the gateway (good for runtime) but didn't add a fleet-scan path. |
| Does `claws doctor --post-upgrade --fleet` handle the monthly upgrade? | **Partial** | Doctor can now know which path to look at (M1 fixed: `.openclaw/policy/policy-ir.json` typed as `SnapshotInternalPath`). Per-workspace active-snapshot resolution still gappy (W11). |
| Can I see fleet-wide compliance in one command? (`claws comply --fleet`) | **Partial** | Compliance lives downstream after the trim (folds into `claws-policy-generator/compliance/`). Contract surface doesn't impede; W11 raises the resolution question. |
| What happens when 3 of 47 workspaces fail the upgrade? | Out of scope for the contract chain | Post-trim claws-side ops layer handles it. |
| Does the CI/CD pipeline (`@bic/claws-action`) work with our GitHub Enterprise setup? | Out of scope | No CI/CD surface in the proposal. |
| **Plus role-specific extensions** | | |
| Does the contract chain compose under the deployment patterns in `serve-deploy-bridge.md`? | **Yes for single-tenant; partial for multi-tenant** | M2 resolution (ctx.snapshotId) makes multi-process work correctly. W12 (tenant scoping) and W13 (multi-tenant multi-policy) remain. Eduardo's split-by-domain works because each domain is its own gateway with its own active-snapshot mapping. |
| Is the contract sequencing actually clean? | **Yes** | W3 resolved-via-different-mechanism: RFC 8785 JCS pinning uncouples the conformance test, so the sequencing dependency drops to a clean DAG (oc-path → snap → PolicyIR + ctx.snapshotId → guardrails-adapter). |
| Is the trim arithmetic defensible at the headline? | **Yes, after M11 prose fix** | 6,200 LoC firm, derivation explicit, destination pinned. The only blocker is M11's 30-second prose inconsistency. |

---

## Regression watch — issues introduced by amendments

The amendments are mostly additive and don't introduce regressions, with one exception:

1. **M11** — the trim-arithmetic prose contradicts the computation. This is a *new* inconsistency introduced by the R1 amendment that pinned 6,200 LoC; the prose was carried over from the earlier draft's 700–1,500 range without being updated to match the new firm number. This is the only regression I see.

2. **No regressions** in the contract surface — the M1, M2, M3 fixes layered cleanly onto the type chain without breaking the upstream-fit framing.

3. **No regressions** in the architectural-flow narrative — the gateway-as-signer + gateway-emitted-audit additions are coherent with the existing "policy lives in snapshots" framing.

4. **No regressions** in the renames — `claws-guardrails` aligns with `claws-snap-server` / `claws-policy-generator` / `claws-sdk` consistently.

---

## Cross-role concerns I'd flag for other reviewers

(Not my territory but visible from my lens — flagging in case other reviewers don't catch them.)

1. **For ciso**: The signing-chain amendment (gateway-as-signer) is architecturally sound but introduces a new attack surface — the gateway's signing key. R1 ciso flagged "key handling undefined." The amendment names the key (`gatewayKeyId`, KeyVault-backed) but does not specify rotation, key-compromise recovery, or the `verify(snapshotId)` API's failure modes. This is ciso's call but worth verifying.

2. **For release-eng**: The hapi-coordination steps (`realigned-story.md:18-27`) are documented but explicitly out-of-scope. Channel-share temporal ordering vs hapi-wave amendment is not pinned (W14 above). Release-eng owns the wave-orchestration; my flag is just that the temporal dependency exists.

3. **For repo-steward**: The renames are now consistent (`claws-guardrails` follows the convention). However, root `package.json` workspaces array, RB-repo-boundary spec, `.no-craftworks-allowlist.yaml` updates are still not reflected in the proposal docs — repo-steward flagged this in R1 and the amendments don't address it. This is operational scope; the proposal docs may be the wrong place to document it, but it should land somewhere.

4. **For gateway-eng**: The conformance section (`snap-pre-rfc.md:158-171`) requires byte-identical wire shapes between `extensions/snapshot/` plugin and `openclaw snap serve` standalone. This is implementable but the test infrastructure cost (running a fixture set against both backends in upstream's CI) is not estimated. Gateway-eng's call.

---

## Architectural-coherence summary (R2)

The chain `oc-path → snap → PolicyIR → ctx.snapshotId-extension → guardrails-adapter` now composes cleanly:

- **Type level**: oc-path is independent; snap depends on no other contract; PolicyIR imports `SnapshotId` and `SnapshotInternalPath` from snap (acceptable cycle-free dependency); ctx.snapshotId extension is a one-field addition to existing `PluginHookToolContext` (no contract cycle); guardrails-adapter consumes PolicyIR + already-shipped `registerTrustedToolPolicy` + `ctx.snapshotId`. Clean DAG.

- **Runtime level**: with `ctx.snapshotId` threaded through, the chain composes correctly under single-process AND multi-process deployments. Multi-tenant multi-binary works (each binary is its own gateway). Multi-tenant single-binary remains v2-out-of-scope (W12).

- **Trim level**: 6,200 LoC firm, derivation explicit, destination pinned (modulo M11 prose fix).

- **Cadence level**: 6–10 weeks honest, dependency graph documented, Rust-port retracted.

The proposal is **structurally sound**, the amendments **resolved the keystone Majors**, and the residual issues are **scoping clarifications** (W10–W13) plus one **30-second prose fix** (M11).

---

## Verification

- Read all four amended proposal documents in full (`snap-pre-rfc.md`, `policy-pre-rfc.md`, `guardrails-adapter.md`, `realigned-story.md`).
- Re-read R1 review (`R1-claws-platform-eng.md`) and R1 consolidated (`R1-consolidated.md`).
- Verified the trim-arithmetic computation: 1,556 + 1,726 + 3,107 + 1,500 = 7,889 (gross) − 1,689 (overlap) = 6,200 (net). Computation is internally correct; the *prose* about "700–1,500 LoC overlap" is what's wrong (M11).
- Verified `SnapshotInternalPath` is consistently used across all four documents (24 references; all match the typed-string-brand convention).
- Verified `OcPath` is now used only for live-workspace addressing in the four documents; not used as the type for `POLICY_IR_PATH` anywhere.
- Verified `ctx.snapshotId` is threaded through `policy-pre-rfc.md` Ask §4, `realigned-story.md` flow diagram, and `guardrails-adapter.md` adapter logic (3 consistent surfacings).
- Verified the `claws-guardrails` rename is applied consistently across all four documents.
- Verified the audit-stays-downstream decision is reflected in three places: `snap-pre-rfc.md:156`, `policy-pre-rfc.md:139`, `realigned-story.md:64-76,281`.
- Spot-checked R1 reviewers' citations (`policy-pre-rfc.md:198` cites gateway-eng / ciso / platform-eng R1 reviews by reference) — citations resolve to actual R1 findings.

No source files modified.

---

## Summary

**Verdict: APPROVE-WITH-WARNINGS.** All three R1 Majors (M1, M2, M3) resolved. R1 W2/W3/W5/W8/W9 fully resolved; W1/W7 partially carried forward as W10/W13 (scoping clarifications); W4/W6 carried forward as W11/W12 (still scoping gaps but not blocking). One new Major (M11 — trim-arithmetic prose vs computation inconsistency, 30-second fix) and four new Warnings (W10–W14, all scoping clarifications). The architectural framing held up, the type-level chain composes cleanly, and the headline trim figure is defensible. Fix M11 (a one-character-range edit) and explicitly scope W10–W13 with one-line clarifications, then ship to channel after hapi-wave amendments land.
