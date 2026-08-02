# OpenClaw Design Assessment Rubric

## Purpose

Use this rubric to grade the maturity of a design area, not the quality of the
people or code associated with it. A high score means the area has a coherent,
source-linked contract that can guide implementation and operations. It does
not mean every proposal is accepted or shipped.

Score each dimension from 0 to 4:

| Score | Meaning |
| ----- | ------- |
| 0 | Absent or contradicted. |
| 1 | Named, but mostly intuitive or implicit. |
| 2 | Partially described with important unresolved boundaries. |
| 3 | Coherent proposal or current behavior with bounded gaps. |
| 4 | Explicit, owner-shaped, evidence-backed, and operationally testable. |

## Dimensions

| Code | Dimension | Questions |
| ---- | --------- | --------- |
| O | Ownership | Is one semantic owner clear? Are mutation, authority, and non-ownership boundaries explicit? |
| M | Object model | Are definitions, selections, activations, attempts, subjects, generations, and renewal boundaries identified where relevant? |
| C | Contract completeness | Are inputs, outputs, lifecycle, consistency, errors, trust, and compatibility specified? |
| S | Separation and cohesion | Is the area small enough to own one job without duplicating adjacent owners or hiding several contracts in one label? |
| E | Evidence | Are claims tied to current source, accepted RFCs, tests, shipped behavior, or exact-head prototypes? |
| X | Evolution and operations | Are partial rollout, stale state, mixed versions, migration, rollback, fleet comparison, and operator inspection addressed? |

Maximum score: 24.

## Grades

| Total | Grade | Interpretation |
| ----- | ----- | -------------- |
| 21-24 | A | Strong contract area. Preserve boundaries and close named gaps. |
| 17-20 | B | Useful and coherent, but one or two important dimensions remain incomplete. |
| 13-16 | C | Promising shape; requires source audit or contract separation before expansion. |
| 9-12 | D | The label hides major ambiguity, overlap, or missing lifecycle semantics. |
| 0-8 | F | Not yet a usable design area; start from source and owner objects. |

## Confidence

Record confidence separately from grade:

- **High**: exact source/RFC/test evidence was reviewed recently.
- **Medium**: durable project audits and current work summaries exist, but the
  system-level assessment has not rechecked every current source path.
- **Low**: the score is mainly a gap assessment from the absence of a source
  audit or facility spec.

## Separation Actions

Each area should receive one primary action:

| Action | Meaning |
| ------ | ------- |
| Preserve | The boundary is coherent; avoid broadening it. |
| Clarify | Keep the area, but make ownership or lifecycle more explicit. |
| Split | The label currently contains independently owned contracts. |
| Reclassify | Treat it as a cross-cutting concern or projection, not a runtime owner. |
| Merge | The area is only a view of an existing owner and should not become a separate contract. |
| Audit first | Do not design from the current label; trace source behavior and owner objects first. |

## Grade Safety Rules

- Grade the contract, not the volume of notes or number of PRs.
- Do not award evidence points for directory links alone.
- A broad umbrella can score well as a portfolio while still requiring its
  child contracts to remain separate.
- A shipped implementation can still score poorly if its ownership and
  lifecycle are implicit.
- A clean proposal can score highly before merge, but its evidence score must
  distinguish prototype proof from accepted current behavior.
