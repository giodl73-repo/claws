# EnterpriseClaw Evidence Ledger

This is the initial portfolio-wide evidence inventory. It identifies the best
current evidence, the strongest supported fact, the main unproven target
claim, and the cheapest next proof for every contract.

The grades describe evidence maturity only:

- **A**: audited current source plus representative proof;
- **B**: source-backed current behavior, target proof incomplete;
- **C**: proposal, concept, or adjacent analogue without a dedicated proof;
- **D**: owner or material evidence unresolved.

## Portfolio Summary

| Grade | Count | Contracts |
| --- | ---: | --- |
| A | 8 | EC-006, EC-007, EC-008, EC-009, EC-029, EC-030, EC-032, EC-033 |
| B | 20 | EC-002, EC-003, EC-004, EC-005, EC-011, EC-012, EC-013, EC-014, EC-017, EC-018, EC-019, EC-020, EC-021, EC-022, EC-023, EC-024, EC-025, EC-027, EC-028, EC-031 |
| C | 6 | EC-001, EC-010, EC-015, EC-016, EC-026, EC-034 |
| D | 0 | None |

No contract is automatically depth-ready because of its grade. Target claims,
deletion gates, mixed-version behavior, and disproof still require direct
proof.

## Contract Ledger

| ID | Grade | Owner and strongest evidence | Supported current fact | Main missing proof | Cheapest next slice |
| --- | --- | --- | --- | --- | --- |
| EC-001 | C | Semantic owners; `../rfcs/EC-001-owner-state-projection.md`, `../../openclaw-design/relationship-model.md` | Owners retain status, freshness, disclosure, and evidence authority. | One stable projection shape across unlike live owners. | Adapt two unlike owners and exercise stale and partial projection. |
| EC-002 | B | Doctor/diagnostic owner; `../../doctor/README.md`, `../../policy/policy-doctor-fix-rule-inventory.md` | Findings, previews, dry runs, and legacy fix paths already exist. | Stable repair-plan identity and separate preview/apply settlement. | Preview and apply one repair with structured rollback. |
| EC-003 | B | Credential/auth-profile owners; `../../openclaw-design/source-audit-credentials-secrets-auth-2026-08-01.md` | Credential material, runtime binding, resolved snapshots, leases, and principal sessions are distinct. | Operation-scoped stale-binding fencing and replay-safe recovery. | Rotate a credential during retry and reject the stale attempt. |
| EC-004 | B | Policy/approval owners; `../../policy/README.md`, `../../policy/agent-control-specification-plugin-proposal.md` | Existing decision paths distinguish allow, deny, warn/escalate, and transform-like outcomes. | Normalized allow/deny/review/modify decisions bound to intent and generation. | Modify intent and prove authorization must run again. |
| EC-005 | B | Trust-relationship owners; node and supply-chain source audits | Pairing generations, removal, revocation, and trust dispositions exist locally. | Portable revocation propagation and federated trust generations. | Revoke trust during a live connection and fence the consumer. |
| EC-006 | A | Configuration activation owner; configuration source audit and `../specialist-reviews/EC-006-007-evidence-packet.md` | Snapshot, candidate, CAS, preflight, canonical reread, supersession, rollback, and restart-debt behavior is tested. | Portable composed generation and managed-source authority. | Emit one portable generation and reject one stale managed source. |
| EC-007 | A | Activating-owner readiness surface; `../../hosting-profiles/` and the EC-006/007 packet | Canonical readiness is distinct from process existence and has package/upgrade proof. | Final accepted scope, protected disclosure, and retained-artifact behavior. | Exercise summary/detail authorization and provider replacement. |
| EC-008 | A | Agent execution runtime; `../../openclaw-design/source-audit-agent-execution-2026-08-01.md` | Run, lifecycle, runtime, provider/model attempts, persistence, and terminal outcomes are source-tested. | Stable attempt identity bound to normalized intent and policy/config generations. | Retry after a binding-generation change without log reconstruction. |
| EC-009 | A | Delegated execution runtime; delegated-execution audit and state-continuity bindings | Child creation, bounded control, restart reconciliation, cleanup retention, and identity fencing have direct evidence. | Parent trust-revocation fencing and separate cancel/cleanup settlement. | Revoke parent authority while a child settles and is cleaned up. |
| EC-010 | C | Scheduling owner only if independently proven; contract and role-review evidence | Scheduling must not own EC-008 run attempts. | A durable schedule/wake/lease owner that exists independently of a live run. | Restart a schedule and prove one fenced wake/lease creates an EC-008 attempt. |
| EC-011 | B | Provider routing; model/provider source audit and provider-attempt evidence slice | Fallback attempts and model calls exist, but identity and usage linkage are incomplete. | Durable candidate-attempt identity and per-candidate settlement/usage. | Primary failure followed by fallback success with per-candidate export. |
| EC-012 | B | Provider usage, run-total, and budget owners; model/provider audit | Failed and retried calls remain in aggregate usage while estimates and confirmed usage are distinct concerns. | Identity-based delayed usage reconciliation per candidate attempt. | Reconcile delayed provider usage for one fallback run. |
| EC-013 | B | Tool/plugin capability composition; tools/MCP source audit | Catalog membership does not prove runtime availability or authorization. | Stable negotiated surface identity and explicit unsupported/degraded states. | Negotiate one local and one MCP capability with failure variants. |
| EC-014 | B | Tool runtime plus effect owner; authorized-action evidence slice | Policy/approval paths exist, but effect identity and certainty are not consistently attached. | Accepted, unknown-after-dispatch, replay, and stale-policy effect settlement. | Run one idempotent approved effect through success, replay, timeout, and stale denial. |
| EC-015 | C | Messaging core and channel owners; channel swim lane and hosted-integration notes | Provider/local identity and thread/copy boundaries must remain distinct. | Dedicated source audit for conversation correlation across resets and route changes. | Round-trip one threaded conversation through reset and external copy creation. |
| EC-016 | C | Channel-native delivery owner; channel swim lane and contract | Acceptance is not delivery, and retry/idempotency are channel semantics. | Durable delivery-attempt identity and restart-safe ambiguous settlement. | Restart after an ambiguous send and resolve receipt versus unknown. |
| EC-017 | B | Session continuity/export owner; export/deletion evidence slice and privacy audit | Reset, fork, archive, export, canonical data, and derived copies are distinct. | Exact source-generation export identity and retained-copy settlement. | Export a branched session, omit one item, and retain one external copy during deletion. |
| EC-018 | B | Context assembly; sessions/context/memory source audit | Context is a bounded run projection; memory and context remain separate owners. | Per-input inclusion/exclusion provenance and hidden-context trust behavior. | Compare native and plugin context assembly with hidden input and provenance. |
| EC-019 | B | Memory owner plus policy owner; sessions/context/memory source audit | Canonical corpus, retrieval, write, provenance, and derived indexes are distinct. | Retrieval-time ACL enforcement and revocation through caches/indexes. | Revoke shared-memory access and prove stale retrieval is blocked. |
| EC-020 | B | Memory corpus owner; memory lifecycle evidence slice | Canonical files and derived indexes have cleanup and publication fencing. | Complete/partial/blocked lifecycle settlement across retained copies. | Delete one canonical file and exercise index cleanup plus retention hold. |
| EC-021 | B | Per-owner state owners plus restore coordinator; `../../state-continuity/` audits and slices | Independent capture, exact targets, restore holds, journals, quarantine, and readiness fencing are evidenced. | Mixed-generation prevention and truthful cross-owner partial settlement. | Restore two owners with one incompatible checkpoint and block mixed admission. |
| EC-022 | B | Gateway/ACP/MCP protocol owners; transport/protocol source audit | Version negotiation, additive evolution, N-1 support, replay, cancellation, and idempotent admission exist. | Language-neutral conformance and explicit support/removal windows. | Run fresh-install, upgrade, and downgrade between TypeScript and Rust peers. |
| EC-023 | B | Protocol/transport stream lifecycle; transport/protocol source audit | Ordering, backpressure, deadlines, cancellation, late-result rejection, and disconnect settlement exist. | Owner-declared replay safety and separation of transport from semantic settlement. | Disconnect and reconnect one stream; fence late results and reject unsafe replay. |
| EC-024 | B | Node pairing owner; node/device source audit | Pairing proof, approval, role tokens, generations, and connection incarnation are distinct. | Offline revocation convergence and portable trust-lifecycle evidence. | Revoke and reconnect a paired node with stale authority fenced. |
| EC-025 | B | Gateway/node invocation relationship; node audit and remote-invocation slice | Requests are policy/pairing/connection/deadline checked and late results are rejected. | Portable remote-effect certainty and durable route/policy correlation. | Exercise timeout, disconnect, late result, and route change in one fixture. |
| EC-026 | C | Proposed Rust Node runtime profile; TypeScript node audit and transition strategy | Current TypeScript node behavior provides the compatibility baseline. | Any real Rust canary, lifecycle profile, single-authority proof, and deletion gate. | Run one Rust node through restart/update and cross-language conformance. |
| EC-027 | B | Extension definition owners; supply-chain source audit/spec | Plugin manifests, capability declarations, install records, and precedence exist. | Stable definition identity and fail-closed unknown-required semantics. | Reject an unknown required field in one real extension manifest. |
| EC-028 | B | Artifact/install owners; supply-chain and release source audits | Immutable artifact identity, install policy, scans, quarantine, and rollback concepts exist. | Signed publisher/build provenance, SBOM, allowlists, and portable revocation. | Install one signed artifact and exercise one revoke/deny case. |
| EC-029 | A | Release/update relationship; release audit/spec and release-activation slice | Exact targets, staging, migration, service handoff, plugin convergence, readiness, and rollback limits are source-backed. | Portable component plan and layer-specific mixed-version recovery proof. | Produce one update bundle with an explicit downgrade refusal. |
| EC-030 | A | Semantic data owners; privacy audit plus memory/session lifecycle slices | Canonical/derived copies, archive, hold, redaction, export, and delete are distinguished. | Cross-owner lifecycle identity and external/backup purge settlement. | Delete one canonical and one derived copy while retaining one declared exception. |
| EC-031 | B | Scoped resource owners; resource-governance source audit/spec | Local limits, admission, leases, usage, cost observations, and projections exist. | Durable scoped quotas, cross-node leases, and restart reconciliation. | Admit, exhaust, restart, and reconcile one bounded lease. |
| EC-032 | A | Host controller plus runtime readiness owners; hosting-profile audits and proof | Profiles, canonical readiness, watch/wait/validate, and package conformance have direct proof. | Host lifecycle authority, restart receipts, and exact version combinations. | Cold-start, drain, restart, and recover one mixed-process deployment. |
| EC-033 | A | Evidence/audit/attestation owners; privacy/readiness audits and Signals slices | Typed findings, structured projections, stable identity, and cross-run correlation have executable examples. | A shared durable attestation base with chronology, integrity, and verifier semantics. | Produce and verify one tamper-evident cross-owner attestation. |
| EC-034 | C | Per-host owners with fleet composition; release audit, relationship model, and rollout analogues | Fleet state must remain a projection over unit owners with per-unit settlement. | Real target-set identity, containment certainty, break-glass authority, and repair proof. | Operate a mixed-version target set with one failed/contained unit and targeted repair. |

## Evidence Program Decision

Specialist panels pause until the relevant contract packets meet the
evidence-ready gate. The EC-006/EC-007 pilot remains valid and becomes the
reference packet, but later batches should not proceed from contract prose
alone.

The next evidence work starts with the six C-grade contracts, then the
high-risk B-grade authority, effect, recovery, compatibility, and lifecycle
relationships.
