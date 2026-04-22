# Cap-Integration Scenario Findings — Applied

**Scenarios**: 15 (S01-S15)
**Total findings**: ~97 (6-8 per scenario)
**Finding depth target**: 5-15 per scenario (currently at 6-8, deepen during implementation)

## Pitfalls Extracted (P-270 through P-282)

Cross-cutting findings that apply beyond their individual scenario.

| Pitfall | Source | Description | Spec Impact |
|---------|--------|-------------|-------------|
| **P-270** | S01-F02, S03-F02 | **Unclassified tools in chunks default to R5 with no provenance.** A tool in TOOLS.md that hasn't been compiled yet has no risk classification. The chunk assembler must show `lock.source: 'governance'` with reason "unclassified — defaulting to R5" so the admin knows it's a default, not a real classification. | CL-10: chunk assembler must distinguish classified R5 from defaulted R5 |
| **P-271** | S02-F02, S09-F04 | **Cross-file chunk assembly has no concurrency control.** Chunk assembly reads IDENTITY.md + AGENTS.md + compiled IR. If a concurrent PATCH writes AGENTS.md between the reads, the chunk contains stale managedBy. Same issue for Loop sync reading SOUL.md while a PATCH writes it. | CL-10: chunk assembly must snapshot workspace state atomically |
| **P-272** | S04-F01, S05-F02 | **Fleet policy load failure is silent.** If the fleet policy file is missing, corrupt, or unreachable, the validation layer has no fleet locks to enforce. Tools that should be fleet-locked become editable. Must fail-closed: fleet policy load error = all fleet-lockable fields locked. | CL-10: fleet policy load must fail-closed, not fail-open |
| **P-273** | S06-F02 | **Concurrent PATCH race condition on the compilation pipeline.** Two PATCHes to different files (TOOLS.md and SOUL.md) trigger two recompilations. If the second starts before the first finishes, the per-phase cache may contain a mix of old and new state. Must serialize or queue recompilations. | CL-10: compilation must be serialized (queue) or use optimistic concurrency |
| **P-274** | S07-F02 | **Rollback failure leaves workspace in an inconsistent state.** If the OC file write succeeds but rollback fails (disk full, permission error), the workspace has an uncompiled governance change. Must detect this on next `claws serve` startup and force recompilation. | CL-10: startup health check must detect write-without-compile state |
| **P-275** | S08-F01 | **SSE reconnection loses events.** If the client disconnects and reconnects, events emitted during the gap are lost. For a settings UI this is acceptable (refresh the chunk). For an audit dashboard, it's data loss. Must document: SSE is current-state, not replay. For replay, use `/api/audit`. | CL-10: SSE is current-state-only; document explicitly |
| **P-276** | S09-F01, S10-F01 | **Deny rule detection in free-form markdown is ambiguous.** "Never share credentials" in SOUL.md is a deny rule, but how does the validator know? Pattern matching ("Never", "Do not", "Must not") has false positives. GovernanceIR-backed detection (check if the text maps to a compiled G-INPUT deny intent) is more accurate but requires compilation to have run. | CL-10: deny rule detection must use GovernanceIR registry, not regex |
| **P-277** | S10-F03 | **R5-injected deny rules vs user-authored deny rules are indistinguishable.** If claws injects R5 deny rules during compilation and the user tries to remove them via Loop, the system should block removal. But if the GovernanceIR doesn't tag which deny rules are compiler-injected vs user-authored, the validation layer can't distinguish them. | CL-10/CL-11: GovernanceIR must tag deny rule provenance (compiler vs user) |
| **P-278** | S11-F01 | **Timezone handling in HEARTBEAT.md is underspecified.** "9:00 AM" with no timezone could be agent-local, user-local, or UTC. Calendar events need explicit timezone. | CL-10/CL-09: HEARTBEAT.md format must require explicit timezone |
| **P-279** | S12-F01, S12-F03 | **Trust escalation token forgery and manager identity verification.** JWT validation must verify signature against a known key, check `sub` claim maps to a real manager with authority over this agent, and ensure the token hasn't been replayed. | CL-10: trust escalation JWT must have signature verification + audience + manager role check |
| **P-280** | S13-F01 | **Work queue is runtime-only — lost on restart.** Runtime tasks (not in HEARTBEAT.md) exist only in memory. Server restart loses them. Must persist to `.claws/workqueue.json` or document as ephemeral. | CL-10: work queue persistence strategy required |
| **P-281** | S14-F01, S14-F02 | **Audit chain query performance degrades over time.** Append-only chain grows unbounded. Full-chain queries on a 6-month-old workspace could take seconds. Must support cursor-based pagination and periodic integrity checks (not per-read). | CL-10: audit query must be paginated; integrity checks periodic, not per-read |
| **P-282** | S15-F03 | **Onboard cannot override default deny rules.** A transcript saying "I don't want any restrictions" must not remove the default deny rules injected by the template. The onboard content validator must enforce: default deny rules are append-only, never removed by user content. | CL-10: default deny rules are immutable during onboarding |

## Spec Amendments from Findings

These findings require amendments to CL-10:

| Amendment | Source Pitfall | Section to Amend |
|-----------|---------------|-----------------|
| Chunk assembler must snapshot workspace atomically | P-271 | Chunk API section |
| Fleet policy load must fail-closed | P-272 | Write-Time Validation Layer |
| Compilation must be serialized (queue) | P-273 | Incremental Compilation section |
| Startup health check for write-without-compile | P-274 | claws serve lifecycle |
| SSE is current-state-only (document explicitly) | P-275 | SSE section |
| Deny rule detection uses GovernanceIR, not regex | P-276 | Loop sync section |
| GovernanceIR must tag deny rule provenance | P-277 | CL-11 amendment |
| HEARTBEAT.md requires explicit timezone | P-278 | CL-09 amendment |
| Trust JWT: signature + audience + manager role | P-279 | Trust Escalation section |
| Work queue persistence strategy | P-280 | Work Queue section |
| Audit query paginated, integrity periodic | P-281 | Audit section |
| Default deny rules immutable during onboard | P-282 | Onboard section |

## Missing Scenarios

Gaps identified during finding analysis that warrant new scenarios:

| ID | Name | Focus |
|----|------|-------|
| S16 | **chunk-stale-compilation** | GET /api/chunks when GovernanceIR is stale (OC file changed, not recompiled). Expect: warning in governance context, auto-recompile triggered. |
| S17 | **multi-tab-concurrent-patch** | Two PATCHes from different CAP tabs simultaneously. Expect: serialized execution, both edits applied, no data loss. |
| S18 | **fleet-policy-hot-reload** | Fleet policy file changes while claws serve is running. Expect: new policy applied without restart, locked fields updated in chunks. |
| S19 | **loop-frontmatter-preservation** | SOUL.md has YAML frontmatter. Loop edit touches body text only. Expect: frontmatter byte-for-byte preserved. |
| S20 | **chunk-read-after-crash** | claws serve restarts after a crash mid-PATCH. Expect: workspace consistent, no partial writes, health check reports status. |
