---
name: faces-development-loop
description: Use the FACES development loop when developing, validating, simplifying, or prototyping a technical idea, RFC, architecture contract, or cross-repo feature. Frames the thesis and deletion target, audits current source behavior, compares internal analogues and external competitors, evaluates with stakeholder roles, and builds bounded evidence slices in forks before upstream promotion.
---

# FACES Development Loop

Use **FACES**: **Frame, Audit, Compare, Evaluate, Slice**.

## 1. Frame

Write the smallest falsifiable thesis before choosing implementation:

- problem and affected users;
- the owner system that already works and should remain authoritative;
- current workaround and measurable cost;
- proposed shared capability, invariant, or contract;
- ownership explicitly retained by each product area;
- explicit V1 boundaries and non-goals;
- deletion or simplification target;
- evidence that would disprove the idea.

Use **owner-first capability framing** in RFCs, PR descriptions, and stakeholder
pitches:

```text
working owner system
+ missing shared capability
-> easier reuse and consistent evidence
```

Lead with what already works. State what the proposal contributes around it,
then name what remains owner-controlled: semantics, catalogs, workflows,
rendering, publication, and review policy as applicable. Avoid language that
implies a central platform will absorb or replace healthy owner systems.

Keep active notes in the owning `projects/<area>/` surface. Load its `SESSION.md`
and `README.md` first.

## 2. Audit

Trace current behavior from real source and representative production inputs:

- entry points, ordering, defaults, validation, mutation, activation, status;
- ownership boundaries across repositories and processes;
- failure posture, atomicity, persistence, migration, and compatibility;
- tests that encode actual behavior;
- removable code, flags, generated files, and cleanup.

Do not select APIs or command names from intuition. Record source-backed facts and
separate them from hypotheses.

## 3. Compare

Run both comparison lanes.

### 3a. Internal analogues

Find how the product already handles related concerns in other areas:

- layering, defaults, overrides, and field ownership;
- schema metadata and owner-defined behavior;
- validation findings and mutation conflicts;
- snapshots, generations, reload, readiness, and diagnostics;
- migration and compatibility patterns.

For each analogue classify `reuse`, `adapt`, or `avoid`. Prefer native seams and
mental models, but do not mistake precedence for authority or analogy for proof.

### 3b. External comparators

Use current primary sources to compare competitors and adjacent systems. Compare
semantics, not vocabulary:

- ownership versus precedence;
- conflict versus silent override;
- inspectability and provenance;
- schema evolution and unknown fields;
- transactional activation and rollback;
- operator experience and fleet rollout.

Capture useful precedent, negative precedent, and the reason this design should
be simpler or different.

## 4. Evaluate

Review the evidence and proposal with at least three relevant `.craft/roles/`
from different tension clusters. Include the runtime owner, affected operator,
and a skeptical simplicity or security lens when available.

Produce findings, not role-play prose:

- blocking contradictions;
- complexity that can be deleted;
- missing failure and migration semantics;
- terminology or mental-model problems;
- proof required before implementation.

Revise the RFC after the evidence and role review. Keep normative V1 behavior
separate from future extensions and implementation hypotheses.

## 5. Slice

Prototype the smallest vertical evidence slice in an isolated fork worktree:

1. one representative input fixture;
2. one narrow implementation seam;
3. one accepted result and one structured failure;
4. one observable proof surface;
5. one explicit deletion or migration mapping.

Prefer an exact/core slice before generalized layering or extension mechanisms.
Keep work fork-only until the user explicitly authorizes upstream issues or PRs.
Do not claim success from code alone: tie the slice to conformance evidence and a
named workaround deletion gate.

## Outputs

Maintain these durable artifacts as appropriate:

- project `SESSION.md` handoff;
- source audit;
- internal/external comparison matrix;
- role-review findings;
- revised RFC or design note;
- prototype slice plan and proof;
- deletion/migration ledger.

At each phase, state what was learned, what changed, and the cheapest next test.
Return to an earlier phase whenever evidence invalidates the thesis.
