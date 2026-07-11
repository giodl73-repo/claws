# OpenClaw Hosting Profiles Project

Use this area to define OpenClaw's readiness-provider contract and hosting profiles: the standard hostee contract
OpenClaw exposes when it is run by Docker, Compose, Kubernetes, Lobster, OCC, or
another platform.

The center of the proposal is not a Lobster-only compatibility layer. It is a
small OpenClaw core feature:

```text
hosting profile + runtime evidence -> ready conditions -> host-facing signal
```

## Active Notes

| Area | File |
| --- | --- |
| Current project guidance and RFC promotion workflow | `guidance.md` |
| Initial Lobster repo inventory and proposal outline | `analysis.md` |
| Stair-step architecture from today's host pressure to OCC/AgentHarness | `stair-step-architecture.md` |
| Lobster repo audit of current host pressure and patch inventory | `lobster-layer-inventory.md` |
| First pass contract classification from Lobster audit | `contract-audit.md` |
| `.craft/roles` review of missing evidence and proposal gaps | `role-review.md` |
| Milestone path from as-is Lobster layer to upstream conformance | `milestones.md` |
| Real OpenClaw hosting seams and missing startup-admission contract | `hosting-seams.md` |
| Standard container/workload hosting model and one-line-to-platform progression | `standard-hosting-model.md` |
| Original project RFC draft; live normative source is RFC PR 33 | `0010-standard-hosting-ready-check.md` |
| Older draft notes before the profiles framing stabilized | `rfc-draft.md` |
| Compact upstream PR series for the RFC and first implementation slices | `openclaw-pr-plan.md` |
| Live GitHub evidence for readiness demand and extensibility boundaries | `github-readiness-demand-2026-07-10.md` |

## Active Work

| Repo | PR / Issue | Branch | Status | Purpose |
| --- | --- | --- | --- | --- |
| bic/lobster | TBD | TBD | Analysis | Inventory host pressure and patches OpenClaw should absorb as generic contracts. |
| openclaw/rfcs | [RFC 33](https://github.com/openclaw/rfcs/pull/33) | `user/giodl/standard-hosting-profiles-ready-check` | Draft | Define the canonical readiness framework, hosting profiles, boundaries, and implementation stack. |
| giodl73-repo/openclaw | [PRs 17-19, 22, 23, and 21](https://github.com/giodl73-repo/openclaw/pulls) | stacked hosting-profile branches | Draft | Implement readiness, built-in profiles, workspace evidence, extensible criteria/operator profiles, and blocking packaged release conformance. |

## Scope

The target deliverable is a proposal for OpenClaw hosting profiles:

- built-in profiles `local`, `container`, `reverse-proxy`, and `node-mode`
- profile-selected defaults and required startup evidence
- host-facing readiness, liveness, and status conditions
- stable failure and advisory reasons
- required workspace writability across every built-in profile
- enumerable, self-describing, activation-scoped plugin readiness providers
  whose criteria are advisory by default
- additive namespaced operator profiles that cannot weaken built-in contracts
- explicit support inheritance: OpenClaw owns the release-tested built-in
  baseline, while operators and plugins own criteria added by derived profiles
- packaged release conformance for every built-in profile
- standard Docker/Compose/Kubernetes examples

The guiding rule: OpenClaw owns the hostee contract; each platform owns how it
supplies the envelope. Lobster remains one host implementation, not the owner of
the generic contract.

Author the RFC in this project first
(`0010-standard-hosting-ready-check.md`). Promote it to the real OpenClaw RFC
repo after profile names, repo placement, non-goals, and the first ready-check
test plan are stable.

## Related Areas

- `projects/lobster/README.md`
- `projects/openclaw/README.md`
- `projects/admin/README.md`
- `projects/snapshot/README.md`
- `projects/context-budget/README.md`
