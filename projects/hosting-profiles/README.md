# OpenClaw Hosting Profiles Project

Use this area to coordinate two related but independently adoptable contracts:
OpenClaw readiness conditions/providers and Standard Hosting Profiles. Together
they define the hostee contract OpenClaw exposes when run by Docker, Compose,
Kubernetes, Lobster, OCC, or another platform.

The center of the proposal is not a Lobster-only compatibility layer. It is a
small OpenClaw core feature:

```text
runtime evidence -> readiness conditions -> host-facing signal
                                  ^
                    optional hosting-profile preset
```

## Runtime Activation Context

Hosting Profiles are also the OpenClaw entry point for a minimal runtime
activation context. OpenClaw resolves a logical runtime id and a unique
process/container incarnation id, then reports them with the selected profile
and readiness result. Launchers may provide stable identities through startup
arguments, environment, or a mounted descriptor; OpenClaw generates local
defaults so existing installations remain zero-configuration.

Managed Configuration, Hosted Integration, and Runtime State Continuity keep
ownership of configuration sources, host-bundle selection, and restore state.
They publish resolved generations and owner-produced readiness conditions. A
Hosting Profile composes those conditions into a support contract without
copying their configuration, credentials, or state into a new envelope.

This is the disposition for Lobster's broad environment/startup ABI: retain a
small documented activation carrier, move ordinary settings to Managed
Configuration, move enterprise bindings and credentials to their owners, and
keep container-only implementation details in the host.

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
| Original combined RFC draft; retained as historical context | `0010-standard-hosting-ready-check.md` |
| Older draft notes before the profiles framing stabilized | `rfc-draft.md` |
| Compact upstream PR series for the RFC and first implementation slices | `openclaw-pr-plan.md` |
| Live GitHub evidence for readiness demand and extensibility boundaries | `github-readiness-demand-2026-07-10.md` |

## Active Work

| Repo | PR / Issue | Branch | Status | Purpose |
| --- | --- | --- | --- | --- |
| bic/lobster | TBD | TBD | Analysis | Inventory host pressure and patches OpenClaw should absorb as generic contracts. |
| openclaw/rfcs | [RFC 0018 / PR 33](https://github.com/openclaw/rfcs/pull/33) | `user/giodl/standard-hosting-profiles-ready-check` | Review | Define readiness conditions/providers, direct operator selection, canonical projections, and CLI. |
| openclaw/rfcs | [RFC 0023 / PR 37](https://github.com/openclaw/rfcs/pull/37) | `user/giodl/rfc-0023-standard-hosting-profiles` | Draft | Define standard, release-tested hosting profile presets over RFC 0018. |
| openclaw/openclaw | [Readiness PR 104018](https://github.com/openclaw/openclaw/pull/104018) | `user/giodl/readiness-profiles-upstream` | Draft | Real readiness-only landing candidate for RFC 0018; four commits, no profile implementation. |
| giodl73-repo/openclaw | [Readiness PRs 17, 22, 23, 27](https://github.com/giodl73-repo/openclaw/pulls) | readiness-only stack | Draft | Modernize Gateway readiness without requiring profiles. |
| giodl73-repo/openclaw | [Profile PR 94](https://github.com/giodl73-repo/openclaw/pull/94) | `user/giodl/standard-hosting-profiles-upstream` | Draft | Consolidated profile-only implementation based on readiness PR 104018. |
| giodl73-repo/openclaw | [Profile review slices 18, 19, 42, 21](https://github.com/giodl73-repo/openclaw/pulls) | four-commit profile stack | Draft | Optional commit-level review aids for PR 94. |

## Scope

The readiness contract is independently useful:

- canonical required and advisory conditions over existing Gateway evidence
- direct `gateway.readiness` selection without a profile
- bounded, activation-scoped plugin readiness providers
- consistent `/ready`, `/readyz`, health, status, and `openclaw ready` results

The separate hosting-profile proposal adds:

- built-in profiles `local`, `container`, `reverse-proxy`, and `node-mode`
- profile-selected defaults and required startup evidence
- named presets over reusable readiness criteria
- runtime activation identity
- packaged release conformance for every built-in profile
- standard Docker/Compose/Kubernetes examples

The guiding rule: OpenClaw owns the hostee contract; each platform owns how it
supplies the envelope. Lobster remains one host implementation, not the owner of
the generic contract.

RFC 0018 is the readiness acceptance decision. RFC 0023 depends on it but is a
separate product/support decision. The old combined project draft is not the
normative source for either RFC.

## Related Areas

- `projects/layering-contracts/README.md` - umbrella contract portfolio and Lobster boundary audit
- `projects/lobster/README.md`
- `projects/openclaw/README.md`
- `projects/admin/README.md`
- `projects/snapshot/README.md`
- `projects/context-budget/README.md`
