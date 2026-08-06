# Experience and Administration Implementation Package

## Purpose

This package reconciles:

- EC-001 Owner State Projection; and
- EC-002 Diagnostic and Repair Plans.

It closes the implementation-package decomposition for all 35 EnterpriseClaw
contracts.

The objective is a coherent local and managed experience over existing owner
systems:

```text
owner-native facts
  -> versioned observation envelope
  -> audience-bound projection
  -> findings and explanation
  -> previewed owner-native repair
  -> applied and validated settlement
```

Experience and administration remain projections and bounded command surfaces.
They do not become canonical configuration, policy, readiness, session,
release, audit, or fleet state.

## Package Boundaries

| Boundary | Contracts | Owns | Does not own |
| --- | --- | --- | --- |
| EXA-01 Owner observation envelope | EC-001 | Projection version, owner, subject, generation, observation, freshness, certainty, owner payload, evidence references | Universal owner state enum |
| EXA-02 Audience, disclosure, and compatibility | EC-001 | Audience/profile, redaction, omissions, cache freshness, envelope/payload compatibility | Authorization or canonical owner data |
| EXA-03 Composition and aggregate explanation | EC-001 | Child sources/generations, partial/stale/unknown preservation, summary and next action | Fleet desired state or owner mutation |
| EXA-04 Diagnostic findings | EC-002 | Finding identity, severity, cause, consequence, evidence, fix class, owner remediation reference | Owner health or policy decision |
| EXA-05 Repair plan and settlement | EC-002 | Stable plan identity, preview/apply correlation, conflicts, authority references, owner results, validation, rollback reference | Central mutation engine |
| EXA-06 Local and managed administration | EC-001, EC-002 | CLI/Control UI/admin projections, preferences, bounded requests, progress, terminal display | Duplicate runtime/config/policy storage |
| EXA-07 Catalog, localization, and presentation | EC-001, EC-002 | Stable machine meaning, localized rendering, accessibility, command/repair discovery | Semantic ownership of commands or repairs |

## Current Owner Map

| Concern | Current owner and evidence | Package decision |
| --- | --- | --- |
| Configuration state | Runtime/source revisions, fingerprints, accepted source hash, activation, supersession, restart debt | First projection fixture owner |
| Readiness state | Generation-bound conditions, reason, observed time, freshness, availability, recovery | Second projection fixture owner |
| Release state | Exact artifact, installed/active state, compatibility, migration, readiness, rollback/recovery certainty | Third projection fixture owner |
| Delivery state | Operation/native attempt, provider receipt, suppression, partial/unknown outcome | Reuse as an unlike follow-on owner |
| Node state | Pairing generation, connection incarnation, capability, presence, invocation settlement | Reuse as an unlike follow-on owner |
| Lifecycle state | Complete, retained, deferred, blocked, external, unsupported, unknown per copy | Reuse for `deleted locally; copies remain` proof |
| Doctor findings | Structured per-check findings, default/opt-in selection, severity, owner-shaped metadata | Reuse |
| Doctor repair | Owner repair callbacks, dry-run effects, apply, validation, visible failure | Extend only for durable plan identity and settlement |
| Command catalog | Static/runtime/plugin inventory, audit and summary views, generated references | Discovery/projection input, not runtime truth |
| Localization | Immutable locale context, catalogs, surface coverage, stable JSON identifiers | Reuse for presentation conformance |
| Control UI | OpenClaw static application and Gateway scopes; #115408/#116013 host policy/enforcement | Adopt generic host boundary |
| Lobster hosted UI | Merged #6060 design and #6121 hosted Control UI; #6116 root cutover draft | Downstream hosting, auth, rollout, and replacement |
| Policy administration | Merged #3355/#3388/#3391 preview/baseline/UX; later save/publish stack | Downstream governed authoring and persistence |
| Shared config-admin shell | Descriptor registry and preview-first save design | Downstream composition; consume OpenClaw schema/findings |

## Planning Boundary Details

### EXA-01 Owner Observation Envelope

The shared envelope standardizes relationship facts while preserving the
owner-native state machine:

```text
projection
  - schema/version
  - producer
  - audience/profile
  - generated time

source
  - owner type and identity
  - subject identity
  - observed generation

observation
  - observed/effective time
  - freshness policy/state
  - certainty and basis
  - compatibility

owner result
  - owner-native code
  - owner payload version
  - opaque/versioned payload

explanation
  - reasons/findings
  - remediation references
  - disclosure/omissions
  - evidence references
```

The first fixture adapts configuration, readiness, and release. It must not
invent one `healthy` or `success` state across them.

### EXA-02 Audience, Disclosure, and Compatibility

Local and managed audiences consume the same observed owner fact but may
receive different detail:

| Audience | Typical detail |
| --- | --- |
| Hobbyist/local operator | Current state, concise reason, safe next action |
| Developer/maintainer | Generation, compatibility, raw owner reason, diagnostics |
| Enterprise operator | Fleet/unit correlation, freshness, policy and repair references |
| Administrator | Governed preview, authority, source, affected owners, save/apply state |
| Security/auditor | Redaction class, omissions, certainty, evidence and retention references |

Redacted or omitted detail remains declared. A protected detail omission cannot
be rendered as confirmed health. Envelope and owner-payload versions evolve
independently; unknown required semantics produce `incompatible`.

### EXA-03 Composition and Aggregate Explanation

Composition records every required child:

- source owner and subject;
- generation;
- observation and freshness;
- owner result;
- projection status;
- certainty;
- reason and action; and
- evidence reference.

Aggregate summaries never erase a stale, incompatible, partial, unavailable,
ambiguous, or unknown required child. Composition is side-effect free and
cannot become fleet desired state or repair authority.

The lifecycle fixture must render:

```text
deleted locally
  -> transcript/index complete
  -> archive retained
  -> QMD deferred
  -> backup retained
  -> provider copy externally controlled
```

### EXA-04 Diagnostic Findings

Doctor remains the diagnostic facility. Findings identify:

- stable check/finding identity;
- owner and subject;
- generation or explicit legacy/unknown state;
- severity and confidence;
- cause and consequence;
- evidence and observation time;
- fix class;
- repair owner and preview availability; and
- compatibility/unsupported behavior.

Merged #100361 proves explicit default versus `--all`/`--only` selection.
Doctor checks remain read-only until an explicit repair path is selected.

### EXA-05 Repair Plan and Settlement

Current Doctor already supports structured repair metadata, dry-run effects,
owner callbacks, apply, and validation. The target delta is:

```text
finding set
  -> stable plan identity
  -> normalized repair intent
  -> preview operation and effects
  -> approval/authority binding
  -> expected owner generations
  -> apply operation/attempt
  -> per-owner settlement
  -> validation
  -> rollback or recovery reference when required
```

Material plan changes create a new intent and require reauthorization. Repairs
that need checkpoint restore consume EC-021. Durable evidence consumes EC-033.
The repair facility does not directly mutate unrelated owner stores.

### EXA-06 Local and Managed Administration

The administration rule is:

```text
OpenClaw owner APIs and schemas
  -> local CLI and Control UI
  -> optional Lobster hosting/auth/policy
  -> managed preview/approval/rollout
```

Lobster may:

- host the version-matched Control UI;
- authenticate and select the user's Gateway;
- enforce generic host policy;
- persist tenant policy and admin preferences;
- show governed fields as locked with owner/reason;
- coordinate preview, approval, rollout, and exceptions; and
- replace duplicated Lobster SPA surfaces after adoption.

It must not parse and rewrite OpenClaw config or runtime state as a second
authority. Merged #6121 is the hosted UI adoption path; #6116 is optional root
cutover, not a portable contract.

### EXA-07 Catalog, Localization, and Presentation

Machine-readable state, finding, plan, effect, and settlement identifiers stay
stable across locale and surface. Human wrappers, explanations, and action
labels may localize.

Command catalogs and generated references help discover inspect/repair
surfaces. They remain inert observations and documentation, not proof that an
external provider, plugin, node, or repair owner is currently available.

## Existing Investment Crosswalk

### OpenClaw

| Investment | Live state on 2026-08-02 | Disposition |
| --- | --- | --- |
| Structured Doctor finding stack | Many merged owner slices | Reuse |
| Doctor lint default audit #100361 | Merged 2026-07-08 | Reuse selection contract |
| Doctor config write preview #99255 | Open draft at `3adfe2f2a1bb` | Adopt narrow config repair preview |
| Doctor dry-run reports #84472 | Open draft at `b3563d3f3404` | Adopt after enough truthful owner slices exist |
| Command inventory #100960 | Open | Reuse/adopt discovery contract |
| Live-node and prompt projections #104158/#104159 | Open drafts | Adopt as owner-attributed dynamic projection examples |
| Generated command reference #104160 | Open draft at `12320349d800` | Adopt documentation freshness |
| Host Control UI policy #115408 | Open draft at `6fba8ef36745` | Adopt generic host presentation policy |
| Hosted Gateway enforcement #116013 | Open draft at `55e3c97ddc15` | Adopt server-side host policy enforcement |
| Configuration/readiness/release stacks | Active or existing source | Use as EC-001 fixture owners |
| Localization stacks #111541-#111545/#112784/#112801/#113427 | Open | Adopt stable machine/localized human semantics |

### Lobster and Scout

| Investment | State on 2026-08-02 | Disposition |
| --- | --- | --- |
| Hosted Control UI design #6060 | Merged 2026-07-30 | Downstream design/adoption evidence |
| Hosted Control UI #6121 | Merged 2026-08-01 | Downstream hosting/auth/route owner |
| Root cutover #6116 | Open draft at `3c2e1f71105d` | Optional rollout/replacement |
| Policy preview #3355 | Merged 2026-06-19 | Downstream text/JSON preview |
| Personal policy baseline #3388 | Merged 2026-06-20 | Downstream governed policy state |
| Policy UX preview #3391 | Merged 2026-06-20 | Downstream gated admin projection |
| Config-admin descriptor shell | Planned | Downstream reusable admin composition |
| Hosted Control UI patch `0019` | Current Lobster adoption path | B3 until generic OpenClaw host policy/enforcement is released and adopted |

## Reconciled Upstream Workstreams

| Workstream | Existing coverage | Residual decision |
| --- | --- | --- |
| U-EXA-01 owner observation envelope | Heterogeneous config/readiness/release facts | Build one three-owner adapter fixture. Add a shared envelope only if it removes real inference without flattening payloads. |
| U-EXA-02 audience/disclosure compatibility | Existing JSON/human output, redaction, localization | Prove local/managed views over one fact with explicit omissions and mixed versions. |
| U-EXA-03 lifecycle projection | EC-030 session copy settlement | Render `deleted locally; copies remain` without a new lifecycle store. |
| U-EXA-04 Doctor config repair preview | #99255 | Adopt; no duplicate preview implementation. |
| U-EXA-05 Doctor dry-run reports | #84472 and current structured repair slices | Adopt when owner coverage is truthful; do not force parity for every lint family. |
| U-EXA-06 durable repair plan identity | Current preview/apply/validation lacks stable cross-step plan identity | Build a two-owner conflict/supersession fixture before proposing fields. |
| U-EXA-07 hosted presentation policy | #115408/#116013 | Adopt; host presentation and server enforcement remain separate from owner truth. |
| U-EXA-08 command/repair discovery | #100960/#104158-#104160 | Adopt catalog/docs stacks; do not treat inventory as availability or attestation. |

No new upstream issue or PR is ready from this package. EC-001 first requires
the three-owner adapter/mixed-version fixture. EC-002 first requires the
two-owner repair plan/conflict/rollback fixture. Filing remains subject to
explicit authorization.

## Fork and Adapter Ledger

| Item | Class | Purpose | Current relationship | Exit |
| --- | --- | --- | --- | --- |
| Cross-owner projection adapter | B1 | Prove config/readiness/release envelope and mixed-version behavior | No accepted shared implementation | Upstream bounded envelope or delete |
| Lifecycle projection adapter | B1 | Prove `deleted locally; copies remain` | EC-030 fixture | Upstream projection seam or delete |
| Repair plan fixture | B1 | Prove plan identity, conflict, authority, apply, validation, rollback reference | Existing Doctor owner | Upstream Doctor extension or delete |
| Hosted Control UI policy stack | B2/B3 | Host UI, auth, server enforcement, rollout, and replacement | #115408/#116013 plus Lobster #6121 | Keep hosting downstream; delete patch after released upstream policy |
| Config-admin descriptor registry | B2 | Compose policy/config/feed admin experiences | Planned Lobster owner | Remain downstream |
| Policy preview/UX | B2 | Tenant preview, strictness, governed persistence, explanation | Merged #3355/#3388/#3391 | Remain downstream |
| Projection-specific log/process inference | B3 | Fill missing owner state in current support/admin views | Existing support pattern | Delete after authoritative envelope adoption |
| Ad hoc repair output joins | B3 | Correlate preview/apply by ordering or text | Existing support pattern | Delete after stable plan/operation IDs |
| Duplicated Lobster SPA surfaces | B3 | Preserve current UX during hosted Control UI rollout | #6116/replacement gates | Delete after cohort acceptance and rollback window |

## Lobster and Scout Capabilities

| Capability | Owner responsibility | Portable dependency |
| --- | --- | --- |
| Hosted Control UI | Asset/version pairing, auth, Gateway selection/relay, rollout, fallback | #115408/#116013 and owner APIs |
| Administrative workspace | Tenant/global scopes, descriptors, preferences, preview, approval, persistence | EXA-01/EXA-04/EXA-05 |
| Governed settings | Show source/authority, disabled fields, reason, proposed diff, save/apply state | Configuration/policy owners |
| Policy administration | Effective baseline, strictness, feed source, package defense, exception workflow | Merged policy stack |
| Repair orchestration | Select owner repairs, collect authority, track child settlement, surface partial/blocked/rollback | U-EXA-06 |
| Audience projections | Hobbyist/operator/admin/security/auditor profiles with explicit redaction/omissions | U-EXA-01/U-EXA-02 |
| Fleet/admin composition | Aggregate per-unit owner facts without erasing stale/unknown children | EC-034 |
| Localization/accessibility | Localize human wrappers and preserve machine identifiers/fallback | Localization stack |
| Assurance UX | Distinguish operational result from evidence completeness | EC-033 |

## Optional Rust Components

| Component | Purpose | Promotion gate |
| --- | --- | --- |
| Rust projection fixture/validator | Validate language-neutral envelopes, owner payload preservation, freshness, and mixed versions | U-EXA-01/U-EXA-02 accepted |
| Rust observation collector | Collect bounded owner APIs with timeouts and cache freshness isolation | Stable owner APIs and no owner mutation |
| Rust repair plan coordinator | Persist plan/child identities and settlement while invoking owner repairs | Stable U-EXA-06 and EC-004/EC-021/EC-033 integration |

Rust does not become a universal owner base class, UI framework, mutation
engine, or audit database. A Rust coordinator may replace one complete
projection/plan owner only after parity, canary, rollback, and exact
TypeScript/adapter deletion.

## Operator Journey

```text
inspect
  -> owner and subject
  -> generation and observation time
  -> current / stale / unavailable / partial / incompatible / ambiguous
  -> owner-native state and reason
  -> redacted/omitted detail
  -> evidence and next action

repair
  -> finding set
  -> stable plan and expected generations
  -> effects/conflicts preview
  -> approval/authority
  -> apply attempt and progress
  -> per-owner settlement
  -> validation
  -> rollback/recovery or remaining action
```

## Acceptance Gates

### Projection

- Configuration, readiness, and release render through one envelope without
  sharing one state enum.
- Owner identity, subject, generation, observation, freshness, certainty,
  compatibility, reason, disclosure, and evidence remain explicit.
- One owner unavailable, one stale, and one incompatible do not rewrite other
  owner results.
- Projection failure remains distinct from owner-reported failure.
- Local and managed audiences consume the same owner fact with declared
  redaction/omissions.
- Unknown required semantics fail incompatible; legacy owners remain explicit.
- Lifecycle projection preserves every retained/external/unknown copy.

### Findings and repairs

- Finding identity and owner remain stable across preview and apply.
- Plan identity is stable; preview and apply have separate operation/attempt
  identities.
- Expected owner generations and normalized intent are bound before mutation.
- Material changes supersede the plan and require reauthorization.
- Conflicts, partial, blocked, superseded, validation-failed, rolled-back, and
  recovery-blocked results remain explicit.
- Owners perform their own mutation and validation.
- Restore uses EC-021 and evidence uses EC-033.

### Administration and presentation

- Hosted UI policy cannot redefine owner truth or authorization.
- Server-side enforcement backs every hidden/disabled managed control.
- Machine JSON/identifiers remain stable across locale and surface.
- Catalog/docs discovery remains inert and coverage-aware.
- Local CLI remains complete without Lobster or a web control plane.

## Dependency-Ordered Work Items

| ID | Work item | Classification | Layer | Depends on | Acceptance | Deletion target |
| --- | --- | --- | --- | --- | --- | --- |
| EXA-001 | Freeze experience/admin inventory | Reuse | Planning | - | Owner surfaces, live PRs, Lobster investments, patch relationship, and dates recorded | Stale duplicate inventory |
| EXA-002 | Define projection identity matrix | Reuse | Planning | EXA-001 | Projection, owner, subject, generation, observation, evidence, and audience identities separated | Universal status identity |
| EXA-003 | Define projection status/certainty matrix | Reuse | Contract | EXA-002 | Current/stale/unavailable/partial/malformed/incompatible/ambiguous and confirmed/inferred/unknown separated | Healthy/unhealthy flattening |
| EXA-004 | Adapt configuration owner fixture | New ask candidate | B1 evidence | EXA-002 | Revision/fingerprints/activation/restart debt preserved in owner payload | Config-specific admin inference |
| EXA-005 | Adapt readiness owner fixture | New ask candidate | B1 evidence | EXA-002 | Subject/generation/conditions/freshness/availability preserved | Readiness as generic health |
| EXA-006 | Adapt release owner fixture | New ask candidate | B1 evidence | EXA-002 | Artifact/compatibility/migration/activation/recovery certainty preserved | Version-only release status |
| EXA-007 | Compose three-owner envelope | New ask candidate | Evidence | EXA-004, EXA-005, EXA-006 | Shared envelope preserves three owner state machines and child sources | Universal owner payload |
| EXA-008 | Prove unavailable/stale/incompatible isolation | New ask candidate | Evidence | EXA-007 | Each failure remains scoped and aggregate remains truthful | Convenient generation selection |
| EXA-009 | Prove envelope/payload mixed versions | New ask candidate | Evidence | EXA-007 | Optional fields relay safely; unknown required semantics are incompatible | Coupled schema versions |
| EXA-010 | Prove local/managed audience projection | New ask candidate | Evidence | EXA-007 | Same fact, different authorized detail, explicit omissions | Separate semantic models |
| EXA-011 | Decide U-EXA-01 projection residual | New ask candidate | Upstream | EXA-008, EXA-009, EXA-010, EXA-013, EXA-014 | Small envelope proven useful under real freshness/fan-in budgets or contract rejected | New projection service |
| EXA-012 | Project DGR lifecycle result | Extend existing | Evidence | EXA-011, DGR-011, DGR-015 | Local deletion plus retained/deferred/external copies and next actions remain visible | Local delete equals complete |
| EXA-013 | Define cache freshness profile | Extend existing | Contract | EXA-003, EXA-007 | Source observation, expiry, collection timeout, and projection time visible | Cache as current truth |
| EXA-014 | Define projection performance budget | Extend existing | Operations | EXA-013 | Slow/unavailable owner isolated without blocking owner runtime | Mandatory synchronous fan-in |
| EXA-015 | Inventory Doctor finding schema | Reuse | Planning | EXA-001 | Finding/check/owner/subject/generation/severity/evidence/fix class recorded | Text parsing |
| EXA-016 | Record merged #100361 selection contract | Reuse | Upstream | EXA-015 | Default, `--all`, and `--only` selection remain explicit | Every check by default |
| EXA-017 | Adopt #99255 config preview | Adopt | Upstream | EXA-015 | Config write effects are truthful, bounded, and owner-applied | Duplicate config preview |
| EXA-018 | Adopt #84472 dry-run reports | Adopt/defer | Upstream | EXA-017 | Report includes only structured truthful effects; no forced parity | Broad speculative preview |
| EXA-019 | Define repair identity matrix | Reuse | Contract | EXA-015 | Finding, plan, intent, preview op, approval, apply op/attempt, validation, rollback refs separated | One repair ID |
| EXA-020 | Build two-owner repair fixture | New ask candidate | B1 evidence | EXA-017, EXA-019 | Two owner repairs, one conflict, stable plan, and expected generations | Hidden mutation sequence |
| EXA-021 | Prove plan supersession | Extend existing | Evidence | EXA-020 | Material owner/finding/effect change creates new intent and invalidates authority | Apply stale preview |
| EXA-022 | Prove approval/authority binding | Extend existing | Evidence | EXA-020, IAE-013, XPK-004 | Risk/policy generations and authority reference bind normalized intent | Approval by display text |
| EXA-023 | Prove partial and validation failure | Extend existing | Evidence | EXA-020 | Per-owner results and failed post-apply validation remain explicit/retryable | Generic repaired |
| EXA-024 | Prove rollback/recovery reference | Extend existing | Evidence | EXA-020, KCC-028 | Restore-capable repair references owner checkpoint/result without reimplementing restore | Doctor backup engine |
| EXA-025 | Bind durable repair evidence | Extend existing | Evidence | EXA-020, XPK-003 | Idempotent integrity-bearing owner evidence references plan/apply/validation identities | Bespoke repair ledger |
| EXA-026 | Decide U-EXA-06 repair-plan residual | New ask candidate | Upstream | EXA-021, EXA-022, EXA-023, EXA-024, EXA-025 | Only proven missing plan/settlement fields added to Doctor | Central mutation engine |
| EXA-027 | Adopt command inventory #100960 | Adopt | Upstream | EXA-001 | Owner-attributed inventory remains inert and coverage-aware | Hand-built command lists |
| EXA-028 | Adopt #104158/#104159 dynamic projections | Adopt/defer | Upstream | EXA-027 | Live node/prompt views preserve observation lifetime and availability limits | Catalog as runtime truth |
| EXA-029 | Adopt #104160 generated reference | Adopt/defer | Upstream | EXA-027 | Static reference freshness derives from canonical command descriptors | Drifted hand docs |
| EXA-030 | Bind localization invariants | Adopt | Upstream | EXA-003 | Human wrappers localize; JSON keys/codes/paths/versions remain stable | Localized machine schema |
| EXA-031 | Adopt #115408 host UI policy | Adopt | Upstream | EXA-001 | Generic host presentation policy is optional and standalone-safe | Lobster-specific core policy |
| EXA-032 | Adopt #116013 server enforcement | Adopt | Upstream | EXA-031 | Hidden/disabled UI controls have server-side enforcement | CSS-only lockdown |
| EXA-038 | Define audience/profile registry | Downstream-only | Lobster | EXA-010, EXA-013, EXA-014 | Detail, freshness, disclosure, action, accessibility, and progressive-disclosure profiles are authorized/versioned before pages compose them | Per-page semantic drift |
| EXA-033 | Reconcile Lobster #6060/#6121 | Adopt | Lobster | EXA-008 through EXA-010, EXA-013, EXA-014, EXA-031, EXA-032, EXA-038 | Version-matched assets, auth, relay, fallback, projection failure isolation, and rollout remain downstream | Duplicate Lobster SPA backend |
| EXA-034 | Decide root cutover #6116 | Downstream-only | Lobster | EXA-033 | Cohort acceptance, fallback, health route, and rollback window explicit | Premature root redirect |
| EXA-035 | Reconcile policy preview stack | Adopt | Lobster | EXA-015 | #3355/#3388/#3391 consume owner findings and preserve governed state ownership | Policy semantics in UI |
| EXA-036 | Define shared config-admin descriptors | Downstream-only | Lobster | EXA-015, EXA-017, EXA-035, EXA-038, XPK-004 | Setting/check/owner/source/apply mode/save contract uses the canonical managed mutation envelope | Universal settings schema |
| EXA-036A | Prove actionable and accessible governed UX | Downstream-only | Lobster evidence | EXA-033, EXA-035, EXA-036, EXA-038 | Task-first summary, safe next action, expandable detail, lock source, escalation owner, full target, field error, keyboard, screen reader, focus, contrast, and error announcement pass | Governance hidden behind generic toast |
| EXA-037 | Define managed repair orchestration | Downstream-only | Lobster | EXA-026, EXA-036A, XPK-004 | Child owner operations retain identities/results; coordinator owns only plan/fan-out and uses canonical mutation/retry semantics | Lobster state mutation |
| EXA-039 | Delete hosted Control UI patch | Delete | B3/Lobster | EXA-032, EXA-033 | Released upstream policy/enforcement adopted and hosted conformance passes | `0019` |
| EXA-040 | Delete projection log/process inference | Delete | B3 | EXA-011 | All targeted views consume authoritative owner facts with explicit legacy gaps | Support regex inference |
| EXA-041 | Delete ad hoc repair joins | Delete | B3 | EXA-026 | Preview/apply/validation reconcile by stable identities | Ordering/text joins |
| EXA-042 | Delete replaced Lobster SPA surfaces | Delete | B3/Lobster | EXA-034 | Accepted cohorts use hosted UI and rollback window closes | Duplicate chat/session/settings UI |
| EXA-043 | Build language-neutral projection/repair fixtures | New component | Evidence | EXA-011, EXA-026, EXA-036A, XPK-007 | Mixed-version projection, progressive disclosure, accessibility, conflict/supersession/partial repair cases are versioned | Implementation-specific proof |
| EXA-044 | Implement Rust projection validator | New component | Rust | EXA-043 | Rust preserves opaque owner payloads and matches TypeScript outcomes | Rust owner schema |
| EXA-044A | Inventory exact observation and repair TypeScript deletion targets | Delete | Planning | EXA-043, XPK-009 | Separate collector and repair coordinator files/tests/state/adapters and retained surfaces are named before construction | One vague coordinator target |
| EXA-045 | Implement bounded Rust observation collector | New component | Rust | EXA-043, EXA-044, EXA-044A | Timeouts/cache freshness isolated; no owner mutation | Universal monitoring service |
| EXA-046 | Implement bounded Rust repair coordinator | New component | Rust | EXA-043, EXA-044, EXA-044A | Persists plan/child settlement and invokes owner APIs only | Rust mutation engine |
| EXA-046A | Prove pre-cutover observation and repair migration/rollback readiness | New component | Release | EXA-045, EXA-046, EAR-033, XPK-006, XPK-008, XPK-009 | Current-owner release/recovery, cache/plan state migration, mixed versions, in-flight work, downgrade refusal, rollback limits, and unknown settlement are proven before authority changes | Canary-first migration |
| EXA-047 | Canary one authoritative observation collector | New component | Migration | EXA-046A, XPK-010 | TypeScript or Rust selected for collection only; no duplicate collection | Dual observation coordinator |
| EXA-047R | Canary one authoritative repair coordinator | New component | Migration | EXA-046A, XPK-010 | TypeScript or Rust selected for repair only; no duplicate apply | Dual repair coordinator |
| EXA-048 | Prove rollback and mixed-version limits | New component | Release | EXA-047, EXA-047R | State migration, old/new envelopes, in-flight plans, rollback, and unknown settlement are proven independently | Binary rollback claims |
| EXA-049 | Delete superseded TypeScript owner and adapters | Delete | Release | EXA-048 | Exact TypeScript coordinator path and compatibility/inference adapters removed | Permanent dual implementation |

## Sequencing

```text
inventory and identity matrices
  -> configuration/readiness/release projection fixtures
  -> failure, mixed-version, freshness, fan-in budget, and audience proof
  -> lifecycle projection
  -> Doctor finding inventory and active preview adoption
  -> two-owner repair plan/conflict/rollback proof
  -> audience/profile registry
  -> hosted Control UI and policy/admin composition
  -> actionable, progressive, accessible UX proof
  -> inference and duplicate-surface deletion
  -> language-neutral fixtures
  -> separate optional Rust observation and repair coordinators
  -> TypeScript and adapter deletion
```

## Findings

1. **The owners already expose the important facts.** EC-001 addresses
   projection-specific inference and freshness, not missing runtime state.
2. **A shared envelope must keep opaque owner payloads.** Configuration,
   readiness, and release cannot share one status enum.
3. **Projection availability is not owner readiness.** Collection/cache
   failures remain separate from owner-reported state.
4. **Doctor is already the repair facility.** The residual is durable plan,
   preview/apply, authority, validation, and rollback correlation.
5. **#99255 and #84472 are the active preview paths.** New repair-preview work
   should adopt them rather than create another substrate.
6. **Lobster already has the managed experience foundation.** Hosted Control
   UI, policy previews, baseline state, and gated UX are delivered or active.
7. **Server enforcement is mandatory.** Hidden or disabled controls without
   #116013-style enforcement are presentation, not policy.
8. **Catalog and localization are supporting contracts.** They preserve
   discovery and human presentation without becoming owner truth.
9. **This closes implementation-package coverage.** Every EC-001 through
   EC-035 contract now belongs to a reconciled package.

## Package Exit

This package is complete when:

- configuration, readiness, and release render through one versioned envelope
  without losing owner semantics and only after real freshness/fan-in budgets
  are proven;
- failure, mixed-version, freshness, audience, disclosure, and lifecycle-copy
  cases are proven;
- #99255/#84472 have owner-approved adoption outcomes;
- a two-owner repair fixture proves stable plan identity, conflict,
  supersession, authority, partial settlement, validation, and rollback
  reference;
- hosted Control UI and admin projections consume owner APIs without duplicate
  runtime/config/policy state;
- local and managed surfaces provide task-first progressive disclosure,
  actionable lock/error/escalation semantics, full-target review, and
  accessibility proof;
- machine meaning remains stable across catalog, locale, CLI, and UI;
- log/process inference and duplicated repair/SPA surfaces have deletion gates;
  and
- any Rust replacement deletes one superseded TypeScript coordinator plus
  temporary compatibility and inference adapters.
