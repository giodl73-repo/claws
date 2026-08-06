# EnterpriseClaw Fork Execution Plan

Status: corrected after full `.craft/roles` review  
Date: 2026-08-02

## Decision

Use `giodl73-repo/openclaw` as an integration and evidence fork over
`openclaw/openclaw`.

Assume that none of the 55 currently open OpenClaw PRs owned by
`giodl73-repo` will merge in time for this program. Capture all 55 exact PR
heads through the quarantined phased program in
`fork-carried-upstream-prs-2026-08-02.md`. Their upstream PRs remain provenance
and future deletion links rather than delivery dependencies. Capture does not
imply runtime admission or authority.

The fork is not the permanent semantic home for EnterpriseClaw. It carries:

- pending portable OpenClaw changes while they are reviewed upstream;
- bounded B1 contract and fixture incubation;
- B2 Scout adopters and plugins where a fork integration point is required;
- B3 compatibility, migration, release, and canary patches; and
- temporary implementation selectors and adapters with exact deletion gates.

Portable owner semantics belong in vanilla OpenClaw. Tenant policy, fleet
coordination, retention, budgets, hosted administration, and managed rollout
belong in Lobster. Source-specific integration belongs in plugins or adapters.
Independent Rust projects may replace complete owner components only through
conformance, release, migration, canary, rollback, and TypeScript deletion.

## Verified Repository State

As of 2026-08-02:

- fork: `https://github.com/giodl73-repo/openclaw`;
- parent: `https://github.com/openclaw/openclaw`;
- default branch: `main`;
- pinned upstream `main`: `b7f9cd0a01671f7be5fc34b4bd4bf6770603f480`;
- current fork `main`: `b7f9cd0a01671f7be5fc34b4bd4bf6770603f480`;
- protected `lobster/integration`:
  `b7f9cd0a01671f7be5fc34b4bd4bf6770603f480`;
- `giodl73-repo` has administrative and push permission;
- `giodl_microsoft` has read-only permission;
- no carried source or EnterpriseClaw behavior is active yet; and
- the Microsoft open-source repository portal requires Entra sign-in and is
  not a prerequisite for beginning fork evidence work.

## Falsifiable Thesis

```text
vanilla OpenClaw
+ traceable portable candidate patches
+ bounded EnterpriseClaw evidence and temporary adapters
-> an integration fork that continuously shrinks as upstream work ships
```

Disprove or revise this plan if:

- the integration branch cannot remain regularly rebased on vanilla;
- portable candidate branches require enterprise-only dependencies;
- patch deletion cannot be verified mechanically;
- local OpenClaw operation becomes dependent on Lobster;
- combined fork overhead exceeds the manual work it replaces; or
- a permanent duplicate owner is required to keep the fork functioning.

## Durable Homes

| Work type | Incubation location | Durable home |
| --- | --- | --- |
| Portable owner contracts, fixtures, and structured results | Candidate branch in the fork | Vanilla OpenClaw |
| Unproven portable behavior | B1 fork branch | Vanilla OpenClaw or deletion |
| Existing pending OpenClaw PR | Exact carried patch | Vanilla OpenClaw release or deletion |
| Scout-specific adopter or plugin | B2 fork/Lobster integration branch | Lobster or plugin |
| Compatibility, migration, release, or canary code | B3 fork branch | Deletion after supported window |
| Tenant policy, rollout, retention, budgets, and fleet coordination | Lobster branch | Lobster |
| Hosted Control UI and managed administration | Lobster over OpenClaw APIs | Lobster |
| Source/provider/channel-specific behavior | Plugin or adapter branch | Plugin or adapter owner |
| Rust owner replacement | Independent Rust repository plus fork adapter | Independent Rust project |

## Branch and Merge Model

```text
openclaw/openclaw main
        |
        v
giodl73-repo/openclaw main
        |
        +-> lobster/evidence-<area>-<slice>
        |
        +-> candidate/<area>-<slice>     only after portable residual proof
        |
        +-> lobster/<area>-<slice>
        |
        v
ordered queue manifest
        |
        v
reconstructed lobster/integration
        |
        v
lobster/rc/<openclaw-version>-<sequence>
        |
        v
signed protected lobster-<openclaw-version>-<sequence> tag
```

Rules:

1. Fork `main` remains an exact upstream mirror.
2. `lobster/evidence-*` starts from an exact upstream commit and tests a hypothesis
   without presuming that an upstream change is required.
3. `candidate/*` is created only after evidence proves a portable residual. It
   starts from an exact upstream commit and contains only a
   portable, independently upstreamable change.
4. `lobster/*` contains fork evidence or temporary OpenClaw-side migration
   work that is not suitable for upstream as-is.
5. OpenClaw, Lobster, plugin, and Rust branches remain in their owning
   repositories. Cross-repository composition references immutable commits and
   artifacts; no Lobster implementation is carried as an OpenClaw branch.
6. `lobster/integration` is derived rather than hand-maintained. It is rebuilt from
   a pinned upstream commit and an ordered queue manifest using
   `cherry-pick -x`.
7. The queue records source SHA, stable patch ID, applied SHA, dependencies,
   application order, and resulting tree SHA.
8. Upstream PRs are never opened from `lobster/integration`.
9. Existing upstream PR branches do not acquire EnterpriseClaw-only
   dependencies.
10. `lobster/rc/*` is mutable while a release candidate is validated. A release is
    finalized only by a unique signed protected tag, immutable component and
    evidence manifests, and verified artifact digests. Failed release
    identifiers are never reused.
11. When upstream ships a replacement, remove the queue entry, reconstruct
    integration on the released commit, rerun the original fixture and residue
    sweep, and delete the carried patch.

`BOOT-001` establishes `lobster/integration`. Later evidence PRs target it for
review, but approval is applied by the queue workflow: freeze the source head,
record the patch, reconstruct integration, verify the tree, and close the PR as
queued rather than using a normal merge.

## Patch and Deletion Ledger

Every non-upstream commit carried by `ec/integration` records:

- identifier and title;
- B1, B2, or B3 classification;
- semantic owner;
- exact upstream base SHA;
- exact patch or PR head SHA;
- stable patch ID, applied SHA, dependency order, and resulting tree SHA;
- upstream issue, PR, or intended destination;
- why it cannot yet use vanilla behavior;
- fixture and expected accepted/failure outcomes;
- supported release and mixed-version window;
- replacement and minimum release;
- rollback behavior;
- exact files, functions, tests, flags, or adapters to delete;
- exact fixtures, compatibility tests, and documentation to retain;
- zero-old-path evidence; and
- expiry, archive, or removal result.

A merged upstream PR is not enough to delete a patch. The replacement must
appear in a supported vanilla release and pass the carried fixture using the
released bytes.

Every deletion also requires:

- repository-wide searches for stale selectors, aliases, catalogs, docs,
  workflows, configuration, tests, and adapters;
- proof that the old path cannot be selected;
- current-head CI after removal; and
- reconstruction of `ec/integration` without the retired queue entry.

## Evidence and Release Integrity

Git branches are indexes, not immutable evidence stores.

Every finalized integration or release result binds:

- signed tag, commit SHA, tree SHA, and ordered queue-manifest digest;
- source repository and upstream base;
- builder identity, workflow digest, runner image, toolchain, lockfiles, and
  dependency snapshot;
- fixture registry and fixture-result digests;
- component artifacts, immutable digests, SBOM references, and provenance;
- signing authority, key generation, expiry, rotation, revocation, and trusted
  timestamp;
- verification result and independent verifier identity;
- supersession relationship for corrected evidence; and
- retention, legal hold, access audit, restore verification, and export state.

Signed evidence manifests and artifacts are published to append-only,
retention-controlled storage. The personal fork may produce development
evidence, but it cannot claim compliance or production attestation without an
independent builder/verifier and retained evidence.

## Phase 0 - Fork Bootstrap

### Work

- create `ec/integration`;
- create `ec/wave-0-contracts`;
- publish XPK-001 through XPK-009 as executable fixture and ledger conventions;
- reserve XPK-010 for the first authority canary;
- publish a Phase 0 execution manifest naming each XPK output, owning path,
  dependencies, validation command, accepted artifact, and structured failure;
- establish an exact vanilla-equivalent build and test baseline;
- pin runtime/toolchain versions, lockfiles, commands, platforms, test
  inventory, known failures, and baseline result digests;
- publish the ordered patch-queue manifest and reconstruction command;
- inventory existing OpenClaw PRs and patches by B1/B2/B3 class; and
- establish artifact, release, and startup trust ordering;
- define the append-only evidence custody, legal-hold, access-audit, restore,
  supersession, and independent-verification owners and interfaces; the
  bootstrap emits only an unsigned development result manifest;
- define policy anti-rollback, monotonic generation, freshness expiry, key
  rotation/revocation, deletion detection, and attestation invalidation; and
- define measurable fork budgets for patch count, patch LOC, patch age,
  rebase/conflict time, CI delta, startup, memory, and runtime latency.

### Merge gate

- fork builds and tests match the pinned vanilla commit;
- no production behavior changes are introduced;
- every carried patch has an owner, fixture, destination, and deletion target;
- candidate and enterprise-only branch paths are mechanically distinguishable;
- integration is reproducible from the ordered manifest with the recorded tree
  SHA;
- vanilla and reconstructed integration run the same pinned CI commands;
- evidence manifests verify independently and cannot be silently rewritten;
- no compliance or production-support claim is made from a mutable branch; and
- protected operations and managed writes reference XPK-003 and XPK-004.

## Phase 1 - Read-Only and Decisive Evidence

Begin with one evidence branch. Open the remaining branches only after the
first slice proves the branch, fixture, integration-reconstruction, operator,
and deletion workflow.

Before EVID-001:

- apply #90708 only if the exact vanilla baseline requires it;
- admit #107026 as evidence-only;
- admit only the minimum passing prefix of the
  #104018 -> #113421 -> #113422 -> #114636 readiness stack.

EVID-001 therefore evaluates vanilla plus the explicitly carried owner stack,
not an assumption that those upstream PRs will land.

| Branch | Primary package work | Evidence |
| --- | --- | --- |
| `ec/evidence-exa-owner-projection` | EXA-004 through EXA-011 | Configuration, readiness, and release preserve native state, freshness, mixed versions, and omissions |
| `ec/evidence-ear-extension-fixtures` | EAR-004 through EAR-010 | Plugin, Claw/skill, and one unlike family preserve identity and reject unknown required semantics |
| `ec/evidence-aro-mpu-attribution` | ARO run/attempt to MPU candidate/call/usage | A fallback run retains causal candidate, call, retry, usage, and cost relationships |
| `ec/evidence-dgr-restart-safe-lease` | DGR bounded lease evidence | Exhaustion, restart, stale-holder fencing, renewal/expiry, and settlement |
| `ec/evidence-iae-protected-effect` | IAE authorization/effect evidence | Exact authority through dispatch, handler failure, timeout, and unknown settlement |

Every evidence branch registers:

- canonical XPK-007 fixture identifiers and schema versions;
- the current TypeScript owner oracle;
- one accepted case and at least one structured failure;
- exact validation commands and result artifacts;
- one operator-visible command or surface with actionable output;
- runtime and resource deltas from vanilla;
- ecosystem compatibility expectations; and
- the workaround, patch, or hypothesis deleted when the slice concludes.

### Decision gate for each slice

- **reuse** if vanilla already expresses the relationship;
- **adopt** if an existing issue or PR is the correct owner;
- **extend existing** if one bounded portable field or result is missing;
- **downstream-only** if the requirement is enterprise policy or composition;
  or
- **delete** if the fixture disproves the proposed abstraction.

An `extend existing` decision creates a fresh `candidate/*` branch from the
recorded upstream base. Evidence-only commits are not carried into the
candidate branch.

## Phase 2 - Portable Owner Extensions

Implement only the residual gaps proven by Phase 1 and package evidence:

- generation-bound configuration activation and readiness;
- stable run and delegated-child attempts;
- provider candidate and usage relationships;
- authority, effect, conversation, and delivery settlement;
- checkpoint, copy, and lifecycle relationships;
- resource admission and durable lease results;
- immutable artifact and per-unit release results; and
- owner projection and Doctor repair identities.

Every patch must:

- preserve the current owner state machine;
- include one accepted result and one structured failure;
- avoid Lobster or Scout dependencies;
- remain independently reviewable upstream;
- include compatibility behavior for older producers/consumers; and
- name the fork code deleted when the replacement ships.

Every extension-facing change must also prove:

- unchanged ordinary skill-folder and plugin loading where metadata is absent;
- safe handling of legacy optional metadata;
- fail-closed handling of unknown required metadata;
- load, publish, install, upgrade, and removal behavior; and
- operation without Claws, Lobster, or EnterpriseClaw services.

Before an upstream PR is opened, refresh live duplicate and owner decisions,
record the exact candidate head, run current-head CI, confirm that no enterprise
or hidden stack dependency exists, and remove temporary evidence artifacts.

## Phase 3 - Continuity and Fleet

Build:

- mixed-owner checkpoint and restore with generation compatibility;
- KCC export and memory authorization paths;
- immutable DGR lifecycle plans with final hold/authority recheck;
- lost lifecycle-child acknowledgement reconciliation;
- immutable OAF fleet targets and durable child journals;
- failed-child targeted repair that cannot widen to healthy units;
- operational and assurance settlement as independent results; and
- emergency containment with explicit unknown reachability.

### Merge gate

- restart and lost-response recovery reconcile by stable identity;
- retained, deferred, external, unsupported, and unknown are not flattened;
- healthy units receive no repair mutation;
- code rollback is not reported as state recovery without exact readiness; and
- Lobster does not copy canonical owner state into a second database;
- fleet denominators bind an immutable membership generation;
- convergence deadlines, drift freshness SLOs, exception policy, and
  event-driven invalidation are explicit; and
- partitioned and unreachable containment cases preserve unknown settlement.

## Phase 4 - Managed Adoption

Implement primarily in Lobster and bounded plugins:

- one managed Cowork/configuration mutation through XPK-004;
- one unlike connector with idempotency and loop prevention;
- policy, approval, retention, Budget, and capacity composition;
- hosted Control UI with generic host policy and server enforcement;
- audience profiles, progressive disclosure, localization, and accessibility;
- fleet rollout, quarantine, repair, and assurance retention; and
- release-ring and support-policy adoption.

Managed ownership remains split:

| Concern | Owner |
| --- | --- |
| Desired tenant policy and rollout | Lobster |
| Runtime admission and approval decision | OpenClaw or Rust semantic owner |
| Connector delivery, retry, and loop state | Connector owner |
| Host/sidecar process lifecycle | Hosting/container owner |
| Owner mutation and validation result | OpenClaw or Rust semantic owner |
| Human projection and workflow | EXA surface |

XPK-004 managed replay semantics are normative:

- globally unique operation identity within the owner namespace;
- normalized intent digest;
- source and expected owner generations;
- origin and causal loop tokens;
- deduplication retention window;
- replay of the original settled result;
- explicit conflict when an operation ID is reused for a different intent;
- unknown-outcome lookup before replay; and
- retry classification that distinguishes transport loss from owner refusal.

The first managed slice uses one low-risk owner-owned configuration field:

```text
rehydrate signed bundle
-> verify every artifact before parse
-> atomically load policy
-> start loopback sidecar
-> prove host and sidecar health
-> expose combined readiness
-> preview one mutation
-> authorize exact normalized intent
-> apply through the owner
-> drop the response and restart the sidecar
-> reconcile the original result without a second mutation
```

The process lifecycle fixture covers startup ordering, port binding, readiness,
sidecar crash, reconnect, pending events/writes, idle teardown, restart,
memory, and cold-start budgets. Tampered, revoked, expired, or unverifiable
managed artifacts block readiness.

The UX fixture uses a scope-neutral `scopeRef`, typed events, summary/detail
levels, pre-commit preview, field-level failures, expandable provenance,
keyboard and screen-reader behavior, and an explicit escalation owner.

### Merge gate

- local OpenClaw remains complete without Lobster;
- Lobster stores desired policy and coordination state, not owner truth;
- every managed write invokes the canonical owner validation/mutation path;
- hidden or disabled controls are enforced server-side;
- errors provide a safe next action and exact escalation owner; and
- managed projections preserve stale, partial, incompatible, and unknown;
- a dropped response or sidecar restart cannot duplicate a mutation;
- duplicate or echoed connector notifications cannot create a sync loop; and
- R5 protected effects remain non-bypassable.

Before protected-effect or fleet authority work proceeds, fixtures must prove:

- break-glass dual authorization, exact scope, TTL, nonce/replay protection,
  automatic expiry, alerting, post-event review, and reconciliation;
- cached-policy anti-rollback and revocation;
- evidence sink behavior for required and post-effect receipts; and
- `operationalStatus` and `assuranceStatus` remain independently reported.

## Phase 5 - Periodic Release Trains

Cut mutable release-candidate branches such as:

```text
ec/rc/2026.8.0-1
ec/rc/2026.8.0-2
```

Each release train proves:

- clean installation from actual published bytes;
- exact component and patch tuple;
- upgrade from a supported vanilla release;
- protocol, database, state, and plugin compatibility;
- target-owned migration and candidate-generation readiness;
- plugin convergence and restart debt;
- previous-version code and compatible-state recovery;
- explicit `recovery_blocked` and quarantine behavior;
- partial publication and upgrade-survivor behavior; and
- three-unit rollout with targeted repair and assurance projection.

Published-byte proof:

1. resolve the exact immutable registry or release version;
2. download without a source checkout, workspace link, or local file
   dependency;
3. verify digest, signature, authority, expiry, revocation, provenance, and
   SBOM;
4. install in an empty environment;
5. start the exact component tuple;
6. run fixtures and smoke checks;
7. dogfood one sibling consumer against the published packages; and
8. record artifact URL, integrity, run identity, component tuple, and evidence
   manifest digest.

After all gates pass, finalize a unique signed protected
`ec-<openclaw-version>-<sequence>` tag. The RC branch is only an index and may
be deleted after retained evidence and artifacts verify.

## Phase 6 - First Rust Owner Replacement

Use RFN as the first replacement:

```text
RFN-020 committed Rust baseline
-> RFN-021 shared fixture parity
-> RFN-022 trusted clean-install artifact
-> RFN-023 disposable Gateway connection
-> RFN-024 one exact bounded command
-> RFN-026/RFN-027 Rust state and fenced import
-> RFN-029 one authoritative admission-time selector
-> RFN-030 effect-free shadow
-> RFN-030A pre-cutover release, migration, and rollback proof
-> RFN-031 authoritative canary
-> RFN-035 promoted supported profile
-> RFN-036 TypeScript and adapter deletion
```

No broader Rust supervisor, updater, observation collector, repair coordinator,
or worker begins until the first profile proves that a complete TypeScript
owner can be deleted.

## Phase 7 - Upstream Promotion and Fork Reduction

For every portable fork patch:

```text
fixture proves a portable residual
-> focused upstream issue or PR after explicit authorization
-> maintainer review
-> merge or accepted replacement
-> inclusion in a supported vanilla release
-> released-byte conformance
-> carried patch and compatibility adapter deletion
```

Valid outcomes:

- merge upstream and delete the fork patch;
- adopt an upstream alternative and delete the fork patch;
- move enterprise-specific behavior to Lobster or a plugin;
- narrow the proposal and repeat the fixture; or
- delete the work when evidence disproves it.

## Periodic Operating Cadence

| Cadence | Activity | Output |
| --- | --- | --- |
| On upstream or queue change | Reconstruct integration from the pinned base and ordered manifest; run identical vanilla/integration CI | New queue, tree, baseline, and result digests |
| Weekly | Refresh PR heads and live states, inspect conflicts, policy/key/revocation freshness, evidence health, and budget drift | Updated base, patch, trust, and health ledger |
| Every two weeks | Freeze passing slice heads, add approved entries to the queue, reconstruct integration, and publish a signed integration evidence manifest | Integration snapshot and mismatch list |
| Monthly | Review upstream candidates, downstream moves, stale patches, security posture, retained evidence, and deletions | Promotion/deletion decision batch |
| Every vanilla release | Cut an `ec/rc/*` branch and run install, upgrade, recovery, fleet, and patch-retirement proof before signing a unique release tag | Supported component tuple and retained release evidence |
| After each phase | Run `.craft/roles` review and explicit go/no-go | Corrected plan and phase decision |
| Before every authority canary | Run XPK-010 | Signed pre-canary evidence and exact rollback/deletion scope |

## Initial Milestone

The first milestone is deliberately narrow:

1. complete PRE-001: select the writable identity, fast-forward fork `main`,
   create/protect `lobster/integration`, and record exact Windows/Linux
   baselines;
2. merge BOOT-001: the minimal queue, reconstruction, baseline, fixture-result,
   and deletion schema required by one slice;
3. capture all 55 heads as `source-only/quarantined` using the full source
   ledger;
4. admit #90708 only if baseline proof requires it, then admit #107026 and the
   minimum passing readiness-stack prefix as evidence-only;
5. review EVID-001: `lobster/evidence-exa-owner-projection` with one complete result
   and one stale/mixed-version/omitted result;
6. expose the result through an existing operator JSON surface where possible,
   with a safe next action;
7. add and remove EVID-001 from the queue to prove reconstruction and
   shrinkability; and
8. only then classify the result and create a clean portable candidate if an
   owner-specific residual remains.

Success means the fork can add visible EnterpriseClaw evidence while remaining
traceable to vanilla, reproducible from an ordered manifest, independently
verifiable, and mechanically proven capable of shrinking.
