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

The 35 RFC scopes remain the durable contract portfolio. Human and product
surfaces simplify them through audience-specific projections; simplification
does not remove or flatten the underlying owner and relationship contracts.

## Reporting Convention

Status summaries lead with the mission and the actual upstream feature PRs or
investment areas, including what each delivers and its current status. Fork
scaffolding, reconstruction, CI, and project-management PRs are reported
separately as supporting process. Every summary ends with the next concrete
decision or action.

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
| Executive five-box overview and top-down narrative | `executive-overview.md` |
| Executive agent-harness competitive landscape | `executive-competitive-landscape-2026-08-02.md` |
| Slide-ready presentation materials | `presentation-materials/README.md` |
| Ideal target architecture | `target-architecture.md` |
| Shared commandments and contract-review grammar | `contract-principles.md` |
| Shared interface, API, envelope, and state-machine patterns | `contract-interface-patterns.md` |
| Recurring contract pitfalls and corrective patterns | `contract-pitfalls.md` |
| Role review of principles, mechanics, and pitfalls | `contract-meta-role-review-2026-08-01.md` |
| Source-backed specialist review program and packets | `specialist-reviews/README.md` |
| Evidence grades, readiness gate, and 35-contract ledger | `evidence-base/README.md` |
| B-to-A portfolio promotion audit | `evidence-base/portfolio-promotion-audit-2026-08-02.md` |
| Competitive analysis and strategic corrections | `competitive-analysis-2026-08-02.md` |
| Layered human operator journeys | `operator-journeys/README.md` |
| Protected-effect fork simulation evidence | `evidence-base/protected-external-effect-simulation-2026-08-02.md` |
| Durable-delivery fork simulation evidence | `evidence-base/durable-delivery-simulation-2026-08-02.md` |
| Fleet rollout and recovery simulation evidence | `evidence-base/fleet-rollout-recovery-simulation-2026-08-02.md` |
| Area-level implementation packages and work-item decomposition | `implementation-packages/README.md` |
| Fork branch, patch queue, phase, release, and upstream-promotion plan | `fork-execution-plan-2026-08-02.md` |
| Live PRE-001 fork sync, protection, checkout, and baseline record | `fork-preflight-2026-08-02.md` |
| Current fork/image, upstream-source, RFC, and patch execution roadmap | `current-roadmap-2026-08-04.md` |
| Exact Lobster image patch manifest choices for 28-file and 30-file paths | `lobster-image-patch-manifest-2026-08-06.md` |
| Final Lobster size, code-area, ProxyPipe, work, and ownership assessment | `lobster-final-assessment-2026-08-04.md` |
| Current Lobster plugin and patch disposition ledger | `lobster-plugin-patch-disposition-2026-08-05.md` |
| Lobster/OpenClaw operational issue, merged-fix, and workaround audit | `lobster-openclaw-operational-issue-audit-2026-08-05.md` |
| EVID-002 hosting-profile source classification and proof boundary | `evid-002-hosting-profile-classification-2026-08-03.md` |
| Full `.craft/roles` review of the fork execution plan | `fork-execution-plan-role-review-2026-08-02.md` |
| Concrete proposed fork, upstream, Lobster, Rust, and deletion PR stack | `fork-pr-plan-2026-08-02.md` |
| Full `.craft/roles` review and correction of the PR portfolio | `fork-pr-plan-role-review-2026-08-02.md` |
| All 55 currently open owned upstream PRs assigned to phased fork carry queues | `fork-carried-upstream-prs-2026-08-02.md` |
| Full 40-character source-head ledger for all 55 carried upstream PRs | `fork-carried-upstream-pr-ledger-2026-08-02.md` |
| Full `.craft/roles` review of the all-55 carried-source program | `fork-carried-upstream-prs-role-review-2026-08-02.md` |
| Consolidated `.craft/roles` review of all ten implementation packages | `implementation-packages/role-review-2026-08-02.md` |
| Cross-package execution ownership, contracts, DAG, and waves | `implementation-packages/cross-package-execution-contracts.md` |
| Operations, assurance, and fleet implementation package | `implementation-packages/operations-assurance-fleet.md` |
| Knowledge, context, and continuity implementation package | `implementation-packages/knowledge-context-continuity.md` |
| Identity, authority, actions, effects, conversations, and delivery package | `implementation-packages/identity-authority-actions-effects.md` |
| Runtime fabric, nodes, and Rust implementation package | `implementation-packages/runtime-fabric-nodes-rust.md` |
| Configuration and activation implementation package | `implementation-packages/configuration-activation.md` |
| Agent runtime and delegated execution implementation package | `implementation-packages/agent-runtime-delegated-execution.md` |
| Models, provider attempts, and usage implementation package | `implementation-packages/models-provider-usage.md` |
| Extensibility, artifact trust, and release implementation package | `implementation-packages/extensibility-artifact-release.md` |
| Data governance and resource control implementation package | `implementation-packages/data-governance-resource-control.md` |
| Experience and administration implementation package | `implementation-packages/experience-administration.md` |
| Major architecture swim lanes and technology-fit inventory | `swim-lanes/README.md` |
| Concise recommendation and evolution posture for every lane | `area-recommendations.md` |
| Upstream, fork, Lobster, and Rust disposition for all 35 contracts | `implementation-disposition-35-contracts.md` |
| Live upstream PR, issue, Lobster, and carried-patch delivery inventory | `delivery-portfolio-inventory-2026-08-02.md` |
| Runtime, operator, founder, security, and maintainer review of that disposition | `implementation-disposition-role-review-2026-08-02.md` |
| Full `.craft/roles` review and corrections before area decomposition | `implementation-disposition-craft-role-review-2026-08-02.md` |
| Broad `.craft/roles` review of the area roadmap | `area-recommendations-role-review-2026-08-01.md` |
| Candidate assessment order, rubric, and worksheet | `technology-fit-framework.md` |
| Existing, fork/RFC, and new-component designations by lane | `initial-implementation-map.md` |
| OpenClaw-fork-to-Rust strangler transition | `rust-transition-strategy.md` |
| Omar guidance and Scout September alignment agenda | `stakeholder-guidance-omar-2026-08-01.md` |
| Founder, operator, learner, platform, and security review | `role-review-2026-08-01.md` |
| Thirty-five architectural contract scopes and RFC candidates | `rfcs/README.md` |
| Formal owner, relationship, lifecycle, and end-to-end closure audit | `rfcs/portfolio-closure-audit-2026-08-01.md` |

## Active Work

| Repo | PR / Issue | Branch | Status | Purpose |
| ---- | ---------- | ------ | ------ | ------- |
| `claws-hapi` | Local target model | `main` | Active | Define and refine the EnterpriseClaw architecture. |
| `giodl73-repo/openclaw` | #203 | `lobster/bootstrap-reconstruction` | Merged | Establish deterministic fork reconstruction and evidence metadata. |
| `giodl73-repo/openclaw` | #204 | `lobster/source-ledger` | Merged | Capture all 55 owned upstream PR generations as quarantined inventory. |
| `giodl73-repo/openclaw` | #205 | `lobster/wave-0-contracts` | Merged | Publish executable XPK-001 through XPK-009 definition-only gates with no admission authority. |
| `giodl73-repo/openclaw` | #206 | `lobster/evid-001-admission` | Merged | Add deterministic exact multi-commit source ranges without admitting quarantined source. |
| `giodl73-repo/openclaw` | #207 | `lobster/evid-001-source-admission` | Merged | Bind per-commit B3 conflict resolutions to exact queue-prefix trees and carried identities. |
| `giodl73-repo/openclaw` | #208 | `lobster/evid-001-carried-sources` | Merged | Admit the exact #107026/#104018/#113421 evidence stack and executable owner-projection fixture with authority `none`. |
| `giodl73-repo/openclaw` | #209 | `lobster/evid-002-hosting-profiles` | Merged | Admit #113422/#114636 hosting profiles, catalog, validation, and release evidence with six bounded B3 resolutions and authority `none`. |
| `giodl73-repo/openclaw` | #210-#221 | EVID-003 through EVID-014 branches | Merged | Add bounded owner-first evidence for usage, leases, checkpoints, lifecycle, node trust, authorized actions, release, session copies, compatibility, protocol evolution, restore, and targeted Fleet repair. |
| `giodl73-repo/openclaw` | #222 | `lobster/evid-015-rust-gateway-canary` | Merged | Prove a clean-built Rust process crosses the current authenticated Gateway boundary with zero authority and obsolete protocol v1 fails closed. |
| `giodl73-repo/openclaw` | #223 | `lobster/evid-016-rust-side-effect-free-invocation` | Merged | Prove one owner-approved, side-effect-free Rust `system.which` invocation with route/generation fencing and pre-dispatch undeclared-command refusal. |
| `giodl73-repo/openclaw` | #224 | `lobster/evid-017-rust-reconnect-continuity` | Merged | Prove replacement routing retires old Rust work, refuses its late result, and accepts fresh work only on the new connection. |
| `openclaw/openclaw` | Current and future implementation | Per worktree | Reference | Test whether implementation remains consistent with the architecture. |
| `openclaw/rfcs` | Normative proposals | Per RFC | Reference | Express focused contracts without duplicating the architecture notebook. |

## Related Areas

- `../openclaw-design/README.md`
- `../layering-contracts/README.md`
- `../managed-config/README.md`
- `../state-continuity/README.md`
- `../hosting-profiles/README.md`
- `../policy/README.md`
