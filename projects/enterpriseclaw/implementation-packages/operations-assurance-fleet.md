# Operations, Assurance, and Fleet Implementation Package

## Purpose

Turn EC-021, EC-029, EC-032, EC-033, and EC-034 into a bounded implementation
plan without:

- filing one upstream RFC per EC contract;
- making the EnterpriseClaw fork the permanent semantic owner;
- turning Lobster into the OpenClaw state database;
- claiming process exit proves recovery or containment; or
- starting a broad Rust rewrite.

EC-007, EC-022, EC-028, and EC-031 are dependencies consumed by this package.

## Evidence

- Current OpenClaw source at
  `bde1602e6e86fd91dd0bec3aae714e059e556c4d`.
- `src/fleet/registry.ts` provides durable cell records and renewable,
  expiring per-cell operation leases.
- `src/fleet/service.runtime.ts` preserves exact attempt labels, health-gated
  replacement, and prior-cell restoration.
- `src/fleet/backup.runtime.ts` provides stopped-cell backup, bounded archive
  handling, tenant checks, and restore verification.
- `src/gateway/server/readiness.ts` provides cached Gateway readiness over
  startup, drain, event-loop, and channel health, but not a general
  owner/generation condition envelope.
- `src/infra/update-runner-types.ts` records before/after versions, update
  steps, failures, and restart safety, but not the complete mixed-component
  target/checkpoint/assurance relationship.
- `src/infra/update-managed-service-handoff.ts` proves managed restart handoff
  and persistent restart-sentinel patterns.
- `src/audit/audit-event-writer.ts` provides a bounded non-blocking worker, and
  its `record()` result proves that operational success and audit persistence
  can diverge.
- The standalone fleet simulation passes ten target cases and found one mutable
  repair-eligibility defect.
- The delivery portfolio was reconciled live on 2026-08-02. Readiness/hosting
  and checkpoint/restore already have active upstream stacks; Lobster already
  has merged release-slot behavior and active continuity adoption work.

## Owner Model

| Concern | Authoritative owner |
| --- | --- |
| Unit artifact, process, generation, readiness, checkpoint, restore, quarantine | Local OpenClaw or Rust unit owner |
| Parent rollout, target set, rollout policy, repair selection | Lobster fleet coordinator |
| Release artifact and compatibility metadata | Artifact/release owners |
| Durable checkpoint publication and cross-owner restore | Lobster continuity coordinator over owner checkpoints |
| Owner evidence production | Local semantic owner |
| Durable evidence retention, signing, and attestation | Lobster assurance capability |
| Fleet projection | Lobster projection over per-unit results |
| Host-critical lifecycle after Rust cutover | Rust supervisor |

## Area RFC Set

These are EnterpriseClaw area design boundaries, not automatic upstream issue
boundaries.

| Area RFC | EC mapping | Durable home |
| --- | --- | --- |
| **OAF-01 Owner lifecycle and generation readiness** | EC-007, EC-032 | Portable owner contract upstream; Scout adoption in fork/Lobster |
| **OAF-02 Fleet consumption of release and recoverability** | EC-021, EC-029, EC-032 | EAR owns the portable per-unit result; OAF/Lobster own aggregation and rollout policy |
| **OAF-03 Owner checkpoint and restore manifest** | EC-021 | Owner interface upstream; publication/composition in Lobster |
| **OAF-04 Evidence references and assurance completeness** | EC-033 | Owner evidence contract upstream; durable assurance in Lobster |
| **OAF-05 Fleet parent/child convergence and containment** | EC-034 | EnterpriseClaw/Lobster contract consuming portable unit seams |
| **OAF-06 Fleet-supported component tuple and promotion policy** | EC-022, EC-026, EC-029, EC-032 | Consume the EAR manifest; record fleet support, rings, quarantine, and promotion in Lobster |

## Upstream Investment Reconciliation

| Workstream | Existing investment | Classification | Next action |
| --- | --- | --- | --- |
| **U-OAF-01 readiness** | #104018, #113421, #113422, #114636 | Adopt existing | Track, review, and consume; do not file a duplicate |
| **U-OAF-02 lifecycle receipt** | Current Fleet leases/attempt labels plus readiness/hosting stack | Conditional residual | Prove whether existing operation/settlement facts suffice; extend only if the fixture fails |
| **U-OAF-03 release recovery** | EAR-025 through EAR-033 | Adopt EAR | Consume the per-unit result; do not define another OAF upstream contract |
| **U-OAF-04 checkpoint/restore** | #112385, #112865, #112896 | Adopt existing | Close compatibility gaps on the existing stack; do not file a parallel checkpoint ask |
| **U-OAF-05 assurance status** | Current audit writer, #114636, #100361 | Conditional residual | Prove whether current owner evidence can express complete/incomplete/unsupported/unknown before extending it |

The operations package therefore has five upstream workstreams, but currently
only **at most two residual asks**: lifecycle receipt and assurance status.
Readiness and checkpoint/restore are adoption work. Release activation and
recovery are consumed from EAR.

## Candidate Upstream Ask Shapes

These are the smallest likely OpenClaw asks. Each still requires a current-head
source audit and maintainer shaping before filing.

### U-OAF-01: Adopt generation-bound owner readiness conditions

Existing delivery path: #104018 -> #113421 -> #113422 -> #114636.

Validate that the existing stack preserves:

- owner identity;
- condition identity and severity;
- observed generation;
- freshness;
- ready/degraded/blocked/unknown;
- reason and remediation reference; and
- compatibility behavior for owners that do not emit the extension.

**Do not file another ask. Deletes:** scripts and fleet adapters that infer
readiness from process existence or unversioned `/healthz`.

### U-OAF-02: Durable per-unit lifecycle operation receipt

Extend current Fleet cell and daemon lifecycle operations with:

- stable operation and attempt identity;
- accepted/active/settled chronology;
- expected owner generation;
- target artifact/runtime profile;
- idempotent reconciliation after lost response;
- structured refusal, partial, timeout, and unknown results; and
- evidence reference.

This is a per-unit owner contract. Multi-unit fan-out does not move upstream.

**Deletes:** retry-by-command-exit and controller-generated replacement
operations after lost acknowledgement.

### U-OAF-03: Consume the EAR release activation and recovery result

Existing partial delivery paths:

- #111542 for updater preview presentation;
- #113422 and #114636 for hosting-profile release proof;
- #112385, #112865, and #112896 for recovery point, final capture, and restored
  admission; and
- Lobster #5541 for Active/Previous/Candidate slots.

EAR owns any residual portable update relationship, including:

- exact component target set and versions;
- compatibility/preflight result before mutation;
- checkpoint reference where state may migrate;
- candidate active and generation-ready proof;
- previous artifact/state recovery result;
- `recovery_blocked` and quarantine guidance; and
- assurance status separate from operational status.

OAF validates these facts in multi-unit rollout, repair, containment, and
assurance fixtures. It does not file or own a parallel release-result ask.

**Deletes:** the inference that source rollback or previous image restoration
alone means recovered, plus any OAF-local release-result schema.

### U-OAF-04: Adopt owner checkpoint manifest and restore preview

Existing delivery path: #112385 -> #112865 -> #112896, with Lobster #5481 and
the continuity proof stack as adopters.

Validate the existing stack against:

- stable checkpoint identity;
- owner and tenant identity;
- source artifact/runtime schema and owner generation;
- included and excluded owner roots;
- consistency limits and dirty-state refusal;
- target compatibility preview;
- atomic owner restore result; and
- retained/external state declaration.

Do not file a parallel checkpoint contract. Extend the existing stack only for
an exact uncovered owner compatibility or Fleet-cell adoption gap.

**Deletes:** timestamp-based backup consistency and code-only rollback.

### U-OAF-05: Owner evidence reference and assurance status

Extend owner operation results with:

- typed evidence reference;
- producer and subject identity;
- operation, authority, artifact, and owner generations;
- requested/accepted/effective/observed chronology;
- disclosure/redaction class;
- `complete`, `incomplete`, `unsupported`, or `unknown` assurance status; and
- explicit behavior when the bounded audit writer rejects or drops an event.

Upstream does not need Lobster's signing, SIEM, tenant retention, or compliance
service.

**Deletes:** treating telemetry presence as durable audit or treating dropped
audit metadata as operational failure.

## Fork Ledger

Every item remains unfiled until the source audit confirms its seam.

| ID | Class | Fork work | Exit |
| --- | --- | --- | --- |
| **F-OAF-01** | B1 | Existing readiness/hosting proof and adapters behind #104018/#113421/#113422/#114636 | Delete or collapse as the upstream stack lands |
| **F-OAF-02** | B1 | Add stable lifecycle operation receipt and reconciliation to Fleet cell operations | U-OAF-02 lands, then delete |
| **F-OAF-03** | B1 | Existing continuity/recovery proofs behind #112385/#112865/#112896 plus only residual release-result proof | Delete duplicate fork slices as the existing stack lands |
| **F-OAF-04** | B1 | Add evidence-reference and assurance projection over current audit writer result | U-OAF-05 lands, then delete |
| **F-OAF-05** | B1 | Add parent/child fixture adapter for the three-cell proof | Delete after Lobster coordinator adopts public unit seams |
| **F-OAF-06** | B2 | Scout hosting adopter mapping Lobster unit identity to OpenClaw owner identity | Move to stable host plugin/adopter seam |
| **F-OAF-07** | B2 | Checkpoint publication and restore adopter | Remain bounded plugin or move transport/storage to Lobster |
| **F-OAF-08** | B2 | Assurance exporter for durable Lobster storage | Remain exporter plugin; no canonical owner state |
| **F-OAF-09** | B3 | Mixed-release manifest reader and compatibility gate over merged Lobster #5541 slot semantics | Delete when upstream and Rust artifacts share the released contract |
| **F-OAF-10** | B3 | TypeScript/Rust supervisor canary selector | Delete after Rust supervisor cutover |
| **F-OAF-11** | B3 | Legacy upgrade/repair script compatibility shims | Delete after release and fleet proof |

The ledger must record base SHA, current patch SHA, owner, touched seams, tests,
upstream link, conflicts, and target deletion release.

### Current carried-patch baseline relationship

The historical local inventory recorded 21 OpenClaw source patches at Lobster
PR #5402 head `f807270d0b90`. Live PR head `285efe4097b5` now states that 22
patches apply cleanly. No active patch directly implements this package's
readiness, hosting-profile, recovery-point, or multi-unit fleet contract. The
package uses the same promotion and deletion discipline but must not claim
unrelated Teams, memory, node, sensitivity, or Automations patch retirement.

Adjacent patch work such as Automation restart semantics remains in its owning
area package.

## Lobster/Scout Capability Set

These are logical owners; they need not become one microservice per row.

| Capability | Responsibility | Must not own |
| --- | --- | --- |
| Target and rollout coordinator | Immutable target sets, parent acceptance, policy, concurrency, pause, abort | Unit runtime state |
| Child dispatch and reconciliation | Durable child identity, delivery, lost-ack reconciliation | Fabricated child settlement |
| Hosting allocator | Placement, network, volumes, compute, routing, repair | OpenClaw readiness meaning |
| Release coordinator | Promotion, supported tuple, staged rollout, targeted rollback | Owner-local activation |
| Checkpoint publication | Durable storage, integrity, retention, restore admission | One universal state format |
| Restore coordinator | Cross-owner preview, fencing, per-owner settlement, quarantine | Direct mutation of owner stores |
| Assurance capability | Durable append, signing, verification, retention, SIEM/compliance export | Runtime success semantics |
| Fleet projection and operator API | Desired/observed/converged/assurance views and safe actions | Canonical unit truth |

## Rust Component Set

### R-OAF-01: Conformance fixtures

Language-neutral fixtures for:

- lifecycle acceptance and reconciliation;
- generation-bound readiness;
- checkpoint/restore compatibility;
- release recovery;
- evidence availability; and
- containment dimensions.

### R-OAF-02: Host supervisor

Later authoritative owner for:

- start, ready, drain, stop, restart, and update handoff;
- local process containment;
- resource and crash recovery;
- unit operation receipt; and
- owner evidence emission.

It does not own fleet desired state, sessions, memory, channels, or provider
effects.

### R-OAF-03: Evidence writer/verifier

Optional later bounded component for tamper-evident durable append and
verification. Runtime owners produce facts; Lobster owns tenant retention and
compliance policy.

## Operator Projection

The primary rollout result is:

```text
47 targeted
44 updated and ready
2 restored to the previous release
1 recovery blocked and quarantined
Operational convergence: partial
Assurance: complete
Action: repair 3 affected units
```

Implementation tracks, protocol versions, and component topology remain
available in details, not the primary decision surface.

## Work-Item Graph

All items are proposed and unfiled.
Cross-package references use `cross-package-execution-contracts.md`.

| ID | Layer | Work item | Depends on | Acceptance |
| --- | --- | --- | --- | --- |
| **OAF-001** | Phase 0 | Inventory current fork patches, scripts, upstream/LTS base, and release owner | - | Every patch has B1/B2/B3 class and exit |
| **OAF-002** | Phase 0 | Record Scout deployment topology and startup/CPU/memory/network/recovery budgets | - | One deployment profile per process |
| **OAF-003** | Phase 0 | Consume the EAR component tuple and record fleet-supported upgrade order | OAF-001, EAR-026, EAR-029 | OAF adds fleet support policy without redefining the per-unit release result |
| **OAF-004** | Audit | Complete current-head source audit for the five upstream workstreams | OAF-001 | Existing stack, source owner, residual gap, and deletion target named |
| **OAF-010** | Evidence | Preserve the standalone ten-case simulation as contract fixtures | - | Deterministic 10/10 pass |
| **OAF-011** | Evidence | Convert simulation objects to language-neutral JSON schemas | OAF-010 | TypeScript and Rust validators agree |
| **OAF-020** | Upstream adoption | Track and validate #104018/#113421/#113422/#114636 | OAF-004, OAF-011 | Existing stack covers the package contract; no duplicate ask |
| **OAF-021** | Upstream decision | Decide U-OAF-02 lifecycle-receipt residual | OAF-004, OAF-011 | Existing facts are recorded sufficient, or the smallest restart/lost-ack extension is shaped; downstream consumes either outcome |
| **OAF-022** | Upstream adoption | Consume EAR per-unit release, readiness, rollback, and recovery results | OAF-004, OAF-011, EAR-029 through EAR-032 | OAF has no competing EC-029 proposal; stale and recovery-blocked remain owner facts |
| **OAF-023** | Upstream adoption | Track and validate #112385/#112865/#112896 | OAF-004, OAF-011 | Existing stack covers checkpoint/restore; only proven residual gaps extend it |
| **OAF-024** | Upstream decision | Decide U-OAF-05 evidence/assurance residual | OAF-004, OAF-011, XPK-003 | Existing evidence is recorded sufficient, or the smallest assurance extension is shaped; dropped evidence never fabricates attestation |
| **OAF-030** | Fork B1 | Implement three-cell parent/child proof using current Fleet cells | OAF-010, OAF-021 through OAF-024 | 2 success, 1 restored, targeted repair only; operational and assurance outcomes remain separate |
| **OAF-031A** | Fork B2 | Implement Scout unit-fact adopter | OAF-020, OAF-021, OAF-022 | Unit identity, lifecycle receipt, readiness, and release facts are consumed without direct owner-store mutation |
| **OAF-031B** | Fork B2 | Implement Scout checkpoint/restore adopter | OAF-023 | Checkpoint and restore results remain KCC owner facts and are not copied into a Lobster recovery database |
| **OAF-032** | Fork B2 | Implement assurance exporter | OAF-024, XPK-003 | Best-effort loss, required receipt, protected-effect evidence, and compliance-export failure follow the shared matrix |
| **OAF-033** | Fork B3 | Implement mixed-release compatibility gate | OAF-003, EAR-027, XPK-008 | Unsupported tuples fail before mutation; OAF consumes the EAR manifest and startup trust order |
| **OAF-040** | Lobster | Implement durable target-set and parent/child journal | OAF-011 | Parent/child recovery after coordinator restart |
| **OAF-041** | Lobster | Implement immutable repair eligibility receipt | OAF-040 | Healthy-unit widening is rejected |
| **OAF-042** | Lobster | Implement staged rollout, partial settlement, and targeted repair | OAF-030, OAF-040, OAF-041 | Healthy units receive no repair mutation |
| **OAF-043** | Lobster | Implement checkpoint publication and restore coordination | OAF-023, OAF-031B | Per-owner complete/blocked/unknown settlement |
| **OAF-044** | Lobster | Implement assurance storage, verification, and projection | OAF-024, OAF-032 | Operational and assurance states remain separate |
| **OAF-045** | Product contract | Publish fleet facts, actions, and next-action semantics for EXA | OAF-042 through OAF-044, EXA-038 | EXA owns rendering; OAF supplies preview, partial, repair, quarantine, containment, and assurance facts |
| **OAF-046** | Lobster evidence | Prove emergency containment and break-glass settlement | OAF-042, OAF-044, XPK-003, XPK-005 | Route isolation, credential revocation, kill request, unknown reachability, signed break-glass scope, and per-unit settlement remain explicit |
| **OAF-050** | Rust | Implement lifecycle/checkpoint/evidence conformance harness | OAF-011 | Same accepted and failure fixtures as TypeScript |
| **OAF-051** | Rust | Build host-supervisor side-effect-free admission slice | OAF-002, OAF-050 | Protocol, budgets, readiness, no real mutation |
| **OAF-052** | Rust | Canary supervisor on disposable units | OAF-033, OAF-043, OAF-044, OAF-051, OAF-060, XPK-010 | One authoritative owner is selected before admission; checkpoint, evidence, restart, and rollback behavior are proven |
| **OAF-060** | Release | Publish current-owner mixed-artifact fresh-install and recovery lane | OAF-003, OAF-033, EAR-033 | Published TypeScript/current-owner artifacts prove install, upgrade, downgrade refusal, rollback, and recovery before Rust canary |
| **OAF-060R** | Release | Extend the release lane with the Rust supervisor profile | OAF-052, OAF-060 | The same published-artifact lane proves Rust-inclusive compatibility without changing per-unit EAR semantics |
| **OAF-061** | Deletion | Delete superseded scripts, B1 patches, and TypeScript owner code | OAF-020 through OAF-024, OAF-046, OAF-060R, XPK-009 | Every exact path has a replacement, minimum release, zero-old-path evidence, rollback window, and deletion |

## Sequence

1. Phase 0 inventory and budgets.
2. Preserve simulation fixtures as schemas.
3. Audit five upstream workstreams; adopt two existing stacks and shape only
   proven residual asks.
4. Build the three-cell fork proof.
5. Build Lobster parent/child, repair, restore, and assurance capabilities.
6. Publish fleet facts/actions to EXA and prove emergency containment.
7. Prove the current-owner mixed release and rollback lane.
8. Build Rust conformance and supervisor slices.
9. Extend the release lane with Rust and delete exact workarounds.

## Package Exit

This package is complete when:

- EAR supplies the per-unit release/activation/recovery result and OAF does not
  maintain a competing EC-029 contract;
- the three-cell proof preserves immutable target membership, lost-ack
  reconciliation, exact checkpoint use, operational/assurance separation, and
  targeted repair;
- emergency containment and break-glass report exact per-unit settlement and
  unknown reachability;
- EXA renders OAF facts without OAF owning a second operator UI;
- the current-owner published-artifact release lane passes before any Rust
  supervisor canary;
- the Rust-inclusive lane preserves the same owner results and one
  authoritative selector; and
- every script, B1/B3 patch, compatibility path, and superseded TypeScript
  owner has an XPK-009 deletion record.

## Disproof Conditions

Revise or delete parts of this package if:

- current OpenClaw owner seams already express the proposed portable behavior;
- multi-unit coordination requires canonical unit-state copying;
- repair cannot exclude healthy units without owner-specific branching;
- rollback cannot be made truthful across code and state;
- assurance persistence must block the runtime hot path;
- the Rust supervisor cannot name a complete TypeScript owner deletion target;
  or
- the package adds more operator work than the scripts it replaces.
