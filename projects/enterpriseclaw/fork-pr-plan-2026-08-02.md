# EnterpriseClaw PR Portfolio

Status: corrected after full `.craft/roles` review; no PRs opened  
Date: 2026-08-02

## Review Conclusion

The earlier 49-row list was useful as a portfolio inventory, but it was not a
valid 49-PR execution DAG:

- twelve rows were conditional upstream hypotheses;
- several rows were release, canary, or promotion operations rather than PRs;
- three rows were reusable deletion templates;
- some rows combined multiple owners or duplicated EAR/OAF responsibilities;
- artifact trust, policy, evidence custody, and owner mutation were ordered too
  late; and
- the first five PRs were larger than required to prove the fork workflow.

The corrected plan starts with an operational preflight and two real PRs.
Later rows remain a staged portfolio, not a commitment to open everything.

In addition, all **55 currently open owned upstream PRs** are captured as
quarantined fork sources. They are not 55 duplicate fork PRs and are not
automatically enabled. Their exact heads live in
`fork-carried-upstream-pr-ledger-2026-08-02.md`; their admission phases and
selectors are in `fork-carried-upstream-prs-2026-08-02.md`.

## Repository and Review Mechanics

Fork `main` remains an exact mirror of `openclaw/openclaw`.

The fork uses:

```text
main                  exact upstream mirror
ec/integration        generated EnterpriseClaw assembly
ec/evidence-*         hypothesis and conformance branches
candidate/*           clean portable upstream candidates
ec/rc/*               mutable release-candidate branches
```

Mechanics:

1. `BOOT-001` is the one bootstrap PR that establishes `ec/integration`.
2. Later fork PRs target `ec/integration` for review but are not merged with a
   normal GitHub merge button.
3. After approval, the queue workflow freezes the source head, records its
   source SHA and patch ID, reconstructs `ec/integration` from the pinned
   upstream base, verifies the resulting tree, and closes the PR as queued.
4. `candidate/*` always starts cleanly from an exact upstream commit and never
   contains bootstrap or EnterpriseClaw-only commits.
5. Lobster, connector, plugin, and Rust work remains in the owning repository.

## Operational Preflight - No PR

### PRE-001: Establish a Writable, Current Fork

Current verified state on 2026-08-02:

- upstream `main`: `adedc323b689f5c71684211eb5b08f00371fb0f8`;
- fork `main`: `5332641ed3bab552d23fb16c67bc697a373ea9d7`;
- `giodl73-repo` has push/admin permission;
- `giodl_microsoft` has read-only permission.

Before opening any PR:

1. select the `giodl73-repo` GitHub identity for fork writes;
2. fast-forward fork `main` to the verified upstream commit;
3. create and protect `lobster/integration`;
4. disable direct pushes and normal merge methods after BOOT-001;
5. define queue approval, reconstruction, close-without-merge, and rollback
   behavior; and
6. record exact Windows and Linux baseline commands.

## Opening Stack - Two Real PRs

### BOOT-001: Add the Minimal Reconstruction Harness

| Field | Value |
| --- | --- |
| Repository | `giodl73-repo/openclaw` |
| Branch | `lobster/bootstrap-reconstruction` |
| Base | `lobster/integration` created from the PRE-001 upstream SHA |
| Size target | At most 600 non-generated LOC and 12 files |
| Production impact | None |

Tangible result:

- pinned upstream base;
- ordered queue manifest;
- deterministic reconstruction command;
- source SHA, patch ID, applied SHA, and resulting tree digest;
- exact vanilla and integration commands and known-failure baseline;
- minimal fixture/result identity needed by the first evidence slice;
- separate delete and retain inventories; and
- unsigned development result manifest.

Acceptance:

- clean Windows and Linux checkouts reconstruct the same tree;
- vanilla and empty-queue integration results match;
- no production import, startup hook, schema, plugin, skill, package, or default
  CLI behavior changes;
- adding and removing a no-op queue entry returns to the original tree; and
- fork maintenance budgets are recorded.

### EVID-001: Prove Current Owner Projection

| Field | Value |
| --- | --- |
| Repository | `giodl73-repo/openclaw` |
| Branch | `lobster/evidence-exa-owner-projection` |
| Review base | `lobster/integration` |
| Size target | At most 800 non-generated LOC and 15 files |
| Production impact | Read-only and opt-in |
| Depends on | BOOT-001 |

Tangible result:

- adapt current configuration, readiness, and updater/release facts;
- preserve each native owner payload and generation;
- emit one complete case;
- emit one stale, mixed-version, or explicitly omitted case;
- expose the result through an existing status, config, readiness, or update
  JSON surface where possible;
- provide a concise reason and safe next action; and
- add zero default runtime, startup, memory, or tool-call overhead.

Acceptance:

- current source and representative real tests, not only synthetic fixtures,
  establish the owner behavior;
- projection failure remains distinct from owner-reported failure;
- no universal `healthy` or `success` enum is introduced;
- ordinary OpenClaw behavior remains unchanged when the slice is absent;
- the branch can be added to and removed from the queue reproducibly; and
- the result is classified as `reuse`, `adopt`, `extend`, `downstream-only`, or
  `delete`.

If `extend` is proven, create one owner-specific clean candidate branch. Do not
automatically create a generic owner-observation framework.

## Evidence Backlog

Open these one at a time after EVID-001 proves the review, queue, and deletion
workflow.

| ID | Repository | PR title | Tangible result | Depends on |
| --- | --- | --- | --- | --- |
| EVID-002 | OpenClaw fork | Prove inert compatibility across extension families | Plugin, Claw/skill, and one unlike family preserve native identity and reject unknown required semantics | BOOT-001 |
| EVID-003 | OpenClaw fork | Prove run-to-provider-call-and-usage attribution | Primary failure and fallback preserve run, candidate, call, retry, usage, and cost causality | BOOT-001 |
| EVID-004 | OpenClaw fork | Prove one restart-safe bounded lease | Exhaustion, restart, stale-holder fencing, renewal/expiry, and settlement | BOOT-001 |
| EVID-005 | OpenClaw fork | Prove mixed-owner checkpoint and copy facts | Compatibility, dirty-state refusal, retained/external/unknown copies, and per-owner settlement | BOOT-001 |
| EVID-006 | OpenClaw fork | Prove immutable lifecycle obligations | Required-child membership, final authority/hold recheck, and lost-ack reconciliation | EVID-005, POLICY-001 |
| EVID-007 | OpenClaw fork | Prove protected effect and uncertain settlement | Exact authority, durable pre-dispatch evidence, timeout-after-dispatch, unknown, and reconcile-before-retry | POLICY-001, ASSURE-001 |

## Foundational Control PRs

These become necessary before managed writes, protected effects, release
attestation, fleet assurance, or Rust authority.

| ID | Repository | PR title | Tangible result | Depends on |
| --- | --- | --- | --- | --- |
| TRUST-001 | OpenClaw fork | Prove verify-before-parse artifact admission | Immutable bytes, digest, signer, authority, expiry, revocation, provenance, and retained-revoked status | BOOT-001 |
| POLICY-001 | OpenClaw fork | Prove local policy generation and anti-rollback enforcement | Monotonic generation, expiry, revocation, stale policy refusal, normalized intent and non-bypassable protected class | BOOT-001 |
| ASSURE-001 | Lobster assurance owner | Add append-only evidence custody and independent verification | Retention, legal hold, access audit, trusted timestamp, supersession, restore, export and complete/incomplete assurance | BOOT-001 |
| MUT-001 | OpenClaw fork | Prove canonical owner-managed mutation | Preview, authority, expected generation, operation ID, intent digest, conflict, settled-result lookup and sanitized errors | POLICY-001 |
| HOST-001 | Lobster hosting owner | Prove managed adapter and sidecar lifecycle | Verify bundle, atomic policy load, loopback start, combined readiness, crash/reconnect, pending writes, idle teardown and budgets | TRUST-001, POLICY-001 |

## Managed Vertical Slice

This is the cheapest complete managed stack.

| ID | Repository | PR title | Tangible result | Depends on |
| --- | --- | --- | --- | --- |
| UX-001 | Lobster/Cowork owner | Apply one governed configuration field | Scope-neutral target, preview, field error, lock owner, safe next action, typed events, keyboard and screen-reader proof | MUT-001, HOST-001 |
| CONN-001 | Selected connector repository | Prove duplicate and echo-loop-safe connector mutation | Source generation, operation and delivery identity, native attempt/receipt, unknown lookup, retry classification and loop token | MUT-001, HOST-001 |
| HOSTED-001 | Lobster hosted UI owner | Render version-matched owner projections with local fallback | Explicit omissions, stale/incompatible isolation, asset/runtime version match and raw local path | EVID-001, HOST-001 |

UX-001 and CONN-001 are siblings. The connector owner does not depend on
Cowork, and Cowork does not depend on the full hosted-Control-UI rollout.

## Artifact and Local Release Stack

EAR is the sole producer of the per-unit release result.

| ID | Repository | PR title | Tangible result | Depends on |
| --- | --- | --- | --- | --- |
| EAR-001 | OpenClaw fork | Generate exact local activation and recovery result | Component tuple, compatibility, checkpoint, migration, candidate readiness, plugin convergence, rollback or recovery blocked | TRUST-001, EVID-005 |
| REL-001 | OpenClaw fork | Publish immutable release-candidate artifacts | Build once, immutable version/digest, provenance, SBOM, workflow and component manifest | TRUST-001, EAR-001 |
| REL-002 | OpenClaw fork | Verify exact published bytes in an empty environment | No checkout/file links, clean install, sibling dogfood, upgrade, downgrade refusal, rollback and recovery blocked | REL-001 |

The following are release operations, not PRs:

1. promote the exact digest verified by REL-002 without rebuilding;
2. sign a unique protected release tag;
3. retain the component and evidence manifests; and
4. independently verify the release evidence.

Local release proof must not depend on Lobster.

## Fleet and Assurance Stack

OAF consumes EAR results; it does not produce another release schema.

| ID | Repository | PR title | Tangible result | Depends on |
| --- | --- | --- | --- | --- |
| OAF-001 | OpenClaw fork | Publish authoritative unit lifecycle facts | Lifecycle receipt, readiness, checkpoint, EAR release result and assurance references without new release ownership | EAR-001, ASSURE-001 |
| FLEET-001 | Lobster | Add immutable fleet target and child journal | Membership generation, coordinator restart, lost-ack reconciliation and convergence deadline | OAF-001 |
| FLEET-002 | Lobster | Add immutable repair eligibility and targeted repair | Healthy units untouched; failed, restored and unknown units settle independently | FLEET-001 |
| FLEET-003 | Lobster | Add containment coordination | Route isolation, credential-revocation request, process-stop request and unknown reachability remain separate owner results | FLEET-001, ASSURE-001 |
| FLEET-004 | Lobster | Add separately authorized break-glass workflow | Independent approvers, exact scope, TTL, nonce, automatic expiry, alerting, review and reconciliation | FLEET-003, EVID-007, ASSURE-001 |
| RING-001 | Lobster | Qualify release rings and quarantine | Exact REL-002 digest, immutable targets, assurance completeness, targeted repair and recovery-blocked support posture | REL-002, FLEET-001 through FLEET-004 |

## Governance and Capacity Stack

Retention and resource management remain separate owner areas.

| ID | Repository | PR title | Tangible result | Depends on |
| --- | --- | --- | --- | --- |
| RET-001 | Lobster | Coordinate retention and legal-hold obligations | KCC copy inventory, authority recheck, per-owner settlement and retained evidence | EVID-005, EVID-006, ASSURE-001 |
| BUDGET-001 | Lobster | Coordinate Budget and capacity over owner facts | MPU usage provenance plus DGR admission/allocation without a second accounting total | EVID-003, EVID-004 |

## Conditional Upstream Hypotheses

These are not PRs yet. Each becomes a clean `candidate/*` branch only after the
named evidence proves a portable gap and live duplicate/owner review passes.

| Hypothesis | Possible smallest delta | Evidence |
| --- | --- | --- |
| H-UP-001 | Owner-specific projection field or result | EVID-001 |
| H-UP-002 | Inert cross-family compatibility residual | EVID-002 |
| H-UP-003 | Provider candidate parent for existing call/usage facts | EVID-003 |
| H-UP-004 | Durable lease result residual | EVID-004 |
| H-UP-005 | Checkpoint/copy settlement residual | EVID-005 |
| H-UP-006 | Lifecycle-plan settlement residual | EVID-006 |
| H-UP-007 | Protected-effect settlement residual | EVID-007 |
| H-UP-008 | Canonical managed-mutation residual | MUT-001 |
| H-UP-009 | Local activation/recovery result residual | EAR-001 |
| H-UP-010 | Owner assurance-status residual | OAF-001 |

Valid conclusions remain `reuse`, `adopt`, `extend`, `downstream-only`, or
`delete`. There is no target number of upstream PRs.

## First Rust Replacement

The current TypeScript release/recovery path and exact deletion inventory must
be proven before executable Rust authority work.

| ID | Repository | PR title | Tangible result | Depends on |
| --- | --- | --- | --- | --- |
| RUST-001 | Independent Rust repo | Commit clean node fixture runner | Reproducible source and TypeScript/Rust accepted/failure parity | BOOT-001 |
| RUST-002 | OpenClaw fork | Inventory exact Rust profile and TypeScript deletion target | Exact command, unsupported surface, files/tests/selectors/adapters, retain list and rollback window | RUST-001, REL-002 |
| RUST-003 | Independent Rust repo | Package trusted Rust artifact and connect to a disposable Gateway | Verified bytes, negotiation, authentication, reconnect and stale-generation refusal | RUST-002, TRUST-001 |
| RUST-004 | Independent Rust repo | Execute one exact bounded command | Existing policy/approval path, unsupported refusal and structured settlement | RUST-003, POLICY-001, ASSURE-001 |
| RUST-005 | Independent Rust repo | Add Rust state generation, import and readiness budgets | Fenced old writer, import receipt, corruption/quarantine, startup/CPU/RSS/disk/network budgets | RUST-004 |
| RUST-006 | OpenClaw fork | Add dormant admission-time implementation selector | Desired placement separated from local selection; no authority enabled | RUST-005 |
| RUST-007 | OpenClaw fork | Enable one Rust-authoritative canary after XPK-010 evidence | Exact selector, migration, mixed version, rollback, unknown settlement and published artifacts | RUST-006, REL-002, signed XPK-010 gate |
| DEL-001 | OpenClaw fork | Delete the promoted TypeScript node profile and adapters | Supported release adopted, rollback window closed, fleet proof complete, old path unselectable and residue sweep clean | RUST-007, RING-001 |

Canary execution and supported-profile promotion are explicit operations and
decisions, not ordinary PRs.

## Concrete Deletion PR Rule

Do not create generic `DEL-*` templates in advance. Create one deletion PR in
the owning repository only when it names:

- the exact carried patch or superseded owner;
- the released replacement and minimum supported version;
- the expired compatibility and rollback window;
- delete and retain inventories;
- zero-old-path evidence;
- current-head CI and fixture results; and
- reconstruction without the retired queue entry.

## Corrected Opening Order

```text
PRE-001 sync and protect the writable fork
-> BOOT-001 minimal reconstruction harness
-> capture all 55 heads as source-only/quarantined
-> optionally admit #90708 if baseline proof requires it
-> admit #107026 plus the minimum readiness-stack prefix as evidence-only
-> EVID-001 current owner projection
-> add and remove EVID-001 from the queue
-> classify the result
-> only then open EVID-002 through EVID-007 as needed
```

The immediate commitment is one preflight, one bootstrap PR, source capture for
all 55 heads, a maximum of six evidence admissions (#90708, #107026, and the
four readiness heads), and one evidence PR. Every other source remains
quarantined until its individual gate.
