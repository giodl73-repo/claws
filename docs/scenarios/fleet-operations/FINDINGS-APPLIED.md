# Findings Applied: fleet-operations

**Date**: 2026-04-11
**Scenarios processed**: 10
**Total findings**: 109
**Major/warning applied**: 89
**Note severity skipped**: 20

---

## Summary of Changes

### Specs Edited

#### CL-05 Developer Experience
- **52 new constraints** added covering: three-state workspace classification (GOVERNED/UNGOVERNED/MISCONFIGURED), workspace discovery heuristic definition, discovery scope limits and fleet registry alternative, scan fault tolerance and partial results, scan output format specification (--format support), per-workspace metadata in scan inventory, fleet.requireGovernance policy escalation, scan idempotency and workspace immutability, INACCESSIBLE workspace state for permission errors, broadcast-to-build stale enforcement window definition, --reason required for broadcast, pre-broadcast policy validation gate, per-workspace trust tier compatibility check before broadcast, broadcast atomicity semantics (best-effort with manifest), post-broadcast build trigger workflow, broadcast version tracking in fleet manifest, broadcast merge semantics (fleet override vs local merge), automatic pre-broadcast snapshot for rollback, drift hash composition specification (claws.json + policy YAML + GovernanceIR hash), drift severity classification (CRITICAL/HIGH/LOW), fleet baseline definition and manifest storage, drift exception registration for intentional overrides, configuration drift vs build drift distinction, drift detection frequency and real-time option, drift timeline via scan history comparison, per-drift-type remediation in drift report, drift findings as SARIF results, broadcast partial failure semantics and retry mechanism, infrastructure drift vs policy drift classification, broadcast exit code for partial success (exit 2), broadcast manifest schema and storage location, stale broadcast failure alerting threshold, write access requirement and read-only workaround, retry idempotency via manifest state machine, per-workspace broadcast timeout configuration, concurrent broadcast prevention via fleet lock, kill switch semantics (deny-all not disable-governance), synchronous kill with per-workspace acknowledgment, kill partial failure escalation (CRITICAL alert), kill flag requirements and blast radius communication, automatic pre-kill snapshot with failure tolerance, post-kill restoration command (revive or snap restore), structured kill reason format for incident correlation, double-kill prevention and state check, kill-to-restore latency SLA, compliance matrix (workspace x framework), ungoverned workspace exclusion from compliance metrics, overall compliance requires all targeted frameworks to pass, compliance report validity window and snapshot pairing, comply --fleet output format support (JSON/CSV minimum), cross-framework rule evaluation deduplication, compliance history storage for trend analysis
- **Fleet Scan section** expanded with: three-state workspace classification, discovery heuristic, scope limits, fault tolerance, output format, per-workspace metadata, idempotency, INACCESSIBLE state
- **Fleet Broadcast section** expanded with: stale enforcement window, --reason required, pre-broadcast validation, compatibility check, atomicity semantics, version tracking, merge semantics, pre-broadcast snapshot, partial failure + retry, manifest schema, alerting threshold, timeout, concurrent lock
- **Fleet Drift section** expanded with: hash composition, severity classification, baseline definition, exception registration, configuration vs build drift, frequency, timeline, remediation guidance, SARIF output
- **Fleet Kill Switch section** added: deny-all semantics, synchronous acknowledgment, partial failure escalation, flag requirements, pre-kill snapshot, restoration path, structured reason, double-kill prevention, latency SLA
- **Fleet Compliance section** added: workspace x framework matrix, ungoverned exclusion, all-frameworks-pass requirement, validity window, output formats, cross-framework deduplication, history storage

#### CL-02 Security Model
- **10 new constraints** added covering: tamper-evident kill audit via out-of-band logging, cross-workspace delegation reference format standardization, delegation vs request-response annotation in AGENTS.md, delegation graph ambiguity with L0 identity, cross-workspace permission ceiling validation, context-dependent severity escalation (warning in scan / error in broadcast), case-insensitive agent name collision detection, fleet template signing and verification (HMAC-SHA256), floor-only inheritance (local raises but never lowers fleet floor), pre-authorization vs fleet inheritance precedence
- **G-A2A-DELEGATE section** expanded with: standardized cross-workspace reference format, delegation vs request-response annotation, permission ceiling validation across workspace boundaries
- **G-A2A-IDENTITY section** expanded with: case-insensitive collision detection, L0 ambiguity in delegation graphs
- **G-ELICIT section** expanded with: fleet inheritance precedence, pre-authorization vs fleet template resolution
- **Audit section** expanded with: tamper-evident kill audit via out-of-band logging
- **Diagnostics section** expanded with: context-dependent severity escalation pattern

#### CL-03 Runtime Enforcement
- **6 new constraints** added covering: delegation depth limit emission independent of cycle detection, plugin ordering enforcement or verification mechanism, governance plugin self-position verification at runtime, governance ignores prior plugin approvals (authoritative evaluation), sidecar monitoring for plugin config changes, late validation mode for uncontrollable plugin ordering

#### CL-04 Compilation Pipeline
- **3 new constraints** added covering: fleet context input for inherited policy resolution in ANALYZE phase, governance plugin marker (`__claws_governance: true`) for fleet scan identification, fleet inheritance metadata in GovernanceIR

### PITFALLS.md
- **16 new pitfalls** (P-170 through P-185)

| ID | Category | Severity | Source | Description | Detection Ring |
|----|----------|----------|--------|-------------|----------------|
| P-170 | Fleet Broadcast | High | S02-F01 | Broadcast pushes policy but not recompilation — stale governance plugin enforces old rules until manual rebuild | Outer |
| P-171 | Fleet Broadcast | High | S02-F05 | Broadcast crash after partial fleet update leaves inconsistent policies with no manifest tracking | Outer |
| P-172 | Fleet Drift | Critical | S03-F02 | Trust tier drift from T2 to T3 is a security escalation — workspace allows higher-risk tools than fleet permits | Outer |
| P-173 | Fleet Broadcast | High | S04-F01 | Partial broadcast creates split-policy fleet with no defined recovery mechanism | Outer |
| P-174 | Fleet Broadcast | High | S04-F03 | Partial broadcast exit code 0 hides failed workspaces from CI pipeline | Outer |
| P-175 | Fleet Broadcast | High | S04-F05 | Unresolved broadcast failures cause permanent drift if operator forgets to retry | Outer |
| P-176 | Fleet Broadcast | High | S04-F09 | Concurrent broadcasts interleave policies across workspaces — no fleet-level lock | Outer |
| P-177 | Fleet Kill | Critical | S05-F01 | Kill switch disabling governance lets compromised agent run ungoverned instead of halted | Fleet |
| P-178 | Fleet Kill | Critical | S05-F03 | Kill fails for unreachable workspaces — compromised agent still running with no escalation path | Fleet |
| P-179 | Fleet Kill | High | S05-F09 | Double-kill overwrites pre-kill snapshot with halted state — destroys recovery point | Fleet |
| P-180 | Fleet Compliance | High | S06-F02 | Ungoverned workspaces inflate fleet compliance percentage — 70% governed shows as 100% passing | Outer |
| P-181 | Fleet Delegation | High | S07-F01 | Cross-workspace delegation reference format unstandardized — graph merge fails on name mismatch | Outer |
| P-182 | Fleet Inheritance | High | S08-F03 | Local policy less strict than fleet template lowers security floor — fleet inheritance inverted | Outer |
| P-183 | Fleet Inheritance | High | S08-F09 | Removing elicitation policy from fleet template causes cascade OBO-WITHOUT-ELICIT failure in 3+ dependent workspaces | Outer |
| P-184 | Fleet Plugin | Critical | S09-F05 | Pre-governance plugin pre-approves R5 tool calls — governance plugin sees "already approved" context and may defer | Middle |
| P-185 | Fleet Identity | High | S10-F05 | Case-different agent names ("finance-bot" vs "Finance-Bot") bypass collision detection — A2A routing ambiguous | Outer |

### Plans Edited
- **claws-fleet-management**: 51 findings, 18 new tests covering fleet scan three-state classification, broadcast partial failure + retry, drift severity classification, kill switch deny-all semantics, compliance matrix, delegation cycle detection, and identity collision blocking
- **claws-fleet-compliance**: 11 findings, 5 new tests covering multi-framework matrix, ungoverned exclusion, cross-framework deduplication, evidence signing, and compliance history
- **claws-a2a-governance**: 11 findings, 4 new tests covering cross-workspace delegation format, cycle detection, L0 identity ambiguity, and permission ceiling validation
- **claws-three-ring-governance**: 10 findings, 3 new tests covering plugin ordering verification, governance-first enforcement, and late validation mode

### Guides Edited
- **docs/claws/governance/fleet-scan.md**: three-state classification, discovery heuristic, fault tolerance, INACCESSIBLE state, output format
- **docs/claws/governance/fleet-broadcast.md**: partial failure semantics, retry mechanism, manifest schema, version tracking, merge semantics, concurrent lock, timeout
- **docs/claws/governance/fleet-drift.md**: hash composition, severity classification, baseline definition, exception registration, configuration vs build drift
- **docs/claws/governance/fleet-kill.md**: deny-all semantics, synchronous acknowledgment, partial failure escalation, pre-kill snapshot, restoration command, double-kill prevention
- **docs/claws/governance/fleet-compliance.md**: workspace x framework matrix, ungoverned exclusion, evidence signing, output formats, history storage
- **docs/claws/governance/fleet-delegation.md**: cross-workspace reference format, cycle detection, identity collision blocking, delegation graph visualization
- **docs/claws/governance/fleet-inheritance.md**: inheritable fields, floor-only semantics, template hierarchy, opt-in requirement, impact analysis
- **docs/claws/governance/plugin-ordering.md**: OBSERVE vs ACT categorization, governance-first requirement, self-position verification, late validation mode

---

## Findings NOT Applied (note severity, skipped per rules)

20 findings with severity "note" were skipped:
- S01-F10 (aggregate fleet health statistics in scan output)
- S01-F11 (incremental scan via governance hash caching)
- S02-F10 (dual audit trail for broadcast)
- S02-F11 (workspace group targeting for selective broadcast)
- S03-F10 (two-phase drift detection for large fleets)
- S03-F11 (drift trend tracking in audit history)
- S04-F10 (partial broadcast audit trail)
- S04-F11 (audit reason enrichment for partial failures)
- S05-F11 (external notification webhook for kill events)
- S05-F12 (three-state kill status HALTED/ACTIVE/UNKNOWN)
- S06-F10 (remediation priority ordering in compliance report)
- S06-F11 (per-framework report extraction via --framework filter)
- S07-F10 (incremental cycle detection via cached delegation graph)
- S07-F11 (delegation graph visualization DOT/Mermaid output)
- S08-F10 (fleet inheritance metadata in GovernanceIR)
- S08-F11 (pre-authorization vs fleet inheritance precedence)
- S09-F09 (full plugin chain visibility in scan report)
- S09-F10 (upstream Gateway ordering constraint proposal)
- S10-F09 (collision context report with agent metadata)
- S10-F10 (collision priority based on A2A activity)
