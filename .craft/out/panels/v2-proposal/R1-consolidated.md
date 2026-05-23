# v2-proposal — Round 1 panel review consolidated

**Type**: plan
**Subject**: 4 docs — `snap-pre-rfc.md` · `policy-pre-rfc.md` · `guardrails-adapter.md` · `realigned-story.md`
**Panel**: claws:platform-eng · claws:gateway-eng · claws:ciso · claws:claws-repo-steward · claws:claws-release-eng
**Date**: 2026-04-29

---

## Verdict: **MAJOR REVISION REQUIRED before any channel share**

| Reviewer | Verdict | Headline |
|---|---|---|
| `claws:platform-eng` | APPROVE-WITH-WARNINGS | 3 Majors (OcPath misuse + ctx.snapshotId multi-process + trim arithmetic); 9 Warnings |
| `claws:gateway-eng` | APPROVE-WITH-WARNINGS | snapshot-ID race is real correctness bug; canonicalization implicit; wire-parity gaps |
| `claws:ciso` | **REVISE** | 10 findings; signing chain fictional; fail-closed defaults unspecified; audit-emission bypassable; TOCTOU window unbounded |
| `claws:claws-repo-steward` | **REQUEST-CHANGES** | 4 HC-BLOCK; OcPath type misuse; **hapi worktree collision** (proposals contradict in-flight hapi PR drafts); renames don't update workspace contract |
| `claws:claws-release-eng` | **REQUEST-CHANGES** | 6 BLOCK; **hapi wave is at implementation stage with contradicting PR drafts**; upstream cadence math is fantasy; trim has no rollback |

The architectural framing is sound. The 0-LoC-guardrails finding is real. Trim is directionally correct. **What's broken is the load-bearing detail and the operational machinery** — the proposals reference a `OcPath` type that doesn't match upstream's actual definition; cite a hapi PR-7 that doesn't exist (it's PR-6, with a daemon-shape that contradicts snap-pre-rfc); use TOCTOU-prone caching workarounds for the snapshot-ID problem; leave signing/canonicalization/fail-closed implicit; and over-promise an upstream timeline that's realistically 6–10 weeks not 1–2.

---

## Critical Majors (consensus across 2+ roles)

### M-HAPI-COLLISION — Hapi worktree's in-flight PR drafts contradict the v2 proposal

| Roles | Severity | Files |
|---|---|---|
| repo-steward (HC-BLOCK 2) + release-eng (B1) | **CRITICAL** | `C:/src/claws/.craft/waves/260427+hapi-the-bringer+openclaw-upstream/` |

The proposals claim "Hapi PR-7 (daemon-shape) retired in favor of snap-pre-rfc." Reality:

- Hapi's `wave.yaml` shows **PR-1 = `@openclaw/workspace`** (which contains oc-path), **PR-2 = OC-4 stripFrontMatter**, **PR-6 = snap** (the daemon shape).
- There is **no PR-7** at hapi.
- PR-6 is daemon-shape and **contradicts snap-pre-rfc's "no daemon"** stance. It has not been retired or reshaped in the hapi worktree.
- Hapi wave is at `stages_in_progress: implementation` — pulse drafts ready to dispatch.

Without explicit hapi `wave.yaml` + `PROGRESS.md` amendments + pulse supersession + PR-draft archival, the v2 proposal is a paper exercise that contradicts the work actually being shipped upstream.

**Fix**: amend Hapi wave docs to reflect snap+policy+guardrails reshape; supersede or rewrite PR-6 draft to match snap-pre-rfc; update sequencing.

### M-OCPATH-TYPE-MISUSE — `OcPath` is a structured object, not a string

| Roles | Severity | Files |
|---|---|---|
| platform-eng (M1) + repo-steward (HC-BLOCK 1) | **CRITICAL** | all four proposal docs |

`OcPath` in `C:/src/claws/packages/openclaw-workspace/src/path/oc-path.ts:23-34` is a structured `interface { file, section?, item?, field?, session? }`, not a string brand. The proposals treat it as a string alias:

- `POLICY_IR_PATH: OcPath = 'oc://workspace/.openclaw/policy-ir.json'` — type-incorrect three ways: (a) string→object mismatch, (b) `'workspace'` isn't in the 9-entry `OC_WORKSPACE_FILES` registry, (c) it's a workspace-branch URI for a snapshot-internal address.
- **Four different path conventions across docs**: `oc://workspace/.openclaw/policy-ir.json` (policy-pre-rfc:69), `.openclaw/policy/policy-ir.json` (realigned-story:33,70,128), existing `packages/openclaw-policy/src/cli-handlers/doctor.ts:45`, and hapi PR-6 uses a fourth form `oc://snapshot/<id>/...` that no parser exists for.

This is the type-level keystone of the contract chain. If it doesn't compile, nothing downstream does.

**Fix**: pick one canonical path representation; reconcile against `OcPath` actual structure (probably needs a `SnapshotInternalPath` distinct type, or a string-typed convention).

### M-CTX-SNAPSHOTID-TOCTOU — `evaluate(event, ctx)` snapshot-ID workaround is wrong in multi-process / multi-tenant

| Roles | Severity | Files |
|---|---|---|
| platform-eng (M2) + gateway-eng (#1) + ciso (#5) | **CRITICAL** | policy-pre-rfc.md, realigned-story.md cross-contract concerns §3 |

Verified upstream: `PluginHookToolContext` at `C:/src/openclaw-core/src/plugins/hook-types.ts:393-401` carries `agentId, sessionKey, sessionId, runId, trace, toolName, toolCallId` — **no snapshot ID, no tenant ID**. The proposal's "policy plugin holds snapshot reference via `onSnapshotPromoted` callback wired downstream" workaround produces three concrete failures:

- (a) **TOCTOU on policy version mid-evaluate** — promoted snapshot races a tool call that started before promote landed
- (b) **Silent multi-tenant policy bleed** when one plugin instance serves multiple tenants
- (c) **Promotion-observation skew** across plugin replicas (Eduardo's split-by-domain deployment)

CISO calls this an unbounded fail-open window during policy transitions. Cannot be fixed downstream — needs upstream contract extension (`snapshotId?: string` in `ctx`).

**Fix**: this becomes the lead question for #clawtributors. Until upstream extends `PluginHookToolContext`, PolicyIR enforcement has correctness holes. The PolicyIR pre-RFC should not open until this is resolved with Peter.

### M-CANONICALIZATION-IMPLICIT — content-hash IDs without canonicalization rule

| Roles | Severity | Files |
|---|---|---|
| gateway-eng (#2) + ciso (#1) | High | snap-pre-rfc.md, policy-pre-rfc.md |

Both contracts claim "content-hash" identity without naming a canonicalization rule. Two `SnapshotStore` impls that canonicalize differently produce **divergent IDs** for the same content — breaks the snapshot-ID equality claim. Same problem with PolicyIR's `policyId`. This is also why the snap×PolicyIR conformance test couples two PRs (per realigned-story).

**Fix**: name RFC 8785 explicitly in both contracts, OR explicitly declare "Store-defined; consumers must use the same Store impl" with the trade-off documented.

### M-SIGNING-CHAIN-FICTIONAL — content-hash ≠ signing; chain of custody missing

| Roles | Severity | Files |
|---|---|---|
| ciso (#1, #2) | **CRITICAL** for production | snap-pre-rfc.md, policy-pre-rfc.md |

`SnapshotStore` contract requires no producer-side signing or consumer-side hash verification on read. A buggy or malicious Store impl can produce `(SnapshotId, content)` pairs where `hash(content) ≠ SnapshotId`. PolicyIR's `policyId = content-hash` + `generatedFrom: SnapshotId` is structural-not-cryptographic — a malicious consumer can write a doctored PolicyIR directly to `POLICY_IR_PATH` bypassing fileingest.

**Fix**: add `signature` field + producer-side signing obligation + consumer-side `verify` requirement + conformance test that mismatched hash → reject. Gateway-signed PolicyIR with cryptographic binding to snapshot.

### M-FAIL-CLOSED-UNSPECIFIED — every failure path defaults open in absence of explicit policy

| Roles | Severity | Files |
|---|---|---|
| ciso (#3) | High | all four docs |

- `snap.read` failure → consumer fails closed (block tool call) or open (proceed without policy)?
- PolicyIR missing from snapshot → fail closed (no tool calls allowed) or open (default-allow)?
- Adapter `evaluate` throws → upstream's `registerTrustedToolPolicy` runner fails closed or skips?
- Malformed Decision deserialization → ?

CISO: half the consumers will fail open. R5-fail-closed (current claws posture) silently demotes to claws-only convention.

**Fix**: explicit fail-closed sections in each pre-RFC + conformance tests asserting fail-closed behavior at every boundary.

### M-AUDIT-EMISSION-BYPASSABLE — decorator pattern is a security regression

| Roles | Severity | Files |
|---|---|---|
| ciso (#4) | High | guardrails-adapter.md, realigned-story.md |

A consumer can choose not to wrap the SnapshotStore with the audit-emitting decorator, wrap with a no-op, or be hijacked by a malicious dep. Today's `packages/openclaw-guardrails/src/audit/` is non-bypassable hash-chained. Decorator pattern regresses this.

**Fix**: contract-level audit-sink obligation, not decorator. SnapshotStore + PolicyIR conformance test verifies all writes emit audit chain entries.

### M-TRIM-ARITHMETIC-AMBIGUITY — 7,700 LoC has 700–1500 LoC double-count

| Roles | Severity | Files |
|---|---|---|
| platform-eng (M3) + repo-steward (HC-BLOCK 4) | Medium | realigned-story.md |

`claws-sdk/src/audit/` (~1,500 LoC) has three different destinations claimed across the audits (policy-generator emit, openclaw-audit package, openclaw-guardrails). Headline 7,700 LoC has 700–1500 LoC of ambiguity. Plus: realigned-story:10 says ~250-500 upstream surface, :84 table says ~380-520; helper-file size is 50 in policy-pre-rfc but 70 in realigned-story.

**Fix**: reconcile destinations; pick one number per metric and propagate.

### M-UPSTREAM-CADENCE-FANTASY — 6-10 weeks realistic, not "1-2 weeks"

| Roles | Severity | Files |
|---|---|---|
| release-eng (B2) | High (calendar honesty) | realigned-story.md |

User has signaled "1–2 weeks" repeatedly; nothing in the four docs admits the upstream chain is months not weeks. Constraints: 10-PR cap, 2-PR concurrency, 2-week LTS cadence, AI-disclosure friction, bot-reviewer trio, conformance test cross-coupling between snap and PolicyIR PRs.

**Fix**: realigned-story explicitly states 6–10 week realistic timeline for the upstream chain; sets expectations.

### M-TRIM-NO-ROLLBACK — trim wave has no rollback if upstream rejects a contract

| Roles | Severity | Files |
|---|---|---|
| release-eng (B3) | High | realigned-story.md |

If a contract changes shape mid-trim or gets rejected, no "Option B reactivates" gate, no bisect-safe commit topology. The 7,700 LoC delete is a one-way door without explicit rollback.

**Fix**: trim sequenced as parallel branches at first; cutover gated on contract-merged-upstream; explicit rollback runbook.

---

## Other findings worth knowing (Warnings + role-specific)

### Wire-parity gaps (gateway-eng)

- **ETag dropped from snap.read** — breaks LBC's dryRun/preview anchor
- **Error envelope dropped from snap** — yankee's earlier audit had `SnapshotErrorCode`; v2 dropped it
- **Decision-vocab translation discards info** — `R5_LOCKED` and `KILL_SWITCH_ACTIVE_MID_FLIGHT` both flatten to `block: true`; consumers can't reconstruct claws's 19 LBC error codes

### Operational gaps (release-eng + repo-steward)

- **Renames don't update workspace contract** — root `package.json` workspaces array, RB-repo-boundary spec, `.no-craftworks-allowlist.yaml` all need updates
- **Asymmetric rename rule** — `openclaw-snap` → `claws-snap-server`, `openclaw-policy` → `claws-policy-generator`, but `openclaw-guardrails` stays as `openclaw-*`. Justification missing.
- **Doc destination unpinned** — proposals live at `.craft/out/proposals/`; long-term home undefined
- **Internal details leak risk** — `guardrails-adapter.md` has internal package paths; `.craft/out/audits/...` paths in pre-RFC footers leak internal tooling
- **cp-5 lobster-web styles already under threshold** — pre-existing coverage debt that trim may worsen

### Security gaps (ciso, beyond fail-closed)

- **Key handling undefined** — `CLAWS_TRUST_SIGNING_KEY` ingestion, `secrecy::SecretString` + `zeroize` patterns, banned-tracing-patterns
- **Auth wiring `auth: 'gateway'` insufficient** — per-tenant isolation, per-user RBAC (read/write/capture), identity continuity across edit→validate→generate→capture flow
- **R0–R5 → `Sensitivity` rename is a contract-level regression** for non-claws consumers (correct call to remove from upstream contract; needs documented R5-lowering to denyRules in claws-policy-generator)
- **Supply chain unstated** — `cargo deny` / `npm audit`, pinned versioning, SBOM, security-team review on `@openclaw/*` bumps
- **Threat model missing** — replay attacks, race conditions, tampering at every boundary in the realigned-story flow

### Operational concerns (release-eng + platform-eng)

- **In-process assumption hidden** — realigned-story flow implies in-process; Eduardo's split-by-domain deployment could cross HTTP on the hot path
- **No `policy.compiled` SSE event** — lobster-web has no readiness signal for "PolicyIR is now active for snapshot N"
- **Cutover divergent-behavior window** — old `claws-sdk/src/snapshot/` callers and new `claws-snap-server` callers may coexist with different canonicalization
- **Rust-port R1 carry-forward** — 4 unaddressed critical findings (M-CRYPTO-MISLABEL, M-CUTOVER-ROLLBACK, RB-violation, codename discipline) plus this panel's findings don't dissolve when surface shrinks

---

## What's strong (multiple roles)

- The **architectural pivot is correct**: ~1665 LoC daemon → ~250–500 LoC contracts is the right call (release-eng)
- The **0-LoC-guardrails finding is real** (bandit was right; verified upstream)
- The **trim is directionally correct** (eliminates ~7,700 LoC of parallel implementation)
- "What's NOT in the contract" sections in each pre-RFC follow Peter's house style
- Bandit's adapter design is closest to dispatch-ready (smallest delta)
- Cross-contract concerns subsection honestly flags 4 operational risks (weaver did good work)
- Codename-leak audit clean: `craftworks` and `bic` zero-occurrence in proposal docs (repo-steward verified)

---

## Recommended path forward

This is **not a small fix-pass**. The findings span:
- Type-level errors (OcPath, POLICY_IR_PATH)
- Architectural correctness (TOCTOU, canonicalization, signing)
- Coordination gaps (hapi worktree desync, doc destination)
- Calendar honesty (timeline math)
- Security baseline (fail-closed, audit, key handling, threat model)

A real revision pass is half a day to a day of focused work — not an "evening polish" task. Plus several items (M-HAPI-COLLISION, M-CTX-SNAPSHOTID-TOCTOU) require **decisions**, not just edits:

1. **Hapi coordination** — go amend hapi wave or treat v2 proposal as a different wave?
2. **`ctx.snapshotId`** — propose upstream extension to Peter (the lead #clawtributors question), or restructure PolicyIR to not need it?
3. **Canonicalization** — RFC 8785 (correctness) vs Store-defined (flexibility)?
4. **Signing model** — gateway-signed PolicyIR (introduces gateway as signer) vs Store-signed (delegated trust)?

These are user-judgment calls, not agent-automatable.

### Three-phase remediation

**Phase A — User decisions** (you read the consolidated + role files; make calls on the 4 above)
**Phase B — Scoped fix-pass** (1 agent, ~3–4 hours, against your decisions)
**Phase C — R2 review** (same 5-role panel, verify fixes)

Total: probably a half-day session tomorrow with rest in between. Not a tonight task.

### What I would NOT do tonight

- Dispatch another agent to "fix all findings" — too many decisions are user-owned
- Open any pre-RFC to channel — multiple reviewers explicitly say no
- Apply patches piecemeal — risk creating partial-fix internal inconsistency

### What I would suggest tonight

- Read the 5 role review files at `.craft/out/panels/v2-proposal/R1-claws-*.md`
- Sleep on the 4 decision points
- Pick up Phase B+C tomorrow with fresh eyes

The architecture is right. The work needed is real but bounded.

---

## Files

- `.craft/out/panels/v2-proposal/R1-claws-platform-eng.md`
- `.craft/out/panels/v2-proposal/R1-claws-gateway-eng.md`
- `.craft/out/panels/v2-proposal/R1-claws-ciso.md`
- `.craft/out/panels/v2-proposal/R1-claws-claws-repo-steward.md`
- `.craft/out/panels/v2-proposal/R1-claws-claws-release-eng.md`
- `.craft/out/panels/v2-proposal/R1-consolidated.md` (this file)
