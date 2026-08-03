# EnterpriseClaw PR Portfolio `.craft/roles` Review

Date: 2026-08-02  
Reviewed artifact: `fork-pr-plan-2026-08-02.md`

## Scope

All eighteen `.craft/roles/claws/` roles reviewed the proposed PR list:

- `founder`, `gateway-eng`, `skill-author`, `power-user`, and `new-hire`;
- `ciso`, `compliance`, `platform-eng`, and `policy-steward`;
- `aether-runtime-eng`, `aether-adapter-eng`, `lobster-container-eng`,
  `cowork-ux-eng`, `m365-connector-eng`, and `clawpilot-product`; and
- `claws-repo-steward`, `claws-release-eng`, and `lorant-reviewer`.

The review tested PR reality, owner boundaries, branch mechanics, dependency
ordering, upstream hygiene, managed replay, artifact trust, release proof,
fleet safety, UX completeness, Rust cutover, and deletion.

## Initial Verdict

**Rejected as a 49-PR executable plan.**

The original list mixed:

- concrete branch candidates;
- conditional upstream hypotheses;
- release/canary/promotion operations;
- reusable deletion templates; and
- multi-owner epics.

Its useful content was retained as a portfolio inventory, but the executable
opening and dependency graph required correction.

## Corrected Verdict

**Approved as a staged PR portfolio with one operational preflight and two
opening PRs.**

The approved opening is:

```text
PRE-001 writable current fork
-> BOOT-001 minimal reconstruction harness
-> EVID-001 current owner projection
-> queue add/remove shrinkability proof
-> reuse/adopt/extend/downstream/delete decision
```

No other PR is approved to open merely because it appears in the portfolio.

## Subsequent Owner Decision

After this review, the owner explicitly changed one planning assumption:

- all 55 currently open `giodl73-repo` PRs against `openclaw/openclaw` are to
  be carried into the fork through phased queues rather than carried only when
  required by the first fixture.

`fork-carried-upstream-prs-2026-08-02.md` records that program. This does not
invalidate the review's safety findings:

- fork `main` must still be synchronized first;
- each PR head is frozen and applied through the reproducible queue;
- drafts remain non-authoritative until their phase gates pass;
- multi-owner conflicts require an explicit selector;
- C0/C1 precede EVID-001, while C2 through C5 remain later phases; and
- new EnterpriseClaw PRs are added only for residual gaps after the carried
  stack is tested.

The all-55 carry decision is an owner-directed scope expansion, not a role
claim that all 55 changes are already mutually compatible or release-ready.

## Blocking Findings and Corrections

### 1. The fork was writable but not current

**Roles:** founder, power-user, lorant-reviewer.

The `giodl73-repo` identity has push/admin permission, but fork `main`
(`5332641...`) trails upstream `main` (`adedc323...`).

**Correction:** PRE-001 selects the writable identity, fast-forwards `main`,
protects `ec/integration`, and records exact Windows/Linux baselines before any
PR.

### 2. Fork PRs lacked a valid review and application target

**Roles:** founder, new-hire, claws-repo-steward.

Fork PRs could not merge to mirror-only `main`, while normal merges would make
derived `ec/integration` unreproducible.

**Correction:** BOOT-001 establishes integration. Later evidence PRs target it
for review, but the queue workflow freezes the head, records the patch,
reconstructs integration, verifies the tree, and closes the PR as queued.

### 3. Four bootstrap PRs were unnecessary

**Roles:** founder, gateway-eng, power-user, new-hire.

The first list separated queue, baseline, fixtures, and signed evidence before
any operator value existed.

**Correction:** BOOT-001 combines only the minimal reconstruction, exact
baseline, first fixture-result identity, and deletion schema. Signed custody
and compliance infrastructure move behind named consumers.

### 4. XPK-001 through XPK-009 could not all become executable in one PR

**Roles:** gateway-eng, aether-runtime-eng, lorant-reviewer.

Managed mutation, cutover, artifact trust, and release require real consumers
and cannot be declared accepted during bootstrap.

**Correction:** BOOT-001 supplies only the common mechanics needed by EVID-001.
Later control PRs separately prove artifact trust, policy, evidence custody,
mutation, and host lifecycle.

### 5. Evidence custody was not a concrete dependency

**Roles:** ciso, compliance, policy-steward.

Retention hooks did not provide append-only custody, legal hold, restore,
export, supersession, or independent verification.

**Correction:** ASSURE-001 is a concrete Lobster assurance-owner PR and gates
protected effects, fleet assurance, break-glass, and attestation. Bootstrap
results remain unsigned development evidence.

### 6. Artifact trust and policy enforcement arrived too late

**Roles:** ciso, aether-adapter-eng, lobster-container-eng.

Managed writes, connectors, Rust commands, and release work could begin before
verified bytes and anti-rollback policy.

**Correction:** TRUST-001 and POLICY-001 precede MUT-001, HOST-001, EVID-007,
release, and executable Rust authority.

### 7. Managed mutation lacked an owner-side PR

**Roles:** aether-runtime-eng, m365-connector-eng.

The original plan made Lobster responsible for mutation replay and settlement.

**Correction:** MUT-001 proves canonical preview, authority, expected
generation, operation identity, intent digest, conflict, settled-result lookup,
and sanitized errors at the OpenClaw owner boundary.

### 8. Managed startup lifecycle was missing

**Roles:** aether-adapter-eng, lobster-container-eng.

No PR owned verify-before-parse, policy load, sidecar start, combined readiness,
crash/reconnect, pending writes, idle teardown, or budgets.

**Correction:** HOST-001 owns that bounded hosting lifecycle and gates Cowork,
connector, and hosted UI slices.

### 9. Cowork and connector work were incorrectly coupled

**Roles:** cowork-ux-eng, m365-connector-eng, clawpilot-product.

A connector should not depend on Cowork, and the first Cowork field should not
depend on full hosted UI rollout.

**Correction:** UX-001 and CONN-001 are sibling adopters of MUT-001/HOST-001.
HOSTED-001 is an independent later projection.

### 10. EAR and OAF release ownership was reversed

**Roles:** platform-eng, aether-runtime-eng, claws-release-eng.

The original unit-facts PR produced release references before EAR.

**Correction:** EAR-001 is the sole local activation/recovery producer.
OAF-001 consumes EAR-001 and publishes lifecycle/readiness/checkpoint/evidence
references without defining another release result.

### 11. Release proof lacked an artifact producer

**Roles:** claws-release-eng, lorant-reviewer.

Clean-install proof cannot precede immutable candidate publication.

**Correction:** REL-001 publishes one immutable candidate digest; REL-002
installs and verifies that exact digest. Promotion and signed tagging are
operations that reuse the same bytes without rebuilding.

### 12. Local release was coupled to Lobster

**Roles:** platform-eng, policy-steward, claws-release-eng.

The original signed release required fleet PRs, violating complete local
operation.

**Correction:** local EAR/REL proof is independent. RING-001 separately
qualifies those exact bytes for managed fleet support.

### 13. Containment and break-glass were one unsafe PR

**Roles:** ciso, compliance, policy-steward.

Containment requests and exceptional bypass authority have different owners and
evidence.

**Correction:** FLEET-003 coordinates containment owner results. FLEET-004 is a
separately authorized, TTL-bound, independently approved and reviewed
break-glass workflow.

### 14. Retention and Budget/capacity were one multi-owner epic

**Roles:** compliance, policy-steward, platform-eng.

Lifecycle obligations and resource allocation consume different owner facts.

**Correction:** RET-001 and BUDGET-001 are separate PRs with KCC/DGR/MPU-aligned
dependencies.

### 15. Upstream rows were placeholders, not PRs

**Roles:** founder, claws-repo-steward, lorant-reviewer.

Several rows had no exact evidence branch, owner seam, base, or current-head
proof.

**Correction:** all upstream possibilities are now `H-UP-*` hypotheses. They
become clean `candidate/*` branches only after decisive evidence and live
duplicate/owner review.

### 16. Rust authority arrived before pre-cutover proof

**Roles:** ciso, platform-eng, claws-release-eng.

The original Rust artifact and selector preceded current-owner release/recovery
and exact deletion inventory.

**Correction:** RUST-002 records the exact profile and deletion target after
REL-002. RUST-006 is dormant selector plumbing. RUST-007 enables authority only
after the signed XPK-010 gate.

### 17. Generic deletion templates were not reviewable PRs

**Roles:** claws-repo-steward, lorant-reviewer.

A deletion PR must name an exact patch, replacement, version, window, and
residue result.

**Correction:** deletion PRs are created only when those facts exist. DEL-001
is retained because it names the first Rust-replaced TypeScript profile.

## Approved Immediate Scope

Only these actions are immediate:

1. PRE-001: sync and protect the writable fork.
2. BOOT-001: add the minimal deterministic reconstruction harness.
3. EVID-001: prove read-only projection over current native config, readiness,
   and updater/release facts.
4. Add and remove EVID-001 from the queue.
5. Classify the outcome.

Everything else remains gated portfolio work.
