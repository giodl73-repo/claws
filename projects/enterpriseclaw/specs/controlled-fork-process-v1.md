# Controlled Fork Process Specification v1

Status: Draft

Version: 1.0.0

Date: 2026-08-11

Schema:
`controlled-fork-promotion-unit.schema.json`

## 1. Purpose

This specification defines how an OpenClaw controlled fork inventories,
admits, proves, promotes, rebases, supersedes, and deletes temporary carries.

The controlled fork is a transition surface between:

- the OpenClaw version currently operated by the team;
- fixes and RFC implementations needed before the next upstream release;
- Lobster image validation and promotion; and
- the eventual upstream OpenClaw release that replaces each carry.

The process prevents a useful temporary fix from becoming anonymous,
unrebuildable, or permanent fork divergence.

## 2. Normative Language

The terms **MUST**, **MUST NOT**, **REQUIRED**, **SHOULD**, **SHOULD NOT**, and
**MAY** are normative.

## 3. Scope

This specification covers:

- exact source identity and provenance;
- change admission and disposition;
- executable evidence;
- linked controlled-fork and Lobster promotion;
- upstream forward-fixes;
- reconstruction and rebase;
- rollback; and
- carry replacement and deletion.

It does not define:

- OpenClaw product behavior;
- Lobster product policy;
- the authority of an owner system;
- a universal runtime API;
- release calendar decisions; or
- which source, package, or image artifact transport Lobster must use.

## 4. Terms

### 4.1 Vanilla base

The exact upstream OpenClaw commit from which a controlled-fork generation is
reconstructed. A release name alone is insufficient; the 40-character commit
identity is REQUIRED.

### 4.2 Carry

A source change present in the controlled fork but not present in its vanilla
base.

### 4.3 Promotion unit

The complete record for one carried change across the controlled fork,
evidence, Lobster consumption, upstream replacement, rollback, and deletion.

### 4.4 Fork generation

One immutable controlled-fork commit and its complete ledger, disposition, and
fixture identities.

### 4.5 Upstream forward-fix

An exact OpenClaw fix merged or proposed after the team's current vanilla base
and temporarily admitted to the controlled fork before the team adopts the
upstream release containing it.

### 4.6 Containing release

The first verified OpenClaw release whose source includes the upstream
replacement for a carry.

### 4.7 Consumer

A system, such as Lobster, that builds or validates from an immutable
controlled-fork generation or artifact.

### 4.8 Deletion proof

Evidence that the replacement behavior passes the retained regression and the
old carry path is absent.

## 5. Required Invariants

### CF-IDENTITY-001: exact base

Every fork generation MUST record the upstream repository, ref or release
label, and exact 40-character vanilla-base commit.

### CF-IDENTITY-002: exact source

Every carry MUST record its exact source SHA and source kind:

- `upstream-forward-fix`;
- `fork-originated`;
- `downstream-extraction`; or
- `evidence-only`.

An upstream forward-fix MUST also record its upstream PR and containing
release when known.

### CF-LEDGER-001: complete promotion unit

Every carry MUST have one promotion-unit record conforming to
`controlled-fork-promotion-unit.schema.json`.

### CF-DISPOSITION-001: explicit state

Every carry MUST have exactly one current state:

```text
proposed
quarantined
fork-proven
lobster-validated
promoted
upstream-replaced
carry-deleted
```

State MUST NOT be inferred solely from PR merge status.

### CF-AUTHORITY-001: no implicit authority

Admission to the controlled fork MUST NOT grant runtime authority. The
promotion unit MUST name the authoritative owner and the evidence authority.
Evidence authority defaults to `none`.

### CF-EVIDENCE-001: accepted and failure proof

Before `fork-proven`, the carry MUST have:

- at least one fixture identity;
- an accepted result;
- a structured failure result; and
- an exact validation command or workflow.

### CF-LINK-001: one unit, linked PRs

When Lobster consumes the change, the controlled-fork PR and Lobster PR MUST:

- share one change ID;
- cross-link each other;
- name the same immutable fork generation or artifact; and
- record rollback and deletion conditions.

The repositories MAY use two PRs, but they MUST represent one promotion unit.

### CF-CONSUME-001: immutable consumption

Lobster MUST NOT use a floating fork branch as promotion evidence. It MUST
consume an exact fork SHA or immutable artifact digest.

### CF-VALIDATE-001: same generation

Fork evidence and Lobster image validation MUST refer to the same immutable
fork generation. A changed fork head invalidates prior consumer validation.

### CF-PROVENANCE-001: consumer provenance

The Lobster-produced artifact SHOULD record:

- vanilla-base commit;
- fork commit or artifact digest;
- change IDs; and
- validation generation.

### CF-FORWARD-001: temporary upstream carry

An upstream forward-fix MUST record:

- upstream PR;
- exact source or merge SHA;
- retained regression;
- expected or verified containing release; and
- deletion condition.

It MUST NOT be relabeled as permanent fork-owned product behavior.

### CF-REBASE-001: reconstruct before retain

When adopting a new OpenClaw base, the process MUST first determine which
carries are included upstream. Included carries MUST be omitted from the
reconstructed queue and verified through their retained regressions.

### CF-DELETE-001: evidence-backed deletion

A carry may transition to `carry-deleted` only when:

- its replacement is present in the adopted base;
- its retained regression passes;
- the old carry path is absent;
- the consumer uses the new fork generation; and
- rollback no longer depends on the deleted carry.

### CF-ROLLBACK-001: exact prior generation

Every promoted unit MUST record an exact prior fork generation or consumer
artifact for rollback.

## 6. State Machine

```text
proposed
  -> quarantined
  -> fork-proven
  -> lobster-validated
  -> promoted
  -> upstream-replaced
  -> carry-deleted
```

Allowed shortcuts:

- evidence-only work MAY stop at `fork-proven`;
- a fork-only change MAY move from `fork-proven` to `upstream-replaced`;
- a rejected proposal MAY move from `proposed` or `quarantined` directly to
  `carry-deleted` if no consumer ever used it.

All other backward transitions require a new promotion-unit revision and
explicit rollback evidence.

## 7. Contribution Protocol

### 7.1 Controlled-fork PR

The contributor MUST:

1. allocate a change ID;
2. pin the vanilla base and source identity;
3. add or update the promotion-unit record;
4. add accepted and structured-failure evidence;
5. name owner, authority, replacement, rollback, and deletion;
6. run exact-head validation; and
7. link relevant RFCs and upstream PRs.

### 7.2 Linked Lobster PR

For a Lobster candidate, the contributor or automation MUST:

1. create or update a linked Lobster PR;
2. pin the exact fork head or artifact;
3. record the same change ID;
4. build and test the Lobster image;
5. record the prior consumer input for rollback; and
6. refuse promotion when the fork generation changes without revalidation.

### 7.3 Merge order

The controlled-fork PR MUST merge first. The Lobster PR MUST then update to
the immutable merged fork generation and rerun validation before merging.

## 8. Forward-Fix Protocol

When a needed OpenClaw fix exists after the current team release:

1. record the upstream PR and exact source identity;
2. admit the smallest exact fix range to the fork;
3. retain or add the regression;
4. mark the carry `upstream-forward-fix`;
5. record the containing release;
6. validate the linked Lobster input; and
7. delete the carry when rebase reaches the containing release and deletion
   proof passes.

This protocol lets the team use an upstream fix now without waiting for the
full release and without making the temporary carry permanent.

## 9. Rebase Protocol

For a new OpenClaw base:

1. pin the new exact base commit;
2. inventory all active promotion units;
3. classify each as included upstream, still required, conflicted, or obsolete;
4. omit included and obsolete carries;
5. replay only still-required carries in dependency order;
6. resolve conflicts at current owner boundaries;
7. run every retained fixture;
8. produce the new fork generation and provenance;
9. update linked Lobster consumption;
10. validate the exact consumer generation; and
11. mark replaced carries superseded or deleted only after proof.

The result MUST be reconstructable from the new vanilla base plus the active
promotion-unit ledger.

## 10. Conformance

A controlled-fork generation conforms to v1 when:

- every active carry has a schema-valid promotion unit;
- every exact identity resolves;
- every `fork-proven` or later unit has executable evidence;
- every Lobster-consumed unit names an immutable input;
- every forward-fix names its upstream source and deletion target;
- reconstruction reaches the expected tree; and
- no deleted carry is present in the reconstructed output.

## 11. Versioning

Backward-compatible field additions increment the minor version.
State-machine, required-invariant, or identity changes increment the major
version.

Promotion-unit records MUST name the schema version they conform to.
