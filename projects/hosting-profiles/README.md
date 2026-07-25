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

| Area                                                                           | File                                    |
| ------------------------------------------------------------------------------ | --------------------------------------- |
| Current project guidance and RFC promotion workflow                            | `guidance.md`                           |
| Initial Lobster repo inventory and proposal outline                            | `analysis.md`                           |
| Stair-step architecture from today's host pressure to OCC/AgentHarness         | `stair-step-architecture.md`            |
| Lobster repo audit of current host pressure and patch inventory                | `lobster-layer-inventory.md`            |
| First pass contract classification from Lobster audit                          | `contract-audit.md`                     |
| `.craft/roles` review of missing evidence and proposal gaps                    | `role-review.md`                        |
| Milestone path from as-is Lobster layer to upstream conformance                | `milestones.md`                         |
| Real OpenClaw hosting seams and missing startup-admission contract             | `hosting-seams.md`                      |
| Standard container/workload hosting model and one-line-to-platform progression | `standard-hosting-model.md`             |
| Original combined RFC draft; retained as historical context                    | `0010-standard-hosting-ready-check.md`  |
| Older draft notes before the profiles framing stabilized                       | `rfc-draft.md`                          |
| Compact upstream PR series for the RFC and first implementation slices         | `openclaw-pr-plan.md`                   |
| Live GitHub evidence for readiness demand and extensibility boundaries         | `github-readiness-demand-2026-07-10.md` |

## Active Work

| Repo                  | PR / Issue                                                                             | Branch                                             | Status   | Purpose                                                                                           |
| --------------------- | -------------------------------------------------------------------------------------- | -------------------------------------------------- | -------- | ------------------------------------------------------------------------------------------------- |
| bic/lobster           | TBD                                                                                    | TBD                                                | Analysis | Inventory host pressure and patches OpenClaw should absorb as generic contracts.                  |
| openclaw/rfcs         | [RFC 0018 / PR 33](https://github.com/openclaw/rfcs/pull/33)                           | `user/giodl/standard-hosting-profiles-ready-check` | Review   | Define readiness conditions/providers, direct operator selection, canonical projections, and CLI. |
| openclaw/rfcs         | [RFC 0023 / PR 37](https://github.com/openclaw/rfcs/pull/37)                           | `user/giodl/rfc-0023-standard-hosting-profiles`    | Draft    | Define standard, release-tested hosting profile presets over RFC 0018.                            |
| openclaw/openclaw     | [Readiness PR 104018](https://github.com/openclaw/openclaw/pull/104018)                | `user/giodl/readiness-profiles-upstream`           | Review   | Fifteen-commit opt-in readiness framework for RFC 0018.                                            |
| openclaw/openclaw     | [Core criteria PR 113421](https://github.com/openclaw/openclaw/pull/113421)            | `user/giodl/readiness-core-owner-adoption`         | Draft    | One follow-on merge unit for activation, execution, state, storage, delivery, and scheduler facts. |
| openclaw/openclaw     | [Hosting Profiles PR 113422](https://github.com/openclaw/openclaw/pull/113422)         | `user/giodl/standard-hosting-profiles-owner-adoption` | Draft | Restacked RFC 0023 implementation; depends on PRs 104018 and 113421.                                |
| giodl73-repo/openclaw | [Readiness PRs 17, 22, 23, 27](https://github.com/giodl73-repo/openclaw/pulls)         | readiness-only stack                               | Draft    | Modernize Gateway readiness without requiring profiles.                                           |
| giodl73-repo/openclaw | [Activation PR 153](https://github.com/giodl73-repo/openclaw/pull/153)                | `user/giodl/readiness-activation-integrity`        | Draft    | First follow-on owner bucket: config, model-route, secret, and plugin activation evidence.         |
| giodl73-repo/openclaw | [Capability PR 154](https://github.com/giodl73-repo/openclaw/pull/154)                | `user/giodl/readiness-agent-execution-capabilities` | Draft   | Second follow-on owner bucket: context engine, tools, MCP, sandbox, and harness evidence; skills await a bounded owner snapshot. |
| giodl73-repo/openclaw | [State/background PR 155](https://github.com/giodl73-repo/openclaw/pull/155)          | `user/giodl/readiness-state-background-services`    | Draft   | Third follow-on owner bucket: state database, session-store durability, delivery runtime, and scheduler lifecycle evidence. |
| giodl73-repo/openclaw | [Host bindings PR 156](https://github.com/giodl73-repo/openclaw/pull/156)              | `user/giodl/readiness-hosted-dependencies`           | Draft   | Fourth bucket: resolve bundle selectors through RFC 0018 and fail the selected aggregate closed.    |
| giodl73-repo/openclaw | [Profile comparison PR 157](https://github.com/giodl73-repo/openclaw/pull/157)         | `user/giodl/standard-hosting-profiles-owner-adoption` | Draft | Exact profile-only comparison against core criteria head `ce9ef81b24d6`.                             |
| giodl73-repo/openclaw | [Profile review slices 18, 19, 42, 21](https://github.com/giodl73-repo/openclaw/pulls) | profile review slices                              | Draft    | Historical commit-level review aids; upstream PR 107765 is superseded by PR 113422.                |

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

The 2026-07-23 three-model review is complete at exact heads `c1919669c3f`
(readiness) and `40b5b2e59d9` (profiles). Architecture and maintainer reviews
approve; resilience reports ship. See `reviews/2026-07-23-three-model/` for the
original findings, dispositions, and final verdicts.

## Related Areas

- `projects/layering-contracts/README.md` - umbrella contract portfolio and Lobster boundary audit
- `projects/lobster/README.md`
- `projects/openclaw/README.md`
- `projects/admin/README.md`
- `projects/snapshot/README.md`
- `projects/context-budget/README.md`
