# EnterpriseClaw All-55 Carried PR `.craft/roles` Review

Date: 2026-08-02  
Reviewed artifacts:

- `fork-carried-upstream-prs-2026-08-02.md`;
- `fork-carried-upstream-pr-ledger-2026-08-02.md`;
- `fork-execution-plan-2026-08-02.md`; and
- `fork-pr-plan-2026-08-02.md`.

## Scope

All eighteen roles reviewed the owner decision to assume none of the 55
currently open owned OpenClaw PRs will merge and to integrate them through the
fork:

- upstream/runtime/ecosystem: `founder`, `gateway-eng`, `skill-author`,
  `power-user`, `new-hire`;
- security/governance/fleet: `ciso`, `compliance`, `platform-eng`,
  `policy-steward`;
- managed integration/product: `aether-runtime-eng`,
  `aether-adapter-eng`, `lobster-container-eng`, `cowork-ux-eng`,
  `m365-connector-eng`, `clawpilot-product`; and
- repository/release/review: `claws-repo-steward`, `claws-release-eng`,
  `lorant-reviewer`.

## Initial Verdict

**No-go for treating all 55 as an active fork baseline.**

The inventory was complete, but source application, runtime activation, and
release promotion were conflated. Draft status, compilation, or queue presence
cannot grant authority.

## Corrected Verdict

**Approved to capture all 55 as quarantined source generations.**

The corrected meaning of "integrate all" is:

```text
capture
-> reconstruct
-> test
-> disposition
-> selectively admit
```

It does not mean that all 55 changes run together or become release-eligible.

## Blocking Findings and Corrections

### 1. Full provenance was not recorded

**Roles:** ciso, compliance, claws-repo-steward, lorant-reviewer.

The phase document showed abbreviated SHAs and often omitted branches, bases,
merge bases, and commit ranges.

**Correction:** `fork-carried-upstream-pr-ledger-2026-08-02.md` records all 55
full 40-character heads and branches. PRE/BOOT must add current base, merge
base, ordered range, per-commit patch IDs, diff digest, CI/review state, tests,
runtime effect, selectors, and deletion facts before admission.

### 2. "Ready" was an invalid status

**Roles:** lorant-reviewer, new-hire.

Non-draft does not mean approved, green, mergeable, current, safe, or
release-ready.

**Correction:** the plan uses `Non-draft` only for GitHub state. Every source
still begins `source-only/quarantined`.

### 3. Carrying all was confused with enabling all

**Roles:** all.

Several changes affect configuration authority, restore admission, feeds,
hosted policy, external effects, lifecycle, or Rust execution.

**Correction:** every entry has one disposition:
`source-only`, `build-only`, `evidence-only`, `release-eligible`, `active`,
`superseded`, or `rejected-not-applied`.

### 4. C0 contained non-baseline behavior

**Roles:** gateway-eng, power-user, ciso.

#83991, #87471, #87774, and #90062 change provider, replay, delivery, and
session behavior.

**Correction:** only #90708 is a conditional baseline repair. The other four
move to owner-specific compatibility lanes.

### 5. EVID-001 was over-gated by nineteen PRs

**Roles:** founder, gateway-eng, new-hire.

The projection slice needs configuration and readiness, not command, recovery,
memory, cancellation, provider, delivery, or session changes.

**Correction:** EVID-001 consumes #107026 plus the minimum passing prefix of
#104018 -> #113421 -> #113422 -> #114636. #90708 is admitted only if baseline
proof requires it.

### 6. Application and authority orders were conflated

**Roles:** ciso, aether-runtime-eng, aether-adapter-eng.

Code may be available for reconstruction while remaining unsafe to activate.

**Correction:** source/build admission and runtime authority use separate DAGs.
Drafts remain source-only/build-only. Trusted feeds, hosted enforcement, Claws
activation, restore admission, and Rust authority remain gated.

### 7. Controls were ordered too late

**Roles:** ciso, compliance, policy-steward, claws-release-eng.

Artifact trust, policy anti-rollback, evidence custody, and owner-side mutation
must precede protected or managed authority.

**Correction:** TRUST-001, POLICY-001, ASSURE-001, MUT-001, and split
adapter/runtime/container lifecycle proofs precede C2 authority and trusted
C3/C4 activation.

### 8. Hosted lifecycle combined three owners

**Roles:** aether-adapter-eng, aether-runtime-eng, lobster-container-eng.

Acquisition/verification, runtime policy decisions, and sidecar lifecycle are
distinct.

**Correction:** the plan separates:

- Aether adapter acquire/verify/load;
- Aether runtime allow/deny/review/modify; and
- Lobster container start/readiness/reconnect/teardown.

### 9. Several assumed stack ancestries were wrong

**Roles:** claws-repo-steward, lorant-reviewer, cowork-ux-eng.

The review found:

- #84472 is not the ancestor of #99255;
- prior publisher-feed title order is not valid ancestry;
- #111541 is not the current localization-stack root;
- localization ancestry is
  #111543 -> #112784 -> #112801 -> surface branches;
- C4 ancestry begins from #115962 for #112808/#112828, #115371, and #117037;
- #115237 is divergent and overlapping; and
- #116050 -> #116450 -> #116863 is valid.

**Correction:** the phase plan records these facts and requires exact range
derivation rather than cumulative-head cherry-picks.

### 10. C3 mixed discovery, trust, activation, and presentation

**Roles:** skill-author, aether-adapter-eng, founder.

Feeds, artifact trust, Claws lifecycle, and EXA presentation have different
owners.

**Correction:** localization, feed/catalog distribution, and host/tool
contributions are separate tranches. Discovery can remain inert; trusted
consume/apply waits for TRUST/REL.

### 11. C4 requires explicit semantic selection

**Roles:** cowork-ux-eng, clawpilot-product, lorant-reviewer.

Two Control UI paths and divergent bootstrap/profile paths cannot all become
authoritative.

**Correction:** select between #112808/#112828, reconcile #115237 versus
#115962, preserve export as inert, and name duplicate code/tests to delete.

### 12. Rust risked becoming a duplicate implementation track

**Roles:** founder, gateway-eng, platform-eng.

The carried Rust stack overlapped the existing RFN/RUST plan.

**Correction:** #116050 -> #116450 -> #116863 maps directly to that plan and
remains dormant until current-owner release/recovery, deletion inventory,
trusted artifacts, migration, XPK-010, canary, and rollback pass.

### 13. The queue needed a mechanized admission algorithm

**Roles:** claws-repo-steward, claws-release-eng, lorant-reviewer.

Applying a cumulative PR head can lose commits or duplicate ancestors.

**Correction:** admission now derives exact commit ranges, computes per-commit
patch IDs, reconstructs on Windows/Linux, stops on conflict, binds B3 patches
to the exact prefix tree, rechecks heads, and admits atomically.

### 14. Maintenance and runtime budgets were missing

**Roles:** gateway-eng, power-user, lobster-container-eng.

**Required gates:**

- opening tranche no larger than five admitted heads;
- later tranche no larger than eight without subdivision;
- large changes receive a separate tranche;
- fork rebase/conflict work remains bounded;
- disabled code adds zero startup/tool-call overhead;
- enabled hot paths have explicit latency/failure budgets; and
- drafts never become authoritative without rollback proof.

## Approved Opening

```text
PRE-001 refresh and pin current upstream
-> BOOT-001 reconstruction and admission ledger
-> XPK-001..XPK-009 executable controls
-> optional #90708 only if baseline requires it
-> #107026
-> minimum readiness-stack prefix
-> EVID-001
-> stop and classify
```

All other heads remain captured but quarantined.
