# Configuration and Activation Implementation Package

Status: reconciled implementation package  
Last validated: 2026-08-02  
EnterpriseClaw contracts: EC-006, EC-007, EC-010

## Executive Decision

OpenClaw already has three strong owner systems:

1. configuration parsing, validation, runtime snapshots, transactional writes,
   hot reload, restart debt, and recovery;
2. a complete active readiness and hosting-profile investment stack; and
3. a durable Cron/Automations scheduler with independent schedule, occurrence,
   catch-up, cancellation, and restart state.

The implementation strategy is therefore to:

- land the bounded ordered-config-layer seam in #107026 before expanding it;
- connect managed sources to the existing configuration activation owner
  rather than building a second configuration database or runtime;
- adopt #104018/#113421/#113422/#114636 as the readiness and profile path;
- adopt existing Automation issues #77298, #113441, and #113443 where they own
  exact residuals;
- prove one portable schedule-generation, occurrence, and activation identity
  before proposing another scheduler surface;
- keep payload-free absent-compute wake, tenant desired state, rollout,
  placement, repair, and operator administration in Lobster; and
- delete Lobster overlay writers, private readiness evaluators, source-specific
  wake races, and carried Cron patches only after their replacements ship.

```text
authored sources
  -> OpenClaw resolution and authority
  -> accepted runtime generation
  -> owner-native readiness observations
  -> optional host/fleet projection

schedule definition
  -> occurrence
  -> durable activation acceptance
  -> downstream operation
  -> separate activation and work settlement
```

## Owner Model

| Owner | Responsibility |
| --- | --- |
| Configuration activation owner | Source resolution, validation, materialization, accepted runtime snapshot, reload/restart planning, rollback, and debt |
| Source owner | Authored document contents, source generation, secure materialization, and declared order |
| Field owner | Schema meaning, defaults, compatibility, validation, runtime behavior, and bounded authority comparison |
| Readiness producer | Generation-bound owner observation, criterion semantics, freshness, reason, and related subjects |
| Hosting profile owner | Named supported criterion composition and package/release conformance |
| Scheduling owner | Schedule lifetime/generation, occurrence, reservation, catch-up, cancellation, and activation settlement |
| Downstream operation owner | Run, command, script, heartbeat, delivery, or effect lifecycle after dispatch |
| Lobster | Tenant desired state, source storage/materialization, rollout, host wake, placement, fleet projection, and operator UX |

Configuration acceptance, readiness, process lifecycle, fleet convergence, and
downstream execution are related but remain different owner contracts.

## Area RFC Boundaries

| Area RFC | EnterpriseClaw source | Boundary |
| --- | --- | --- |
| CFA-01 Ordered configuration sources and field authority | EC-006 | Source identity/order, resolution, exact authority, conflicts, compatibility, and provenance |
| CFA-02 Accepted and active configuration generations | EC-006 | Candidate, preflight, commit, canonical reread, runtime publication, rollback, restart debt, and status |
| CFA-03 Owner readiness observations | EC-007 | Producer, criterion, subject, generation, required/advisory status, freshness, reason, availability, and recovery |
| CFA-04 Hosting-profile and readiness facilities | EC-007, EC-032 | Watch, wait, inspect, validate, release conformance, and host consumption without another evaluator |
| CFA-05 Scheduled occurrence and activation lifecycle | EC-010 | Schedule generation, occurrence, reservation, durable acceptance, dispatch correlation, cancellation, catch-up, and settlement |
| CFA-06 Absent-compute wake and readiness handoff | EC-010, EC-032 | Payload-free retained cause, one destination generation, provisioning, exact readiness, and owner delivery |

These are planning boundaries, not six automatic upstream RFCs.

## Current OpenClaw Owner Seams

| Concern | Existing seam | Current strength | Residual gap |
| --- | --- | --- | --- |
| Config read/materialization | Config IO and schema/plugin owners | JSON5, includes, env, migration, validation, defaults, plugin metadata, runtime materialization | Generic ordered external sources and source provenance are not on current main |
| Runtime snapshot | `runtime-snapshot` owner | Separate source/runtime snapshots, revision, source/runtime fingerprints, pinning | Revision is process-local; no portable accepted-generation projection |
| Config writes | Config write flow | Validation, preflight, managed owner scope, expected-base conflict, commit, canonical reread, activation, bounded rollback | Managed source routing and multi-source write ownership are intentionally outside V1 |
| Reload | Gateway managed reload | Candidate preparation, supersession, hot commit, owner actions, restart target/debt, recovery | Operator vocabulary is distributed and not one generation/status view |
| Ordered layers | #107026 | Opt-in repeated ordered ordinary documents, exact authority, bounded tool-policy tightening, immutable startup snapshot | Startup-only/read-only V1; no provenance API, reload, write routing, or portable generations |
| Readiness framework | #104018 | Canonical conditions/providers/subjects, compatibility-preserving opt-in, machine/human projections | Not landed |
| Core readiness | #113421 | Reusable inert observations over current owner snapshots | Depends on #104018; not landed |
| Hosting profiles | #113422 | Four named profiles and package scenarios | Depends on readiness stack; not landed |
| Readiness/profile facilities | #114636 | Catalog, live validation, package release evidence | Depends on profile stack; not landed |
| Cron/Automations | `src/cron/` | Persisted jobs, normalized schedules, due/manual distinction, catch-up, pacing, queued/running markers, restart recovery, cancellation, separate execution/delivery outcomes | No uniform portable occurrence/activation identity across trigger kinds |
| Restart-interrupted status | #77298 | Exact issue for health-counter pollution after Gateway restart | Owner decision on `skipped` versus public `interrupted` |
| Automation hook identity | #113441 | Existing issue for immutable job/run/revision hook context | Owner confirmation and implementation |
| Staged Automation publication | #113443 | Existing issue for fail-closed non-runnable publication/finalization | Owner confirmation and implementation |

## Existing-Investment Crosswalk

### Configuration

| Investment | State on 2026-08-02 | Classification | Package consequence |
| --- | --- | --- | --- |
| OpenClaw RFC #34, Managed Configuration | Open draft, head `5b33475052c` | Adopt | Normative bounded V1 path |
| OpenClaw #107026 ordered config layers | Open non-draft, head `409fab999c40` | Adopt | Rebase/review/land before adding generation or live-write scope |
| Current config activation owner | Present on main | Reuse | Integrate external layers with existing snapshot/reload owner |
| `giodl/lobster#12` | Open draft, head `0d37e2a34b45` | B2 adopter | Three-file Scout global/tenant/operator adapter |
| Lobster allowed-origins overlay | Present | B3 deletion | First exact writer-removal proof after conformant release |
| Broad managed-config fork prototypes | Fork-only | B1 evidence | Preserve evidence; do not land broad generation/controller prototype |

The key finding is that EC-006's target is broader than #107026 V1. The safe
sequence is bounded source adoption first, then evidence-led integration with
the existing activation owner.

### Readiness and hosting profiles

| Investment | State on 2026-08-02 | Classification | Package consequence |
| --- | --- | --- | --- |
| RFC #33 readiness conditions | Open non-draft, head `fae4ea1636c1` | Adopt | Canonical readiness contract |
| #104018 readiness framework | Open non-draft, head `2f131c6e2204` | Adopt | Foundation |
| #113421 core owner conditions | Open non-draft, head `c1d7f394f866` | Adopt | Owner adoption |
| RFC #37 standard hosting profiles | Open non-draft, head `e931e8d95e15` | Adopt | Supported profile contract |
| #113422 hosting profiles | Open non-draft, head `18c42a7f26ab` | Adopt | Profile implementation |
| #114636 profile facilities | Open non-draft, head `123bae7b876e` | Adopt | Inspection, validation, and package evidence |
| Fork readiness facility slices #167/#169/#171/#172/#173/#174 | Fork-only proof | B1 | Review aids; delete/archive after upstream adoption |

No new readiness framework or private host evaluator is justified.

### Scheduling and host wake

| Investment | State on 2026-08-02 | Classification | Package consequence |
| --- | --- | --- | --- |
| Current Cron owner | Present | Reuse | Preserve scheduler as independent owner |
| RFC #50 Automations terminology | Merged, head `2841c8724992` | Reuse | User-facing terminology only; does not change internal owner contracts |
| #77298 restart interruption | Open issue | Adopt | Existing exact patch-retirement path |
| #113441 hook identity | Open issue | Adopt | Existing Automation identity decision |
| #113443 staged publication | Open issue | Adopt | Existing fail-closed publication decision |
| Carried `0015` restart-status patch | Current Lobster baseline | B3 | Delete after #77298 resolution ships |
| Carried `0018` Automation identity patch | Current Lobster baseline | B1/B3 | Replace through #113441 or remove |
| Carried `0019` Passport fence | Current Lobster baseline | B2 | Remain downstream regional/duplicate-execution policy |
| `giodl/lobster#39` | Open draft, head `3080b0835192` | B2 evidence | Durable Cron wake projection |
| `giodl/lobster#46/#47` | Open drafts, heads `9ec773467851`/`4c03d0b1e7db` | B2 evidence | Coalesced retained wake authority and owner validation |
| `giodl/lobster#51` | Open draft, head `f6248d965689` | B2 evidence | Readiness-gated retained wake delivery |
| `bic/lobster#5481` | Open non-draft, head `277812458306` | Managed adoption | Shared host acceptance/continuity dependency |

Host wake is composition over scheduler, retained-cause, lifecycle, readiness,
and delivery owners. It is not a new generic OpenClaw wake API.

## Residual Upstream Workstreams

### U-CFA-01: Adopt bounded ordered config layers

Land #107026 and RFC #34 without adding:

- layer roles or Microsoft semantics;
- live layer reload;
- write routing;
- a provenance/status API;
- deployment generations;
- host rollout; or
- a second config persistence owner.

V1 proves that ordinary OpenClaw documents can be composed before one
immutable startup activation.

### U-CFA-02: Extend the existing activation owner only after V1 adoption

After #107026 is accepted and consumed, prove whether the existing source and
runtime snapshots can expose:

- stable accepted-generation identity;
- source order and redacted provenance;
- exact conflict and rejection facts;
- active versus restart-deferred targets;
- canonical source/runtime fingerprints;
- rollback/recovery debt; and
- compatibility with unknown optional fields.

This is a follow-up extension to the current configuration owner, not a
replacement framework and not part of #107026's landing scope.

### U-CFA-03: Adopt the readiness/profile stack

Track and consume:

```text
#104018
  -> #113421
  -> #113422
  -> #114636
```

Readiness remains an observation over owner generations. Profiles select
criteria. Facilities inspect, watch, wait, validate, and package evidence.
None mutate configuration or silently repair the runtime.

### U-CFA-04: Adopt exact Automation decisions

- #77298 owns Gateway-restart interruption status and health counters.
- #113441 owns immutable Automation identity/revision in hook context.
- #113443 owns staged non-runnable Automation publication/finalization.

Do not file parallel issues for these exact residuals.

### U-CFA-05: Portable scheduled activation identity, conditional

Only after a cross-trigger fixture proves the current owner gap, propose the
smallest identity relationship:

- schedule lifetime and generation;
- occurrence kind and identity;
- activation operation/attempt;
- accepted/dispatched/settled chronology;
- expected generation and lost-reply lookup;
- downstream owner operation reference; and
- cancellation and unknown settlement.

It must not create a workflow engine, host wake service, or generic effect
replay layer.

### Not residual upstream work

- Lobster tenant/global/operator configuration storage;
- admin editing, rollout, placement, or fleet convergence;
- host-specific readiness polling intervals and repair policy;
- payload or credentials in a central wake journal;
- Passport/regional duplicate-execution policy;
- Rust-owned configuration semantics; or
- a central scheduler replacing current Cron.

## Fork and Adapter Ledger

| Ledger item | Class | Purpose | Current relationship | Exit |
| --- | --- | --- | --- | --- |
| Managed-config broad prototype | B1 | Prove authority, provenance, candidate, and activation ideas | Fork-only evidence | Archive/delete after bounded upstream seams cover proven needs |
| Managed-config simple core/Gateway/docs | B1 | Prove bounded ordered-source V1 | Basis for #107026 | Delete fork copies after upstream adoption |
| Gateway controller/bootstrap fork PRs #60/#61 | B1 | Prove snapshot handoff and bootstrap seam | Fork-only review aids | Delete/archive after #107026 disposition |
| Lobster managed-config PR #12 | B2 | Materialize Scout global/tenant/operator documents | Open draft adopter | Remain Lobster adapter |
| Allowed-origins overlay | B3 | Legacy generated config mutation | Current Lobster code | Delete after conformant released layer support |
| Other baked config/env writers | B3 | Legacy host composition | Current Lobster code | Delete one-by-one after equivalent effective-config proof |
| Readiness fork slices #167/#169/#171/#172 | B1 | Watch, catalog, wait, explanation proof | Superseded by active upstream stack | Delete/archive after adoption |
| Profile fork slices #173/#174 | B1 | Catalog and live validation proof | Superseded by #114636 | Delete/archive after adoption |
| Private Lobster readiness checks | B2/B3 | Host startup and routing decisions | Existing listener/process/proxy checks | Replace only where canonical profile readiness covers semantics |
| Cron restart-status patch `0015` | B3 | Prevent interrupted runs polluting failure health | #77298 | Delete after shipped resolution |
| Automation identity patch `0018` | B1/B3 | Propagate immutable job/run/revision facts | #113441 | Delete after shipped owner contract |
| Automation staged-publication patch | B1/B3 | Keep hosted jobs inert until final authority | #113443 | Delete after shipped owner contract |
| Passport execution fence | B2 | Regional ownership and duplicate-execution policy | No generic upstream equivalent | Remain Lobster |
| Cron projection journal PR #39 | B2 | Durable payload-free scheduling projection | Open fork proof | Remain Lobster or consolidate into host lifecycle owner |
| Retained wake PRs #46/#47/#51 | B2 | Coalesce causes, validate owners, gate delivery on exact readiness | Open fork proofs | Consolidate into bounded Lobster service; delete redundant paths |
| Source-specific cold-start races | B3 | Teams/API/Cron/operator wake independently | Existing managed paths | Delete after one retained activation owner ships |

## Lobster Managed Capabilities

| Capability | Lobster responsibility | Portable dependency |
| --- | --- | --- |
| Desired-state documents | Store global, tenant, and operator intent and source generations | CFA-01 |
| Secure source materialization | Write complete bounded documents and secrets references before start | #107026/RFC #34 |
| Config rollout | Stage, compare, replace process, observe accepted/ready result, rollback/quarantine | CFA-02/CFA-03 |
| Admin editing and policy | Actor authorization, ownership, conflict UX, audit, and break-glass | EC-004/EC-033 |
| Readiness aggregation | Consume canonical owner/profile results across units | CFA-03/CFA-04/EC-034 |
| Repair scheduling | Select repair based on owner facts without rewriting their meaning | EC-034 |
| Retained wake | Validate durable cause identities, coalesce one destination generation, provision idempotently | CFA-06 |
| Readiness-gated delivery | Deliver owner-retained work after exact destination/readiness tuple | CFA-06/EC-016 |
| Regional execution fence | Enforce Passport placement and duplicate-execution policy | Downstream-only |

## Optional Rust Components

| Component | Purpose | Gate |
| --- | --- | --- |
| Rust configuration consumer | Consume a versioned effective generation for a Rust owner | OpenClaw remains semantic config owner |
| Rust readiness producer | Emit the same owner-generation observation contract | Rust node/supervisor profile exists |
| Rust scheduler/lease owner | Later replacement for one bounded schedule profile | U-CFA-05 stable, shared conformance, canary, state migration, TypeScript deletion |
| Rust host supervisor | Consume config targets/readiness and own process handoff | EC-026 and operations package gates |

There is no justification for a Rust parser that redefines OpenClaw field
semantics or a Rust scheduler before the portable activation contract is proven.

## Operator Journey

```text
inspect configuration
  -> see source order and redacted provenance
  -> see accepted and active generations
  -> see rejected candidate/conflict/restart debt

inspect readiness
  -> see exact active generation
  -> see required/advisory owner observations
  -> distinguish unavailable, not-ready, degraded, and recovered

inspect Automation
  -> see schedule generation and next occurrence
  -> see accepted activation and downstream operation
  -> distinguish activation settlement from work/delivery settlement

wake absent compute
  -> validate retained cause
  -> grant one destination generation
  -> provision
  -> wait for exact readiness
  -> dispatch owner-retained work
```

## Acceptance Gates

### Configuration

- Ordinary local files remain the default source of intent.
- Managed layers are opt-in and use the same OpenClaw validation and runtime
  activation path.
- Rejected candidates never replace prior authoritative runtime state.
- Field authority and conflicts are deterministic and explainable.
- Protected provenance never exposes secret values or host-private paths.
- Process replacement, hot activation, restart debt, and rollback are distinct.

### Readiness

- Accepted, active, ready, available, recovered, and converged remain distinct.
- Required false/unknown conditions block; advisory conditions remain visible.
- Evaluation binds to one active config/plugin/runtime generation.
- Host probes consume owner results and never infer readiness from process
  existence alone.
- Facilities do not introduce another evaluator or repair authority.

### Scheduled activation

- Manual and scheduled occurrences have distinct identity.
- Schedule generation fences queued/stale occurrences.
- Durable acceptance precedes asynchronous dispatch acknowledgement.
- Lost replies reconcile by activation identity rather than blind dispatch.
- Cancellation prevents future acceptance and reports downstream work
  separately.
- Restart catch-up is bounded, paced, and explicit.

### Host wake

- Journals carry identities and deadlines only, never payloads or credentials.
- Callers cannot select recovery points, destination generations, or readiness.
- Concurrent causes join one destination generation.
- Unknown provisioning/readiness retains the cause and fails closed.
- Delivery begins only after exact accepted destination/readiness proof.

### Deletion

- Every removed Lobster writer has old/new effective-config comparison.
- Every removed readiness script has a canonical replacement result.
- Every removed Cron patch has a shipped replacement and release adoption.
- Every removed wake race has durable retained-cause and delivery proof.

## Dependency-Ordered Work Items

| ID | Work item | Classification | Layer | Depends on | Acceptance | Deletion target |
| --- | --- | --- | --- | --- | --- | --- |
| CFA-001 | Freeze configuration/readiness/scheduling inventory | Reuse | Planning | - | Current source, RFCs, PR heads, Lobster proofs, patch baseline, and dates recorded | Stale duplicate inventory |
| CFA-002 | Map config objects and generations | Reuse | Planning | CFA-001 | Authored source, source snapshot, candidate, accepted runtime, restart target, and debt separated | Generic config revision |
| CFA-003 | Map readiness identities and lifetimes | Reuse | Planning | CFA-001 | Producer, criterion, subject, active generation, availability, observation, and recovery separated | Process health inference |
| CFA-004 | Map schedule and activation identities | Reuse | Planning | CFA-001 | Job lifetime, schedule generation, occurrence, reservation, activation, downstream operation, and settlement separated | Schedule/run conflation |
| CFA-005 | Refresh #107026 against current main | Adopt | Upstream | CFA-001, CFA-002 | Bounded V1 remains reviewable, conflict-free, and unchanged in scope | Stale fork stack |
| CFA-006 | Land/adopt RFC #34 and #107026 | Adopt | Upstream | CFA-005 | Ordered ordinary documents, exact authority, immutable startup activation, local compatibility | Parallel layer loader |
| CFA-007 | Refresh Lobster PR #12 adapter | Adopt | B2/Lobster | CFA-006, XPK-008 | Complete global/tenant/operator documents verify before parse and materialize securely and exclusively | Prototype planner paths |
| CFA-008 | Prove old/new effective config | Extend existing | Lobster | CFA-007 | Representative deployments compare semantic effective fragments and conflicts | Exact-blob overlay tests |
| CFA-009 | Delete allowed-origins overlay | Delete | B3/Lobster | CFA-008 | Writer, cleanup, env-only projection, lifecycle call, and tests removed | `gateway_config_override` path |
| CFA-010 | Inventory remaining Lobster config writers | Reuse | Planning | CFA-008 | Each writer classified keep/adopt/extend/delete with owner and release gate | Unowned overlay backlog |
| CFA-011 | Prove accepted-generation status need | Extend existing | Evidence | CFA-006, CFA-002 | Current snapshots/reload facts cannot satisfy bounded operator case without a portable projection | Broad speculative generation API |
| CFA-012 | Define minimal CFA-02 extension only if the fixture requires it | New ask candidate | Upstream | CFA-011 | If current owner facts are insufficient, exact accepted/active/rejected/deferred/debt/provenance fields are defined; otherwise the no-extension result is recorded | Disconnected hash inference |
| CFA-013 | Adopt readiness RFC #33 and #104018 | Adopt | Upstream | CFA-001, CFA-003 | Canonical opt-in owner observation framework lands | Private readiness framework |
| CFA-014 | Adopt core conditions #113421 | Adopt | Upstream | CFA-013 | Core observations remain inert, bounded, generation-aware, and owner-native | Host reimplementation of criteria |
| CFA-015 | Adopt profiles RFC #37 and #113422 | Adopt | Upstream | CFA-014 | Named support profiles compose criteria without another evaluator | Private hosting checklist |
| CFA-016 | Adopt facilities #114636 | Adopt | Upstream | CFA-015 | Catalog, validation, and package evidence consume canonical result | Fork facilities #173/#174 |
| CFA-017 | Reconcile readiness fork slices | Delete | B1 | CFA-013, CFA-016 | Unique fixes transferred; redundant branches archived/deleted | Fork #167/#169/#171/#172/#173/#174 |
| CFA-018 | Replace Lobster process/listener readiness inference | Extend existing | B2/B3 | CFA-016 | Canonical profile result governs routing where semantics match; shallow liveness retained | Duplicated private evaluator |
| CFA-019 | Bind managed config rollout to readiness | Extend existing | Lobster | CFA-007, CFA-016 | Exact source/accepted/active/profile-readiness generations retained per rollout | Process-start success as activation |
| CFA-020 | Adopt #77298 restart interruption decision | Adopt | Upstream | CFA-004 | Restart interruption no longer pollutes genuine execution-failure health | Patch `0015` |
| CFA-021 | Adopt #113441 Automation hook identity | Adopt | Upstream | CFA-004 | Hooks receive immutable job/run/definition revision without host-only semantics | Patch `0018` |
| CFA-022 | Adopt #113443 staged publication | Adopt | Upstream | CFA-004 | Hosted job remains non-runnable until owner finalization; stale finalize fails closed | Staged-publication patch |
| CFA-023 | Build scheduled-occurrence activation fixture | Extend existing | Evidence | CFA-004 | Due, manual, catch-up, restart, and retained scheduled occurrences are classified without absorbing command, stream, script, heartbeat, or agent-run owners | Generic workflow identity |
| CFA-024 | Prove schedule-generation race | Extend existing | Evidence | CFA-023 | Queued occurrence after edit is superseded or explicitly retained by policy | Stale queued dispatch |
| CFA-025 | Prove lost activation acknowledgement | Extend existing | Evidence | CFA-023 | Inspection by operation identity avoids duplicate downstream dispatch | Retry by transport result |
| CFA-026 | Decide U-CFA-05 residual | New ask candidate | Upstream | CFA-024, CFA-025 | File only the smallest portable identity gap not covered by #113441/current source | New workflow engine |
| CFA-027 | Delete restart-status patch | Delete | B3/Lobster | CFA-020 | Pinned release includes replacement and counters/status match policy | `0015` |
| CFA-028 | Delete Automation identity/staging patches | Delete | B3/Lobster | CFA-021, CFA-022 | Pinned release includes replacements and hosted conformance passes | `0018` and staged-publication patch |
| CFA-029 | Preserve Passport fence downstream | Downstream-only | B2/Lobster | CFA-004 | Regional owner, duplicate-execution policy, and evidence remain explicit | Accidental generic upstream policy |
| CFA-030 | Consolidate retained wake owner | Extend existing | Lobster | CFA-003, CFA-004 | #39/#46/#47 invariants converge on one payload-free activation record | Parallel wake journals |
| CFA-031 | Prove concurrent-cause coalescing | Extend existing | Lobster evidence | CFA-030 | Teams/API/Cron/operator causes join one destination generation | Source-specific cold-start races |
| CFA-032 | Prove exact readiness-gated delivery | Extend existing | Lobster evidence | CFA-016, CFA-030 | #51 dispatches only after exact recovery/destination/readiness tuple | Listener-up delivery |
| CFA-033 | Integrate host acceptance #5481 | Adopt | Lobster | CFA-030, CFA-032 | Recovery, activation, readiness, and delivery retain separate owners linked by exact operation and generation references | Duplicate recovery authority |
| CFA-034 | Delete source-specific wake races | Delete | B3/Lobster | CFA-031, CFA-032, CFA-033 | Independent cold-start paths removed without deleting owner payload/ack state | Teams/API/Cron wake races |
| CFA-035 | Register Rust readiness producers | New component | Rust | CFA-013, RFN-020A, RFN-028 | Rust node/supervisor emits the CFA generation-bound result for the selected supported profile | Rust-specific readiness schema |
| CFA-036 | Define future Rust scheduler gate | New component | Rust planning | CFA-026 | Supported profile, state migration, canary, release, and exact TS deletion target named | Premature scheduler rewrite |
| CFA-037 | Prove mixed-version config/readiness/wake | Extend existing | Release | CFA-011, CFA-016, CFA-032 | Current-owner-sufficient and minimal-extension outcomes both support safe optional fields, fail-closed required semantics, and explicit old/new order | Version inference |
| CFA-038 | Record package adoption/deletion result | Delete | Portfolio | CFA-009, CFA-017, CFA-027, CFA-028, CFA-034, CFA-037 | Upstream release, Lobster adoption, retained B2 owners, and deleted B1/B3 paths recorded | Permanent migration ledger |

## Sequencing

```text
inventory and owner identity
  -> bounded ordered config V1
  -> Lobster adapter and first writer deletion
  -> readiness/profile stack adoption
  -> managed rollout bound to canonical readiness
  -> Automation issue adoption and scheduled-occurrence proof
  -> conditional activation identity extension
  -> retained wake consolidation
  -> exact readiness-gated delivery
  -> patch/writer/wake-race deletion
```

## Findings

1. **EC-006 must extend, not replace, the current configuration owner.** Current
   main already has strong snapshot, write, reload, rollback, and debt
   semantics.
2. **#107026 is intentionally smaller than EC-006.** Landing its startup-only,
   read-only V1 is a prerequisite, not a reason to inflate the PR.
3. **The readiness work is already a complete stack.** The correct action is
   adoption in dependency order, followed by deletion of fork facilities and
   private host evaluators.
4. **Configuration acceptance is not readiness.** A valid active generation
   can remain not ready, and a recovered evaluator can still report degraded.
5. **Cron/Automations is already an independent owner.** It has durable state
   and recovery value even when no downstream run exists.
6. **Several scheduling residuals already have issues.** #77298, #113441, and
   #113443 must be resolved before another public surface is proposed.
7. **Absent-compute wake belongs in Lobster.** It composes retained causes,
   lifecycle, provisioning, readiness, and delivery without moving payloads or
   schedule semantics into a central service.
8. **Deletion is measurable.** The first configuration outcome is removal of
   the allowed-origins writer; the scheduling outcome is removal of carried
   patches and source-specific wake races.

## Package Exit

This package is complete when:

- #107026/RFC #34 are adopted without scope inflation;
- Lobster consumes a conformant released ordered-layer seam and deletes the
  allowed-origins overlay;
- the readiness/profile stack is adopted and redundant fork/private
  evaluators are removed;
- #77298, #113441, and #113443 have explicit owner dispositions;
- scheduled-occurrence evidence proves whether one portable activation identity
  is still required, while command, stream, script, heartbeat, and agent-run
  owners remain separate;
- mixed-version release works whether current activation facts are sufficient
  or a minimal CFA-02 extension is accepted;
- retained causes coalesce into one destination generation and owner delivery
  waits for exact canonical readiness; and
- every B1/B3 configuration, readiness, Cron, and wake path has a recorded
  adoption or deletion result.
