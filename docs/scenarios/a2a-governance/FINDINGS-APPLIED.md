# Findings Applied: a2a-governance

**Date**: 2026-04-11
**Scenarios processed**: 6
**Total findings**: 60
**Major/warning applied**: 53
**Note severity skipped**: 7

---

## Summary of Changes

### Specs Edited

#### CL-02 Security Model (G-A2A-* section)
- **34 new constraints** added covering: trust requirement for all declared agents (not just delegated), cascading skip notification when G-A2A-TRUST fails, trust level taxonomy (none/delegation-only/communication/full), agent-specific fix suggestions in block reasons, declared vs active agent distinction in precondition, directional trust declarations, compile-time vs runtime enforcement layering, audit event type taxonomy for A2A blocks (default-deny/trust-revoked/trust-condition-failed/identity-mismatch), threat-specific L0 warning text (naming impersonation risk), absent IDENTITY.md triggers L0 warning not rule skip, fleet context detection beyond config flag, quantified risk per identity level (L0=zero effort, L1=key theft, L2=fleet compromise), per-level weakness documentation, explicit vs default L0 distinction, L0 key reference validation skip, transitive trust chain path in FE6 diagnostic, group membership vs pairwise trust analysis, delegation vs transitive trust distinction (delegation carries B identity), proximate vs original sender in trust evaluation, delegation depth vs trust depth clarification, multi-option fix suggestions for transitive trust, scalable transitive trust detection (O(V+E)), external data source limitation for G-A2A-FLOW, transitive label propagation through delegation chain, declassify annotation audit trail, default ceiling explanation in diagnostic, multi-label ceiling evaluation (max across labels), complete violation diagnostic with chain path, cycle detection prerequisite for label propagation, specific tool listing in all-expansion warning, transitive all-delegation chain warning, per-tool delegation ceiling (not per-risk-level), independent G-A2A-DELEGATE + G-A2A-FLOW constraint checking, delegation map maintenance and per-invocation check

#### CL-03 Runtime Enforcement
- **7 new constraints** covering: default-deny for dynamic agents, lateral movement pattern detection from correlated blocks, lateral movement alert context (misconfiguration vs compromise), progressive lateral movement escalation response, correlated SIEM export for lateral movement incidents, agent-level quarantine vs workspace-level kill switch, side-channel data exfiltration defense via G-CONTEXT + G-DATA

#### CL-05 Developer Experience
- **5 new constraints**: incremental identity level migration tooling, fleet-wide minimum identity level metric, cross-workspace lateral movement correlation, cross-workspace transitive trust detection via claws scan, default delegation depth limit review (10 may be too permissive)

#### CL-04 Compilation Pipeline
- **2 new constraints**: transitive flow analysis performance budget (200ms ANALYZE), reclassification before delegation ceiling evaluation ordering

### PITFALLS.md
- **8 new pitfalls** (P-202 through P-209)
- P-202: **L0 fleet identity impersonation** -- Critical -- S02-F01 -- L0 identity in fleet context allows trivial name-spoofing impersonation across workspaces. claws response: CL-02 G-A2A-IDENTITY threat-specific L0 warning. Detection ring: Fleet
- P-203: **Dynamic agent default-deny bypass** -- High -- S01-F02 -- Dynamically spawned agents (not in AGENTS.md) bypass compile-time trust validation; runtime must enforce default-deny independently. claws response: CL-03 runtime default-deny for unknown agents. Detection ring: Inner
- P-204: **Transitive trust via group bridging** -- High -- S03-F02 -- Agent in groups A and B bridges two trust groups; A-only and B-only agents appear transitively trusted but should not be. claws response: CL-02 FE6 group membership graph analysis. Detection ring: Compile-time
- P-205: **Cross-workspace transitive trust undetectable locally** -- High -- S03-F06 -- Each workspace FE6 only sees local trust; cross-workspace transitive chains invisible without fleet-wide scan. claws response: CL-05 claws scan with Tarjan SCC. Detection ring: Fleet
- P-206: **CONFIDENTIAL data flows to PUBLIC agent via intermediate** -- Critical -- S04-F02 -- High-water-mark propagation only checks adjacent pairs; intermediate agent forwards CONFIDENTIAL data to PUBLIC agent undetected. claws response: CL-02 G-A2A-FLOW transitive label propagation. Detection ring: Compile-time
- P-207: **Cycle in delegation graph crashes label propagation** -- High -- S04-F07 -- Circular delegation causes infinite loop in label propagation; pipeline hangs. claws response: CL-02 cycle detection runs BEFORE label propagation. Detection ring: Compile-time
- P-208: **Implicit all-delegation includes R5 tools** -- High -- S05-F01 -- tools: all delegation silently includes R5/OBO tools; developer unaware of what all expands to. claws response: CL-02 IMPLICIT-R4-DELEGATION warning with specific tool list. Detection ring: Compile-time
- P-209: **Side-channel data exfiltration via shared resource** -- High -- S06-F06 -- Compromised agent writes sensitive data to shared file/memory/env that another agent reads; bypasses all A2A governance. claws response: CL-02 G-CONTEXT + G-DATA memory isolation and data labels. Detection ring: Inner

### Plans Edited
- **claws-governance-ir**: delegation map structure, conditional trust evaluation
- **claws-rules**: G-A2A-TRUST with taxonomy, G-A2A-FLOW transitive propagation, cycle detection ordering
- **claws-emit**: delegation ceiling enforcement handlers, identity level checks
- **claws-fleet**: lateral movement correlation, cross-workspace trust graph, fleet scan identity metrics

### Guides Edited
- **docs/claws/governance/a2a-boundary.md**: trust taxonomy, no-transitive-trust rationale, delegation vs trust depth
- **docs/claws/governance/tool-classification.md**: delegation ceiling per-tool semantics
- **docs/claws/fleet/fleet-security.md**: lateral movement detection, L0 impersonation risk

---

## Findings NOT Applied (note severity, skipped per rules)

7 findings with severity "note" were skipped: S01-F10 (implicit delegation trust visibility), S02-F09 (adoption-friendly default severity), S03-F10 (no-transitive-trust rationale), S04-F10 (type safety mental model), S05-F10 (permission delegation mental model), S06-F10 (composed defense validation).
