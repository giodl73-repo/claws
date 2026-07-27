## Decision Requested

Should OpenClaw add an opt-in, structured, subject-aware readiness contract around its existing Gateway checker?

This RFC covers Readiness Conditions and Providers. Standard Hosting Profiles remain a separate product/support decision in [RFC 0023](https://github.com/openclaw/rfcs/pull/37).

## Why

OpenClaw already exposes `/ready` and `/readyz`, but their evaluator is purpose-built around fixed Gateway observations. Operators cannot select which known runtime facts their deployment requires, plugins cannot contribute bounded observations, and a single result cannot identify the different runtime subjects those observations describe.

## Proposed V1

Each condition has stable `type`, `subjectRef`, `status`, `requirement`, `reason`, and `message` fields, with optional bounded related subjects. Required `False` or `Unknown` conditions fail readiness; advisory conditions remain visible. Activated `/ready`, `/readyz`, health, status, and `openclaw ready` consume the same canonical result while `/healthz` remains shallow liveness.

The result declares its producer and a versioned reconciled subject package once. IDs renew at the lifecycle boundary owned by each subject: optional host workload, process, Gateway serving lifecycle, config, plugin, node, or another resource. A generation revises the same object. Operators can therefore diff `(subjectRef, type)` and distinguish a condition transition from replacement or revision.

OpenClaw retains no history. Hosts and telemetry systems may store and diff the bounded result. This gives Docker, Kubernetes, OCC, and other operators enough attribution to explain a readiness transition without turning readiness into a resource store or control plane.

Operators select reusable criteria through `gateway.readiness`. Registering a criterion never selects it. Plugin providers are namespaced, enumerable, observational, advisory by default, and receive a subject collector. Core owns deadlines, cancellation, coalescing, caching, output bounds, redaction, reconciliation, deterministic ordering, and fail-closed projection.

The normative sidecars are [Readiness v1](https://github.com/giodl73-repo/rfcs/blob/user/giodl/standard-hosting-profiles-ready-check/rfcs/0018/readiness-v1-spec.md) and [Readiness Subjects v1](https://github.com/giodl73-repo/rfcs/blob/user/giodl/standard-hosting-profiles-ready-check/rfcs/0018/readiness-subjects-v1-spec.md). The non-normative [platform comparison](https://github.com/giodl73-repo/rfcs/blob/user/giodl/standard-hosting-profiles-ready-check/rfcs/0018/readiness-platform-comparison.md) maps the design to Kubernetes, Docker, systemd, ASP.NET Core, Spring Boot, and OpenTelemetry.

## Compatibility Boundary

- Without `gateway.readiness` or another accepted activation contract, `/ready` and `/readyz` use the legacy checker.
- Presence of `gateway.readiness`, including `{}`, activates bounded canonical evaluation.
- Selected but unobserved facts remain explicit `Unknown` conditions.
- A separately accepted Standard Hosting Profile may activate the same evaluator by selecting a named condition set.

## Implementation Stack

- Framework and subject identity: [openclaw/openclaw#104018](https://github.com/openclaw/openclaw/pull/104018), head `6dce3555a511`
- Isolated subject review slice: [giodl73-repo/openclaw#161](https://github.com/giodl73-repo/openclaw/pull/161)
- Core owner adoption and Policy example: [openclaw/openclaw#113421](https://github.com/openclaw/openclaw/pull/113421), head `9cc02c5d89c`
- Owner review slices: [153](https://github.com/giodl73-repo/openclaw/pull/153), [154](https://github.com/giodl73-repo/openclaw/pull/154), [155](https://github.com/giodl73-repo/openclaw/pull/155)

Owner criteria observe existing snapshots. Readiness does not make model calls, acquire credentials, connect MCP servers, start sandboxes or harnesses, open databases, or start schedulers. Active filesystem checks and provider calls are bounded.

## Operator Facilities

- [Fork PR 167](https://github.com/giodl73-repo/openclaw/pull/167) adds `openclaw ready --watch`: bounded semantic transitions, unavailable/not-ready recovery, and subject-lifetime replacement without changing one-shot behavior. [Exact-head tests and package-installed Docker proof](https://github.com/giodl73-repo/openclaw/actions/runs/30224900928) pass.
- [Fork PR 169](https://github.com/giodl73-repo/openclaw/pull/169) adds the inert `readiness.catalog` RPC and `openclaw ready criteria list|inspect`. It reports selectable core/plugin ownership, current selection, and selected-but-missing IDs from one activation-pinned snapshot without invoking providers. [Exact-head tests, formatting, and type-aware lint](https://github.com/giodl73-repo/openclaw/actions/runs/30227102643) pass.
- Bounded startup wait remains a later convenience. Doctor, telemetry, support bundles, and updates consume readiness evidence through their existing owners.

## Package Proof

[Exact-head package-installed Docker proof](https://github.com/giodl73-repo/openclaw/actions/runs/30214165737) passes on dependent head `e9c1988c5e59`. It exercises RFC 0018 readiness surfaces, stable repeated polls, fail-closed transitions, and host-stable/process-and-Gateway-renewing container restart semantics using an immutable no-push package/image artifact.

## Maintainer Questions

1. Is explicit activation the right upgrade boundary?
2. Is required/advisory the right modernization of the existing evaluator?
3. Is the producer/subject identity package the right attribution model?
4. Is activation-scoped plugin registration the right extension boundary?
