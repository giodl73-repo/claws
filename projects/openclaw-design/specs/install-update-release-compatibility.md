# Install, Update, Release, and Compatibility

## Status

- Facility type: owner/composition/evidence portfolio
- Status: current source-audited local and release core; optional fleet
  rollout/convergence incomplete
- Maturity: `22/24 (A)`
- Enterprise: `E4/C3`
- Source audit:
  `../source-audit-install-update-release-compatibility-2026-08-01.md`
- First bounded enterprise proof:
  `../evidence-slices/release-activation.md`

## Purpose

Allow OpenClaw code and its related components to be selected, installed,
migrated, activated, verified, promoted, and recovered without confusing:

- a mutable channel with an immutable release;
- a package swap with a running activation;
- code rollback with state rollback;
- local update ownership with fleet rollout policy; or
- artifact publication with deployment success.

## Working Owners

- package managers own package acquisition and global layouts;
- git owns source history and checkout identity;
- image/native-app systems own their artifact installation semantics;
- the OpenClaw updater owns local planning, preflight, mutation, and recovery;
- Doctor and state owners own migrations and repair;
- plugin owners own plugin convergence and compatibility;
- service managers own process supervision;
- readiness owners decide whether the updated runtime can serve;
- release workflows own candidate and publication evidence; and
- operators or optional fleet controllers own rollout intent.

No shared contract may absorb those owners.

## Core Objects

### Release identity

An immutable tuple sufficient to identify exact source and artifacts:

- release/version identifier;
- source repository and commit;
- signed tag where applicable;
- artifact family, digest, and platform;
- provenance/signature references;
- component manifest; and
- release-proof references.

### Channel intent

A mutable discovery or promotion pointer:

- channel name;
- target release identity;
- scope;
- policy owner;
- generation;
- changed time; and
- freshness/expiry evidence.

Channels never become immutable release identity.

### Compatibility envelope

The bounds a component declares:

- host/runtime version;
- plugin API range;
- wire/protocol versions and capabilities;
- state and agent schema versions;
- platform/runtime requirements;
- migration-reader requirements; and
- supported mixed-version or downgrade window.

### Update plan

A previewable plan for one installation:

- current and target release identities;
- install and service owners;
- affected roots/components;
- compatibility findings;
- required migrations;
- estimated interruption and restart/drain behavior;
- recovery point and rollback limits;
- plugin/component convergence decisions;
- policy/approval requirements; and
- expected evidence.

### Activation attempt

One bounded attempt:

- attempt ID;
- plan identity/generation;
- stage and candidate verification;
- mutation/swap result;
- migration results;
- component convergence;
- service handoff/restart;
- readiness/health result;
- terminal outcome; and
- recovery certainty.

### Migration ledger

Owner-specific ordered transitions:

- owner and migration ID;
- source/target versions;
- preconditions;
- idempotency/retry semantics;
- data transformed;
- retained compatibility reader;
- rollback or restoration requirement;
- applied time and result; and
- evidence reference.

### Rollout intent

Optional policy above local activation:

- target population;
- cohort/ring order;
- maintenance window;
- concurrency and availability bounds;
- health/semantic gates;
- approval;
- hold/exclusion;
- pause/resume/abort;
- promotion criteria; and
- rollback policy.

### Fleet convergence

A projection, not a runtime owner:

- desired release by target;
- installed and active release;
- state/schema compatibility;
- rollout cohort;
- current attempt;
- outcome and certainty;
- exception/hold;
- last evidence time; and
- drift/convergence status.

## Child Contracts

### Release identity contract

Must:

- bind exact source and exact bytes;
- distinguish each platform/component artifact;
- retain provenance and validation references;
- reject ambiguous mutable aliases where exact identity is required; and
- permit independently versioned components.

### Selection contract

Must expose:

- configured intent;
- effective channel and why it was selected;
- resolved exact target;
- freshness and registry/source evidence;
- downgrade detection; and
- unsupported or ambiguous selection.

### Compatibility contract

Must report each relevant dimension separately:

- compatible;
- incompatible;
- indeterminate;
- migration required;
- mixed-version restricted;
- downgrade blocked; or
- compatibility metadata unavailable.

Unknown compatibility is not compatible.

### Candidate activation contract

Must preserve the ordering:

```text
resolve exact target
-> inspect compatibility
-> establish recovery point
-> quiesce/stop when required
-> stage candidate
-> verify candidate
-> activate/swap
-> run owner migrations
-> converge managed components
-> restart/load
-> prove readiness
-> publish terminal evidence
```

Owners may omit inapplicable phases, but may not silently reorder a
state-changing migration before target and recovery preflight.

### Service handoff contract

Must:

- identify the service/supervisor being changed;
- prove the service belongs to the selected install root;
- avoid replacing files inside a running process;
- enforce single-flight mutation;
- drain or stop before unsafe replacement;
- preserve a restart/continuation sentinel;
- restart through the service owner; and
- verify the active release and readiness.

### Migration contract

Must:

- run under the target owner's code;
- be idempotent or carry explicit retry semantics;
- declare forward-only behavior;
- retain required old readers through the supported upgrade window;
- separate runtime compatibility removal from migration-reader removal; and
- record enough evidence to explain later downgrade refusal.

### Rollback and recovery contract

Every failure must state which layers are restored:

| Layer | Example result |
| ----- | -------------- |
| Candidate | Staged bytes rejected; live install unchanged |
| Package/source | Previous package root or git SHA restored |
| Runtime | Prior service restarted and healthy |
| Component | Plugin/component convergence restored or disabled |
| Config/data | Snapshot restored, separate state selected, or not restored |
| External effects | Compensated, uncertain, or unaffected |

`rolled_back` without layer and certainty is invalid.

### Release proof contract

Must retain:

- candidate source identity;
- validation workflow/run identity;
- exact package/image/app digests;
- package acceptance and install proof;
- migration/upgrade-survivor baselines;
- publication and registry readback;
- provenance/signature/attestation;
- selected component set; and
- unresolved partial publication.

### Rollout contract

An optional controller may:

- assign targets to cohorts;
- schedule windows;
- submit local update plans;
- pause or abort new attempts;
- place safeguard holds;
- evaluate health and semantic evidence;
- promote a release; and
- request owner-supported rollback.

It must not:

- directly rewrite OpenClaw package roots or databases;
- bypass local compatibility refusal;
- claim cancellation stopped an already-running migration;
- infer active release from a registry alias; or
- force local installations to join a fleet.

## Outcomes

Local activation:

- `planned`;
- `blocked`;
- `deferred`;
- `staging`;
- `activated`;
- `ready`;
- `failed_pre_activation`;
- `failed_post_activation`;
- `recovered`;
- `partially_recovered`;
- `rollback_required`; or
- `state_restore_required`.

Fleet convergence:

- `converged`;
- `partial`;
- `blocked`;
- `deferred`;
- `held`;
- `exempted`;
- `rolled_back`;
- `failed`; or
- `unknown`.

## Enterprise Bindings

Optional enterprise bindings may add:

- organization/tenant and target identity;
- maintenance and blackout windows;
- rollout rings/cohorts;
- approval and separation of duties;
- private mirrors and network policy;
- signed desired-release policy;
- exception owner and expiry;
- minimum security release or revoked release;
- fleet inventory and drift;
- audit/SIEM export; and
- retention for release and rollout evidence.

These bindings remain optional for a personal/local OpenClaw installation.

## Security Invariants

- Mutable channels cannot substitute for exact release identity at activation.
- Target compatibility is checked before mutation where metadata permits.
- Unknown database compatibility fails closed.
- A running Gateway does not overwrite its own global package tree.
- Only a proven service owner may rewrite service metadata.
- Failed source rollback cannot be reported restart-safe.
- Manual downgrade does not suppress newer-schema startup refusal.
- Release promotion does not rebuild immutable artifacts.
- A revoked release or artifact cannot remain an eligible rollout target.

## Non-Goals

- One package manager or installer abstraction.
- One global version for all OpenClaw components.
- One mandatory enterprise update service.
- Transparent automatic state downgrade.
- Universal zero-downtime upgrades.
- Automatic retry of uncertain external side effects.
- Treating release CI as runtime readiness.

## Proof Required

Minimum local evidence:

1. current and target identity;
2. one compatible and one blocked target;
3. stage/verify/activate result;
4. migration/component convergence result;
5. active version plus readiness;
6. code and state rollback certainty.

Minimum fleet evidence:

1. two cohorts;
2. one health-gated promotion;
3. one held or incompatible target;
4. one partial failure that does not affect successful targets;
5. desired/installed/active release projection; and
6. complete retained evidence for each target.
