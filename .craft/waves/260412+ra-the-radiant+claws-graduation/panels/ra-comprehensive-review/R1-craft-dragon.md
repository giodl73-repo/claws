---
role: craft:dragon
round: 1
scope: ra-comprehensive-review
tension: "Invariant rigor > feature velocity"
cluster: A
date: 2026-04-16
specs_reviewed: [CL-10, CL-11]
pulses_reviewed: [06, 30, 33, 35, 39, 43, 60, 63, 65, 68, 70]
scenarios_reviewed:
  - fail-mode/S01 (R5 fail-open rejected)
  - obo-elicitation/S07 (signed approval token forgery)
  - cross-file-conflicts/S07 (schedule-no-approval / cron unattended)
  - cap-integration-v1/S03 (R5 PATCH rejection)
  - cap-integration-v1/S21 (boundary removal violation)
  - cap-integration-v1/S25 (skill install R5 tools)
  - cap-integration-v1/S33 (external edit bypass)
finding_count: 13
---

# R1 craft/dragon -- Ra Comprehensive Review

**Tension**: Invariant rigor > feature velocity (Cluster A)

**Review focus**: R5 invariant chain across all 3 API layers, all write paths, all session types, and historical reads (time-travel). Session model bypass paths. Validation layer coverage completeness.

---

## F01 -- TIME-TRAVEL READS SERVE UNPROTECTED HISTORICAL STATE

**Severity**: CRITICAL
**Spec**: CL-10 (Time-Travel API, lines 1486-1555)
**Pulse**: 70 (time-travel-api)

The `?at=` parameter on Layer 1 GET endpoints returns historical GovernanceIR snapshots. If a tool was classified R1 at version 38 but later reclassified to R5 at version 42, `GET /api/oc/TOOLS.md#Tools/send-email?at=v38` returns the old R1 classification. This is by design for audit correlation. However, the spec does not address what happens when a consumer ACTS on this historical state.

If the time-travel response is consumed by a caching partner or a retry loop that feeds it back into a session's tool resolver, the agent could see R1 classification for a tool that is currently R5. The historical response does not carry a `historical: true` flag or a `currentRiskLevel` field that forces consumers to acknowledge the difference. The version store serves the old GovernanceIR as-is.

Pulse 70 has zero scenario codes (`scenario_codes: []`) and zero L3 acceptance tests. There is no scenario that tests: "read historical state where R5 was not yet classified, attempt to use that information to bypass current governance." The time-travel API is a read-only surface, but its output feeds into decision-making surfaces that are not read-only.

**Required**: (1) Time-travel responses MUST include an `X-Governance-Historical: true` header AND a `currentVersion` field in the response body showing the live version. (2) The session tool resolver MUST reject governance data from historical versions -- only current GovernanceIR feeds tool authorization. (3) Add a scenario: "consumer attempts to use time-travel R1 classification to bypass current R5 enforcement."

---

## F02 -- SESSION CONFIG EDITS TO AGENTS.MD CAN WIDEN DELEGATED TOOL SETS BEYOND DELEGATOR'S PERMISSIONS

**Severity**: CRITICAL
**Spec**: CL-10 (Session Model, lines 283-333; Session Config Edit)
**Pulse**: 65 (session-config-edit)

Pulse 65 states that agent sessions have "tool subset constrained by delegating session's trust tier." The SessionConfigEditor writes to AGENTS.md for agent sessions. However, the validation layer (pulse 30) validates against GovernanceIR for R5/fleet/governance rules -- it does NOT validate that the delegated agent's tool set remains a subset of the delegating session's tool set.

Consider: main session has tools {A(R1), B(R3), C(R5)}. Agent session "scout" is delegated with {A, B}. An admin PATCHes `/api/sessions/agent:scout/config` to add tool D(R2) which the main session does NOT have. The R5 validator passes (D is R2). The fleet validator passes (D is not fleet-locked). The governance validator passes (no deny rules for D). The write succeeds. Agent "scout" now has a tool its delegator does not.

Pulse 65's unit tests include "add R5 tool to cron = rejected" and "fleet-locked tool rejection" but no test for "add tool not in delegator's tool set = rejected." The session-tool-resolver in pulse 60 computes permissions but it is read-path only -- it does not gate writes.

**Required**: The ValidationPipeline must include a delegation-scope validator that checks: for agent session config edits, every tool in the resulting tool set must exist in the delegating session's resolved tool set. Missing this creates a privilege escalation path from delegated agents.

---

## F03 -- CRON SESSION R3+ PRE-AUTHORIZATION IN HEARTBEAT.MD BYPASSES PER-INVOCATION APPROVAL

**Severity**: HIGH
**Spec**: CL-10 (Unattended session approval policy C-1, line 518)
**Pulse**: 60 (session-types), 65 (session-config-edit)
**Scenario**: cross-file-conflicts/S07 (schedule-no-approval)

CL-10 line 518 states: "if a gated tool (R3+) triggers `requiresExternalApproval: true` in an unattended session, the timeout `failMode` is forced to `'deny'` regardless of configuration." This is the runtime enforcement.

However, pulse 60 states: "Cron session default tool allowlist: R1-R2 only. R3+ tools require explicit session-level pre-authorization in HEARTBEAT.md." This means an admin can write a pre-authorization for an R3 tool in HEARTBEAT.md, which the session config editor (pulse 65) validates and accepts. Once pre-authorized, the R3 tool executes in the cron session without human approval at runtime.

The gap: pre-authorization in HEARTBEAT.md for R3-R4 tools in cron sessions effectively converts per-invocation approval to standing approval. Scenario S07 (cross-file-conflicts) identifies this exact issue for R5 tools but the resolution only covers R5. For R3-R4, the pre-auth quietly removes the approval gate in unattended contexts. The CL-10 C-1 constraint ("failMode forced to deny") is bypassed because pre-authorization means the approval gate never fires.

**Required**: (1) Cron session pre-authorization for R3-R4 tools must produce a governance warning at compile time: "Standing approval for R3+ tools in unattended sessions removes per-invocation human oversight." (2) The audit trail must record every pre-authorized R3+ execution in a cron session with a distinct event type so SOC review can assess the standing approval's appropriateness.

---

## F04 -- VALIDATION LAYER SHORT-CIRCUITS ON FIRST FAILURE -- MASKS CONCURRENT VIOLATIONS

**Severity**: HIGH
**Spec**: CL-10 (Write-Time Validation Layer, lines 853-905)
**Pulse**: 30 (validation-layer)

Pulse 30 explicitly states: "Pipeline short-circuits on first failure -- no unnecessary validators run." This means if R5 validation fails, fleet and governance validators never execute. If a PATCH targets an R5 tool that is ALSO fleet-locked AND violates a governance deny rule, the response only reports `R5_LOCKED`. The partner never learns about the fleet lock or governance violation.

This is a problem for the partner UX. If the admin interprets "R5_LOCKED" as "my fleet admin locked this" and contacts the fleet admin for an override, they will find the fleet admin did not lock it -- it is R5 non-negotiable. Meanwhile, the governance deny rule violation goes unreported.

More critically for invariant defense: if the R5 validator has a bug that returns pass for a specific edge case (e.g., tool exists in TOOLS.md but not in GovernanceIR -- see S03 finding F02), the governance validator would have caught the deny rule violation, but it never runs because R5 passed.

**Required**: The validation pipeline should collect ALL violations across ALL validators before returning. Short-circuit optimization is a performance concern; defense-in-depth requires exhaustive validation. Return the full violation set ranked by severity.

---

## F05 -- BATCH EDITS CAN COMBINE ACTIONS THAT INDIVIDUALLY PASS BUT JOINTLY VIOLATE GOVERNANCE

**Severity**: HIGH
**Spec**: CL-10 (Batch Edits, lines 1417-1457)
**Pulse**: 68 (batch-edits)

CL-10 line 1417 states batch edits catch "cross-field conflicts (e.g., enabling a tool AND removing its deny rule simultaneously)." However, pulse 68's batch-executor validates each operation independently through the ValidationPipeline, then applies all atomically with one recompilation.

The validation happens against the CURRENT GovernanceIR, not the GovernanceIR that would result from the combined operations. Operation 1 enables tool X (R3, passes validation). Operation 2 removes the deny rule covering tool X from SOUL.md (passes validation because the deny rule is user-authored and allowed with warning). Both pass individually. But the combined effect -- enabled R3 tool with no deny rule constraint -- may create a governance posture the admin did not intend.

The recompilation after the batch would surface this as a warning, but the batch already committed the writes before recompilation. If recompilation fails, the rollback path is triggered, but governance WARNINGS (not errors) do not trigger rollback -- only compilation ERRORS do.

**Required**: The batch executor must validate against a PROJECTED GovernanceIR that includes the cumulative effect of all operations in the batch, not the current GovernanceIR applied to each operation independently. Alternatively, run a dry-run recompilation on the combined edit set before writing any files.

---

## F06 -- ONBOARD API GENERATES SOUL.MD WITH DEFAULT DENY RULES BUT DOES NOT ROUTE THROUGH VALIDATION LAYER FOR THE INITIAL WRITE

**Severity**: HIGH
**Spec**: CL-10 (Onboard Content Validation, lines 1797-1808; Write Path Architecture, lines 1731-1748)
**Pulse**: 43 (onboard-api)

CL-10 line 1731 states: "All write paths route through the same validation layer. No bypass." The diagram shows `POST /api/onboard` in the list. However, POST /api/onboard creates NEW files (SOUL.md + MEMORY.md) in a workspace that may not have these files yet. The write-time validation layer (pulse 30) validates edits against COMPILED GovernanceIR. At onboard time, there is no GovernanceIR -- the workspace is empty. The first compilation happens AFTER the onboard writes.

Pulse 43 states: "Content validation runs on BOTH the input transcript AND the generated SOUL.md/MEMORY.md output before writing." But this is the onboard-validator (secret scanning, size limits, injection defense) -- not the write-time governance validation layer. The R5/fleet/governance validators in the validation pipeline cannot operate without a compiled GovernanceIR.

This creates a bootstrap gap: the first write to the workspace bypasses governance validation because there is nothing to validate against. If the onboard API generates SOUL.md with tools pre-declared and a claws.json already exists with fleet policy, the fleet-lock validator should enforce fleet locks on the generated content -- but it cannot because the GovernanceIR does not yet exist.

**Required**: (1) The onboard flow must be: generate files -> write files -> compile -> validate compiled output against fleet policy -> if fleet violations exist, delete the generated files and return error. The validation happens POST-compile, not pre-write. (2) Document this as an intentional deviation from the "all writes through validation" invariant, with the compensating control being immediate post-write compilation + fleet validation.

---

## F07 -- LOOP SYNC WRITE PATH AND CHUNK PATCH USE DIFFERENT ENDPOINTS BUT SAME VALIDATION -- YET LOOP ACCEPTS PARTIAL REJECT WHILE CHUNKS DO NOT

**Severity**: HIGH
**Spec**: CL-10 (Unified Validation, lines 1731-1748; Loop Sync, lines 237-281)
**Scenario**: cap-integration-v1/S21 (boundary removal violation)

Scenario S21 describes a "partial_reject" status for Loop edits: R5-injected deny rules are preserved while user-authored rules are removed. The result is `status: "partial_reject"`. This is semantically different from the chunk PATCH model where the validation pipeline returns pass or fail -- no partial state.

The validation pipeline (pulse 30) is designed as a binary gate: pass or reject. The partial_reject behavior described in S21 requires a different control flow: parse the edit, identify the R5-protected portions, strip them from the edit, apply the remaining edit, and return a response indicating what was kept and what was applied. This is not a validation decision -- it is an edit transformation.

Pulse 35 (loop-soul-sync) states "PATCH rejected for locked section" as an L1 test, implying full rejection for locked content. But S21 expects partial rejection (R5 rules kept, user rules removed). These are contradictory. If the validation layer fully rejects any edit touching locked content, the Loop user cannot remove ANY text from a section that contains a single R5 deny rule.

**Required**: Define a clear semantics for partial-reject. Either: (a) The edit is transformed to exclude R5-protected spans and applied as modified (requires edit-transformation logic, not just validation), OR (b) The edit is fully rejected with a response indicating which spans are protected, and the client must resubmit without the protected spans. Do not leave two contradictory behaviors across pulses.

---

## F08 -- MISSING SCENARIO: SESSION TYPE TRANSITION DURING ACTIVE GOVERNANCE

**Severity**: HIGH
**Spec**: CL-10 (Session Model, lines 283-333)
**Pulse**: 60 (session-types)

Pulse 60 states: "SessionType is server-assigned at creation, immutable." This is good -- no session can change type at runtime. However, the spec does not address what happens when the OC runtime re-creates a session with a different type assignment.

Consider: cron session "daily-triage" runs with R1-R2 tools (restricted cron allowlist). The admin removes the cron schedule from HEARTBEAT.md and creates a manual trigger for the same workflow. The OC runtime creates a new "main" session for the same workflow. The main session gets the full workspace tool set (including R5 tools). The workflow that was constrained to R1-R2 in the cron context now has R5 access in the main context.

There is no scenario in the Ra wave's 35 cap-integration scenarios or 20 pitfall-coverage scenarios that tests: "workflow moves from cron session to main session and gains elevated tool access." The session model protects individual sessions, but the workflow-to-session mapping is outside claws's control.

**Required**: Add a scenario: "Workflow X runs in cron session with R1-R2 tools. Same workflow runs in main session. Verify governance artifacts (audit trail, approval events) distinguish between the two execution contexts and that the expanded tool set in main is explicitly acknowledged."

---

## F09 -- SKILL INSTALL QUARANTINE WINDOW BETWEEN INSTALL AND CAPABILITY EXTRACTION

**Severity**: HIGH
**Spec**: CL-10 (Skills Store)
**Scenario**: cap-integration-v1/S25 (skill install R5 tools)

S25 finding F09 identifies the quarantine gap: between skill install (files written to skills/) and capability extraction completion, the declared risk (potentially false) is the only classification. S25 finding F01 mandates extraction-authoritative-over-declaration. But the extraction is part of the synchronous recompilation (S25 F02), which runs AFTER the files are written.

During the recompilation phase, the GovernanceIR temporarily reflects the declared risk. If recompilation takes >0ms (and it will -- pulse 32 targets ~40ms for incremental), there is a window where GET /api/chunks/connections returns tools with declared-but-unverified risk levels. For an R5 tool declared as R1, this window allows the tool to appear unlocked in the partner UI.

Pulse 40 (skills-store) depends on pulse 30 (validation) but the validation pipeline validates the install operation, not the tool risk levels. Tool risk levels are determined by compilation, which runs after validation.

**Required**: (1) Tools from newly installed skills must be served with `classification: 'pending'` (not the declared risk) until the first compilation after install completes. (2) Pending-classified tools must be treated as R5 (fail-closed for unclassified per CL-11 fail-mode table: "Unknown / Missing / Invalid -> fail-closed -> treat as R5"). (3) The install response must not return until compilation AND extraction are complete -- no early response with declared-risk data.

---

## F10 -- ALLOW-ALL HANDLER DOES NOT RE-EVALUATE AFTER COMPILATION

**Severity**: MEDIUM
**Spec**: CL-10 (Allow-All Scope, lines 935-945)
**Pulse**: 33 (allow-all)

The allow-all handler enables all non-R5 tools in a single batch. The response includes a summary of enabled/skipped tools. However, the R5 determination is based on the GovernanceIR at the time of the request. After the allow-all writes and triggers recompilation, the new GovernanceIR might reclassify a tool from R4 to R5 (e.g., because enabling the tool triggered a cross-file analysis that detected OBO capability).

The allow-all response says "tool X enabled" but the post-recompilation state has tool X as R5-locked. The partner UI shows success, but the next GET /api/chunks shows tool X locked. The user sees a flash of "enabled" followed by "locked" with no explanation.

**Required**: The allow-all response must be computed AFTER recompilation, not before. If recompilation changes any tool's risk classification, the response must reflect the post-recompilation state. Any tools that were enabled but then reclassified to R5 must appear in a `retroactively_locked` array in the response with explanation.

---

## F11 -- EXTERNAL EDIT BYPASS: NO GOVERNANCE GATE, ONLY DETECTION

**Severity**: MEDIUM
**Spec**: CL-10 (External Edit)
**Scenario**: cap-integration-v1/S33 (external edit bypass)

S33 is well-analyzed (13 findings) and explicitly states: "The system's defense is detection and notification, not prevention." This is architecturally correct -- claws cannot gate filesystem writes. However, the detection-only model means there exists a class of governance violations that persist indefinitely until a human notices the SSE warning and takes action.

If the SSE client disconnects (CL-10 P-275 states "events emitted during the gap are lost"), and the admin does not check the audit trail, an external edit that violates governance persists undetected by any connected consumer. The startup health check (P-274) catches write-without-compile state from crashes but does NOT catch "compiled-with-violations" state -- a successful compilation with governance warnings is a valid state.

**Required**: (1) The governance endpoint `GET /api/governance` must include a `violations` array that persists across SSE reconnects. Violations detected from external edits must remain in the governance summary until resolved, not just emitted as transient SSE events. (2) The startup health check should surface outstanding governance violations (not just compilation staleness) so reconnecting clients see the full violation state.

---

## F12 -- TRUST ESCALATION JWT NONCE STORE PERSISTENCE NOT SPECIFIED

**Severity**: MEDIUM
**Spec**: CL-10 (Trust Escalation, lines 1755-1790)
**Pulse**: 39 (trust-escalation)

The JWT one-time-use nonce tracking prevents replay attacks. Pulse 39 implements a nonce store that rejects duplicate JWTs. However, neither the spec nor the pulse specifies how the nonce store survives server restarts. If the nonce store is in-memory, a server restart clears it, allowing all previously-seen JWTs to be replayed within their TTL window (5 minutes).

The workqueue (P-280) has explicit crash-recovery semantics (persisted to `.claws/workqueue.json`). The compilation cache has explicit persistence (`phase-cache.json`). The nonce store has no persistence specification. A 5-minute TTL limits the replay window, but in a crash-restart-within-5-minutes scenario, every JWT issued in the last 5 minutes becomes replayable.

**Required**: The nonce store must be persisted to disk (`.claws/nonce-store.json` or equivalent) with write-ahead-log semantics matching the audit chain's WAL. On startup, load the nonce store and reject any JWT with a previously-seen `jti`. Prune expired entries (older than TTL) on load.

---

## F13 -- SCENARIO COVERAGE GAP: NO SCENARIO FOR R5 ENFORCEMENT ACROSS ALL WRITE PATHS SIMULTANEOUSLY

**Severity**: MEDIUM
**Specs**: CL-10, CL-11
**Scenarios**: cap-integration-v1 (35 scenarios total)

The Ra wave has 35 cap-integration scenarios plus 20 pitfall-coverage scenarios (55 total in the wave). Individual write paths have R5 coverage: S03 (chunk PATCH), S05 (allow-all), S10 (Loop deny rule), S21 (Loop boundary removal), S25 (skill install). But there is no single scenario that exercises R5 enforcement across ALL 6 write paths identified in CL-10 line 1731-1741:

1. `PATCH /api/chunks/{tab}/{section}` -- covered by S03
2. `PATCH /api/oc/SOUL.md` (Loop soul) -- covered by S21
3. `PATCH /api/oc/MEMORY.md` (Loop memory) -- NOT explicitly covered for R5
4. `PATCH /api/trust/escalate` -- covered by S12/S26 but for JWT, not R5 tool lock
5. `POST /api/onboard` -- covered by S15/S34 but for injection, not R5 tool lock
6. `POST /api/skills/install` -- covered by S25

The R5 invariant is: "no write path can weaken R5 protection." Without a cross-cutting scenario that attempts R5 bypass through each path in sequence (chunk, Loop soul, Loop memory, session config, batch, onboard, skill install), the invariant is tested per-path but not holistically. A regression in one path would not be caught by the other paths' tests.

**Required**: Add one cross-cutting acceptance scenario: "R5 bypass attempted through all 7 write paths (chunk PATCH, Loop soul, Loop memory, session config, batch, onboard, skill install). All attempts rejected with appropriate error codes. Workspace files unchanged after all attempts." This scenario is the R5 invariant's integration test.

---

## Summary

| #   | Severity | Finding                                                               | Pulse/Spec     |
| --- | -------- | --------------------------------------------------------------------- | -------------- |
| F01 | CRITICAL | Time-travel serves unprotected historical R5 state                    | P70 / CL-10    |
| F02 | CRITICAL | Session config edits can widen delegated agent tools beyond delegator | P65 / CL-10    |
| F03 | HIGH     | Cron R3+ pre-auth in HEARTBEAT.md bypasses per-invocation approval    | P60,65 / CL-10 |
| F04 | HIGH     | Validation short-circuit masks concurrent violations                  | P30 / CL-10    |
| F05 | HIGH     | Batch edits validate individually, not jointly                        | P68 / CL-10    |
| F06 | HIGH     | Onboard API bootstrap gap -- no GovernanceIR at first write           | P43 / CL-10    |
| F07 | HIGH     | Loop partial-reject vs chunk full-reject inconsistency                | P35 / CL-10    |
| F08 | HIGH     | No scenario for session type change gaining elevated access           | P60 / CL-10    |
| F09 | HIGH     | Skill install quarantine window exposes declared-but-unverified risk  | P40 / CL-10    |
| F10 | MEDIUM   | Allow-all response computed before recompilation reclassification     | P33 / CL-10    |
| F11 | MEDIUM   | External edit violations lost on SSE disconnect                       | S33 / CL-10    |
| F12 | MEDIUM   | Trust escalation nonce store not persisted across restarts            | P39 / CL-10    |
| F13 | MEDIUM   | No cross-cutting R5 invariant scenario across all write paths         | CL-10,11       |

**Critical findings (2)**: F01 and F02 represent invariant-level weaknesses where the R5 chain can be bypassed through historical reads or delegation widening. These must be addressed before implementation.

**High findings (7)**: F03-F09 represent design gaps where the R5/governance invariant holds for the primary path but has seams at secondary paths (cron pre-auth, batch validation, onboard bootstrap, partial-reject, session transitions, skill quarantine).

**Medium findings (4)**: F10-F13 represent operational robustness concerns where the invariant is correct in steady state but has temporal windows or persistence gaps.

**Overall assessment**: The R5 invariant chain is structurally sound across the primary write paths (chunk PATCH, R5 validator, fleet lock, governance deny). The design is fail-closed by default and non-configurable for R5. The critical gaps are at the BOUNDARIES: historical reads (F01), delegation scope (F02), unattended pre-authorization (F03), and the bootstrap/quarantine windows (F06, F09). The 35 cap-integration scenarios provide good per-path coverage but lack the cross-cutting holistic test (F13) that would catch regressions at path boundaries.
