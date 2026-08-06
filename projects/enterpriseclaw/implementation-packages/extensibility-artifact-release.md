# Extensibility, Artifact Trust, and Release Implementation Package

## Purpose

This package reconciles:

- EC-027 Extension Capability Metadata;
- EC-028 Artifact Trust and Provenance; and
- EC-029 Release Activation and Recovery.

The implementation goal is not one universal manifest, marketplace, installer,
or release controller. The goal is to preserve each semantic owner's native
definition and lifecycle while making six relationships explicit:

```text
inert definition
  -> compatibility result
  -> immutable artifact
  -> install admission
  -> local activation
  -> release evidence
```

OpenClaw remains the portable owner of extension definitions, artifact
admission, local installation, update, migration, activation, readiness, and
recovery semantics. Lobster/Scout owns enterprise catalog policy, trusted
sources and mirrors, signing requirements, release rings, patch promotion,
quarantine, fleet rollout, and support posture. A fork is evidence or temporary
compatibility work, not a permanent semantic home.

## Package Boundaries

| Boundary | Contracts | Owns | Does not own |
| --- | --- | --- | --- |
| EAR-01 Extension definition identity | EC-027 | Stable inert identity, owner, version, capabilities, requirements, dependencies, lifecycle declarations | Catalog ranking, activation, runtime authority |
| EAR-02 Compatibility and inert composition | EC-027 | Host/dependency/schema compatibility, conflict detection, unknown-required refusal, selected composition plan | Installation, credential setup, readiness |
| EAR-03 Artifact identity and install admission | EC-028 | Source coordinate, immutable digest, verified bytes, admission result, local install record | Runtime authorization, tenant approval |
| EAR-04 Provenance, revocation, and retained installs | EC-028 | Publisher/build evidence, optional SBOM/transparency references, revocation identity, retained-install status | Universal marketplace or global trust score |
| EAR-05 Release component identity and compatibility | EC-029 | Exact component artifacts, protocol/schema/migration/checkpoint compatibility, release candidate identity | Fleet scheduling, ring policy |
| EAR-06 Local activation and release proof | EC-029 | Staging, target-owned migration, service handoff, activation, readiness, recovery, publication/fresh-install proof | Multi-unit convergence and enterprise promotion policy |

## Current Owner Map

| Concern | Current owner and evidence | Package decision |
| --- | --- | --- |
| Plugin definition | Canonical plugin manifests, registry metadata, bundled metadata snapshots, precedence, reserved-ID refusal | Reuse; extend only after unlike-family fixtures prove a common identity gap |
| Host contribution discovery | Open issue #114782 and draft PR #114783 provide manifest-first inert host bundles | Adopt as the plugin-family exemplar; discovery imports no runtime code and grants no authority |
| Claw application definition | Merged #112773 separates portable `CLAW.md` metadata from strict OpenClaw profiles | Reuse; do not make host-bundle fields the Claw schema |
| Skills and packages | Existing skill folders, npm/package metadata, Claw exact dependencies, and owner validation | Preserve baseline loadability and owner-native schemas |
| Plugin and Claw install | Exact package/version/source/digest, policy checks, preview integrity, provenance, status, doctor, update, export, and safe removal | Reuse current installers and lifecycle records |
| Standalone Claws adapter | Private CLI proof delegates preview/apply to public OpenClaw CLI; draft #113836 closed without merge | Keep private/reference evidence or move to an independent repo; no OpenClaw private-module adapter |
| Artifact distribution | npm, ClawHub, plugin paths, archives, local directories, and possible OCI transports | Keep source adapters; normalize immutable identity and outcomes, not transport semantics |
| Update target selection | Current package/git updater selects and stages an exact target | Reuse |
| Candidate verification | Current updater verifies staged candidates and refuses incompatible database downgrade | Reuse and expose in a compact release-component evidence bundle |
| Migration | Target-owned Doctor and database/schema owners perform migration checks | Reuse; no release-owned schema engine |
| Service handoff | Current updater performs detached managed-service handoff and activation checks | Reuse |
| Plugin convergence | Current update/release paths reconcile plugins against the selected target | Reuse and include exact result in release proof |
| Publication proof | Current release automation verifies exact release identity, published artifacts, and upgrade survivors | Reuse |
| Local release slots | Lobster #5541 provides Active, Previous, and Candidate OpenClaw image slots | Adopt downstream; slots do not prove state downgrade or portable activation |
| Patch promotion | Lobster #5402 promotes OpenClaw `2026.7.1` and reports 22 applied patches | Adopt as the current release/patch baseline; every replacement needs a deletion gate |
| Fleet convergence | Operations/assurance/fleet package and EC-034 | Reference rather than duplicate |

## Planning Boundary Details

### EAR-01 Extension Definition Identity

The target is a stable definition relationship, not one physical manifest:

```text
definition identity
  + semantic owner
  + definition version
  + native source reference
  + optional common capability envelope
```

The common envelope is justified only when one plugin, one skill or Claw, and
one unlike provider/channel/host contribution can preserve their native
definitions while answering the same bounded questions:

- What is this definition?
- Who owns its semantics?
- Which capabilities and dependencies does it declare?
- Which lifecycle and trust requirements are required rather than optional?
- Which compatibility rules can be evaluated without importing runtime code?

#114782/#114783 are a plugin-family example. They must remain inert,
manifest-first, duplicate-rejecting, and provenance-preserving. They do not
justify moving every extension family into the plugin registry.

### EAR-02 Compatibility and Inert Composition

Compatibility is evaluated before installation or activation:

```text
definitions
  -> validate schema/version
  -> reject unknown required semantics
  -> evaluate host/dependency compatibility
  -> detect duplicate/conflicting contributions
  -> produce inert composition plan
```

An unknown optional field may be retained or ignored under its declared
versioning rules. An unknown required trust, lifecycle, migration, or
compatibility semantic makes the definition incompatible. A catalog entry,
manifest discovery result, or composition plan never grants runtime authority.

### EAR-03 Artifact Identity and Install Admission

Artifact identity must bind:

- source family and source-resolved coordinate;
- selected version or revision;
- immutable content digest;
- artifact shape/media type where needed;
- verified local bytes;
- admission policy and trust requirements;
- install operation and resulting local record.

Mutable names and tags may select a candidate, but they are not retained as the
sole installed identity. Existing plugin and Claw install paths already prove
much of this relationship. The first task is to normalize evidence and refuse
name-only authority, not replace those installers.

### EAR-04 Provenance, Revocation, and Retained Installs

Local install provenance and signed supply-chain provenance are different:

| Evidence | Meaning |
| --- | --- |
| Source/install provenance | Where the resolver obtained the artifact and what bytes were installed |
| Publisher provenance | Which publisher identity authorized the release |
| Build provenance | Which source/build process produced the bytes |
| SBOM reference | Which declared components/dependencies were associated with the build |
| Transparency reference | Where a signed statement can be independently audited |
| Revocation statement | Which authority revoked which immutable artifact, for what scope and time |

Portable work should define only a minimal signed statement and adapter result
after npm, ClawHub/plugin, and one unlike source prove compatible authority and
digest semantics. It must not invent a universal trust score or require all
local artifacts to participate. Baseline local installation remains possible
unless a selected governed profile requires stronger evidence.

Revocation affects new admission and the visible status of retained
installations. It does not silently uninstall, deactivate, or rewrite runtime
policy. Those actions require their normal owners and authority.

### EAR-05 Release Component Identity and Compatibility

A release target is a set of exact components, not one version string:

```text
release target
  -> component manifest
     - component owner
     - immutable artifact identity
     - protocol range
     - state/schema range
     - migration requirement
     - plugin/extension compatibility
     - checkpoint/recovery requirement
```

The compact component manifest should be generated from current updater,
package, plugin, protocol, and database facts. It may be emitted as an
independent release evidence artifact and referenced by update JSON and package
publication. The first slice should not make it a new hand-authored source of
truth.

### EAR-06 Local Activation and Release Proof

The portable local transition is:

```text
resolve exact target
  -> stage and verify
  -> check compatibility
  -> capture required recovery point
  -> run target-owned migration
  -> hand off service/process
  -> activate exact component set
  -> observe candidate-generation readiness
  -> reconcile plugins
  -> commit or recover
  -> persist release evidence
```

Code rollback does not imply state or external-effect rollback. `rolled_back`
requires the previous code plus compatible previous state to become active and
ready. Otherwise the result is `recovery_blocked` and the unit remains
quarantined.

This package owns one deployment unit's release relationship. Lobster release
rings, cohorts, route movement, quarantine duration, fleet repair, and support
policy remain downstream or in the operations package.

## Existing Investment Crosswalk

### OpenClaw

| Investment | Live state on 2026-08-02 | Disposition |
| --- | --- | --- |
| #114782 manifest-first host contribution bundles | Open issue | Adopt owner decision; no duplicate host-bundle proposal |
| #114783 host contribution implementation | Open draft at `14bd05f56914` | B1 evidence/adoption candidate; keep inert and plugin-owner bounded |
| #112773 portable Claw/OpenClaw profile separation | Merged 2026-07-24 | Reuse as cross-harness metadata precedent |
| #113045 Claw removal normalization | Merged 2026-07-23 | Reuse as lifecycle symmetry and safe cleanup evidence |
| #113836 standalone Claws adapter | Closed without merge 2026-07-26 | Superseded by independent public-CLI delegation |
| #111542 updater dry-run localization | Open at `00f37e291db8` | Adopt presentation only; JSON release facts remain canonical |
| Current package/git updater | Existing source | Reuse target selection, staging, verification, handoff, migration, and downgrade refusal |
| Current plugin convergence | Existing source | Reuse; include result in release evidence |
| Current publication/fresh-install checks | Existing release workflows | Reuse; compact evidence rather than duplicate pipeline |
| Current plugin/Claw install records | Existing source and lifecycle proof | Reuse immutable local identity/integrity/provenance |

### Lobster and Scout

| Investment | State | Disposition |
| --- | --- | --- |
| `bic/lobster#5541` Active/Previous/Candidate slots | Merged 2026-07-27 | Downstream release-slot owner |
| `bic/lobster#5402` OpenClaw promotion | Open at `285efe4097b5`; 22 patches apply | Current B3 promotion and deletion baseline |
| MOS3 feed contract | Design/implementation evidence | Downstream catalog, review, scope, attestation, revocation, and effective-view owner |
| MOS3 plugin acquisition slice #5057 | Bounded fail-closed evidence | Keep mutation disabled until OpenClaw verified install and MOS3 save/publish contracts exist |
| PromoteClaw and release quarantine | Existing managed process | Downstream promotion, quarantine, and support policy |

## Reconciled Upstream Workstreams

| Workstream | Existing coverage | Residual decision |
| --- | --- | --- |
| U-EAR-01 stable inert definition identity | Plugin manifests, Claw metadata/profile split, #114782/#114783 | Build unlike-family fixtures first. Add a shared envelope only if native IDs cannot survive composition/adaptation. |
| U-EAR-02 unknown-required compatibility | Strict Claw profile validation and host-bundle version boundary | Extend the selected owner only after fixtures show silent approximation or unsafe discovery. |
| U-EAR-03 immutable install evidence | Plugin and Claw source/version/digest/provenance records | Normalize evidence and migration; do not create a new installer. |
| U-EAR-04 signed provenance and revocation | Local provenance exists; feed attestations are adjacent | Identify package-source authorities and prove three source families before proposing a portable signed statement. |
| U-EAR-05 release component manifest | Current updater/package/protocol/database/plugin facts exist separately | Generate a compact evidence artifact; do not create a parallel hand-authored release config. |
| U-EAR-06 per-target activation result | Current updater and release pipelines already implement phases | Add only missing structured phase/result/recovery references to existing output. |
| U-EAR-07 publication and fresh-install proof | Existing release checks and upgrade-survivor validation | Aggregate exact artifact/test references into the release evidence bundle. |

No new upstream issue or PR is ready from this package. Each residual requires a
bounded fixture against current source and explicit filing authorization.

## Fork Ledger

| Item | Class | Purpose | Upstream/adoption link | Exit |
| --- | --- | --- | --- | --- |
| #114783 host-bundle implementation | B1 | Prove inert plugin host contributions and deterministic duplicate refusal | #114782/#114783 | Merge through plugin owner or archive |
| Private standalone Claws CLI | B2 | Prove harness-neutral resolution and public-CLI delegation | Merged #112773; closed #113836 | Move to approved independent repo or keep private; no OpenClaw patch |
| Private ClawHub resolution/cache | B2 | Prove exact digest resolution and safe extraction | ClawHub/source owner | Replace with approved source API/package or delete |
| Lobster OpenClaw promotion stack #5402 | B3 | Carry required patches into promoted image | Per-patch upstream links | Delete each patch after conformant released replacement |
| Release compatibility adapters | B3 | Bridge mixed package/protocol/schema versions | U-EAR-05/U-EAR-06 | Delete after minimum-version and migration window closes |
| Rust updater/supervisor adapters | B1/B3 | Prove parity and staged cutover for one host-critical owner | EC-029 fixtures | Delete TypeScript owner and temporary adapter after promotion |

Every fork item requires:

- current base and exact head;
- owner;
- reason it cannot live in a plugin or Lobster service;
- upstream/adoption link;
- supported release window;
- deletion test; and
- final archive or removal evidence.

## Lobster and Scout Capabilities

| Capability | Owner responsibility | Portable dependency |
| --- | --- | --- |
| Enterprise catalog and effective feed | Curate, review, scope, pin, deprecate, revoke, attest, and project installability | EAR-01 through EAR-04 facts |
| Trusted sources and mirrors | Approve registries/feeds, mirror immutable bytes, enforce source policy | Artifact identity and source adapter verification |
| Signing policy | Require approved publisher/build authorities and evidence freshness | Portable provenance adapter outcomes |
| Install/save/publish UX | Obtain authority, dispatch canonical OpenClaw install, and verify readback | Owner-native install operation/result |
| Release promotion | Select exact OpenClaw candidate and patch set | EAR-05 component manifest |
| Rings and cohorts | Select units, route traffic, hold quarantine, promote or recover | EAR-06 per-unit results plus EC-034 |
| Patch lifecycle | Carry, link, test, retire, and prove deletion | Live #5402 baseline and upstream release adoption |
| Quarantine and support posture | Block unsafe promotion, expose retained installs/releases, assign operator action | Readiness, recovery, trust, and evidence results |

Lobster may make stronger admission decisions than baseline OpenClaw. It must
not rewrite an artifact digest, plugin install result, migration result, or
local release outcome.

## Optional Rust Components

| Component | Purpose | Promotion gate |
| --- | --- | --- |
| Rust artifact verifier | Verify digests, signatures, attestations, and bounded archives | Language-neutral valid/invalid/revoked fixtures and source-owner approval |
| Rust release manifest validator | Validate exact components and compatibility before mutation | Generated manifest and TypeScript parity |
| Rust updater/supervisor | Stage, hand off, observe readiness, and recover one deployment unit | Fresh install, upgrade, migration, crash, rollback, and recovery-blocked proof |

Rust is not a reason to rewrite plugins, skills, Claws, catalogs, or source
adapters. A Rust component must consume the same artifact and release contracts,
preserve owner identities/results, select one authoritative implementation
before mutation, and delete one exact TypeScript owner path after canary and
release promotion.

## Operator Journey

```text
inspect extension
  -> definition owner and version
  -> capabilities and required semantics
  -> compatibility and conflicts
  -> no activation implied

inspect artifact
  -> source-resolved coordinate
  -> immutable digest and verified bytes
  -> publisher/build/revocation evidence
  -> admitted, blocked, retained, or stale

inspect release
  -> exact component target
  -> compatibility and recovery point
  -> staged / migrating / activating / ready
  -> committed / rolled back / recovery blocked
  -> publication and fresh-install evidence
```

## Acceptance Gates

### Definitions and compatibility

- Plugin, Claw/skill, and one unlike family retain stable native definition
  identities.
- Metadata discovery imports no runtime code and performs no activation.
- Unknown required compatibility, trust, lifecycle, or migration semantics fail
  closed.
- Duplicate/conflicting contributions are deterministic and owner-explainable.
- Baseline bare skills/local extensions remain usable without EnterpriseClaw
  metadata.

### Artifact admission and trust

- Resolved bytes match the recorded immutable digest.
- Mutable tags/names are never the sole retained installed identity.
- Missing optional provenance follows baseline policy; missing required
  provenance blocks before activation.
- Invalid, unverifiable, and revoked evidence are distinguishable.
- Retained revoked installations are visible and require owner-authorized
  remediation rather than silent deletion.
- Mirrors preserve artifact identity and provenance relationships.

### Release activation and recovery

- The release target names exact components and compatibility ranges.
- Compatibility and required recovery points are checked before mutation.
- Target-owned migrations run against the staged target and report structured
  results.
- Release commit requires exact candidate activation and candidate-generation
  readiness.
- Plugin convergence and restart debt are explicit.
- `rolled_back` requires compatible prior code and state to become active and
  ready; otherwise the result is `recovery_blocked`.
- Publication, package, and fresh-install evidence reference exact artifacts.

### Downstream and migration

- Lobster selects promotion/ring/cohort policy without becoming local release
  truth.
- Every #5402 patch has an upstream/adoption/expiry/deletion record.
- Rust or TypeScript is selected before artifact mutation or service handoff;
  there is no dual activation.
- Temporary compatibility and migration adapters are deleted after the
  supported window.

## Dependency-Ordered Work Items

| ID | Work item | Classification | Layer | Depends on | Acceptance | Deletion target |
| --- | --- | --- | --- | --- | --- | --- |
| EAR-001 | Freeze extensibility/artifact/release inventory | Reuse | Planning | - | Source owners, PR states/heads, Lobster investments, 22-patch baseline, and dates recorded | Stale duplicate inventory |
| EAR-002 | Define definition/artifact/release identity matrix | Reuse | Planning | EAR-001 | Native definition, selected definition, artifact, install, activation, component, and release identities separated | Universal package identity |
| EAR-003 | Define required/optional metadata compatibility rules | Reuse | Contract | EAR-002 | Unknown required trust/lifecycle/migration/compatibility fails closed | Silent approximation |
| EAR-004 | Build plugin host-bundle fixture | Adopt | Upstream evidence | EAR-003 | #114783 fixture remains inert, deterministic, duplicate-rejecting, and provenance-preserving | Runtime import during discovery |
| EAR-005 | Build Claw/skill definition fixture | Reuse | Evidence | EAR-003 | Merged #112773 identity/profile split maps without changing baseline package shape | Parallel Claw manifest |
| EAR-006 | Select unlike third definition family | Reuse evidence | Research | EAR-003 | Provider, channel, or host-binding owner and native identity documented | Plugin-only generalization |
| EAR-007 | Test cross-family identity stability | New ask candidate | B1 evidence | EAR-004, EAR-005, EAR-006 | Adaptation preserves native IDs and owner without display/path inference | Consumer-generated IDs |
| EAR-008 | Decide U-EAR-01 common envelope residual | New ask candidate | Upstream | EAR-007 | Small additive envelope proven necessary or shared contract rejected | Universal manifest |
| EAR-009 | Prove unknown-required refusal across families | Extend existing | Evidence | EAR-004, EAR-005, EAR-006 | Same required/optional semantics produce compatible outcomes | Unknown required fields ignored |
| EAR-010 | Decide U-EAR-02 compatibility residual | New ask candidate | Upstream | EAR-009 | Extend one existing owner only if current schemas cannot express refusal | New compatibility engine |
| EAR-011 | Reconcile #114782/#114783 owner decision | Adopt | Upstream | EAR-004 | Plugin owner accepts bounded manifest/version/compatibility posture or proof archived | Duplicate host-bundle proposal |
| EAR-012 | Record #112773/#113045 lifecycle precedents | Reuse | Contract | EAR-001 | Portable profile separation and symmetric cleanup are normative examples | Reopened duplicate fixes |
| EAR-013 | Archive #113836 OpenClaw adapter path | Delete | B1 | EAR-012 | Independent adapter uses public CLI only; private module import path absent | Draft #113836 design |
| EAR-014 | Inventory plugin and Claw install identities | Reuse | Planning | EAR-001 | Source/version/digest/provenance/operation/result fields and gaps recorded | Name-only assumptions |
| EAR-015 | Normalize immutable install evidence fixture | Extend existing | Evidence | EAR-014 | Plugin and Claw installs produce equivalent bounded evidence without replacing owners | New installer |
| EAR-016 | Define legacy install-record migration | Extend existing | Upstream | EAR-015 | Existing records remain readable; name-only entries are explicit legacy/unknown | Permanent dual authority |
| EAR-017 | Reject mutable-name-only admission where required | Extend existing | Upstream | EAR-016 | Governed profile blocks before activation while baseline local policy remains compatible | Mutable tag authority |
| EAR-018 | Inventory provenance authorities by source | Reuse evidence | Research | EAR-014 | npm, ClawHub/plugin, and one unlike source name publisher/build/revocation authorities | Universal signer assumption |
| EAR-018A | Define trust-root lifecycle and verification order | New ask candidate | Evidence | EAR-018, XPK-008 | Root rotation, expiry, compromise, replay, clock uncertainty, supersession, offline verification, and verify-before-parse/extract behavior are explicit | Static forever key |
| EAR-019 | Define minimal signed provenance fixture | New ask candidate | Evidence | EAR-018A | Authority, subject digest, predicate/evidence refs, issued time, expiry, and verification result are source-neutral | Marketplace-specific token |
| EAR-020 | Define signed revocation fixture | New ask candidate | Evidence | EAR-018A | Authority, artifact digest, scope, reason, issued/effective time, supersession, and compromise response are explicit | Name-based denylist |
| EAR-021 | Prove retained revoked installation status | Extend existing | Evidence | EAR-020 | New admission blocks; retained installation is visible; no silent uninstall/deactivation | Revocation as deletion authority |
| EAR-021A | Define response for an actively exploited retained artifact | Extend existing | Contract | EAR-021, XPK-005 | Severity, quarantine or disable authority, deadline, exception, break-glass, operator action, and evidence are bounded without silent uninstall | Indefinite visible-only risk |
| EAR-022 | Decide U-EAR-04 portable trust residual | New ask candidate | Upstream | EAR-019, EAR-020, EAR-021 | Three source families prove one minimal adapter contract or proposal is rejected | Universal trust service |
| EAR-023 | Reconcile MOS3 feed trust projection | Downstream-only | Lobster | EAR-018 | Feed attestation, review, tenant state, revocation, and artifact integrity remain projected separately | Feed as artifact authority |
| EAR-024 | Unlock canonical plugin acquisition only after proof | Downstream-only | Lobster | EAR-015, EAR-021, EAR-021A, EAR-022, EAR-023, XPK-004 | MOS3 dispatches owner install only after trust proof and verifies immutable owner result/readback | Feed-driven mutation |
| EAR-025 | Inventory current updater phase facts | Reuse | Planning | EAR-001 | Resolve/stage/verify/migrate/handoff/activate/readiness/plugin/recovery/publication facts recorded | New updater |
| EAR-026 | Generate compact release component manifest | Extend existing | Evidence | EAR-002, EAR-025 | Exact component artifacts and compatibility derive from current owners | Hand-authored parallel config |
| EAR-027 | Validate protocol/schema/migration compatibility | Extend existing | Upstream | EAR-026 | Incompatible target fails before deployment mutation | Trial migration as compatibility check |
| EAR-028 | Bind recovery-point requirement | Adopt | Upstream | EAR-026, KCC-028 | Required checkpoint identity and compatibility are checked before migration | Release-owned backup engine |
| EAR-029 | Structure local activation phase result | Extend existing | Upstream | EAR-025, EAR-027, EAR-028 | Existing updater output reports phase, exact target, owner result, and retained recovery state | Generic success |
| EAR-030 | Bind candidate-generation readiness | Adopt/extend | Upstream | EAR-029, CFA-016, CFA-019 | Stale readiness cannot commit target; exact candidate readiness is referenced | Listener-up inference |
| EAR-031 | Include plugin convergence and restart debt | Extend existing | Upstream | EAR-029 | Release result distinguishes converged, pending restart, partial, and blocked | Package update as readiness |
| EAR-032 | Prove rollback versus recovery-blocked | Extend existing | Evidence | EAR-028, EAR-029, EAR-030 | Previous code plus compatible state reaches ready, or unit is quarantined as recovery blocked | Code reinstall as rollback |
| EAR-033 | Prove actual published-artifact install and compatible-set recovery | Extend existing | Release | EAR-026, EAR-029, XPK-008 | Clean external install uses published bytes; compatible set, partial publication, smoke/dogfood, fresh install, upgrade survivor, and recovery refs are retained before promotion | Pipeline URL as proof |
| EAR-034 | Adopt #111542 localized presentation | Adopt | Upstream | EAR-029 | Human preview localizes wrappers while JSON facts and identifiers remain invariant | Localized machine schema |
| EAR-035 | Map #5541 release slots to per-unit results | Adopt | Lobster | EAR-029, EAR-032 | Active/Previous/Candidate slot transitions consume but do not rewrite local outcomes | Slot as readiness truth |
| EAR-036 | Build live #5402 patch ledger | Adopt | B3/Lobster | EAR-001 | All 22 patches have owner, upstream link, expiry, promotion gate, and deletion test | Historical 21-patch assumption |
| EAR-037 | Delete promoted replacement patches | Delete | B3/Lobster | EAR-036 | Pinned release contains replacement and hosted conformance passes per patch | Permanent carry |
| EAR-038 | Define Scout ring/quarantine projection | Downstream-only | Lobster | EAR-030, EAR-032, EAR-035 | Ring/cohort state references exact release/unit/readiness/recovery identities | Fleet policy upstream |
| EAR-039 | Build language-neutral artifact and release fixture suites | New component | Evidence | EAR-021A, EAR-022, EAR-026, EAR-032, EAR-033, XPK-007 | Trust-root/provenance/revocation cases and activation/readiness/rollback/blocked/publication cases are separately versioned under one registry | Implementation-specific proof |
| EAR-040 | Implement optional Rust verifier | New component | Rust | EAR-039 | Rust and TypeScript produce identical artifact trust outcomes | Rust-specific trust semantics |
| EAR-041 | Implement bounded Rust updater/activator | New component | Rust | EAR-033, EAR-039, EAR-040 | One deployment profile verifies, stages, migrates, activates, and reports owner results; host supervision remains OAF-owned | Full ecosystem rewrite |
| EAR-041A | Prove state migration, mixed-version, and rollback readiness before cutover | New component | Release | EAR-033, EAR-041, XPK-006, XPK-008, XPK-009 | Current-owner release/recovery, old/new state, in-flight activation, downgrade refusal, fallback limits, and unknown settlement are proven before authority changes | Canary-first migration |
| EAR-042 | Canary one authoritative activator | New component | Migration | EAR-041A, XPK-010 | TypeScript or Rust selected before mutation/handoff; no dual activation | Dual updater execution |
| EAR-043 | Prove post-canary release and rollback limits | New component | Release | EAR-042 | Fresh install, upgrade, migration, plugin convergence, crash, rollback, and blocked recovery remain valid under authoritative canary | Binary rollback claims |
| EAR-044 | Delete superseded TypeScript owner and adapters | Delete | Release | EAR-043 | Exact TypeScript path/tests and temporary compatibility/migration adapters removed | Permanent dual implementation |

## Sequencing

```text
inventory and identity matrix
  -> three-family inert metadata fixtures
  -> host-bundle owner decision
  -> immutable install evidence
  -> trust-root lifecycle, verify-before-parse, provenance, revocation, and
     active-exploit response
  -> generated release component manifest
  -> actual published-artifact install and structured local activation/recovery
  -> Lobster release-slot/ring/patch adoption
  -> language-neutral fixtures
  -> optional Rust verifier and updater/activator
  -> pre-cutover migration/rollback proof
  -> TypeScript and adapter deletion
```

## Findings

1. **OpenClaw already has the hard local release machinery.** Target selection,
   staging, verification, Doctor migration, database downgrade refusal,
   service handoff, plugin convergence, publication, and fresh-install proof
   should be extended rather than replaced.
2. **#114782/#114783 are an exemplar, not a universal extension schema.**
   Manifest-first host bundles should remain inert and plugin-owner bounded.
3. **Merged #112773 is the portability precedent.** Portable Claw identity and
   strict host profiles coexist without forcing host policy into the portable
   package.
4. **Artifact trust has two different layers.** Current local install
   provenance is mature; signed publisher/build provenance, SBOM/transparency,
   and portable revocation require source-authority proof.
5. **Revocation is not uninstall authority.** It blocks new admission and
   exposes retained risk; normal owners decide deactivate, repair, or remove.
6. **The release manifest should be generated evidence.** Current owners
   already hold component truth; a new hand-authored release configuration
   would create dual authority.
7. **EC-029 is per deployment unit.** Fleet rollout and repair remain with
   Lobster/EC-034, while exact local activation and recovery remain portable.
8. **Lobster already has the enterprise release shell.** #5541 supplies
   release slots and #5402 supplies the current patch promotion baseline.
9. **Rust is optional and bounded.** A verifier or updater may replace one
   complete owner after parity, canary, rollback, and exact TypeScript deletion;
   plugins, skills, Claws, and catalogs do not need a forced rewrite.

## Package Exit

This package is complete when:

- three unlike extension families prove or disprove a shared inert definition
  envelope;
- #114782/#114783 has an owner decision and no parallel host-bundle proposal;
- plugin and Claw installs retain immutable identity without name-only
  authority;
- portable signed provenance/revocation is proposed only after three
  source-family fixtures agree;
- trust-root rotation, compromise, expiry, replay, offline verification, and
  verify-before-parse behavior are proven;
- the current updater emits or references one generated component manifest and
  structured activation/recovery result;
- the actual published bytes install in a clean environment and compatible-set
  or partial-publication failure is recoverable;
- rollback and recovery-blocked behavior are proven with exact prior state;
- Lobster consumes per-unit results for slots, rings, quarantine, and promotion
  without becoming local truth;
- all 22 carried patches have live retirement records; and
- any Rust replacement deletes one superseded TypeScript owner plus temporary
  migration adapters.
