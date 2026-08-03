# Data Governance and Resource Control Implementation Package

## Purpose

This package reconciles:

- EC-030 Data Lifecycle Obligations; and
- EC-031 Resource Admission and Usage.

The architecture must let unlike semantic owners satisfy lifecycle obligations
and resource constraints without creating:

- one global data inventory;
- one delete or retention switch;
- one mandatory quota manager;
- one scheduler that owns all work;
- one billing database; or
- one enterprise service required for ordinary local operation.

The package separates:

```text
data policy
  -> owner copy relationships
  -> owner lifecycle operations
  -> per-copy settlement

resource policy
  -> owner admission decision
  -> bounded lease or reservation
  -> owner usage observation
  -> causal reconciliation
```

OpenClaw owns portable owner capabilities, admission/enforcement behavior,
owner-local leases, usage observations, and truthful settlement. Lobster/Scout
owns tenant policy, legal hold, retention schedules, eDiscovery, residency,
budgets, placement, fairness, fleet capacity, allocation, and compliance
projection.

## Package Boundaries

| Boundary | Contracts | Owns | Does not own |
| --- | --- | --- | --- |
| DGR-01 Data classes and copy relationships | EC-030 | Canonical, derived, export, archive, backup, cache, evidence, and external-copy relationships | One central content inventory |
| DGR-02 Lifecycle authority and obligations | EC-030 | Requested mode, authority, policy generation, hold/exception state, owner capability | Owner-native data mutation |
| DGR-03 Per-owner lifecycle settlement | EC-030 | Complete, retained, deferred, blocked, external, unsupported, and unknown results | Synchronous global transaction |
| DGR-04 Resource policy and admission | EC-031 | Resource/scope/generation, allow/queue/defer/throttle/reject/cancel/kill/truncate outcomes | Work ownership or one global scheduler |
| DGR-05 Durable lease and reservation | EC-031 | Stable identity, capacity, expiry, renewal, fencing, revocation, restart settlement | Tenant allocation policy |
| DGR-06 Usage and causal reconciliation | EC-031 | Quantity/unit/time/outcome/confidence linked to causing operation or lease | Invoice-grade chargeback |
| DGR-07 Managed governance and capacity projection | EC-030, EC-031 | Cross-owner plans, retries, retention, budgets, placement, fairness, capacity, assurance | Rewriting owner results |

## Current Owner Map

### Data lifecycle

| Concern | Current owner and evidence | Package decision |
| --- | --- | --- |
| Session registry and transcript | Session lifecycle, delete/reset guards, transcript archive, disk-budget cleanup, archive compression | Reuse; distinguish archive-and-remove from purge |
| Session export | Existing `/export-session` reads a stable session identity and creates a workspace HTML copy with warnings | Extend through the knowledge package only for stable export/copy identity and omissions |
| Session indexes | Transcript active-event/FTS rows are removed transactionally with canonical transcript deletion | Reuse as owner-local propagation |
| QMD session projection | QMD owns derived Markdown, artifact mapping, retention cutoff, and best-effort stale cleanup | Treat cleanup as deferred owner settlement, not purge proof |
| File-backed memory | Workspace files are canonical for memory-core; source/chunk/vector/FTS/cache state is derived | Reuse; lifecycle extension waits for memory owner decisions |
| Memory mutation | #116484/#116485 and #116499-#116501 are the active read/delete/write/consent decision path | Adopt; no parallel memory lifecycle API |
| LanceDB memory | Independent row owner with agent-scoped delete | Preserve backend-local result; do not claim whole-memory deletion |
| Workspace/artifacts | Workspace, sandbox, state root, temporary files, exports, and support artifacts have separate owners | Reuse EC-035 boundaries |
| Messages and attachments | Channel/provider owners retain native message, attachment, draft, reaction, and delivery copies | Report external or owner-native outcomes; local transcript deletion does not imply provider deletion |
| Checkpoints/backups | Recovery-point and snapshot owners retain protected or deferred copies | Adopt EC-021; deletion must declare retained recovery state |
| Audit/evidence | Owner evidence and durable audit may remain under policy after content deletion | EC-033 owns redaction, integrity, and evidence retention |

### Resource control

| Concern | Current owner and evidence | Package decision |
| --- | --- | --- |
| Model/context/output limits | Model and agent configuration, context engine, compaction, and truncation owners | Reuse selections and owner outcomes |
| Gateway rate limits | Auth and control-plane rate limiters | Reuse owner-local enforcement |
| Agent concurrency | Agent limits, grouped lanes, session placement, child admission, and subagent registry | Reuse; adopt exact bugs/features rather than globalize |
| Cron admission | Durable run-admission owner with grouped budgets and queue behavior | Reuse; scheduling remains EC-010 |
| Reply queues | Queue owners enforce caps and queue policy | Reuse owner-native queue/defer/drop outcomes |
| Worktree leases | Run-lease owner provides local identity, expiry, stale-holder fencing, and cleanup | Use as one lease exemplar |
| Provider cooldown | Auth-profile usage and fallback cooldown owners | Keep route health separate from tenant quota |
| Disk pressure | Session disk-budget/archive owners; issue #105466 requests sandbox disk/workspace quota enforcement | Adopt bounded owner issue; lifecycle policy still constrains cleanup |
| Usage and cost | Existing model-call/run usage, pricing, session rollups, and Gateway usage reports | Reuse EC-012 package; do not duplicate accounting |
| Fleet capacity | Cell profiles and host signals provide local capacity/pressure facts | Lobster owns cross-fleet capacity and placement |

## Planning Boundary Details

### DGR-01 Data Classes and Copy Relationships

A copy relationship is owner-emitted evidence, not a new canonical database:

```text
canonical owner object
  -> transactional derived copy
  -> eventually reconciled projection
  -> retained archive or backup
  -> user-created export
  -> external provider copy
  -> lifecycle evidence
```

Each relationship identifies:

- source owner and source generation;
- copy owner and stable copy identity where available;
- purpose and relationship kind;
- whether it is transactionally coupled, rebuildable, retained, externally
  controlled, or unknown;
- propagation expectation; and
- current freshness or settlement state.

Owners without complete copy declarations remain compatible. Aggregate systems
must report `unknown` rather than infer completion.

### DGR-02 Lifecycle Authority and Obligations

Lifecycle policy and mutation authority remain distinct:

| Relationship | Owner |
| --- | --- |
| Data class, retention, residency, hold, encryption, tenant policy | Lobster/enterprise policy authority |
| Canonical object and supported lifecycle modes | Semantic owner |
| Operation authority and policy generation | Authorization/policy owners |
| Mutation | Semantic owner |
| Cross-owner plan and retry | Lobster coordinator |
| Evidence production | Semantic owner |
| Durable assurance and disclosure | Lobster/EC-033 |

Portable modes are bounded vocabulary, not identical implementation:

- export;
- unlink;
- archive-and-remove;
- purge;
- expire;
- hold;
- release hold; and
- report retained/external state.

### DGR-03 Per-Owner Lifecycle Settlement

Every known owner or copy settles independently:

```text
complete
retained
deferred
blocked
externally_controlled
unsupported
unknown
```

Aggregate completion is valid only when every required relationship is
terminal and retained exceptions satisfy the selected policy. A failure to
remove one derived projection after canonical deletion is a partial operation
with retryable work, not generic success and not automatic rollback of the
canonical mutation.

The first proof should reuse the bounded session export/deletion fixture:

- canonical transcript rows;
- transactionally coupled indexes;
- workspace export;
- QMD projection;
- retained delete archive;
- simulated backup; and
- external provider copy.

Memory follows only after #116484/#116485 and #116499-#116501 settle owner
semantics.

### DGR-04 Resource Policy and Admission

Resource policy names:

- resource owner and resource kind;
- scope and subject;
- hard/soft limit, burst, priority, or window;
- policy generation and authority;
- enforcement point;
- absence/default behavior; and
- latency budget.

Admission preserves the owner's native outcome:

```text
allow | queue | defer | throttle | reject | cancel | kill | truncate
```

These outcomes cannot be flattened into `allowed: boolean`. For protected or
high-risk work, missing required managed admission fails closed. Ordinary local
operation remains complete when no managed policy is selected.

### DGR-05 Durable Lease and Reservation

Current OpenClaw has several lease-like mechanisms, but no one portable
restart-safe contract. The cheapest decisive EC-031 proof is one bounded
resource:

```text
allocate one capacity unit
  -> persist lease identity and admitted generation
  -> exhaust the resource
  -> restart the owner
  -> fence the stale holder
  -> renew or expire the live lease
  -> reconcile terminal settlement
```

The first fixture should compare Cron admission, a worktree run lease, and one
child/subagent slot. It should not merge their stores or schedulers. A shared
lease envelope is justified only if the same identity/fencing/settlement
semantics survive all three.

### DGR-06 Usage and Causal Reconciliation

Usage remains owner-native and links causally to:

- operation or run;
- candidate/model call where applicable;
- admission decision;
- lease/reservation;
- resource identity;
- issued, observed, and reconciled times;
- quantity and unit;
- confidence and coverage; and
- correction/supersession.

EC-012 owns model/provider usage and cost provenance. EC-031 consumes those
facts for admission and allocation; it must not create another usage total.

### DGR-07 Managed Governance and Capacity Projection

Lobster composes owner facts into:

- tenant/user/app data obligations;
- retention schedules and legal hold;
- eDiscovery and subject export;
- retry and exception workflows;
- approved budgets and reservations;
- placement, fairness, and capacity targets;
- anomaly and consumption views;
- operator remediation; and
- compliance assurance.

Managed policy may deny, delay, or constrain future work. It does not rewrite
whether an OpenClaw owner deleted a copy, admitted a run, held a lease, or
observed usage.

## Existing Investment Crosswalk

### OpenClaw

| Investment | Live state on 2026-08-02 | Disposition |
| --- | --- | --- |
| Session delete/reset/archive/disk-budget owners | Existing source | Reuse; ordinary delete is not purge |
| Session export | Existing source | Extend only through U-KCC-01 |
| Memory delete contract #116484 | Open | Adopt decision |
| Safe memory deletion #116485 | Open | Adopt decision |
| Memory semantic writes #116499 | Open | Adopt decision |
| Protected memory paths #116500 | Open | Adopt decision |
| Standing memory consent #116501 | Open | Adopt decision |
| Cost provenance #90674 | Open | Adopt through EC-012; no duplicate financial semantics |
| Workspace disk quota #105466 | Open | Adjacent bounded owner issue; keep lifecycle and quota semantics separate |
| Hybrid subagent usage/budget #112086 | Open | Adjacent aggregation/enforcement thread; do not treat as the global EC-031 owner |
| Ended subagent quota blockage #66187 | Open | Exact owner bug; fix/adopt independently of portable lease work |
| Session lane concurrency #53023 | Open | Product/config decision adjacent to resource policy |
| Per-agent maxConcurrent projection #8061 | Open | Projection request, not admission authority |

### Lobster and Scout

| Investment | State on 2026-08-02 | Disposition |
| --- | --- | --- |
| Budget plugin #3371 | Merged 2026-06-20 | Downstream read-only analysis owner |
| Budget UX #3379 | Merged 2026-06-21 | Downstream projection |
| Budget governance evidence #3742 | Merged 2026-07-01 | Downstream policy/evidence input |
| Purview/eDiscovery/retention #5378 | Open | Enterprise lifecycle/compliance owner |
| Memory note retention #5914 | Open | Exact retained-growth issue |
| Session reset archive accumulation #5318 | Open | Exact retained-copy issue |
| Licensing/token caps #556 | Open | Enterprise budget/licensing decision |
| Token budget UX #3912 | Open | Managed UX |
| Consumption dashboard #3913 | Open | Managed projection |
| Capacity for approximately 30k users #6428 | Open | Fleet capacity evidence |
| GPU/TPS capacity planning #98 | Open | Infrastructure capacity owner |
| Memory delete #6149 | Open | Adopter of #116484/#116485 |
| Memory write governance #6336-#6338 | Open | Adopters of #116499-#116501 |

The current #5402 promotion baseline carries memory, approval, Automation,
Teams, secrets, node, and compatibility patches. It does not provide a generic
cross-owner lifecycle settlement or restart-portable resource lease. Patch
retirement remains linked to the exact owner replacement, not this package as a
whole.

## Reconciled Upstream Workstreams

| Workstream | Existing coverage | Residual decision |
| --- | --- | --- |
| U-DGR-01 session export/copy identity | Existing export owner and U-KCC-01 | Adopt the knowledge package; do not file another exporter |
| U-DGR-02 session lifecycle settlement | Guarded delete, transactional index cleanup, archives, QMD, backups, external copies | Build the bounded fixture. Add only missing owner result/copy references. |
| U-DGR-03 memory lifecycle settlement | #116484/#116485 and #116499-#116501 plus EC-020 | No work before owner decisions. Then test current status/evidence before a residual ask. |
| U-DGR-04 resource decision vocabulary | Many owner-specific admission outcomes | Build unlike-owner fixtures. Add a common envelope only if projections cannot preserve native outcomes. |
| U-DGR-05 durable lease identity | Cron admission, worktree lease, child/subagent slots | Persist/exhaust/restart/reconcile one resource. File only the proven missing identity/fencing/settlement seam. |
| U-DGR-06 usage causality | EC-011/EC-012 package, model calls, run totals, usage reports | Reuse candidate/call/run links; no second usage ledger. |
| U-DGR-07 bounded disk/workspace quota | #105466 | Adopt the exact owner issue rather than generalizing into global quota work. |
| U-DGR-08 subagent quota correctness | #66187, #112086, #53023, #8061 | Resolve bugs/product projections in their owners; use as conformance inputs, not the shared lease contract. |

No new upstream issue or PR is ready from this package. EC-030 first requires a
truthful session fixture. EC-031 first requires the bounded restart-safe lease
proof. Filing remains subject to explicit authorization.

## Fork and Adapter Ledger

| Item | Class | Purpose | Current relationship | Exit |
| --- | --- | --- | --- | --- |
| Session lifecycle settlement fixture | B1 | Prove canonical, derived, retained, external, and unknown results | Existing session/QMD/export owners | Upstream owner extension or delete |
| Memory lifecycle settlement fixture | B1 | Prove canonical/index/cache/export results after owner decisions | #116484/#116485/#116499-#116501 | Upstream owner extension or delete |
| Portable lease fixture | B1 | Compare Cron, worktree, and child-slot identity/fencing/restart settlement | No accepted shared thread | Upstream narrow owner seam or reject shared contract |
| Managed retention coordinator | B2 | Apply tenant obligations, holds, retries, exceptions, and assurance | Lobster #5378 and memory/session issues | Remain downstream |
| Memory policy/consent adapters | B2 | Resolve tenant authority and standing consent | Lobster #6149/#6336-#6338 | Remain downstream; delete compatibility path after adoption |
| Budget plugin and UX | B2 | Read-only analysis, recommendations, and projections | Merged #3371/#3379/#3742 | Remain downstream |
| Managed quota/admission adapter | B2 | Apply tenant limits before native owner admission | EC-031 future seam | Remain downstream |
| Legacy name/path copy inference | B3 | Reconstruct copy relationships from paths and current state | Existing support pattern | Delete after stable copy identities |
| Aggregate-only usage joins | B3 | Infer resource usage from time/provider/current state | Existing support workaround | Delete after causal operation/lease links |
| Carried memory list/delete compatibility | B3 | Preserve current hosted memory UX | #5402 plus memory decision stack | Delete after released accepted owner contract |

## Lobster and Scout Capabilities

| Capability | Owner responsibility | Portable dependency |
| --- | --- | --- |
| Data policy registry | Data classes, tenant/user/app scope, retention, residency, encryption, legal basis, and policy generation | DGR-01/DGR-02 |
| Hold and exception workflow | Authority, reason, expiry/release, blocked operations, approvals, and disclosure | Owner capability/result |
| Subject export/eDiscovery | Cross-owner plan, authorization, destination, disclosure, omissions, expiry, and assurance | U-KCC-01 plus DGR-03 |
| Lifecycle coordinator | Fan out owner-native operations, persist child identities, retry deferred work, preserve retained/external/unknown | DGR-03 |
| Memory governance | Delete/write consent, protected paths, retention, and user/admin UX | #116484/#116485/#116499-#116501 |
| Budget policy | Soft/hard limits, reservations, burst, priority, and feature/workload caps | DGR-04/DGR-05 |
| Placement and fairness | Tenant/workload allocation, queue class, node/runtime placement, and support posture | Owner admission plus EC-034 |
| Usage allocation | Approved rate cards, attribution, coverage, corrections, invoice import, and chargeback | EC-012/DGR-06 |
| Capacity management | Fleet supply, reservations, pressure, SLO risk, and expansion planning | Owner capacity/readiness facts |
| Governance UX | Explain blocked, deferred, retained, exhausted, stale, partial, and unknown states with owner action | All package results |

## Optional Rust Components

| Component | Purpose | Promotion gate |
| --- | --- | --- |
| Rust lifecycle plan/settlement coordinator | Track cross-owner operations and per-copy results without storing content | Stable EC-030 fixtures and Lobster owner adoption |
| Rust lease manager/supervisor | Own one bounded resource lease with persistence, renewal, fencing, revocation, and restart settlement | Language-neutral EC-031 fixture and one selected owner |
| Rust usage reconciler | Link delayed owner observations to operation/lease identities | Stable causal usage contract and correction semantics |

Rust must not become the content owner, tenant policy database, universal
scheduler, or billing ledger. Promotion requires one authoritative
implementation selected before admission, compatible state migration, canary,
rollback, and exact TypeScript/adapter deletion.

## Operator Journey

```text
inspect lifecycle request
  -> authority and policy generation
  -> target owner and source generation
  -> requested mode
  -> known copy relationships
  -> complete / retained / deferred / blocked / external / unsupported / unknown
  -> retry, hold release, or assurance action

inspect resource decision
  -> resource and scope
  -> policy generation
  -> allow / queue / defer / throttle / reject / cancel / kill / truncate
  -> lease/reservation identity and expiry
  -> usage and reconciliation
  -> budget/capacity projection
```

## Acceptance Gates

### Data lifecycle

- Canonical, derived, export, archive, backup, evidence, and external copies
  remain distinguishable.
- Every lifecycle operation binds owner, target generation, authority, policy
  generation, mode, and operation identity.
- Owner capability and unsupported behavior are explicit.
- Aggregate completion requires terminal results from all required owners.
- Retained, deferred, externally controlled, and unknown copies are never
  reported as deleted.
- Ordinary session archive-and-remove is not labeled purge.
- Evidence contains no prohibited content and does not claim masking equals
  canonical deletion.

### Resource admission and leases

- Policy, admission, lease, usage, and allocation identities remain separate.
- Native outcomes preserve queue/defer/throttle/reject/cancel/kill/truncate.
- One bounded lease survives restart, fences stale holders, and settles
  terminally.
- Lost acknowledgement reconciles by lease/operation identity rather than
  allocating twice.
- Exhaustion behavior follows the operation risk class.
- Disabling managed policy preserves ordinary local operation.
- Admission stays within the owner's latency budget.

### Usage and managed composition

- Usage links causally to operation/lease/candidate/call where supported.
- Issued, observed, and reconciled times are distinct.
- Corrections supersede rather than overwrite prior evidence.
- Lobster may constrain future work but cannot rewrite owner settlement.
- Legal hold, tenant retention, budgets, fairness, chargeback, and fleet
  capacity remain downstream.

## Dependency-Ordered Work Items

| ID | Work item | Classification | Layer | Depends on | Acceptance | Deletion target |
| --- | --- | --- | --- | --- | --- | --- |
| DGR-001 | Freeze lifecycle/resource inventory | Reuse | Planning | - | Source owners, live issues/PRs, Lobster investments, patch relationship, and dates recorded | Stale duplicate inventory |
| DGR-002 | Define data/copy identity matrix | Reuse | Planning | DGR-001 | Canonical, derived, export, archive, backup, evidence, external, and unknown identities separated | Global content inventory |
| DGR-003 | Define lifecycle plan, operation, and result matrix | Reuse | Contract | DGR-002, XPK-002 | Plan ID, accepted membership generation, immutable required-copy set, child IDs, acceptance time, export/unlink/archive/purge/expire/hold, and all terminal states are separated | Boolean deleted |
| DGR-004 | Define resource identity matrix | Reuse | Planning | DGR-001 | Policy, decision, reservation, lease, usage, allocation, and capacity identities separated | Global budget identity |
| DGR-005 | Freeze session lifecycle fixture | Reuse evidence | Evidence | DGR-002, DGR-003 | Canonical/index/export/QMD/archive/backup/external relationships versioned | Path-only copy inference |
| DGR-006 | Bind session source generation | Extend existing | Evidence | DGR-005 | Export/delete target exact session ID, branch, transcript generation, and lifecycle revision | Latest-session inference |
| DGR-006A | Recheck authority, policy generation, and legal hold immediately before mutation | Extend existing | Evidence | DGR-006, XPK-004 | Newly applied hold, revoked authority, changed generation, or target conflict blocks destructive effect before bytes change | Preview-time-only authorization |
| DGR-007 | Prove ordinary archive-and-remove | Extend existing | Evidence | DGR-006A | Canonical/index removal plus retained archive/QMD/backup/external results are truthful | Delete equals purge |
| DGR-008 | Prove bounded local purge | New ask candidate | B1 evidence | DGR-006A | Required bounded local copies absent after restart reconciliation; no retained archive | In-memory cleanup claim |
| DGR-008A | Prove lost lifecycle-child acknowledgement reconciliation | Extend existing | Evidence | DGR-007, DGR-008 | Retry looks up plan/child operation identity and cannot duplicate delete, purge, export, or copy settlement | Blind lifecycle replay |
| DGR-009 | Prove deferred QMD cleanup | Extend existing | Evidence | DGR-007 | Forced cleanup failure remains visible/retryable after restart | Best-effort cleanup as complete |
| DGR-010 | Adopt U-KCC-01 export identity | Adopt | Upstream | DGR-006 | One export owner adds stable copy/omission evidence; no duplicate exporter | Parallel export API |
| DGR-011 | Decide U-DGR-02 lifecycle residual | New ask candidate | Upstream | DGR-007, DGR-008, DGR-008A, DGR-009 | Only missing owner result/copy references added to current lifecycle owners | Universal deletion service |
| DGR-012 | Adopt #116484/#116485 | Adopt/defer | Upstream | DGR-001 | Memory delete namespace, containment, race, persistence, and idempotence decisions settle | Duplicate memory delete |
| DGR-013 | Adopt #116499-#116501 | Adopt/defer | Upstream | DGR-001 | Semantic writes, protected paths, and standing consent settle | Raw write governance fork |
| DGR-014 | Consume KCC memory-native copy settlement | Adopt | Evidence | KCC-024 through KCC-026 | Canonical file and derived index/cache/export owners report separate outcomes; DGR does not redefine memory semantics | Backend row as whole-memory proof |
| DGR-015 | Map memory copy facts into the obligation planner | Reuse | Contract | DGR-003, DGR-014 | Memory facts become plan children without another upstream memory lifecycle ask | Parallel memory lifecycle |
| DGR-016 | Inventory checkpoint/audit retained exceptions | Reuse | Contract | DGR-002, KCC-028, XPK-003 | Protected recovery/evidence copies declare policy, expiry/release, integrity, and result | Hidden retained state |
| DGR-017 | Define owner capability declaration | Extend existing | Contract | DGR-003 | Unsupported lifecycle modes are explicit without invalidating ordinary owners | Assumed purge support |
| DGR-018 | Reconcile Lobster Purview/eDiscovery #5378 | Downstream-only | Lobster | DGR-003, DGR-016 | Enterprise policy/hold/export requirements map to owner capabilities/results | Purview semantics upstream |
| DGR-019 | Reconcile retained-growth issues #5914/#5318 | Adopt | Lobster | DGR-007 | Memory notes and reset archives have explicit policy and remediation owners | Unbounded silent retention |
| DGR-020 | Reconcile Lobster memory adopters | Adopt | Lobster | KCC-022, KCC-023, DGR-014 | #6149/#6336-#6338 consume accepted upstream owners and KCC settlement facts | Permanent memory patch |
| DGR-021 | Define resource policy/outcome fixture | Reuse evidence | Evidence | DGR-004 | Cron, child, queue, and disk owners preserve native decisions and reasons | Allow/deny flattening |
| DGR-022 | Audit admission latency and fail-open rules | Extend existing | Evidence | DGR-021 | Required managed decision behavior and ordinary local absence behavior are explicit | Hidden network dependency |
| DGR-023 | Inventory Cron admission identity | Reuse | Evidence | DGR-004 | Slot/reservation identity, generation, queue, release, and restart facts recorded | Scheduler rewrite |
| DGR-024 | Inventory worktree lease identity | Reuse | Evidence | DGR-004 | Lease ID, holder, expiry, fencing, cleanup, and stale-owner behavior recorded | File-lock inference |
| DGR-025 | Inventory child/subagent slot identity | Reuse | Evidence | DGR-004 | Admission generation, slot ownership, completion, and cleanup facts recorded | Process-local counter only |
| DGR-026 | Build restart-safe bounded lease fixture | New ask candidate | B1 evidence | DGR-023, DGR-024, DGR-025 | Allocate, exhaust, restart, fence, renew/expire, and settle one unit | Hypothetical lease abstraction |
| DGR-027 | Prove lost lease acknowledgement | Extend existing | Evidence | DGR-026 | Lookup by lease/operation identity prevents duplicate allocation | Retry creates second lease |
| DGR-028 | Prove lease revocation and stale holder | Extend existing | Evidence | DGR-026 | Revoked/expired generation cannot continue consuming capacity | Expiry without fencing |
| DGR-029 | Decide U-DGR-05 portable lease residual | New ask candidate | Upstream | DGR-026, DGR-027, DGR-028 | Small identity/fencing/settlement seam proven necessary or shared contract rejected | Global lease service |
| DGR-030 | Adopt #105466 bounded disk quota | Adopt/defer | Upstream | DGR-021 | Sandbox/workspace owner defines enforceable growth limit and explicit outcome | Disk cleanup as quota |
| DGR-031 | Adopt #66187 quota-release fix | Adopt/defer | Upstream | DGR-025 | Ended subagent no longer consumes maxConcurrent capacity | Shared lease workaround |
| DGR-032 | Evaluate #112086 hybrid usage/budget | Adopt/defer | Upstream | DGR-021, DGR-025 | Owner-approved scope remains aggregation/enforcement, not global accounting | Duplicate usage system |
| DGR-033 | Keep #53023/#8061 product decisions separate | Adopt/defer | Upstream product | DGR-021 | Configuration/projection does not become admission authority | Config value as lease |
| DGR-034 | Link usage to lease/operation | Extend existing | Evidence | DGR-026, MPU-006, MPU-009A | Observation references causal candidate/call/run or lease identity with explicit legacy/unknown linkage | Time-window joins |
| DGR-035 | Prove delayed usage reconciliation | Extend existing | Evidence | DGR-034 | Late observation updates allocation once without changing owner total | Batch-window attribution |
| DGR-036 | Adopt #90674 cost provenance | Adopt/defer | Upstream | DGR-034 | Billed/estimated/free/unavailable/partial/unknown remain explicit | Numeric zero certainty |
| DGR-037 | Preserve run-total ownership | Reuse | Contract | DGR-034, MPU-025 | Resource allocation consumes unchanged call/run totals | Quota-owned usage total |
| DGR-038 | Reconcile merged Budget stack | Adopt | Lobster | DGR-001 | #3371/#3379/#3742 remain read-only analysis/UX/evidence | Core Budget package |
| DGR-039 | Define tenant budget reservation | Downstream-only | Lobster | DGR-026, DGR-034, XPK-005 | Scope, authority, capacity, expiry, exhaustion, release, and late settlement consume the selected owner-native seam even if U-DGR-05 is rejected | Global OpenClaw budget manager |
| DGR-040 | Reconcile licensing and budget UX | Downstream-only | Lobster | DGR-038, DGR-039 | #556/#3912/#3913 consume owner decisions and coverage-aware usage | Product policy upstream |
| DGR-041 | Define fleet capacity projection | Downstream-only | Lobster | DGR-021, OAF-042 | #6428/#98 consume fresh per-unit capacity/readiness with partial coverage | Fleet scheduler upstream |
| DGR-042L | Build language-neutral lifecycle fixtures | New component | Evidence | DGR-011, DGR-015, XPK-007 | Complete/retained/deferred/external/hold-race/lost-ack cases are versioned independently | Implementation-specific lifecycle proof |
| DGR-042R | Build language-neutral lease and usage fixtures | New component | Evidence | DGR-029, DGR-035, XPK-007 | Allocate/exhaust/restart/revoke/fence/lost-ack/delayed-usage cases are versioned independently | Implementation-specific lease proof |
| DGR-043 | Implement Rust lifecycle coordinator | New component | Rust | DGR-042L | Tracks immutable plan/child settlement without storing content or policy values | Rust data owner |
| DGR-044 | Implement bounded Rust lease owner | New component | Rust | DGR-042R | One resource persists, renews, fences, revokes, and settles compatibly | Universal Rust scheduler |
| DGR-046 | Prove pre-cutover lease migration, mixed-version, and rollback readiness | New component | Release | DGR-044, EAR-033, XPK-006, XPK-008, XPK-009 | Current-owner release/recovery, lease state import, restart, old/new readers, downgrade refusal, rollback limit, and unknown settlement are proven before authority changes | Canary-first migration |
| DGR-045 | Canary one authoritative lease implementation | New component | Migration | DGR-046, XPK-010 | TypeScript or Rust selected before admission; no dual capacity allocation | Dual lease authority |
| DGR-046R | Prove post-canary rollback and settlement limits | New component | Release | DGR-045 | Canary restart, revocation, late settlement, and rollback behavior match the pre-cutover proof | Binary rollback as resource rollback |
| DGR-047 | Delete superseded owner and adapters | Delete | Release | DGR-046R, XPK-009 | Exact TypeScript owner path and temporary migration/inference adapters removed | Permanent dual implementation |

## Sequencing

```text
inventory and identity matrices
  -> immutable session lifecycle plan, hold fence, and lost-ack fixture
  -> consume KCC memory mutation/copy facts
  -> owner capability and retained-exception contract
  -> unlike admission outcome fixtures
  -> restart-safe bounded lease proof
  -> causal usage reconciliation
  -> Lobster retention, budgets, and capacity composition
  -> separate language-neutral lifecycle and lease fixtures
  -> optional Rust coordinator or lease owner
  -> pre-cutover migration and rollback readiness
  -> authoritative canary
  -> TypeScript and adapter deletion
```

## Findings

1. **OpenClaw already has meaningful lifecycle owners.** The missing contract
   is truthful per-copy settlement, not a universal retention service.
2. **Ordinary session deletion is archive-and-remove.** Retained delete/reset
   archives, QMD projections, backups, and provider copies prevent a purge
   claim.
3. **Memory work already has owner decisions.** #116484/#116485 and
   #116499-#116501 must settle before any lifecycle implementation.
4. **OpenClaw already has broad resource controls.** Limits, lanes, queues,
   cooldowns, timeouts, disk pressure, and usage reporting should be preserved.
5. **EC-031 remains B-grade for one reason.** No current proof persists,
   exhausts, restarts, fences, and reconciles one portable bounded lease.
6. **Resource outcomes are owner-specific.** Queue, defer, throttle, reject,
   cancel, kill, and truncate cannot collapse into allow/deny.
7. **Usage accounting is not owned here.** EC-011/EC-012 remain authoritative;
   EC-031 links admission and allocation to their facts.
8. **Lobster already owns the enterprise layer.** Budget plugin/UX/evidence are
   merged, while Purview, retention, licensing, budget, and capacity issues are
   active downstream investments.
9. **Neither current patch carry nor Rust justifies a global manager.** Fork
   work is bounded proof/adoption, and Rust may replace one complete lease or
   settlement owner only after conformance and deletion proof.

## Package Exit

This package is complete when:

- the bounded session fixture reports canonical, derived, retained, external,
  deferred, and unknown outcomes truthfully under immutable accepted
  membership, final authority/hold fencing, and lost-ack reconciliation;
- memory lifecycle consumes KCC owner-native mutation and copy-settlement facts
  without defining a second memory lifecycle;
- owner capability and retained-exception behavior are explicit;
- one bounded resource persists, exhausts, restarts, fences, and settles by
  stable lease identity;
- admission outcomes remain owner-native and ordinary local operation remains
  complete without managed policy;
- usage reconciles causally without creating another total or billing ledger;
- Lobster retention, legal hold, budgets, placement, and capacity consume but
  do not rewrite owner facts; and
- any Rust replacement deletes one superseded TypeScript owner plus temporary
  compatibility and inference adapters only after pre-cutover migration,
  mixed-version, and rollback proof.
