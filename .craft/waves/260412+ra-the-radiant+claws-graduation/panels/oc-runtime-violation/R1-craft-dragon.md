---
panel: oc-runtime-violation
round: 1
role: craft/dragon
tension: "Invariant rigor > feature velocity"
cluster: A
scope:
  - design/claws/specs/CL-10-cap-integration.md (OpenClaw Runtime Writes + Policy Violation State Model)
  - pulses/72+auto-snapshot.md
  - pulses/73+violation-state.md
  - scenarios/cap-integration/S41-oc-runtime-skill-install/scenario.yaml
  - scenarios/cap-integration/S43-structural-error-recovery/scenario.yaml
  - scenarios/cap-integration/S44-violation-state-transitions/scenario.yaml
date: 2026-04-16
verdict: REVISE
finding_count: 12
severity_counts:
  HC-BLOCK: 4
  HC-WARN: 5
  LC-NOTE: 3
---

# R1 craft/dragon — OC Runtime Writes & Policy Violation State Model

## Governing Lens

This review evaluates whether the system invariants in the OC runtime write pipeline and the violation state machine are airtight. The dragon role treats every state transition, error path, and recovery contract as a load-bearing structure. Features that weaken these invariants are sent back for redesign.

---

## Findings

### F01 — HC-BLOCK: Stale last-good GovernanceIR creates unclassified tool exposure

**Location**: CL-10 Policy Violation State Model (line 1900); Pulse 73 (line 31-34); S41 F04

The "last good GovernanceIR" invariant has a critical blind spot. When the system enters DEGRADED_R5 and serves the last-good IR, that IR was compiled from a PREVIOUS workspace state. If the OC runtime's write added a NEW tool (not just violated policy on an existing one), the last-good IR has no entry for that tool at all. The tool is neither blocked nor governed — it is invisible to governance.

Concrete scenario: OC runtime installs a skill with two tools — `deploy-to-prod` (R5, missing elicitation) and `read-logs` (R2, benign). The system enters DEGRADED_R5 and blocks `deploy-to-prod`. But `read-logs` does not exist in the last-good IR because it was just installed. If a partner queries governance for `read-logs`, the response is either "tool not found" (breaking the partner) or "no governance data" (the tool runs unclassified).

The spec says "the LAST GOOD GovernanceIR continues to serve" (line 1900) but does not address tools that exist in the workspace but not in the last-good IR. The pulse 73 deliverables describe `violation-aware-compile.ts` as keeping "the last good GovernanceIR from the forest" but never mention a merge strategy for new-but-compliant tools.

**Required**: Define an invariant for tools present in the workspace but absent from the last-good IR. Options: (a) treat unclassified tools as blocked by default (fail-closed, consistent with R5 philosophy), (b) compile only the non-violating subset and merge into the last-good IR (partial compilation). Option (a) is safer. The spec must state explicitly: "Any tool not present in the serving GovernanceIR is treated as blocked with reason UNCLASSIFIED."

---

### F02 — HC-BLOCK: Auto-snapshot can capture a partially-written file

**Location**: CL-10 Auto-Snapshot Contract (line 1866-1876); Pulse 72 (line 29-34, 42-43); S41 F01

The auto-snapshot is triggered by the file watcher. But file writes are not atomic on any OS — a large file (e.g., a skill directory with multiple files) may be half-written when the watcher fires. The snapshot captures the filesystem at the moment of the watcher event, not at the moment the write completes.

The pulse 72 spec says "On file watcher event: save current GovernanceIR + file hashes" (line 42). File hashes of a partially-written file are meaningless. Worse, if the snapshot captures a half-written `TOOLS.md`, the admin's diff shows a corrupt baseline, making rollback to the snapshot restore a broken state.

S41 F10 addresses rapid successive writes via debounce, but debounce solves the multi-write problem, not the single-write-in-progress problem. A 200ms debounce does not guarantee the OS write buffer has flushed.

**Required**: The auto-snapshot must verify file integrity before capturing. At minimum: (a) debounce must be long enough for typical OS flush (500ms minimum, not "configurable" without a floor), (b) the snapshot must hash files and verify they parse before storing (a snapshot of an unparseable file is worse than no snapshot), (c) if a file fails to parse during snapshot, the snapshot must be marked `integrity: partial` and the admin warned that rollback to this snapshot may not produce a clean state.

---

### F03 — HC-BLOCK: DEGRADED_R5 per-tool blocking is unsafe when the violation is a structural dependency

**Location**: CL-10 Severity-Based States (line 1888-1893); Pulse 73 (line 50); S41 F03

DEGRADED_R5 blocks ONE tool and allows all others. But R5 violations are not always isolated. If the R5 violation is on a trust chain tool (e.g., `delegate-authority` in AGENTS.md), the trust chain is broken. All tools that depend on the trust chain — including tools that delegate to other agents — are operating on a broken governance foundation, even though they individually pass R5 classification.

Example: OC runtime modifies AGENTS.md to add a delegation without proper elicitation. The `delegate-authority` tool is blocked (DEGRADED_R5). But `execute-delegated-task` on Agent B still operates, believing its trust chain is valid because its own classification is R3. The trust chain it relies on was established by the now-blocked delegation tool. The per-tool blocking does not propagate through dependency graphs.

S41 expects `other_tools_operational: true` and `workspace_not_locked: true` (lines 26-27). This is correct for independent tools but dangerously wrong for tools with governance dependencies.

**Required**: The violation state machine must distinguish between isolated violations (a single tool's R5 classification) and structural violations (a trust chain, delegation, or policy dependency is broken). Structural violations must escalate to a broader block scope — either all tools in the dependency subgraph or a workspace-level `DEGRADED_STRUCTURAL` state. The state enum needs a fifth state, or DEGRADED_R5 needs a `scope: isolated | structural` discriminant that controls blocking breadth.

---

### F04 — HC-BLOCK: ERROR state with PATCH blocked prevents self-healing patches

**Location**: CL-10 line 1904; Pulse 73 (line 47, 60, 62); S44 F08 (line 175-182)

The spec states: "PATCH is blocked (503) until violations are resolved — you can't edit on top of a broken state" (line 1904). Pulse 73 acceptance criteria: "PATCH blocked (503) in ERROR state" (line 62). S44 confirms: "ERROR: 503_all" (line 42).

This creates a catch-22 for programmatic recovery. If a Companion App or fleet controller detects the ERROR (via SSE `workspace:error` event) and wants to fix it by PATCHing the corrupted file, the PATCH is rejected with 503. The only recovery path is direct file system editing (VS Code, shell) — which itself triggers the file watcher and another snapshot/recompile cycle.

For DEGRADED_R5 and DEGRADED_WARN, the spec correctly differentiates PATCH behavior (per-tool blocking vs. allowed-with-warnings). But ERROR gets a blanket 503 that prevents API-driven recovery.

**Required**: ERROR state must allow a special PATCH variant — either `PATCH /api/repair` with elevated authorization, or PATCH requests with an `X-OC-Repair: true` header that bypasses the 503 gate specifically for the file(s) that caused the structural error. The repair PATCH must still validate content (no accepting garbage) but must not be blocked by the state it is trying to fix. The invariant should be: "PATCH is blocked in ERROR EXCEPT for repair patches targeting the specific files listed in the error details."

---

### F05 — HC-WARN: State machine can get stuck in ERROR with no automated recovery if file watcher dies

**Location**: Pulse 73 (line 66); S43 F06 (line 130-139); S44 (line 28-29)

The recovery from ERROR depends entirely on the file watcher detecting the fix: "Recovery: fix the violation -> recompile succeeds -> CLEAN state restored" (pulse 73, line 66). S43 F06 correctly identifies that the watcher must not de-register files after errors.

But what if the file watcher itself crashes or stops? In ERROR state, the server is serving stale IR and returning 503 on PATCH. If the watcher dies, no file change is ever detected, no recompile ever runs, and the system is permanently stuck in ERROR. There is no heartbeat, no periodic recompile, and no manual trigger endpoint.

S44 F02 requires startup reconciliation via recompile (line 88-96), which handles restart. But a watcher crash without server restart is the gap — the server keeps running, serving stale data, with no path back.

**Required**: Add a file watcher health check. If the watcher has not emitted an event in N minutes (configurable, default 5), the system performs a full filesystem scan and recompile. Alternatively, expose `POST /api/recompile` as an admin endpoint that forces a manual recompile regardless of file watcher state. Either way, the system must not depend solely on one subsystem (file watcher) for its only recovery path.

---

### F06 — HC-WARN: No transition from DEGRADED_R5 to ERROR preserving R5 violations

**Location**: S44 F05 (line 128-139); S44 state transitions (lines 14-29)

S44 defines the transition path: DEGRADED_WARN -> ERROR (structural error takes precedence). S44 F05 correctly notes that the DEGRADED_WARN violations must be preserved through ERROR and re-evaluated on recovery. But the S44 transition list does not include DEGRADED_R5 -> ERROR. If the system is in DEGRADED_R5 (a tool is blocked) and then a structural error occurs, what happens?

The severity ordering in S44 F03 says ERROR > DEGRADED_R5 > DEGRADED_WARN > CLEAN (line 104). So DEGRADED_R5 -> ERROR is a valid transition. But no scenario tests it. No finding addresses whether the R5 violation list is preserved through the ERROR state. If the R5 violations are dropped when entering ERROR, then fixing the structural error transitions to CLEAN — and the R5-violating tool silently becomes unblocked.

**Required**: Add a DEGRADED_R5 -> ERROR transition to the S44 scenario. The violation list must accumulate (not replace). On recovery from ERROR, the system must re-evaluate and may land in DEGRADED_R5 (not CLEAN) if the R5 violation persists. Test this explicitly.

---

### F07 — HC-WARN: DEGRADED_FLEET state is defined but absent from the state machine

**Location**: CL-10 line 1893; Pulse 73 (line 36); S44 transitions (lines 14-29)

CL-10 defines four violation states: DEGRADED_R5, DEGRADED_WARN, ERROR, and DEGRADED_FLEET (line 1893). But pulse 73 defines only four states: CLEAN, DEGRADED_R5, DEGRADED_WARN, ERROR (line 36). DEGRADED_FLEET is not in the pulse deliverables, not in the ViolationState enum, not in any scenario transition list, and not tested.

If DEGRADED_FLEET is deferred to a later pulse, the spec should say so. If it is in scope, pulse 73 is incomplete. The risk: a future implementer reads CL-10, sees DEGRADED_FLEET, and either implements it inconsistently or ignores it. The state machine must be complete — partial state enums are invariant violations.

**Required**: Either (a) add DEGRADED_FLEET to pulse 73's ViolationState enum with transitions and tests, or (b) explicitly mark it as "deferred to fleet integration pulse" in both CL-10 and pulse 73, with a placeholder in the enum (`DEGRADED_FLEET = 'deferred'`). The spec and pulse must agree on scope.

---

### F08 — HC-WARN: Concurrent violation ordering is underspecified for DEGRADED_R5 + DEGRADED_WARN

**Location**: S44 F03 (lines 100-111)

S44 F03 establishes severity ordering: ERROR > DEGRADED_R5 > DEGRADED_WARN > CLEAN. But it only addresses ERROR + DEGRADED_R5 coexistence. What about DEGRADED_R5 + DEGRADED_WARN simultaneously (an R5 tool violation AND a G-DATA warning)?

The "worst state wins" rule says the system is in DEGRADED_R5. But DEGRADED_R5 has per-tool blocking semantics, while DEGRADED_WARN has warning-only semantics. If the system is in DEGRADED_R5 (because that is worse), are the DEGRADED_WARN warnings still surfaced? Or are they swallowed because the state is DEGRADED_R5?

The PATCH matrix in S44 F08 (line 175-182) defines behavior per state, not per violation type. If the system is DEGRADED_R5 with concurrent DEGRADED_WARN violations, does a PATCH to a non-blocked, non-warned resource get warnings or not?

**Required**: Define compound state behavior. The state machine should track the "worst state" for routing/blocking decisions but maintain the full violation list for reporting. Chunks must include ALL active violations regardless of which state is "winning." The PATCH middleware must check both the state-level gate AND per-violation warnings. Specify this in CL-10 and add a compound-violation scenario.

---

### F09 — HC-WARN: Auto-snapshot LRU eviction may delete the only clean baseline

**Location**: Pulse 72 (line 34, 46); CL-10 line 1860

Auto-snapshots are bounded to 20 (LRU eviction). If the system is in DEGRADED_R5 for an extended period and the OC runtime continues making writes (e.g., agent learns preferences, saves session state), each write triggers a new auto-snapshot. After 20 writes, the original clean-baseline snapshot (before the R5 violation was introduced) is evicted.

The admin now cannot diff against the pre-violation state. The only remaining snapshots all contain the R5-violating tool. Rollback to any available snapshot restores a still-violated state.

**Required**: The auto-snapshot eviction policy must pin snapshots that are referenced by active violations. A snapshot labeled `auto:pre-install` that is the baseline for an active DEGRADED_R5 violation must not be evicted until the violation is resolved. The LRU eviction should skip pinned snapshots. Alternatively, the eviction bound should count only unpinned snapshots (so up to 20 unpinned + N pinned).

---

### F10 — LC-NOTE: Missing invariant for snapshot-to-IR version consistency

**Location**: Pulse 72 (line 42-43); CL-10 line 1875-1876

The auto-snapshot stores "GovernanceIR + file hashes" (pulse 72, line 42). CL-10 says auto-snapshots are "stored in the compilation forest alongside version-indexed entries" (line 1875). But there is no stated invariant that the GovernanceIR hash in the snapshot matches the version-indexed IR in the forest.

If the auto-snapshot's GovernanceIR hash points to a forest entry that has been garbage-collected (compilation forest has its own eviction), the snapshot is orphaned — it references an IR that no longer exists. Rollback to the snapshot restores file state but cannot restore the governance context.

**Required**: Add an invariant: "An auto-snapshot's governanceIrHash must reference a forest entry that exists. Auto-snapshot eviction must cascade — if a forest entry is evicted, any auto-snapshot referencing it must also be evicted (or the forest entry must be pinned)."

---

### F11 — LC-NOTE: S44 does not test the CLEAN -> ERROR direct transition

**Location**: S44 transitions (lines 14-29)

S44 tests: CLEAN -> DEGRADED_R5 -> CLEAN -> DEGRADED_WARN -> ERROR -> CLEAN. The direct transition CLEAN -> ERROR (structural error from a clean state) is not exercised. S43 covers this scenario separately, but the S44 state machine exercise should be comprehensive.

If the state machine implementation has a bug where CLEAN -> ERROR is handled differently from DEGRADED_WARN -> ERROR (e.g., the violation list initialization path differs), S44 would not catch it.

**Required**: Add CLEAN -> ERROR as an explicit transition in S44 or add a note that S43 is the canonical test for this path and S44 intentionally omits it to avoid redundancy.

---

### F12 — LC-NOTE: Violation attribution for OneDrive sync may be misleading

**Location**: CL-10 line 1864; Pulse 72 (line 43, 57); S41 F13 (lines 226-234)

CL-10 lists OneDrive sync as a trigger type alongside oc_runtime and external_edit (line 1864). Pulse 72 includes `onedrive_sync` as a trigger type (line 43). But OneDrive sync is not a primary actor — it is a transport mechanism. The actual write was performed by a human or OC runtime on another device. Attributing a violation to `onedrive_sync` tells the admin HOW the file arrived, not WHO wrote it.

S41 F13 acknowledges this as "best-effort" (line 234), which is reasonable. But the violation audit trail should distinguish between transport (onedrive_sync) and actor (unknown, likely remote_user or remote_oc_runtime). If the admin sees `source: onedrive_sync` for an R5 violation, they do not know whether to investigate a misconfigured agent on another device or a human experiment gone wrong.

**Required**: Consider a two-level attribution: `transport: onedrive_sync`, `actor: unknown`. The audit trail should note that OneDrive attribution is transport-only and the actual actor cannot be determined. This is a documentation/schema clarification, not a blocking design issue.

---

## Summary

The OC runtime write pipeline and violation state model are well-structured but have four invariant gaps that must be closed before implementation:

1. **Unclassified tool exposure** (F01): Tools added by OC runtime but absent from last-good IR run with zero governance. Fail-closed for unclassified tools is required.
2. **Partial-write snapshots** (F02): Auto-snapshots can capture mid-write filesystem state. Integrity verification before snapshot storage is required.
3. **Structural dependency blindness** (F03): Per-tool blocking in DEGRADED_R5 ignores trust chain and delegation dependencies. Structural violations need broader scope.
4. **Self-healing PATCH blocked** (F04): Blanket 503 in ERROR prevents API-driven repair. A repair PATCH exemption is required.

The five HC-WARNs (F05-F09) address recovery robustness and state machine completeness. The three LC-NOTEs (F10-F12) are consistency and documentation improvements.

Verdict: **REVISE** — the four HC-BLOCKs are invariant-level gaps. No implementation should proceed until F01, F02, F03, and F04 are resolved in both CL-10 and the pulse plans.
