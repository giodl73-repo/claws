# R2 Dragon Review -- CL-10: CAP Integration & Serve API

**Reviewer**: craft/dragon (invariant rigor > feature velocity)
**Review type**: spec (verification round)
**Round**: 2
**Date**: 2026-04-15
**Scope**: Verify resolution of R1 findings (5 Major, 5 Warning, 4 Note). Targeted checks on write-time validation atomicity, R5 bypass paths, "Allow all" scope, trust escalation authorization, PATCH audit, and compilation cache integrity.

---

## R1 Finding Disposition

### Major Findings

| R1 ID | R1 Finding | R2 Status | Evidence |
|-------|-----------|-----------|----------|
| M-01 | `locked` field on R5 tools has no enforcement mechanism -- no validation contract, no error response schema, no rejection rule mapping | **RESOLVED** | The spec now defines a `FieldEditability` type with a `lock` descriptor carrying `source: 'r5' \| 'fleet' \| 'governance' \| 'none'` (lines 600-613). The server rejects PATCH edits to locked fields with typed error responses `R5_NON_NEGOTIABLE` or `FLEET_LOCK_VIOLATION` (line 622). The `PatchError` union (lines 579-587) provides the missing error contract. The `PatchResult` discriminated union (lines 575-577) gives partners a clear success/failure branch. This fully addresses the concern. |
| M-02 | Governance validation gap -- temporal window between OC file write and recompilation allows durable invalid state | **RESOLVED** | The write-time validation layer (lines 544-566) now explicitly runs validation BEFORE writing. Steps 2-5 are declared **atomic** (lines 568-570): "if validation fails, nothing is written. If write succeeds but compile fails, the write is rolled back. No temporal window where the workspace is in a governance-violating state." This is the correct design. The validate-before-write with rollback-on-compile-failure eliminates the temporal window I flagged. |
| M-03 | `pre_authorizations: all` has undefined relationship to R5 gating | **RESOLVED** | The spec adds a dedicated "Allow All Scope" section (lines 625-636) that explicitly states: "R5 tools are explicitly excluded." The PATCH handler sets `pre_authorizations` for R1-R4 tools only, returns R5 tools as `still_gated` in the response, and the updated chunk continues to show R5 tools as locked. The `R5_EXCLUDED_FROM_ALLOW_ALL` error type (line 583) provides a specific rejection if someone attempts to circumvent this through a raw PATCH. This is exactly the fix I requested. |
| M-04 | Fleet policy bypass via PATCH -- no fleet-awareness in write path | **RESOLVED** | The `lock.source` field distinguishes `'fleet'` from `'r5'` and `'governance'` (lines 608-619). PATCH rejects edits to fleet-locked fields with `FLEET_LOCK_VIOLATION` (line 581). The write-time validation pipeline explicitly checks fleet locks at step 2 (line 553). The connections chunk example still uses `riskLevel`/`riskLabel` raw fields in the `governance` context (lines 821-822) rather than a structured `RiskClassification`, but the lock enforcement itself is sound. |
| M-05 | Trust escalation has no authorization or manager approval gate | **PARTIALLY RESOLVED** | The `PatchError` union now includes `TRUST_REQUIRES_APPROVAL` (line 586) and `AUTHORIZATION_REQUIRED` (line 587). Phase 3 item 11 says "manager-approved promotion" (line 1066). However, the trust escalation API still has no request schema, no definition of what a "manager approval token" looks like, no async approval workflow, and no specification of how `managerApproved: false` (line 209) transitions to `true`. The error type exists but the authorization mechanism does not. See NEW-W1 below. |

### Warning Findings

| R1 ID | R1 Finding | R2 Status | Evidence |
|-------|-----------|-----------|----------|
| W-01 | Lossless principle tension -- PATCH makes claws a file author, not just compiler | **PARTIALLY RESOLVED** | The spec describes "lossless edit to OC file (preserves formatting, frontmatter, comments)" at step 4 (line 557). The Chunk format description (lines 739-742) says "editability for array items is embedded per-item" and "no JSONPath-like query syntax." This implicitly defines claws's authoring role as structured section-level edits. However, there is still no explicit reconciliation with the core claws principle ("NEVER modifies original OC workspace files"). The spec should include a paragraph acknowledging this role expansion and defining "lossless" in the write context. The tension is reduced but not documented. |
| W-02 | Loop sync deny-rule removal is post-hoc warning, not pre-gated | **PARTIALLY RESOLVED** | The write-time validation layer includes "Deny rules: warn on removal, require confirmation" at step 2 (line 555). This is the right intent -- deny rule removal is a gated operation requiring confirmation. However, the Loop sync section (lines 231-234) still says "claws recompiles and surfaces a governance warning" with no mention of gating or confirmation. And `PATCH /api/loop/soul` (lines 263-269) still shows the ungated pattern: "writes SOUL.md -> triggers claws build -> returns governance result." The validation layer description and the Loop sync description contradict each other. If Loop PATCH goes through the same validation layer, say so explicitly. If it does not, the Loop path is still an R5-adjacent bypass. See NEW-W2. |
| W-03 | POST /api/onboard has no content validation | **UNRESOLVED** | The onboard API (lines 141, 352, 1076-1077) is unchanged from R1. It still says "seed files from conversation" with no schema, validation, sanitization, or governance constraint. The `PatchError` union covers chunk PATCH but not POST /api/onboard. This endpoint writes SOUL.md -- the file that defines behavioral boundaries -- from an unvalidated transcript. The write-time validation layer is defined for `PATCH /api/chunks/{tab}/{section}` only. POST /api/onboard is a separate write path that bypasses it entirely. |
| W-04 | Audit trail deferred to Phase 2 while write endpoints span Phases 2-5 | **PARTIALLY RESOLVED** | The write-time validation layer includes "Audit: emit audit event via @openclaw/audit-chain" as step 6 (line 559). Phase 2 item 7 says "every PATCH produces an audit event" (line 1054). Since all PATCH endpoints (including Loop sync in Phase 3, trust escalation in Phase 3) now go through the same validation layer, audit is structurally guaranteed for all PATCH operations. However, POST /api/onboard (Phase 5) and POST /api/skills/install (Phase 4) are non-PATCH write endpoints that do not go through the validation layer. Audit coverage for non-PATCH writes is unspecified. |
| W-05 | Work queue has no integrity model | **UNRESOLVED** | The work queue section (lines 155-183) is unchanged from R1. Still no answer to: (a) can a user remove a manager-assigned task silently? (b) are task state transitions validated? (c) is there an audit trail for task mutations? The work queue bridges governance (HEARTBEAT.md schedules) with runtime state -- if it becomes a WORKQUEUE.md file, it enters the PATCH surface and inherits the validation layer; if it stays runtime-only, the data source and integrity model are unspecified. The spec still says "WORKQUEUE.md or a runtime-only concept" -- the decision is unmade. |

### Note Findings

| R1 ID | R1 Finding | R2 Status |
|-------|-----------|-----------|
| N-01 | R5 enforcement at ProviderRegistry is sound | **ACKNOWLEDGED** -- still true, and the authoring-time enforcement now matches via the write-time validation layer |
| N-02 | Chunk API abstraction is well-designed | **ACKNOWLEDGED** -- improved by the `lock` descriptor with `source` field. The generic constraint `Chunk<K extends ChunkTab>` (line 706) addresses the type-system reviewer's `Chunk<T = unknown>` concern |
| N-03 | Phase ordering correctly sequences risk | **ACKNOWLEDGED** -- still valid |
| N-04 | SSE events provide observability | **ACKNOWLEDGED** -- still valid. The gap (warnings are informational, not blocking) is now partially addressed by the write-time validation layer doing pre-write gating |

---

## R2 Targeted Checks

### Check 1: Is the write-time validation layer truly atomic (validate -> write -> compile)?

**PASS with caveat.** The spec states steps 2-5 are atomic (lines 568-570) and defines the rollback contract: "If write succeeds but compile fails, the write is rolled back." This is the correct transactional model. The caveat: the spec does not define the rollback mechanism. On a file system, "rollback" means either (a) write to a temp file and rename on success, or (b) keep a copy before writing and restore on failure. The spec should specify which strategy, because a naive write-then-rollback has a crash window between write and rollback. Implementation guidance should say "write to staging, promote on success" (write-ahead) rather than "write, then undo on failure" (write-behind). This is an implementation detail, not a spec blocker, but it matters for the crash-safety claim.

### Check 2: Can R5 still be bypassed through ANY path?

**Three paths evaluated:**

| Path | R5 Protected? | Evidence |
|------|--------------|----------|
| PATCH /api/chunks/{tab}/{section} | **YES** | Write-time validation rejects R5 disable-approval edits (line 552). `lock.source: 'r5'` is never unlockable (line 616). `R5_NON_NEGOTIABLE` error type (line 580). |
| PATCH /api/loop/soul | **UNCLEAR** | Loop sync description (lines 263-269) shows a direct write-then-recompile pattern with no mention of the write-time validation layer. If deny rules in SOUL.md gate R5 tools ("Never send email without approval"), removing them via Loop is an R5-adjacent bypass. The validation layer says "deny rules: warn on removal, require confirmation" (line 555) but the Loop section does not reference this layer. |
| POST /api/onboard | **NO** | Writes SOUL.md from an unvalidated transcript. No validation layer, no governance check, no R5 enforcement. If the transcript seeds a SOUL.md without R5-protective deny rules, the governance surface is weaker. This is not a direct R5 bypass (the ProviderRegistry still forces R5 gating at runtime), but it is a governance policy bypass -- the agent's SOUL.md will lack the deny rules that the admin intended. |

**Verdict**: PATCH path is properly guarded. Loop and onboard paths need explicit statements that they go through the same validation layer (or equivalent).

### Check 3: Is "Allow all" properly scoped to R1-R4?

**PASS.** Lines 625-636 are unambiguous: "R5 tools are explicitly excluded." The PATCH handler sets `pre_authorizations` for R1-R4 only, returns R5 tools as `still_gated`, and the `R5_EXCLUDED_FROM_ALLOW_ALL` error type (line 583) catches any direct attempt. The dedicated endpoint `PATCH /api/chunks/connections/allow-all` with its explicit response format (line 634-635) makes the scoping concrete and testable.

### Check 4: Does trust escalation require manager approval now?

**PARTIAL.** The error type `TRUST_REQUIRES_APPROVAL` exists (line 586). Phase 3 item 11 says "manager-approved promotion" (line 1066). The GET /api/trust response shows `managerApproved: false` in `nextEscalation.requirements` (line 209). But PATCH /api/trust/escalate still has no request schema. The spec does not define:
- What the PATCH request body contains (a manager approval token? a signed assertion? just `{ "tier": "T3" }`?)
- How `managerApproved` transitions from `false` to `true` (does the manager call a separate endpoint? does the admin submit proof?)
- Whether escalation is a direct mutation or an async request
- What authorization the caller needs (any Companion App user? only the `delegation.owner`? only the manager?)

The error type is the rejection mechanism, but the approval mechanism is absent. An implementer would have to invent the entire authorization flow.

### Check 5: Are PATCH operations audited?

**YES for chunk PATCH. UNCLEAR for non-PATCH writes.** Step 6 of the validation layer (line 559) emits an audit event for every PATCH. Since all chunk edits go through this layer, audit coverage is structurally guaranteed. However:
- POST /api/onboard -- no audit mention
- POST /api/skills/install -- no audit mention
- PATCH /api/trust/escalate -- goes through validation layer (has `TRUST_REQUIRES_APPROVAL` error), so presumably audited, but not explicitly stated

The audit event schema is also unspecified. @openclaw/audit-chain is referenced but the event payload (who, what, when, before/after state) is not defined.

### Check 6: Is the compilation forest cache tamper-resistant?

**NOT ADDRESSED.** The per-phase cache (lines 954-971) and cache location (lines 1020-1028) define the caching mechanism but include no integrity model. The cache files (`phase-cache.json`, per-phase output files) are stored in `.claws/cache/` alongside the workspace. Concerns:
- Cache files are writable by anyone with workspace access. A tampered `analyze/` cache could cause the server to skip governance analysis and serve stale governance data.
- The `hashContent()` function verifies that inputs match cached outputs, but if both the cache AND the source file are tampered simultaneously, the hash will match the tampered input and the tampered governance output persists.
- The cache has no signature or MAC. It is purely a performance optimization with no integrity guarantee.

This is not a critical vulnerability because the cache is a local performance optimization (not a trust boundary), and the ultimate enforcement is at the ProviderRegistry at runtime. But for a server that serves governance data to three UX surfaces, a tampered cache would cause all three surfaces to display incorrect governance state until a full recompile is triggered. The spec should note that the cache is a performance layer, not a trust layer, and that a full recompile (`claws build --no-cache`) is the recovery mechanism.

---

## New Findings (R2)

### Warning (W)

| ID | Section | Finding |
|----|---------|---------|
| NEW-W1 | Trust escalation -- authorization mechanism absent | The `TRUST_REQUIRES_APPROVAL` error type (line 586) and "manager-approved promotion" phrase (line 1066) establish the intent but not the mechanism. PATCH /api/trust/escalate has no request schema, no authorization model, and no specification of how manager approval is obtained or verified. This is the only PATCH endpoint that involves an external approval chain (the manager is a human outside the API), and the spec treats it the same as a data PATCH. It needs either: (a) a two-phase flow -- POST /api/trust/escalation-request creates a pending request, manager approves via a separate endpoint or out-of-band mechanism, PATCH /api/trust/escalate consumes the approval -- or (b) a signed token model where the PATCH body includes proof of manager approval. Without this, the error type is a gate with no key. |
| NEW-W2 | Loop sync does not reference write-time validation layer | The Loop sync description (lines 263-269) shows `PATCH /api/loop/soul` writing SOUL.md directly then triggering claws build. The write-time validation layer (lines 544-566) is defined for `PATCH /api/chunks/{tab}/{section}`. Are Loop PATCH endpoints routed through the same validation layer? The spec should state one of: (a) Loop PATCH endpoints are aliases for chunk PATCH and inherit all validation, or (b) Loop PATCH endpoints have their own validation layer. Without this statement, the Loop path is architecturally disconnected from the governance enforcement that the chunk path provides. The "deny rules: warn on removal, require confirmation" in the validation layer (line 555) is exactly what Loop sync needs, but Loop sync does not reference it. |
| NEW-W3 | Connections chunk `editable` still uses JSONPath-like keys | The key design decision (lines 739-742) says "editability for array items is embedded per-item in data -- each tool carries its own `lock` field. No JSONPath-like query syntax." But the connections chunk example (lines 816-819) still uses `tools[*].enabled` and `tools[send-email].enabled` in the `editable` record. These ARE JSONPath-like keys. The design decision and the example contradict each other. If per-item lock is the canonical approach, the connections chunk example needs to move the lock into each tool item (like the `FieldEditability.lock` descriptor does for flat fields) and drop the `tools[*]` keys from `editable`. This was CONSENSUS-M3 from R1 -- the type definition was fixed but the example was not updated. |

### Note (N)

| ID | Section | Finding |
|----|---------|---------|
| NEW-N1 | `ChunkData` type is undefined | The `Chunk` interface (line 714) uses `data: ChunkData` but `ChunkData` is never defined. This should be a discriminated union keyed by `ChunkTab` so that `Chunk<'connections'>` has typed tool arrays and `Chunk<'general'>` has typed identity fields. Currently it is an opaque reference. |
| NEW-N2 | `GovernanceResult.cacheHit` exposes internal state | The `GovernanceResult` type (line 594) includes `cacheHit: boolean` and `durationMs: number`. These are useful for debugging but expose compilation internals to partners. Consider whether these belong in the partner-facing response or should be relegated to a debug/admin response variant. |

---

## Lens Comparison: R1 vs R2

| Check | R1 Status | R2 Status | Delta |
|-------|-----------|-----------|-------|
| R5 invariant preserved through all write paths? | **FAIL** | **PASS (chunk), UNCLEAR (Loop, onboard)** | Chunk PATCH is now fully guarded. Two non-chunk write paths need explicit validation layer routing. |
| `locked` fields server-enforced, not UX hints? | **FAIL** | **PASS** | `FieldEditability.lock` with `source` discriminant and typed error responses. Enforcement mechanism is specified. |
| `pre_authorizations: all` cannot bypass R5? | **FAIL** | **PASS** | Explicitly scoped to R1-R4. Dedicated endpoint, `still_gated` response, `R5_EXCLUDED_FROM_ALLOW_ALL` error. |
| Fleet policy overrides cannot be bypassed by PATCH? | **FAIL** | **PASS** | `lock.source: 'fleet'` + `FLEET_LOCK_VIOLATION` error. Write-time validation checks fleet locks. |
| Trust escalation requires authorization? | **FAIL** | **PARTIAL** | Error type exists (`TRUST_REQUIRES_APPROVAL`). Authorization mechanism absent. No request schema, no approval flow. |
| Lossless principle upheld? | **WARN** | **WARN** | "Lossless edit" described at step 4. Role expansion (compiler -> author) still not explicitly documented. |
| Deny rule removal is a gated operation? | **WARN** | **PARTIAL** | Validation layer says "require confirmation" (line 555). Loop sync section does not reference this gate. Contradictory descriptions. |
| Onboard content is validated before write? | **WARN** | **WARN** | Unchanged. POST /api/onboard has no validation. |
| All write paths have audit trail? | **WARN** | **PARTIAL** | Chunk PATCH audited via validation layer step 6. Non-PATCH writes (onboard, skill install) unspecified. |
| Error paths exhaustive? | **WARN** | **PASS** | `PatchError` union with 8 typed errors. `PatchResult` discriminated union. `GovernanceResult` with warnings/errors. |
| Chunk `editable` key syntax consistent? | N/A (from consolidated) | **FAIL** | Type definition says per-item locks, example uses JSONPath keys. Contradiction. |

---

## Summary

The spec has materially improved. The five consensus Major findings from R1 are addressed:

1. **Write-time validation layer** (CONSENSUS-M1): Added with a 7-step pipeline, atomic semantics, and rollback on compile failure. This is the single most important addition -- it closes the authoring-time enforcement gap.
2. **Single write surface** (CONSENSUS-M2): `/api/workspace/:file` is removed. Chunks are the sole write API.
3. **`editable` key syntax** (CONSENSUS-M3): Type definition fixed (per-item locks, no JSONPath). But the connections chunk example still uses `tools[*].enabled` keys -- the example contradicts the design decision.
4. **Fleet lock enforcement** (CONSENSUS-M4): `lock.source: 'fleet'` + `FLEET_LOCK_VIOLATION` error.
5. **"Allow all" vs R5** (CONSENSUS-M5): Explicitly scoped to R1-R4 with dedicated endpoint.

**Remaining gaps** (3 Warnings, 2 Notes):

- Trust escalation has an error type but no authorization mechanism (NEW-W1)
- Loop sync is architecturally disconnected from the write-time validation layer (NEW-W2)
- The connections chunk example contradicts the per-item lock design decision (NEW-W3)
- POST /api/onboard and POST /api/skills/install bypass the validation layer entirely (W-03 persists)
- Work queue integrity model is still unspecified (W-05 persists)

**Verdict**: The spec is ready for Phase 1 (read APIs) and Phase 2 (chunk PATCH) implementation. The remaining gaps are concentrated in Phase 3 (Loop sync, trust escalation) and Phase 5 (onboard), which have time to be resolved before implementation reaches them. I recommend fixing NEW-W3 (example/design contradiction) now since it affects the Phase 1 Chunk GET response format that partners will build against.

**R1 resolution rate**: 5/5 Major addressed (4 resolved, 1 partial). 5/5 Warning addressed (0 fully resolved, 3 partial, 2 unresolved). Overall: strong improvement on the core write-path safety concerns, with cleanup needed on secondary write paths (Loop, onboard) and the trust escalation authorization model.
