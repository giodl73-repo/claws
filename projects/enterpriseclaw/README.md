# EnterpriseClaw

Use this area for the desired long-term OpenClaw architecture: its organizing
principles, logical layers, owner boundaries, trust model, control loops,
deployment profiles, and evolution rules.

**EnterpriseClaw** is the codename for this architectural model. It is not a
separate product, a claim about current behavior, an implementation plan, or a
second normative RFC tree.

## Relationship to the Current-State Audit

`projects/openclaw-design/` records what OpenClaw currently owns, how it
behaves, and where contracts are incomplete.

EnterpriseClaw answers a different question:

> If OpenClaw keeps the owner systems that already work, what architecture
> should those systems converge toward?

The direction is:

```text
working owner systems
+ explicit generations, authority, lifecycle, and evidence
-> simpler local use and governable enterprise operation
```

## Frame

- **Problem**: OpenClaw has mature facilities, but important relationships
  among activation, authority, execution, effects, lifecycle, and evidence are
  implicit or inconsistently projected.
- **Affected users**: hobbyists, maintainers, plugin authors, host
  integrators, enterprise operators, security teams, and auditors.
- **Working owner systems**: configuration, sessions, memory, tools, channels,
  providers, nodes, releases, workspaces, and plugins remain authoritative for
  their semantics.
- **Shared contribution**: a coherent system architecture that explains how
  autonomous owner domains compose safely.
- **Owner-retained responsibilities**: catalogs, workflows, storage, policy
  decisions, rendering, publication, retries, idempotency, and effect
  semantics.
- **V1 boundary**: describe architecture, responsibilities, invariants, and
  quality attributes; do not prescribe APIs, schemas, packages, command names,
  storage engines, or a project backlog.
- **Simplification target**: remove inferred authority, generic success,
  duplicated lifecycle logic, hidden generations, and operator guesswork.
- **Disproof condition**: reject any shared contract that forces healthy owner
  systems into a universal object model or makes local operation depend on
  enterprise infrastructure.

## Active Notes

| Area | File |
| ---- | ---- |
| Current session and resume state | `SESSION.md` |
| Ideal target architecture | `target-architecture.md` |
| Shared commandments and contract-review grammar | `contract-principles.md` |
| Shared interface, API, envelope, and state-machine patterns | `contract-interface-patterns.md` |
| Recurring contract pitfalls and corrective patterns | `contract-pitfalls.md` |
| Role review of principles, mechanics, and pitfalls | `contract-meta-role-review-2026-08-01.md` |
| Source-backed specialist review program and packets | `specialist-reviews/README.md` |
| Evidence grades, readiness gate, and 34-contract ledger | `evidence-base/README.md` |
| Major architecture swim lanes and technology-fit inventory | `swim-lanes/README.md` |
| Concise recommendation and evolution posture for every lane | `area-recommendations.md` |
| Broad `.craft/roles` review of the area roadmap | `area-recommendations-role-review-2026-08-01.md` |
| Candidate assessment order, rubric, and worksheet | `technology-fit-framework.md` |
| Existing, fork/RFC, and new-component designations by lane | `initial-implementation-map.md` |
| OpenClaw-fork-to-Rust strangler transition | `rust-transition-strategy.md` |
| Omar guidance and Scout September alignment agenda | `stakeholder-guidance-omar-2026-08-01.md` |
| Founder, operator, learner, platform, and security review | `role-review-2026-08-01.md` |
| Thirty-four architectural contract scopes and RFC candidates | `rfcs/README.md` |

## Active Work

| Repo | PR / Issue | Branch | Status | Purpose |
| ---- | ---------- | ------ | ------ | ------- |
| `claws-hapi` | Local target model | `main` | Active | Define and refine the EnterpriseClaw architecture. |
| `openclaw/openclaw` | Current and future implementation | Per worktree | Reference | Test whether implementation remains consistent with the architecture. |
| `openclaw/rfcs` | Normative proposals | Per RFC | Reference | Express focused contracts without duplicating the architecture notebook. |

## Related Areas

- `../openclaw-design/README.md`
- `../layering-contracts/README.md`
- `../managed-config/README.md`
- `../state-continuity/README.md`
- `../hosting-profiles/README.md`
- `../policy/README.md`
