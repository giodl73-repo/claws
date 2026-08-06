# EnterpriseClaw Fork Execution Plan `.craft/roles` Review

Date: 2026-08-02  
Reviewed artifact: `fork-execution-plan-2026-08-02.md`

## Scope

All eighteen roles under `.craft/roles/claws/` reviewed the fork plan in four
non-overlapping tension clusters:

- upstream, runtime, ecosystem, and approachability: `founder`, `gateway-eng`,
  `skill-author`, `power-user`, and `new-hire`;
- security, evidence, policy, and fleet: `ciso`, `compliance`, `platform-eng`,
  and `policy-steward`;
- managed integration and product surfaces: `aether-runtime-eng`,
  `aether-adapter-eng`, `lobster-container-eng`, `cowork-ux-eng`,
  `m365-connector-eng`, and `clawpilot-product`; and
- repository, release, and review integrity: `claws-repo-steward`,
  `claws-release-eng`, and `lorant-reviewer`.

The review tested whether the fork can remain traceable to vanilla, produce
trustworthy evidence, support clean upstream PRs, preserve owner boundaries,
operate safely through managed integrations, and mechanically shrink.

## Verdict

**Approved after correction to begin Phase 0 and one read-only Phase 1 evidence
slice.**

The plan is not yet approval to:

- open new upstream issues or PRs;
- claim production or compliance attestation;
- enable managed protected effects;
- run an authoritative Rust canary; or
- begin broad fleet rollout.

Those actions remain behind their package fixtures, released-byte proof, and
explicit authorization.

## Strong Findings

- The fork is explicitly an incubation and integration surface rather than a
  permanent semantic owner.
- Portable candidates, enterprise adoption, release compatibility, and Rust
  replacements have distinct durable homes.
- Candidate changes begin from exact vanilla commits and do not depend on
  Lobster or EnterpriseClaw services.
- Actual published-byte validation, migration, rollback, and exact deletion
  are stronger than source-only release claims.
- Managed writes traverse owner validation rather than writing canonical state
  through connectors or hosted UI.
- Operational and assurance status remain separate.
- The first code-bearing work is read-only evidence rather than a large
  production framework.

## Blocking Findings and Applied Corrections

### 1. Phase 1 prematurely called hypotheses upstream candidates

**Roles:** founder, gateway-eng, new-hire.

Evidence may show that vanilla already suffices or that the requirement belongs
downstream. Naming every branch `candidate/*` prejudged the outcome.

**Correction:** Phase 1 now uses `ec/evidence-*`. A clean `candidate/*` branch
is created only after a fixture proves a portable residual.

### 2. Phase 0 incorrectly included the pre-canary gate

**Roles:** gateway-eng, new-hire, lorant-reviewer.

XPK-010 depends on actual release and migration evidence and cannot be completed
as an initial bootstrap artifact.

**Correction:** Phase 0 implements XPK-001 through XPK-009. XPK-010 remains the
mandatory gate before the first authority canary.

### 3. The integration branch was not reproducible

**Roles:** claws-repo-steward, claws-release-eng, lorant-reviewer.

Periodically merging rebased branches would create an opaque patch stack and
unreliable source-to-applied commit mapping.

**Correction:** `ec/integration` is reconstructed from a pinned upstream commit
and ordered queue manifest using `cherry-pick -x`. The queue records source SHA,
patch ID, applied SHA, dependencies, order, and resulting tree SHA.

### 4. Release branches were incorrectly treated as immutable evidence

**Roles:** ciso, compliance, claws-release-eng, lorant-reviewer.

A branch is a mutable ref, especially when the same account has administrative
permission.

**Correction:** mutable `ec/rc/*` branches are finalized through unique signed
protected tags, immutable component/evidence manifests, artifact digests,
trusted timestamps, and independently verified append-only evidence storage.

### 5. Evidence provenance and retention were too late and incomplete

**Roles:** ciso, compliance, policy-steward.

Early evidence could not later become trustworthy merely by adding a retention
service in Phase 4.

**Correction:** Phase 0 now defines builder, workflow, runner, toolchain,
lockfile, fixture, SBOM, signer, key lifecycle, timestamp, supersession,
retention, legal-hold, access-audit, restore, and independent-verification
requirements. Personal-fork output cannot claim compliance by itself.

### 6. The first milestone imported too many pending PRs

**Roles:** founder, gateway-eng, power-user.

Carrying every active PR would create rebase cost before the first fixture
proved that any patch was needed.

**Correction:** inventory all active PRs, but carry only patches required by
the first evidence slice.

### 7. Phase 0 and Phase 1 lacked executable manifests

**Roles:** new-hire, skill-author, gateway-eng.

The plan named contracts and ranges without paths, commands, owner oracles, or
result artifacts.

**Correction:** Phase 0 now requires an execution manifest. Every Phase 1 slice
registers XPK-007 fixture IDs, schema versions, owner oracle, exact commands,
accepted/failure artifacts, operator surface, runtime budget, compatibility,
and deletion outcome.

### 8. Runtime and fork-maintenance budgets were missing

**Roles:** gateway-eng, power-user, lobster-container-eng.

The plan lacked limits for patch growth, rebase cost, startup ordering, memory,
latency, crash recovery, and sidecar operation.

**Correction:** Phase 0 records patch-count/LOC/age, conflict time, CI delta,
startup, memory, and latency budgets. The managed slice now proves an explicit
artifact-to-policy-to-sidecar-to-readiness lifecycle.

### 9. Managed replay and connector loop behavior was underspecified

**Roles:** m365-connector-eng, aether-runtime-eng, policy-steward.

Operation identity alone did not define deduplication, intent conflicts,
unknown-outcome lookup, source generations, or multi-hop loop prevention.

**Correction:** XPK-004 adoption now requires an intent digest, source and
expected generations, causal loop tokens, deduplication retention, original
result replay, ID-reuse conflict, unknown lookup, and retry classification.

### 10. Managed UI requirements were aspirational

**Roles:** cowork-ux-eng, clawpilot-product, new-hire.

Progressive disclosure lacked a scope-neutral client contract, typed events,
field-level errors, and an executable workflow.

**Correction:** the first managed slice now requires `scopeRef`, summary/detail
levels, pre-commit preview, typed events, field errors, expandable provenance,
keyboard/screen-reader behavior, and an escalation owner.

### 11. Policy and break-glass safety lacked executable proof

**Roles:** ciso, policy-steward, compliance.

The architecture prohibited permissive R5 overrides but the fork phases did not
test anti-rollback, expiry, revocation, or break-glass settlement.

**Correction:** protected-effect work is blocked on cached-policy anti-rollback,
key/revocation behavior, dual-authorized scoped break-glass, TTL, replay
protection, automatic expiry, alerting, review, and reconciliation fixtures.

### 12. Fleet proof needed stronger convergence semantics

**Roles:** platform-eng, compliance.

A three-unit fixture alone does not establish membership, deadlines, drift, or
partition behavior.

**Correction:** Phase 3 now binds immutable membership generation, convergence
deadline, drift freshness SLO, exception policy, event-driven invalidation, and
partitioned/unreachable settlement.

### 13. Repository boundaries allowed implementation leakage

**Roles:** claws-repo-steward, founder.

Wording around B2 branches could imply carrying Lobster implementation inside
the OpenClaw fork.

**Correction:** OpenClaw, Lobster, plugin, and Rust branches stay in their
owning repositories. Cross-repository composition references immutable commits
and artifacts. `claws-hapi` remains the canonical planning surface.

### 14. Deletion could still leave partial conversions

**Roles:** lorant-reviewer, claws-repo-steward.

Deleting named production files alone could leave selectors, aliases, tests,
workflows, catalogs, and documentation.

**Correction:** the ledger now separates delete and retain inventories and
requires repository-wide residue checks, old-path-unselectable proof,
current-head CI, and integration reconstruction without the queue entry.

## Cheapest First Proof

Run only `ec/evidence-exa-owner-projection`:

1. pin one vanilla OpenClaw commit and exact CI baseline;
2. register the fixture in XPK-007;
3. emit one complete projection;
4. emit one stale, mixed-version, or explicitly omitted projection;
5. expose both through one operator command with a safe next action;
6. carry only patches required by this fixture;
7. reconstruct and verify `ec/integration`; and
8. add and remove one residual queue entry to prove the fork can shrink.

If vanilla passes without a patch, the correct result is `reuse` and zero
production delta.

## Go/No-Go

| Stage | Decision |
| --- | --- |
| Phase 0 contracts, manifests, baselines, and evidence controls | **Go** |
| First EXA read-only evidence slice | **Go after Phase 0 baseline** |
| Additional Phase 1 slices | **Go after the first branch/reconstruction/deletion workflow passes** |
| Upstream filing | **No-go without proven portable residual and explicit authorization** |
| Managed protected effects | **No-go until replay, policy, evidence, and break-glass fixtures pass** |
| Compliance attestation | **No-go without independent retained provenance and complete assurance** |
| Fleet authority | **No-go until convergence, partition, and targeted-repair gates pass** |
| Rust authority canary | **No-go until XPK-010 passes** |

