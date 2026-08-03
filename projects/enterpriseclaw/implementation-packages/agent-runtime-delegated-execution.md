# Agent Runtime and Delegated Execution Implementation Package

Status: reconciled implementation package  
Last validated: 2026-08-02  
EnterpriseClaw contracts: EC-008, EC-009

## Executive Decision

OpenClaw already has a mature agent-turn and subagent runtime. The missing work
is not another workflow engine or task database. It is a smaller set of
owner-correct contracts and evidence:

- document one run relationship shared by Gateway and channel entry paths;
- distinguish whole-run execution attempts from provider/model candidate
  attempts, tool calls, tasks, deliveries, and schedules;
- bind accepted attempts to exact runtime, context, configuration, authority,
  credential, and capability generations;
- preserve requester, controller, completion owner, and lineage as separate
  delegation relationships;
- make child admission, terminal settlement, cancellation, delivery, and
  cleanup restart-safe without inferring one from another;
- adopt existing run/subagent diagnostic issues instead of creating a second
  lifecycle event family;
- keep tenant quotas, managed admission, retention, and operator projections in
  Lobster; and
- defer any Rust execution kernel until one bounded TypeScript owner profile
  can be replaced and deleted.

```text
ingress
  -> admitted run
  -> fixed execution-attempt bindings
  -> provider/model candidate attempts
  -> tool/delegated child operations
  -> transcript and terminal settlement
  -> delivery/accounting projections

delegation:
requester != controller != completion owner != lineage parent
```

## Owner Model

| Owner | Responsibility |
| --- | --- |
| Ingress owner | Request identity, idempotent admission, lifecycle generation, and accepted run |
| Session owner | Canonical session key/ID, transcript generation, persistence, and lifecycle fencing |
| Agent execution owner | Run, execution attempt, runtime generation, cancellation, terminal outcome, and child references |
| Provider/model owner | Candidate selection, request attempt, fallback, provider result, and usage |
| Tool/effect owner | Tool-call identity, approval, execution, external effect, and certainty |
| Delegation owner | Spawn plan, child session, controller/completion authority, run registry, recovery, and cleanup |
| Delivery owner | User-visible reply operation, native delivery attempt, receipt, and settlement |
| Lobster | Tenant admission, quotas, fleet placement, managed retention, projection, and operator UX |

No universal `Execution` object should erase these different lifetimes.

## Area RFC Boundaries

| Area RFC | EnterpriseClaw source | Boundary |
| --- | --- | --- |
| ARO-01 Run admission and session targeting | EC-008 | Ingress identity, idempotency, session target/generation, lifecycle fence, and durable acceptance |
| ARO-02 Execution-attempt bindings | EC-008 | Attempt identity, normalized intent, runtime/context/config/policy/credential/capability generations, and retry reason |
| ARO-03 Cancellation and terminal settlement | EC-008 | Abort owner, timeout phase, liveness, provider-started evidence, child references, transcript settlement, and immutable outcome |
| ARO-04 Delegation admission, lineage, and authority | EC-009 | Spawn request/plan, child session, requester/controller/completion/parent relationships, depth, scope, and child slots |
| ARO-05 Delegated recovery, result delivery, and cleanup | EC-009 | Run registry, steer/cancel/kill, restart reconciliation, completion, announcement, tombstone, archive, and cleanup |
| ARO-06 Run and delegation evidence projections | EC-008, EC-009, EC-033 | Owner-local hooks/events, outbound correlation, subagent terminal telemetry, usage references, redaction, and retention |

These boundaries describe existing owners and residual gaps. They are not six
automatic upstream RFCs.

## Current OpenClaw Owner Seams

| Concern | Existing seam | Current strength | Residual gap |
| --- | --- | --- | --- |
| Gateway admission | Agent request preflight and run handler | Idempotency key becomes `runId`; dedupe reservation; lifecycle generation; phased preflight/routing/session/admission | Shared semantic contract with channel/auto-reply entry remains implicit |
| Session targeting | Session preparation and lifecycle admission | Canonical key/agent, freshness/reset, session rotation, pre-dispatch revalidation, durable target before heavy work | Cross-entry vocabulary remains distributed |
| Runtime generation | Embedded run orchestrator | Session/global lanes and one prepared model runtime pin config, directories, plugins, model selection, hooks, and fallbacks | Portable generation references are not one attempt binding |
| Execution attempt | Embedded attempt owner | Staged setup, tools, prompt, session lock, provider stream, transcript, cleanup, phase-aware abort state | No obvious stable whole-attempt identity |
| Provider fallback | Model/runtime owners | Ordered candidate attempts and fallback behavior | Candidate-attempt identity belongs with EC-011, not the whole-run attempt |
| Tool lifecycle | Tool handlers | `runId:toolCallId`, progress, structured results, receipts, exactly-once after-hook projection | Tool effect certainty remains owner-specific |
| Terminal outcome | Terminal outcome builder | Restart/user/RPC cancel, hard timeouts, blocked/abandoned liveness, provider reach, ordinary errors | Projection across Gateway/task/session/reply surfaces can drift |
| Delegated spawn | Spawn tool/plan/session-create | Explicit requester, controller, completion owner, lineage parent, depth, role, control scope, workspace, policy, and child session | Child-slot reservation is process-local |
| Delegated registry | Subagent registry | Run and child indexes, task/swarm/scheduler refs, terminal and delivery state, restart recovery | Settlement spans several stores and legacy rows may lack complete lineage |
| Child control | Subagent control and visibility | Tree/scope-gated steer/cancel/kill; tombstones; queue/lane/runtime/session reconciliation | Parent trust-revocation behavior needs explicit proof |
| A2A completion | Session send/A2A helpers | Bounded ping-pong, skip tokens, baseline snapshots, stale/duplicate suppression | Completion-owner semantics are heuristic in some paths |
| Diagnostics | Existing owner hooks and diagnostics-otel | Exactly-once `subagent_ended`; optional hook contexts; owner-local projections | Several useful projections remain issues/fork evidence |

## Existing-Investment Crosswalk

### Run and terminal correlation

| Investment | State on 2026-08-02 | Classification | Package consequence |
| --- | --- | --- | --- |
| Current agent execution source/tests | Present | Reuse | Compatibility oracle |
| #50291 hook trace/run correlation | Open issue | Adopt/extend existing | Broad existing demand; do not file a duplicate correlation issue |
| `giodl73-repo/openclaw#148` | Open fork draft, head `d6978e25f6c` | B1 evidence | Proves routed outbound `runId` correlation while omitting it from durable replay |
| #104950 aborted run without trajectory trace | Open issue | Adopt | Existing terminal-evidence gap |
| #57404 per-run usage lifecycle events | Open issue | Adopt | Usage projection, not run authority |
| #80551 typed `agent_start` hook | Closed without an identified active replacement | Historical decision | Recheck owner rationale before proposing a start hook |
| #102019 session end reason | Closed | Historical decision | Do not recreate a terminal taxonomy from this package |

### Delegated execution

| Investment | State on 2026-08-02 | Classification | Package consequence |
| --- | --- | --- | --- |
| Current subagent runtime | Present | Reuse | Strong owner baseline |
| #101867 missing subagent terminal telemetry | Open issue | Adopt | Existing projection demand |
| `giodl73-repo/openclaw#149` | Open fork draft, head `a614815a4ce` | B1 evidence | Reuses exactly-once `subagent_ended`; does not alter lifecycle |
| #90911 subagent/task token usage | Open issue | Adopt | Existing usage projection demand |
| #103618 cooperative host suspension | Merged 2026-07-10 at `e475996d946a` | Reuse | Current suspension/orphan-recovery baseline |
| Managed skill dispatch fork #114 | Open fork draft, head `b461715f14e` | B1 evidence | Canonical child admission POC; not a workflow engine or accepted upstream plan |

No active upstream thread was found for a new durable delegation registry or
generic execution framework. Source proof must precede any such ask.

## Residual Upstream Workstreams

### U-ARO-01: Shared run relationship, conditional

First build one fixture across Gateway and channel/auto-reply entry paths that
records:

- ingress/source operation;
- canonical session key and session ID;
- run ID and lifecycle generation;
- reply operation, when present;
- prepared runtime generation;
- execution attempt;
- terminal outcome;
- transcript settlement; and
- delivery/accounting references.

If owner-native facts cannot express this without reconstruction, propose the
smallest shared relationship. Do not create a workflow/task database.

### U-ARO-02: Execution-attempt identity and bindings, conditional

Prove the need for a stable whole-execution attempt distinct from:

- `runId`;
- provider/model candidate attempt;
- tool call;
- delegated child run;
- scheduled activation;
- reply operation; and
- delivery attempt.

The attempt binds exact normalized intent, runtime, context, config, policy,
credential, capability, and risk-classifier generations. It stores references,
never secret material or prohibited parameters.

### U-ARO-03: Terminal outcome consistency

Use the current terminal builder as the owner. Reconcile #104950 and existing
Gateway/task/session/reply projections before adding fields.

The outcome must preserve:

- cancellation source;
- timeout phase;
- liveness/abandonment;
- provider-started state;
- transcript settlement;
- child/owner-native terminal references;
- external-effect uncertainty; and
- superseding late settlement without rewriting history.

### U-ARO-04: Delegation authority and restart settlement, conditional

Build evidence for:

- durable child-slot admission or explicit restart over-admission behavior;
- parent/requester trust revocation while the child is active;
- separate cancel acknowledgement, child terminal result, completion delivery,
  archive, and cleanup;
- legacy parent-only lineage migration; and
- idempotent recovery by child/delegation operation identity.

Only file a portable extension if current registry/session records cannot
satisfy these cases.

### U-ARO-05: Adopt owner-local diagnostics

- #50291 is the existing hook/run correlation thread.
- #101867 is the existing subagent terminal telemetry thread.
- #90911 and #57404 own usage projections.
- #104950 owns missing aborted-run evidence.

Promote fork #148 or #149 only through the owning issue and current owner
review. Do not combine them into a new telemetry platform or duplicate
`run.completed`/`subagent_ended`.

### Not residual upstream work

- Lobster tenant quotas, placement, retention, or fleet aggregation;
- managed workflow definitions, joins, loops, or approvals;
- a central trace/correlation registry;
- provider candidate-attempt or usage semantics owned by EC-011/EC-012;
- tool/effect settlement owned by EC-014;
- delivery settlement owned by EC-016;
- a new task database parallel to sessions/subagent registry; or
- an early Rust agent-kernel rewrite.

## Fork and Adapter Ledger

| Ledger item | Class | Purpose | Current relationship | Exit |
| --- | --- | --- | --- | --- |
| Outbound run correlation #148 | B1 | Prove authoritative routed-reply `runId` handoff | Fork-only over #50291 | Promote through owner or archive |
| Subagent terminal telemetry #149 | B1 | Project exactly-once terminal hook | Fork-only over #101867 | Promote through owner or archive |
| Managed skill dispatch #114 | B1 | Prove canonical skill resolution/admission/native child spawn | Fork-only Claws/Skill Memory POC | Adopt into accepted application owner or archive |
| Run-binding evidence adapter | B1 | Compare Gateway and channel entry facts | Not implemented | Upstream shared relationship or delete |
| Attempt-binding evidence adapter | B1 | Record reference-only fixed generations | Not implemented | Upstream owner extension or delete |
| Legacy aggregate-log reconstruction | B3 | Rebuild run/attempt context after the fact | Existing downstream/operator pattern | Delete after authoritative bindings exist |
| Legacy parent-only child classification | B3 | Infer spawn depth/ownership from incomplete rows | Current compatibility path | Delete after migration and retention window |
| Managed run projection | B2 | Retain tenant/operator run summaries | Lobster responsibility | Remain downstream |
| Managed quota/admission adapter | B2 | Apply tenant limits before native run/child admission | Lobster responsibility | Remain downstream |
| Managed completion/cleanup reconciler | B2/B3 | Reconcile host-visible child state | Only if owner-native registry evidence is insufficient | Delete duplicate state after adoption |
| Rust execution selector | B3 | Select TypeScript or Rust before run admission | Future only | Delete after Rust-only supported profile |
| TypeScript compatibility fallback | B3 | Preserve unsupported run profiles during migration | Current TypeScript owner | Delete only for promoted Rust profile |

## Lobster Managed Capabilities

| Capability | Lobster responsibility | Portable dependency |
| --- | --- | --- |
| Tenant run admission | Actor/tenant policy, quotas, concurrency allocation, placement, and support posture | ARO-01 plus EC-031 |
| Managed run projection | Store bounded run/attempt/terminal references and freshness without copying transcripts/secrets | ARO-01/ARO-02/ARO-03 |
| Delegated-work policy | Tenant child-depth, role, resource, and application policy before native admission | ARO-04 |
| Operator control | Authorized cancel/kill/repair request routed to current controller owner | ARO-04/ARO-05 |
| Retention and audit | Tenant retention, assurance, disclosure, and compliance export over owner evidence | ARO-06/EC-033 |
| Fleet placement | Choose deployment unit/runtime generation before admission | EC-026/EC-031/EC-034 |
| Application runner | Invoke canonical Claw/skill admission without copying runtime checks | Future accepted Claws contract |

Lobster may deny or delay admission. It must not rewrite OpenClaw run,
subagent, transcript, tool, or terminal truth.

## Future Rust Components

| Component | Purpose | Promotion gate |
| --- | --- | --- |
| Rust run-envelope validator | Consume shared run/attempt fixtures without executing | U-ARO-01/U-ARO-02 stable |
| Rust delegated-runtime worker | Execute one bounded child profile behind current Gateway/session contracts | Delegation authority/recovery conformance |
| Rust agent execution kernel | Replace one complete TypeScript run owner profile | Models, context, tools, sessions, effects, lifecycle, state, release, and ecosystem gates |

The first Rust step is a validator or isolated child worker, not a full agent
kernel. TypeScript remains authoritative until canary, migration, rollback, and
exact deletion proof.

## Operator Journey

```text
inspect run
  -> see ingress, session, run, lifecycle, runtime, and attempt identities
  -> see fixed authority/config/context/model/capability references
  -> see provider/tool/child/delivery owner references
  -> see terminal outcome and uncertainty

inspect delegated child
  -> see requester, controller, completion owner, and lineage parent
  -> see child session and run generation
  -> see admission, cancellation, terminal, delivery, archive, and cleanup
  -> see restart/recovery or unresolved state

cancel
  -> authorize against current controller
  -> persist request/acceptance
  -> signal child/runtime
  -> report cancellation separately from terminal effect settlement and cleanup
```

## Acceptance Gates

### Run and attempt

- Gateway and channel entry paths preserve the same semantic identities.
- Retries create distinguishable attempts without changing run identity unless
  the owner starts a new run.
- Bindings are fixed at acceptance and referenced by generation.
- Provider candidate, tool, child, schedule, and delivery attempts are not
  aliases for the execution attempt.
- Lost acknowledgement reconciles authoritative acceptance before replay.

### Cancellation and terminal outcome

- Cancellation source and timeout phase remain explicit.
- Accepted cancel does not imply provider, tool, child, or external effect
  stopped.
- Transcript settlement and visible reply/delivery remain separate.
- Late owner results may supersede unknown observations by reference; history
  is immutable.
- Gateway, task, session, reply, and diagnostic projections derive from the
  same owner result.

### Delegation

- Requester, controller, completion owner, and lineage parent remain distinct.
- Parent lineage never grants control by itself.
- Child creation revalidates current session/authority at the writer barrier.
- Parent trust revocation fences new authority and reports active child
  exposure.
- Cancel, terminal, delivery, archive, and cleanup are independently visible.
- Restart recovery does not infer completion from parent state or missing
  process state.

### Evidence and privacy

- Owner hooks emit at most once according to owner persistence.
- Durable replay never inherits a live ended `runId`.
- Metrics avoid high-cardinality session/run/task labels.
- Managed projection stores references and bounded outcomes, not prompts,
  transcripts, credentials, raw errors, or tool parameters.
- Diagnostics absence never becomes runtime failure or terminal truth.

### Rust and deletion

- One runtime is selected before admission.
- Shadow comparison is effect-free.
- State authority is fenced before migration.
- Exact TypeScript files/functions/tests are named before promotion.
- Selectors, compatibility fallbacks, and import adapters are deleted after
  Rust-only authority.

## Dependency-Ordered Work Items

| ID | Work item | Classification | Layer | Depends on | Acceptance | Deletion target |
| --- | --- | --- | --- | --- | --- | --- |
| ARO-001 | Freeze run/delegation inventory | Reuse | Planning | - | Source owners, issues, fork proofs, downstream consumers, and dates recorded | Stale duplicate inventory |
| ARO-002 | Define execution identity matrix | Reuse | Planning | ARO-001 | Ingress, session, run, execution attempt, provider candidate, tool, child, schedule, reply, and delivery identities separated | Universal execution ID |
| ARO-003 | Define delegation relationship matrix | Reuse | Planning | ARO-001 | Requester, controller, completion owner, lineage parent, child session/run, task/swarm/scheduler refs separated | Parent-as-authority |
| ARO-004 | Build cross-entry run fixture | Extend existing | Evidence | ARO-002 | Gateway and channel/auto-reply entry paths emit equivalent semantic relationship | Entry-specific correlation reconstruction |
| ARO-005 | Prove durable run acceptance lookup | Reuse | Evidence | ARO-004 | Lost ingress acknowledgement resolves accepted/terminal/unknown without duplicate execution | Retry by transport result |
| ARO-006 | Define whole-execution attempt fixture | Extend existing | Evidence | ARO-002, ARO-004 | Attempt is distinguishable from provider/tool/child/delivery attempts and binds fixed generations | Ambiguous attempt vocabulary |
| ARO-007 | Exercise binding-generation retry | Extend existing | Evidence | ARO-006 | Changed config/policy/credential/runtime binding creates a new attempt or new run by explicit owner rule | Aggregate-log reconstruction |
| ARO-008 | Decide U-ARO-01 shared run residual | New ask candidate | Upstream | ARO-004, ARO-005 | File only fields absent from current owner-native facts | New workflow/task database |
| ARO-009 | Decide U-ARO-02 attempt residual | New ask candidate | Upstream | ARO-006, ARO-007 | Stable reference-only attempt binding justified across unlike retries | Provider-attempt conflation |
| ARO-010 | Reconcile terminal projection surfaces | Extend existing | Evidence | ARO-002 | Gateway, task, session, reply, dedupe, and event outputs map to current terminal builder | Divergent status helpers |
| ARO-011 | Adopt #104950 aborted-run evidence | Adopt | Upstream | ARO-010 | Aborted last run has an owner-linked terminal/trajectory explanation | Silent `abortedLastRun` |
| ARO-012 | Recheck closed start/end taxonomy threads | Reuse | Planning | ARO-010 | #80551/#102019 rationale recorded before any public hook/taxonomy proposal | Recreated rejected taxonomy |
| ARO-013 | Adopt #50291 correlation thread | Adopt | Upstream | ARO-004 | Exact owner-approved hook contexts gain only authoritative correlation | Parallel trace registry |
| ARO-014 | Promote or archive fork #148 | Delete | B1 | ARO-013 | Routed reply correlation adopted with durable-replay omission, or evidence branch archived | Fork #148 |
| ARO-015 | Prove cancellation/terminal separation | Extend existing | Evidence | ARO-010, XPK-003 | User/RPC/restart/timeout cancel, cancel-before-dispatch, approval-wait cancellation, stale-prompt dismissal, policy/user denial, and approved-handler failure remain distinct and audited | Cancel as terminal effect proof |
| ARO-016 | Define durable child admission behavior | Extend existing | Evidence | ARO-003 | Restart behavior for process-local child slots is explicit and bounded | Hidden over-admission |
| ARO-017 | Prove parent trust revocation | Extend existing | Evidence | ARO-003, IAE-017 | New child/control authority fenced; active exposure and unsettled work reported | Lineage trust inference |
| ARO-018 | Prove child cancel/terminal/delivery/cleanup separation | Extend existing | Evidence | ARO-003, ARO-015 | Each lifecycle phase has independent state and recovery; cross-boundary errors are sanitized while local evidence remains precise | Parent-state completion inference |
| ARO-019 | Prove restart reconciliation idempotency | Extend existing | Evidence | ARO-016, ARO-018 | Registry/session/task/delivery cleanup converges by child/delegation operation identity | Duplicate announce/cleanup |
| ARO-020 | Migrate legacy parent-only lineage | Extend existing | Upstream/B3 | ARO-003, ARO-019 | Older rows retain explicit compatibility state and no longer become false roots | Parent-only heuristic after retention |
| ARO-021 | Decide U-ARO-04 delegation residual | New ask candidate | Upstream | ARO-017, ARO-018, ARO-019 | Extend current records only for proven portable missing facts | New delegation framework |
| ARO-022 | Adopt #101867 terminal telemetry | Adopt | Upstream | ARO-018 | Existing exactly-once terminal owner projects bounded outcome/reason | Missing subagent outcome visibility |
| ARO-023 | Promote or archive fork #149 | Delete | B1 | ARO-022 | Owner accepts diagnostics-otel projection or evidence branch archived | Fork #149 |
| ARO-024 | Consume MPU ownership of #90911 subagent/task usage | Adopt/projection | Upstream | ARO-003, MPU-017 | ARO attaches the MPU accounting reference to the exact task/subagent owner without duplicating accounting semantics | Fragile task usage correlation |
| ARO-025 | Consume MPU ownership of #57404 run usage projection | Adopt/projection | Upstream | ARO-002, MPU-018 | ARO attaches the MPU run-total accounting result to the run lifecycle event | Poll-only run usage |
| ARO-026 | Keep diagnostics non-authoritative | Reuse | Contract | ARO-022, ARO-024, ARO-025 | Runtime correctness and recovery do not depend on exporter availability | Telemetry as lifecycle database |
| ARO-027 | Evaluate managed skill dispatch #114 | Reuse evidence | Claws/B1 | ARO-003 | Canonical admission reuses native skill/session/subagent owners without workflow semantics | Duplicate runner checks |
| ARO-028 | Decide managed dispatch durable home | Downstream-only | Claws/OpenClaw | ARO-027 | Accepted application owner or archive; no parallel generic dispatcher | Fork #114 if rejected |
| ARO-029 | Define Lobster run projection | Downstream-only | Lobster | ARO-004, ARO-006, ARO-010, EXA-011 | Projection consumes fixture outcomes whether or not residual upstream fields are needed; no copied transcript/secrets | Log scraping |
| ARO-030 | Define Lobster delegated-work policy | Downstream-only | Lobster | ARO-003, ARO-021 | Tenant depth/resource/role policy gates native admission without rewriting child truth | Host-owned subagent registry |
| ARO-031 | Prove managed cancel routing | Downstream-only | Lobster | ARO-017, ARO-018, ARO-030 | Current controller authorizes; unknown/revoked authority fails closed | Parent/admin guesswork |
| ARO-032 | Build language-neutral run fixtures | New component | Evidence | ARO-008, ARO-009, ARO-021 | Accepted/rejected/cancel/restart/terminal/delegation cases versioned independently of implementation | Rust-specific semantics |
| ARO-033 | Implement Rust run-envelope validator | New component | Rust | ARO-032 | Parses and validates fixtures without execution authority | Direct full-kernel rewrite |
| ARO-034 | Select first Rust execution profile | New component | Planning | ARO-033, RFN-035, CFA-037, IAE-026, MPU-011, DGR-029, KCC-028, EAR-033, XPK-006 | One bounded child/worker profile, session/state owner, resources, unsupported features, policy/authority dependencies, artifact/release contract, and exact TS deletion target named | Unbounded agent kernel |
| ARO-034A | Prove pre-cutover runtime state migration and rollback readiness | New component | Release | ARO-034, KCC-028, EAR-033, XPK-006, XPK-008, XPK-009 | Current-owner release/recovery, session/run state import, in-flight attempts, mixed versions, downgrade refusal, rollback limits, and unknown settlement are proven before authority changes | Canary-first runtime migration |
| ARO-035 | Canary one authoritative runtime | New component | Migration | ARO-034A, XPK-010 | TypeScript or Rust selected before admission; no dual effect; restart/rollback limits proven | Dual runtime dispatch |
| ARO-036 | Delete reconstruction, fallback, and superseded TS owner | Delete | Release | ARO-035 | Aggregate reconstruction, migration adapters, selector, fallback, exact TS path/tests removed for promoted profile | Permanent dual implementation |

## Sequencing

```text
source and identity inventory
  -> cross-entry run fixture
  -> execution-attempt binding proof
  -> terminal projection reconciliation
  -> delegation authority/restart fixtures
  -> owner-local issue adoption
  -> Lobster projection and admission
  -> language-neutral conformance
  -> bounded Rust profile
  -> TypeScript deletion
```

## Findings

1. **OpenClaw already has real run and delegation owners.** The architecture is
   distributed, not absent.
2. **Run, attempt, provider call, tool call, child run, schedule, and delivery
   are different objects.** A universal execution ID would make the design
   worse.
3. **The most important EC-008 gap is fixed binding identity.** Current runtime
   generations are strong but not one durable whole-attempt relationship.
4. **Delegation has four distinct relationship identities.** Requester,
   controller, completion owner, and lineage parent must never collapse.
5. **The strongest EC-009 gaps are restart and settlement edges.** Child slots
   are process-local and terminal state spans registry, task, session,
   delivery, and cleanup owners.
6. **Existing issues own the main projection gaps.** #50291, #101867, #104950,
   #90911, and #57404 should be adopted instead of creating a new event family.
7. **Fork #148 and #149 are evidence, not a stack.** Each should move only
   through its semantic owner.
8. **Rust is not next for the full agent kernel.** The safe first step is a
   fixture validator or one isolated delegated-worker profile after contracts
   stabilize.

## Package Exit

This package is complete when:

- Gateway and channel entry paths share one proven run relationship;
- a whole-execution attempt is either proven necessary and stabilized or
  explicitly disproved;
- terminal projections derive from one owner result;
- cancellation before dispatch, during approval, after dispatch, and during
  child delivery remains distinct from denial, handler failure, and terminal
  effect certainty;
- parent trust revocation and child cancel/terminal/delivery/cleanup survive
  restart with separate evidence;
- existing run/subagent correlation, telemetry, and usage issues have explicit
  dispositions;
- Lobster projects fixture outcomes whether or not optional upstream residuals
  are accepted and does not become the run or delegation database; and
- any Rust replacement names and deletes one complete TypeScript owner profile
  rather than creating a permanent dual runtime.
