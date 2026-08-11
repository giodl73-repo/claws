# Controlled-Fork Contribution and Lobster Promotion Process

Date: 2026-08-11

Normative process:
`specs/controlled-fork-process-v1.md`

Machine-readable record:
`specs/controlled-fork-promotion-unit.schema.json`

## Goal

Give the team one understandable path for adding an OpenClaw change, proving
it in the controlled fork, and moving Lobster to the exact tested fork
generation without recreating an untracked patch pile.

GitHub cannot create one pull request across two repositories. Treat the work
as **one promotion unit with two linked PRs**:

1. the controlled-fork PR owns source, ledger state, and executable evidence;
2. the Lobster PR consumes the exact fork generation and proves the image.

The two PRs share one change ID and cross-link each other.

## Promotion Unit

Every unit records:

| Field | Meaning |
| --- | --- |
| Change ID | Stable identifier used in both repositories |
| Vanilla base | Exact OpenClaw release or commit from which reconstruction starts |
| Fork PR and head | Source change and immutable tested commit |
| Contract / owner | Behavior being changed and the system that remains authoritative |
| Disposition | Quarantined, evidence-only, release-eligible, active, superseded, or deleted |
| Fixtures | Accepted and structured-failure proof |
| Lobster PR | Exact image-consumption and validation change |
| Consumption mode | Current patch bridge or target fork artifact |
| Upstream replacement | RFC and implementation PR expected to replace the carry |
| Containing release | First OpenClaw release expected to include an upstream forward-fix |
| Rollback | Exact prior fork or image generation |
| Deletion condition | Observable condition for removing the carry |

## Workflow

### Forward-fix bridge

If OpenClaw fixes an issue after the team's pinned release, do not wait for the
next full OpenClaw promotion and do not recreate the fix as an anonymous
Lobster patch.

Promote the exact upstream fix into the controlled fork:

1. record the upstream PR, head SHA, merge SHA, and affected owner;
2. reconstruct or cherry-pick the smallest exact source range onto the current
   fork base;
3. retain the upstream regression or add a bounded accepted/failure fixture;
4. mark the carry as an upstream forward-fix, not fork-owned product behavior;
5. record the first upstream OpenClaw release expected to contain the fix;
6. let the linked Lobster PR consume the exact fork generation; and
7. name rebase-to-containing-release plus passing regression proof as the
   deletion condition.

When the fork rebases to the containing OpenClaw release:

1. remove the carried commit or generated patch;
2. run the retained regression against the upstream implementation;
3. prove the old carry path is absent;
4. mark the ledger entry superseded and then deleted; and
5. update Lobster to the new exact fork generation.

This gives the team the fix immediately while ensuring the temporary carry
does not become permanent fork divergence.

### 1. Open the controlled-fork PR

The contributor branches from the current controlled-fork head and includes:

- the smallest owner-native source change;
- a source-ledger entry with exact source and base identities;
- a disposition entry with authority, rollback, replacement, and deletion;
- accepted and structured-failure fixtures;
- focused executable proof; and
- links to the relevant EnterpriseClaw contract and upstream RFC.

New source starts quarantined. It becomes evidence-only or release-eligible
only after the exact-head proof passes.

### 2. Open the linked Lobster PR

The Lobster PR may start as a draft while the fork PR is open. It records:

- the shared change ID;
- the fork PR URL;
- the exact fork head SHA or immutable artifact digest;
- the OpenClaw vanilla base;
- the prior Lobster input for rollback;
- the image tests required for promotion; and
- the upstream replacement and carry-deletion condition.

Never consume a floating branch name as promotion evidence.

### 3. Validate one exact generation

Both repositories must test the same immutable fork generation:

- controlled-fork contract and fixture checks pass;
- a fresh-clone reconstruction reaches the expected tree;
- Lobster builds its OpenClaw image from the named input;
- scoped patched-source tests pass;
- image startup and readiness pass;
- required runtime and release checks pass; and
- the produced image records the fork SHA or artifact digest in provenance.

### 4. Merge in dependency order

1. Merge the controlled-fork PR.
2. Update the Lobster PR from the branch head to the immutable merged fork SHA
   or artifact digest.
3. Rerun Lobster validation.
4. Merge the Lobster PR only after it proves that exact input.

The Lobster PR is the promotion gate; the fork PR is the source and evidence
gate.

### 5. Upstream and delete

When portable behavior lands upstream:

1. rebase or reconstruct the fork from the new OpenClaw release;
2. prove the upstream behavior with the retained fixture;
3. mark the controlled-fork carry superseded or deleted;
4. update Lobster to the new exact fork/upstream input;
5. prove zero use of the old path; and
6. delete the downstream carry.

## Current Bridge and Target State

### Current bridge

Lobster currently promotes signed OpenClaw releases with a downstream patch
queue. Until direct fork-artifact consumption is wired, the linked Lobster PR
may carry a generated patch representing the exact controlled-fork delta.

That bridge must still record:

- fork PR and exact head;
- patch ID;
- vanilla base;
- fixture IDs;
- rollback;
- replacement; and
- deletion condition.

The patch is a transport format, not the source of truth.

### Target state

Lobster consumes an immutable artifact produced from the controlled-fork head:

- pinned source archive;
- package artifact; or
- image layer/digest selected by the Lobster build owner.

The target removes manual patch regeneration. A team member changes and proves
OpenClaw once in the fork; automation updates the linked Lobster PR to the
latest immutable fork generation and reruns image validation.

## Automation Contract

A future promotion workflow should:

1. detect the shared change ID on a release-eligible fork PR;
2. publish an immutable fork artifact and provenance manifest;
3. create or update the linked Lobster PR;
4. pin the exact SHA or digest;
5. include fixture, replacement, rollback, and deletion metadata;
6. trigger Lobster image validation;
7. refuse promotion if the fork head changes without revalidation; and
8. report one promotion-unit status across both PRs.

## State Machine

```text
proposed
  -> quarantined
  -> fork-proven
  -> lobster-validated
  -> promoted
  -> upstream-replaced
  -> carry-deleted
```

No state transition is inferred from a merged PR alone. Each transition
requires the named evidence for the exact generation.
