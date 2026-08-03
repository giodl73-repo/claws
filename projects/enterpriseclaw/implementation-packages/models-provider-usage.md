# Models, Provider Attempts, and Usage Implementation Package

Status: reconciled implementation package  
Last validated: 2026-08-02  
EnterpriseClaw contracts: EC-011, EC-012

## Executive Decision

OpenClaw already separates model catalog, logical route selection, auth
binding, prepared runtime, fallback candidates, model calls, and run-total
usage. The missing contract is narrow:

```text
run execution attempt
  -> provider candidate attempt
      -> model call
          -> hashed provider request identity
```

The implementation strategy is:

- keep catalog, selection, credentials, prepared runtime, model calls, and run
  accounting with their current owners;
- add candidate-attempt identity only if a bounded primary-failure/fallback
  fixture proves current records cannot correlate the lifecycle;
- derive per-candidate usage from existing per-call observations without
  changing the run-total accumulator;
- adopt #107937/#98968 for plugin-runtime usage diagnostics;
- defer #90674 cost provenance to the persisted usage/pricing owners and do
  not invent unknown-versus-free semantics;
- treat #13219, #90911, and #57404 as separate product/projection decisions,
  not reasons to create a global billing service;
- keep tenant budgets, rate cards, allocation, anomaly policy, and chargeback
  in Lobster; and
- use Rust only for bounded provider transport/isolation behind the same
  candidate/call/usage contracts.

## Owner Model

| Owner | Responsibility |
| --- | --- |
| Model catalog owner | Definitions, metadata, discovery, lookup, ordering, and compatibility |
| Route/selection owner | Logical provider/model intent, aliases, allowlists, donor projection, and ordered candidates |
| Credential/auth owner | Profile, endpoint, environment, SecretRef, rotation, cooldown, and availability |
| Prepared runtime owner | Fingerprinted executable provider/model/auth/runtime generation and lease |
| Fallback owner | Candidate order, candidate attempt, retry/cooldown, and terminal candidate settlement |
| Model-call owner | Actual provider request, call identity, timing, status, usage, and hashed upstream request ID |
| Run-total owner | Aggregate usage across successful, failed, and retried calls |
| Pricing/cost owner | Rate source, provenance, estimate, provider-billed value, unavailable/free state, and version |
| Budget/allocation owner | Admission, reservation, limit, exhaustion, delayed settlement, and policy |
| Lobster | Tenant rate cards, budgets, allocation, anomaly policy, reporting, and enterprise FinOps UX |

Selection is not availability, availability is not readiness, usage is not
cost, estimated cost is not billing, and billing is not budget authority.

## Area RFC Boundaries

| Area RFC | EnterpriseClaw source | Boundary |
| --- | --- | --- |
| MPU-01 Model catalog and route intent | EC-011 dependency | Definitions, logical route, donor privacy, aliases, allowlists, and selected intent |
| MPU-02 Auth and prepared runtime binding | EC-011 | Auth profile/runtime generation, endpoint, credential reference, lease, freshness, and fencing |
| MPU-03 Provider candidate attempts and fallback | EC-011 | Candidate ID/order, fixed binding, dispatch state, model-call links, retry/cooldown, cancellation, timeout, and settlement |
| MPU-04 Model-call and provider-request evidence | EC-011, EC-012 | Call ID, provider-native request hash, timing, status/error, tokens, and confidence |
| MPU-05 Usage and cost reconciliation | EC-012 | Per-call, per-candidate, run-total, provider record, estimate, billing, delayed reconciliation, and chronology |
| MPU-06 Managed budgets and FinOps projection | EC-012, EC-031 | Tenant rate cards, reservations, caps, allocation, attribution, anomaly, reporting, and enforcement |

These boundaries do not create a universal model gateway or one global budget
manager.

## Current OpenClaw Owner Seams

| Concern | Existing seam | Current strength | Residual gap |
| --- | --- | --- | --- |
| Catalog | Model catalog/lookup/order | Normalized definitions, configured overlays, discovery, lookup, ordering | No package change required |
| Logical route | Catalog route and provider-model route | Selected public route separated from private donor facts | Route identity is intent, not invocation |
| Selection | Model selection/resolution | Defaults, session override, explicit ref, alias, allowlist, fallback-backed availability | Selection does not prove auth or provider success |
| Auth binding | Provider auth/profile/runtime config | Profile order, env, SecretRef, endpoint, cached auth snapshot, source plan, availability | Fallback observations retain broad auth mode, not exact redacted generation ref |
| Prepared runtime | Prepared model runtime owner | Fingerprinted generation, reuse/replacement, lease, auth mutation fencing | Not linked through a durable candidate identity |
| Fallback | Candidate planner/runner/observations | Ordered candidates, retry/cooldown/probe behavior, structured provider/model/error/reason/status/code | No stable OpenClaw candidate-attempt ID |
| Model call | `model.call.*` diagnostics | `runId`, `callId`, provider/model/API/transport, duration, status, error, tokens, hashed upstream request ID | Call is not the fallback candidate |
| Run usage | Usage accumulator | Correctly retains failed/retried usage in aggregate totals | Loses per-candidate partition |
| Cost | Persisted usage plus aggregate reader | Provider-billed origin support; merged #85882 prevents unpriced aggregate spend from looking confidently zero | Persisted per-turn provenance cannot distinguish estimate, free, or unavailable |
| Plugin LLM usage | Runtime LLM completion | Owns successful completion, normalized usage, estimated cost, agent and optional session | Missing diagnostic projection; #107937 owns the path |

## Existing-Investment Crosswalk

### Candidate and model-call identity

| Investment | State on 2026-08-02 | Classification | Package consequence |
| --- | --- | --- | --- |
| Current fallback and `model.call` owners | Present | Reuse | Source of truth |
| Candidate-attempt evidence slice | Local design/evidence only | B1 candidate | Build executable fixture before filing |
| Stable upstream candidate-attempt thread | None found | New ask candidate | File only after disproof against current records |

### Usage diagnostics and product surfaces

| Investment | State on 2026-08-02 | Classification | Package consequence |
| --- | --- | --- | --- |
| #98968 plugin runtime usage gap | Open; source-reproduced; linked PR open | Adopt | Exact demand anchor |
| #107937 plugin LLM usage diagnostics | Open non-draft, head `f52816089d1b` | Adopt/repair existing | Review metric compatibility and duration semantics; no duplicate PR |
| Fork #150 | Open draft, head `06ed6cb65ba` | B1 evidence | Minimal owner-local emission; remove misleading duration if promoted |
| #13219 per-model usage product | Open; maintainer/product decision required | Adopt/defer | Dedicated product surface, not satisfied by one diagnostic event |
| #90911 task/subagent usage | Open; maintainer/product decision required | Adopt/defer | Projection tied to task/subagent owners |
| #57404 run usage lifecycle events | Open; maintainer/product decision required | Adopt/defer | Projection tied to run owner |

### Cost provenance

| Investment | State on 2026-08-02 | Classification | Package consequence |
| --- | --- | --- | --- |
| #90674 unknown pricing | Open; maintainer/product decision required | Adopt/defer | Owner must define provider-billed/estimated/free/unavailable states |
| #85882 aggregate missing cost | Merged 2026-05-25 at `d7363801d157` | Reuse | Prevents confident aggregate `$0` for unpriced token use |
| #90825 warning attempt | Closed without merge | Do not repeat | A hot-path warning is not the owner contract |

### Lobster budget evidence

| Investment | State on 2026-08-02 | Classification | Package consequence |
| --- | --- | --- | --- |
| `bic/lobster#3371` context-budget plugin | Merged 2026-06-20 at `4a19dbe12281` | Downstream-only | Existing read-only managed analysis surface |
| `bic/lobster#3379` Budget UX | Merged 2026-06-21 at `0306300dd110` | Downstream-only | Existing gated operator projection |
| `OPENCLAW_CODE_MODE_JUDGE_DAILY_COST_USD` | Existing Lobster host input | Downstream-only | Current bounded managed cost-policy example |
| Historical fork rate-card/attribution notes | Not live delivery inventory | Evidence concepts only | Current `giodl/lobster#3/#4/#9` are unrelated host-provider PRs; do not cite them as Budget implementation |

The live correction is important: historical notes that named fork PRs #3,
#4, and #9 as Budget work are stale. Current GHE titles and heads are unrelated
host-provider work, so no active rate-card or spend-attribution PR is claimed.

## Residual Upstream Workstreams

### U-MPU-01: Candidate-attempt identity, conditional

Build the bounded fixture first:

- one run execution attempt;
- primary candidate with fixed provider/model/auth/runtime binding;
- one or more model calls;
- retryable failure;
- fallback candidate with distinct identity and ordinal;
- successful model call;
- per-call and per-candidate usage;
- aggregate run reconciliation; and
- one candidate fenced before dispatch with zero calls/usage.

Only if current source cannot express this without provider/model/time-window
reconstruction should the fallback owner add a stable candidate identity.

### U-MPU-02: Candidate settlement and restart, conditional

If U-MPU-01 is justified, preserve:

- allocated, prepared, dispatched, retryable failure, terminal failure,
  succeeded, cancelled, timed out, fenced, and unknown;
- candidate-to-model-call links;
- redacted auth-profile and prepared-runtime generations;
- retry/cooldown reason and chronology;
- late provider result without duplicate candidate creation; and
- restart lookup by run-attempt/candidate identity.

No provider-native ID or transport schema is replaced.

### U-MPU-03: Adopt plugin-runtime usage diagnostics

Use #98968/#107937. Owners choose:

1. minimal accounting completeness using existing `model.usage`; or
2. attributed accounting with a permanent bounded plugin dimension.

Do not record plugin completion latency as agent-run duration. Do not open
another PR while #107937 is active.

### U-MPU-04: Cost provenance decision

Use #90674 and the existing persisted usage/pricing owners to define:

- provider-billed;
- catalog/rate-card estimated;
- explicitly free/local;
- unavailable;
- partial; and
- unknown.

Define migration/replay behavior and whether unavailable omits numeric cost or
retains compatibility values with explicit state. No heuristic may infer
unknown versus free from all-zero rates.

### U-MPU-05: Delayed provider usage reconciliation, conditional

First prove one real provider record that arrives after the model-call result.
Then determine whether current owner records can idempotently bind:

- provider record identity;
- candidate attempt;
- model call;
- run total;
- provider-issued time;
- observed time;
- reconciled time; and
- estimate/billing replacement chronology.

Do not build a generic reconciliation service from hypothetical billing APIs.

### Not residual upstream work

- Lobster tenant budgets, chargeback, rate-card approval, anomaly policy, or
  reporting;
- a dedicated usage-log product hidden inside #107937;
- one global budget manager;
- prompt/output content in accounting evidence;
- raw credentials or provider request IDs;
- a universal provider request schema;
- catalog or route ownership of invocation outcomes; or
- a central OpenClaw billing database.

## Fork and Adapter Ledger

| Ledger item | Class | Purpose | Current relationship | Exit |
| --- | --- | --- | --- | --- |
| Candidate-attempt evidence fixture | B1 | Prove parent identity over existing model calls | Not implemented | Upstream owner extension or delete |
| Fork #150 runtime usage | B1 | Prove minimal plugin completion accounting | Superseded by active #107937 path | Transfer selected fix or archive |
| Provider/model/time-window joins | B3 | Reconstruct fallback and usage relationships | Current operator/support workaround | Delete after candidate/call links |
| Current-profile inference | B3 | Infer historical auth binding from latest profile state | Unsafe support workaround | Delete after redacted generation refs |
| Aggregate-only candidate accounting | B3 | Attribute all run usage to final successful model | Incorrect projection | Delete after per-candidate derivation |
| Lobster context-budget plugin | B2 | Read-only analysis/recommendation | Merged #3371 | Remain downstream |
| Lobster Budget UX | B2 | Gated operator projection | Merged #3379 | Remain downstream |
| Judge daily-cost input | B2 | Managed feature-specific cost cap | Lobster host policy | Remain downstream |
| Rate-card adapter | B2 | Future approved rate-card ingestion | No current live PR | Remain Lobster if implemented |
| Spend-attribution adapter | B2 | Future tenant/user/workload attribution | No current live PR | Remain Lobster if implemented |
| Provider transport worker | B1/B2 | Isolate one provider transport behind stable contract | Future Rust/component proof | Independent component or delete |
| Compatibility fallback | B3 | Preserve TypeScript provider path during migration | Current runtime | Delete for promoted worker profile |

## Lobster Managed Capabilities

| Capability | Lobster responsibility | Portable dependency |
| --- | --- | --- |
| Rate-card ownership | Approved source, currency, effective version, integrity, staleness, and model coverage | U-MPU-04 |
| Tenant budgets | Soft/hard limits, reservations, allocation, exhaustion, and policy | EC-031 |
| Feature-specific caps | Judge or workload-specific daily/operation limits | Owner usage evidence |
| Spend attribution | Tenant/user/agent/workspace/task/skill/tool classification with disclosure policy | MPU-04/MPU-05 |
| Anomaly and recommendation | Read-only analysis, confidence, rollout, and remediation UX | Merged Budget plugin/UX |
| Managed provider selection | Tenant allowlists, deployment policy, broker selection, and enterprise egress | Current OpenClaw route/credential owners |
| Chargeback/reporting | Invoice/provider import, allocation rules, retention, reconciliation, and audit | U-MPU-05 if portable links are needed |

Lobster may enforce budgets before admission and reconcile enterprise billing
afterward. It must not rewrite provider call, token, or run-total truth.

## Optional Rust Components

| Component | Purpose | Promotion gate |
| --- | --- | --- |
| Rust candidate/usage fixture runner | Validate language-neutral candidate/call/reconciliation cases | U-MPU-01/U-MPU-05 accepted |
| Rust provider transport worker | Isolate one provider protocol/auth/stream/cancel path | Stable provider-specific contract and owner approval |
| Rust pricing calculator | Consume an approved versioned rate card for estimates | U-MPU-04 provenance contract |

A Rust worker does not become a universal model gateway. It preserves logical
route, credential, candidate, model-call, upstream request, usage, and terminal
identities owned by the surrounding system.

## Operator Journey

```text
inspect route
  -> selected logical provider/model
  -> auth and prepared-runtime generation
  -> ordered fallback candidates

inspect run
  -> candidate 1 failed after model call
  -> candidate 2 succeeded
  -> per-call usage
  -> per-candidate usage
  -> aggregate run usage

inspect cost
  -> provider-billed / estimated / free / unavailable / partial
  -> pricing or provider-record version
  -> issued / observed / reconciled times
  -> tenant budget/allocation status
```

## Acceptance Gates

### Candidate attempts

- Candidate identity is allocated by the fallback owner before dispatch.
- Candidate order and fixed provider/model/auth/runtime bindings are explicit.
- A fenced pre-dispatch candidate has zero calls and zero usage.
- A post-dispatch timeout may have usage and unknown upstream settlement.
- Retries and fallback candidates remain distinguishable after restart.
- Candidate identity never includes secret material.

### Model calls and usage

- Existing model-call identity remains authoritative.
- All calls link to one candidate or explicitly report legacy/unknown linkage.
- Failed and retried calls remain in run totals.
- Per-candidate usage derives from linked calls; it does not replace run totals.
- Raw prompts, responses, credentials, and provider request IDs are absent.

### Cost and reconciliation

- Provider-billed and estimated cost are distinct.
- Free/local and unavailable are never inferred from the same zero-rate shape.
- Delayed records reconcile idempotently by provider record plus candidate/call
  identity.
- Issued, observed, and reconciled times remain distinct.
- Corrections supersede by reference and preserve prior evidence.

### Budgets and operations

- Budget admission and usage settlement have separate owners.
- Missing cost blocks confident financial claims but need not block ordinary
  local model execution unless explicit policy requires it.
- Pricing/cache/provider degradation is scoped and fresh.
- Metric dimensions remain bounded and compatibility-reviewed.
- Exporter failure never changes model-call or run settlement.

## Dependency-Ordered Work Items

| ID | Work item | Classification | Layer | Depends on | Acceptance | Deletion target |
| --- | --- | --- | --- | --- | --- | --- |
| MPU-001 | Freeze model/provider/usage inventory | Reuse | Planning | - | Source owners, live issues/PRs, Lobster investments, stale references, and dates recorded | Stale duplicate inventory |
| MPU-002 | Define model/provider identity matrix | Reuse | Planning | MPU-001 | Catalog, route, auth profile, prepared runtime, candidate, call, upstream request, usage, pricing, and budget identities separated | Universal model identity |
| MPU-003 | Define usage/cost confidence matrix | Reuse | Planning | MPU-001 | Observed tokens, estimate, provider-billed, free, unavailable, partial, unknown, and corrected separated | Numeric cost as certainty |
| MPU-003A | Define provider-request identity privacy contract | Reuse | Contract | MPU-002, MPU-003, XPK-003 | Hash/key or salt strategy, version, collision handling, retention, disclosure, and cross-tenant unlinkability are explicit | Stable cross-tenant request fingerprint |
| MPU-004 | Build primary/fallback candidate fixture | New ask candidate | B1 evidence | MPU-002, MPU-003A, ARO-006 | Primary retryable failure and fallback success retain candidate order/bindings under one stable run attempt | Call-order reconstruction |
| MPU-005 | Link existing model calls to candidates | Extend existing | B1 evidence | MPU-004 | Each call has one candidate; legacy unknown remains explicit | Provider/time-window joins |
| MPU-006 | Derive per-candidate usage | Extend existing | B1 evidence | MPU-005 | Linked per-call sums reconcile to existing run total including failed calls | Final-model-only attribution |
| MPU-007 | Prove pre-dispatch generation fence | Extend existing | Evidence | MPU-004 | Changed auth/runtime generation blocks candidate with zero calls/usage | Stale credential dispatch |
| MPU-008 | Prove post-dispatch timeout uncertainty | Extend existing | Evidence | MPU-005 | Timeout may retain usage and unknown provider settlement | Timeout as zero usage |
| MPU-009 | Prove candidate restart reconciliation | Extend existing | Evidence | MPU-004, MPU-005 | Late result/retry does not duplicate candidate or usage | In-memory-only attempt order |
| MPU-009A | Name the durable candidate persistence owner | Reuse | Contract | MPU-009 | Existing fallback/run owner, schema generation, lookup, migration, corruption, and cleanup are explicit before a residual ask | Unowned candidate database |
| MPU-010 | Decide U-MPU-01 identity residual | New ask candidate | Upstream | MPU-006, MPU-007, MPU-009A | Stable candidate identity proven necessary and minimal in the named owner | New provider gateway |
| MPU-011 | Decide U-MPU-02 settlement residual | New ask candidate | Upstream | MPU-008, MPU-009, MPU-010 | Only missing restart/terminal fields added to fallback owner | Universal provider schema |
| MPU-012 | Adopt #98968/#107937 | Adopt | Upstream | MPU-001 | Selected minimal or attributed usage contract fixes plugin completions | Duplicate usage PR |
| MPU-013 | Resolve #107937 duration semantics | Extend existing | Upstream | MPU-012 | Plugin completion latency never populates agent-run duration | Misnamed duration metric |
| MPU-014 | Resolve plugin attribution compatibility | Extend existing | Upstream | MPU-012 | Permanent dimensions accepted and live exporter proof attached, or omitted | Unreviewed metric-cardinality change |
| MPU-015 | Archive or transfer fork #150 | Delete | B1 | MPU-012, MPU-013 | Useful minimal logic transferred without misleading duration, or branch archived | Fork #150 |
| MPU-016 | Keep #13219 product decision separate | Adopt/defer | Upstream product | MPU-012 | Dedicated usage-log scope not claimed by diagnostics fix | Hidden usage product |
| MPU-017 | Own #90911 task/subagent accounting link | Adopt/defer | Upstream | MPU-006, ARO-003 | Accounting references exact task/subagent owner identity; ARO only attaches the projection | Fragile task usage |
| MPU-018 | Own #57404 run accounting link | Adopt/defer | Upstream | MPU-006, ARO-002 | Accounting result references the exact run; ARO only attaches the lifecycle projection | Poll-only run usage |
| MPU-019 | Record merged #85882 behavior | Reuse | Contract | MPU-003 | Aggregate unpriced spend remains missing, not confident zero | Aggregate `$0` certainty |
| MPU-020 | Resolve #90674 provenance states | Adopt/defer | Upstream | MPU-003, MPU-019 | Persisted usage distinguishes billed/estimated/free/unavailable/partial/unknown | Zero-rate inference |
| MPU-021 | Define persisted compatibility migration | Extend existing | Upstream | MPU-020 | Old JSONL/worker/session records remain readable with explicit legacy state | Breaking replay schema |
| MPU-022 | Find one delayed provider record | Reuse evidence | Research | MPU-002 | Real provider API/record with stable identity and delayed usage/billing documented | Hypothetical reconciliation |
| MPU-023 | Build delayed reconciliation fixture | New ask candidate | Evidence | MPU-010, MPU-020, MPU-022 | Provider record causally updates candidate/call/run without time-window inference | Batch-window joins |
| MPU-024 | Decide U-MPU-05 residual | New ask candidate | Upstream | MPU-023 | Existing owners insufficient for idempotent delayed settlement | Generic billing service |
| MPU-025 | Preserve run-total ownership | Reuse | Contract | MPU-006, MPU-023 | Candidate reconciliation never removes failed/retried usage from aggregate | Candidate-owned run total |
| MPU-026 | Reconcile Lobster Budget plugin | Adopt | Lobster | MPU-001 | #3371/#3379 remain read-only downstream analysis/UX | Parallel core budget package |
| MPU-027 | Correct stale Lobster fork references | Delete | Portfolio | MPU-001 | Historical #3/#4/#9 Budget claims removed or marked non-live | False active investment claims |
| MPU-028 | Define approved Lobster rate-card owner | Downstream-only | Lobster | MPU-020 | Version, currency, authority, integrity, approval, staleness, coverage, and fallback explicit | Unversioned local price map |
| MPU-029 | Define tenant budget reservation | Downstream-only | Lobster | MPU-006, DGR-026, DGR-034, XPK-005 | Admission, reservation, exhaustion, release, and late settlement identities explicit without requiring a portable lease residual | Global OpenClaw budget manager |
| MPU-030 | Reconcile judge daily-cost policy | Downstream-only | Lobster | MPU-029 | Existing feature cap maps to bounded owner usage and explicit uncertainty | Env value as billing truth |
| MPU-031 | Define spend attribution disclosure | Downstream-only | Lobster | MPU-006, MPU-028 | Tenant/user/agent/workload dimensions are authorized, bounded, and coverage-aware | Raw identity in telemetry |
| MPU-032 | Define anomaly/recommendation confidence | Downstream-only | Lobster | MPU-028, MPU-031 | Recommendations remain read-only and show missing/partial evidence | Automated spend mutation |
| MPU-033 | Build language-neutral candidate/usage fixtures | New component | Evidence | MPU-010, MPU-020, MPU-024 | Accepted/failure/fence/timeout/delayed/correction cases versioned | Implementation-specific proof |
| MPU-034 | Implement Rust fixture runner | New component | Rust | MPU-033 | Rust matches TypeScript results without provider authority | Rust-specific accounting semantics |
| MPU-035 | Select bounded Rust provider worker | New component | Planning | MPU-034, RFN-035, CFA-037, IAE-026, DGR-029, EAR-033, XPK-006 | One provider protocol, auth source, stream/cancel, resource budget, artifact/release path, and exact TS deletion target named | Universal Rust model gateway |
| MPU-035A | Prove pre-cutover provider-worker migration and rollback readiness | New component | Release | MPU-035, EAR-033, XPK-006, XPK-008, XPK-009 | Current-owner release/recovery, candidate/call state compatibility, credentials, in-flight streams, metrics, downgrade refusal, rollback limits, and unknown settlement are proven before authority changes | Canary-first provider migration |
| MPU-036 | Canary provider worker | New component | Migration | MPU-035A, XPK-010 | One worker selected before dispatch; candidate/call IDs preserved; no dual call | Dual provider dispatch |
| MPU-037 | Prove release and rollback limits | New component | Release | MPU-036 | Mixed versions, state, credentials, metrics, cancellation, and rollback behavior explicit | Binary rollback as call rollback |
| MPU-038 | Delete fallback adapters and superseded TS worker | Delete | Release | MPU-037 | Selector, compatibility path, migration adapter, exact TS code/tests removed for promoted profile | Permanent dual transport |

## Sequencing

```text
identity and confidence inventory
  -> provider-request privacy and durable persistence ownership
  -> primary/fallback fixture
  -> candidate/call links and per-candidate usage
  -> active usage PR adoption
  -> cost provenance decision
  -> real delayed-provider proof
  -> Lobster rate card, budget, and attribution
  -> language-neutral fixtures
  -> optional bounded Rust worker
  -> TypeScript deletion
```

## Findings

1. **OpenClaw does not need a new provider-attempt replacement object.** It
   needs a candidate parent over existing model calls.
2. **Run totals are already correct.** They intentionally retain failed and
   retried usage; per-candidate partitions must derive from calls.
3. **#107937 is the active plugin-usage path.** Fork #150 is evidence only and
   contains a duration semantic that must not become agent-run latency.
4. **Cost provenance is a product contract.** #90674 cannot be safely fixed by
   treating zero rates as unknown because zero also represents free/local
   models.
5. **Aggregate cost is safer than it was.** Merged #85882 prevents token use
   without pricing from appearing as confident zero in aggregate views.
6. **Delayed reconciliation must start from a real provider record.** A generic
   billing service is not justified by hypothetical APIs.
7. **Historical Lobster Budget PR references are stale.** Current fork PRs #3,
   #4, and #9 are unrelated host-provider work and cannot count as live
   rate-card/attribution investment.
8. **Lobster is the correct home for enterprise FinOps.** OpenClaw should
   expose portable call/usage/provenance facts; Lobster owns tenant budgets,
   allocation, chargeback, anomaly policy, and UX.

## Portable Package Exit

The portable package is complete when:

- one primary/fallback fixture proves or disproves candidate-attempt identity;
- every model call can link to a candidate without provider/time-window joins;
- candidate identity has a named durable owner and request hashes cannot become
  stable cross-tenant correlation identifiers;
- per-candidate usage reconciles to unchanged run totals;
- #107937/#98968 has an owner-approved accounting/attribution outcome;
- #90674 has explicit persisted cost provenance and compatibility semantics;
- delayed reconciliation is implemented only if a real provider record proves
  the need; and
- any Rust provider worker preserves the contract and deletes one superseded
  TypeScript transport path.

## Managed FinOps Exit

The optional managed composition is complete when Lobster has live, correctly
referenced owners for approved rate cards, tenant reservations, budgets,
attribution, anomaly confidence, disclosure, and product UX. Missing managed
FinOps investment does not block the portable OpenClaw candidate/call/usage
contract.
