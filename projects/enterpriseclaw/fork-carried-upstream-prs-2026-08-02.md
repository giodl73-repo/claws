# EnterpriseClaw Carried Upstream PR Program

Status: corrected after full `.craft/roles` review; all 55 PRs are captured,
but none is assumed admitted or authoritative  
Date: 2026-08-02

## Decision

Assume none of the 55 currently open `giodl73-repo` PRs against
`openclaw/openclaw` will merge in time for EnterpriseClaw.

All 55 are retained as fork source inputs. This does **not** make all 55 active
runtime behavior:

```text
capture every source head
-> reconstruct and test its exact delta
-> quarantine by default
-> admit individually as build-only, evidence-only, release-eligible, or active
-> select one authority where semantics overlap
-> delete when replaced, disproved, or superseded
```

The canonical full-head source inventory is
`fork-carried-upstream-pr-ledger-2026-08-02.md`.

## Live State

Latest refresh during the role review:

- upstream `main`: `181da6f69c453ab6898838e3ea53cd7f98086b53`;
- fork `main`: `5332641ed3bab552d23fb16c67bc697a373ea9d7`;
- fork is materially behind and must be fast-forwarded before queue work;
- open owned PRs: **55**;
- non-draft PRs: **20**;
- draft PRs: **35**; and
- every entry begins `source-only/quarantined`.

`Non-draft` is a GitHub state, not a readiness claim. It does not imply green
CI, approval, mergeability, compatible ancestry, queue admission, or release
eligibility.

## Required Per-PR Admission Record

Before any source head enters a reconstructed queue generation, record:

- full source head, PR base, merge base, and current upstream base SHAs;
- source repository, branch, ordered commit range, and declared predecessor;
- per-commit stable patch IDs and aggregate diff digest;
- changed files, non-generated LOC, overlap set, and conflict result;
- review, CI, mergeability, and current-head freshness;
- targeted tests and full queue test result;
- production imports, startup hooks, hot paths, defaults, memory, latency, and
  failure behavior;
- risk class and protected-effect status;
- disposition: `source-only`, `build-only`, `evidence-only`,
  `release-eligible`, `active`, `superseded`, or `rejected-not-applied`;
- allowed deployment profiles and exact authority selector;
- required evidence, approvers, and independent verifier;
- delete and retain inventories; and
- expiry, released replacement, or durable downstream owner.

A changed source head or upstream base invalidates the admission generation.

## Safe Queue Admission Algorithm

1. Atomically refresh the upstream base and PR head.
2. Verify declared ancestry and derive the ordered commit range.
3. Reject ambiguous merge commits unless explicit mainline semantics exist.
4. Compute per-commit patch IDs and an aggregate diff digest.
5. Reconstruct from a clean current upstream base on Windows and Linux.
6. Stop on conflicts; bind any B3 resolution patch to the exact base and queue
   prefix tree.
7. Run targeted tests, pinned queue CI, and default-off/authority checks.
8. Re-query upstream and source heads before admission.
9. Admit atomically with one disposition; never infer authority from presence.
10. Release only exact published bytes and delete only after residue proof.

## Global Quarantine Rules

- All 35 drafts remain `source-only` or `build-only` until their individual
  gates pass.
- Development evidence is visibly non-attestable until ASSURE-001 custody and
  independent verification exist.
- Configuration, restore, feed, host, policy, effect, and Rust changes do not
  become authoritative merely because they compile in the fork.
- Every semantic overlap has one selector before runtime admission.
- Disabled code must add zero startup, tool-call, or managed-service
  dependency to ordinary OpenClaw.

## Phase C0 - Baseline Infrastructure

### C0a: Conditional baseline repair

| PR | Role |
| --- | --- |
| #90708 | Carry only if the pinned vanilla baseline cannot complete without it |

### C0b: Owner-specific compatibility fixes

These are not baseline prerequisites. Capture them now, but admit them through
their owning behavior lanes:

| PR | Owner lane |
| --- | --- |
| #83991 | Provider payload compatibility |
| #87471 | Webchat replay projection |
| #87774 | Feishu route/delivery settlement |
| #90062 | Agent/session identity resolution |

Gate:

- focused regression proof;
- no unrelated changes;
- owner-specific effect and authority review; and
- independent queue removal.

## Phase C1a - Minimal Projection Foundations

Only this tranche precedes EVID-001.

| Stack | PRs | Initial disposition |
| --- | --- | --- |
| Ordered configuration | #107026 | evidence-only until provenance/policy gates pass |
| Readiness/hosting | #104018 -> #113421 -> #113422 -> #114636 | non-authoritative observation |

EVID-001 runs against:

```text
current upstream
+ optional #90708 only if baseline proof requires it
+ #107026
+ minimum passing readiness/hosting prefix
```

The first evidence slice does not wait for commands, recovery, memory,
cancellation, provider fixes, delivery fixes, or session fixes.

## Phase C1b - Independent Owner Evidence

### Command and node observation

```text
#100960 -> #104158 -> #104159 -> #104160
```

Command inventory remains inert, coverage-aware, and non-authorizing.

### Recovery and continuity

```text
#112385 -> #112865 -> #112896
```

#112896 remains non-authoritative until checkpoint compatibility, dirty-state
refusal, assurance, exact recovery readiness, and rollback limits pass.

### Additional seams

| PR | Evidence lane |
| --- | --- |
| #115329 | KCC read-only memory observation |
| #115390 | IAE cancellation and effect-certainty settlement |

## Controls Before Authority

Before C2 authority or any trusted C3/C4 activation:

```text
XPK-001..XPK-009 executable controls
-> TRUST-001 artifact verification
-> POLICY-001 generation and anti-rollback
-> ASSURE-001 append-only custody and independent verification
-> MUT-001 owner-side mutation/replay
-> hosted adapter/runtime/container lifecycle proofs
```

The hosted lifecycle is split by owner:

- Aether adapter: acquire, verify-before-parse, and atomically load policy;
- Aether runtime: allow/deny/review/modify and external approval mapping;
- Lobster container: loopback sidecar, generation handshake, combined
  readiness, reconnect, pending requests, idle teardown, memory, and cold-start
  budgets.

## Phase C2 - Policy, Doctor, Audit, and Hosted Enforcement

All nine PRs remain individually quarantined until their relevant controls
pass:

| Lane | PRs | Ordering |
| --- | --- | --- |
| Runtime audit and attestation | #81104 | after ASSURE-001 |
| Doctor preview and lint | #84472, #98869, #99255, #99619 | no ancestry assumed between #84472 and #99255 |
| Tool-policy repair preview | #101336, #101916 | #101336 -> #101916 |
| Hosted Control UI enforcement | #115408, #116013 | #115408 -> #116013; after POLICY/HOST/MUT |

Gate:

- preview remains separate from apply;
- owner validates and authorizes before atomic mutation;
- material intent changes supersede authorization;
- hidden controls have server enforcement;
- evidence loss cannot fabricate attestation; and
- R5 remains non-bypassable.

## Phase C3a - Localization

The verified current ancestry is:

```text
#111543 -> #112784 -> #112801
                         -> #111542
                         -> #111544
                         -> #111545
                         -> #113427
```

#111541 is a separate locale-context implementation, not the current ancestor
of that stack.

For ownership, #112784 and #112801 remain catalog/distribution governance even
though their current Git ancestry is inside the localization stack.

Localization may become active independently when:

- machine identifiers remain stable;
- fallback behavior is explicit;
- missing catalogs do not block ordinary local operation; and
- surface coverage and accessibility pass.

## Phase C3b - Feed and Catalog Distribution

PRs:

- #109305;
- #109461;
- #109584;
- #110250;
- #110438;
- #113333;
- #112784; and
- #112801.

Do not infer a stack from title order. The prior assumed publisher ancestry was
not valid. PRE/BOOT must record exact commit ancestry and overlap.

Split the capability:

- discovery/follow/watch and mutable indexes may remain inert;
- trusted consume/apply/activate waits for TRUST-001 and REL published-byte
  proof; and
- feed identity never becomes artifact authority.

## Phase C3c - Host Contributions and Tool Profiles

| PR | Disposition |
| --- | --- |
| #114773 | build/evidence-only one-hop dispatcher until owner need is proven |
| #114783 | inert host-contribution discovery after XPK-008 trust ordering |
| #112473 | separate opt-in tool-profile lane |

Host discovery imports no runtime code and grants no authority.

## Phase C4 - Claws Application and Lifecycle

Verified ancestry:

```text
#115962 -> #112808 -> #112828
#115962 -> #115371
#115962 -> #117037
```

#115237 is divergent and overlaps the same bootstrap/profile area.
#116462 remains an independently reviewed scoped-removal fix until ancestry is
captured.

Required decisions before admission:

1. select one Control UI lifecycle path between #112808 and #112828;
2. reconcile or select between divergent #115237 and #115962 profile/bootstrap
   semantics;
3. preserve export as inert evidence rather than activation;
4. prove scoped removal cannot escape its owner;
5. keep ordinary local use complete without Lobster; and
6. record exact deleted duplicate code and tests.

No C4 path activates before TRUST/POLICY/MUT and local EAR/REL proof.

## Phase C5 - Existing Rust Stack

Verified ancestry:

```text
#116050 -> #116450 -> #116863
```

Map this stack directly to the existing RFN/RUST plan. Do not build a second
Rust implementation path.

The three PRs may enter early as `source-only` or `build-only`, but remain
dormant while TypeScript is authoritative.

Authority order:

```text
current TypeScript published release/recovery
-> exact Rust profile and TypeScript deletion inventory
-> trusted Rust artifact
-> state migration and mixed-version proof
-> dormant selector
-> signed XPK-010
-> bounded Rust canary
-> supported-profile decision
-> TypeScript and adapter deletion
```

## Corrected Execution Order

```text
PRE-001 refresh and pin current upstream
-> BOOT-001 reconstruction and full admission ledger
-> XPK-001..XPK-009 executable controls and quarantine selectors
-> C0a only if baseline requires #90708
-> C1a config plus minimum readiness prefix
-> EVID-001
-> C0b and C1b independent owner evidence
-> TRUST/POLICY/ASSURE and owner-side mutation/hosting controls
-> individually admitted C2
-> C3a localization where safe
-> trusted C3b/C3c and selected C4 paths
-> EAR/REL exact published-byte proof
-> OAF/fleet/ring proof
-> dormant C5 promotion through XPK-010
-> concrete carry-patch and TypeScript deletion
```

## Phase Summary

| Source group | Count | Default state |
| --- | ---: | --- |
| C0a baseline repair | 1 | conditional source-only |
| C0b compatibility fixes | 4 | source-only |
| C1a projection foundations | 5 | evidence-only after admission |
| C1b independent owner evidence | 9 | source-only |
| C2 policy/Doctor/enforcement | 9 | source-only |
| C3 localization/distribution/host tools | 17 | source-only |
| C4 Claws lifecycle | 7 | source-only |
| C5 Rust | 3 | source-only/build-only |
| **Total** | **55** | **quarantined by default** |

All 55 source heads remain in scope. The role-approved correction is that
"integrate all" means capture, reconstruct, test, and disposition every head;
it does not mean enable every head in one runtime.
