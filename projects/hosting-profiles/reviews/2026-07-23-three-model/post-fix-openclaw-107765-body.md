Related RFC: https://github.com/openclaw/rfcs/pull/37

Depends on: https://github.com/openclaw/openclaw/pull/104018

> **Stacked implementation:** this branch contains readiness head `8fbc1210762` followed by nineteen profile-only commits. Until PR 104018 lands, GitHub shows both layers; afterward this PR reduces to the Hosting Profiles work below.

## Problem

OpenClaw runs locally, in containers, behind identity proxies, and as a controller for paired execution targets, but those deployment labels are not reproducible support contracts. Their intended posture is scattered across flags, environment, config, probes, and private checklists. A live Gateway can therefore claim readiness without satisfying the runtime facts its host expects.

## Standard Hosting Profiles

Profiles are optional, named, release-tested presets over the readiness conditions from PR 104018. They do not create another evaluator.

| Profile | Supported posture | Additional required evidence |
| --- | --- | --- |
| `local` | Explicit foreground/local Gateway | Writable workspace |
| `container` | Directly reachable container listener | Non-loopback effective listener and writable workspace |
| `reverse-proxy` | Gateway behind a trusted identity proxy | Trusted-proxy auth, identity header, trusted source, explicit loopback allowance when applicable, and writable workspace |
| `node-mode` | Gateway controlling execution targets | Approved pairing, connected target, canonical command-policy approval, live control channel, and writable workspace |

Selection precedence is `gateway startup argument > environment > openclaw.json`. Without a selection, OpenClaw preserves the existing readiness baseline and emits no profile or activation fields. With a selection, machine-readable readiness identifies the profile, its source, a logical runtime ID, and a unique incarnation ID. Invalid selected values fail before destructive reset/force behavior; shadowed lower-precedence values are ignored.

Profiles observe effective runtime state. They do not generate or repair configuration, add Lobster/OCC concepts, encode scheduler policy, or replace direct criterion selection.

## Why This Helps

Docker, Kubernetes, systemd, OCC, and downstream hosts consume ordinary `/readyz`: `200` means the selected posture can serve work; `503` carries named unmet conditions. Maintainers gain a bounded scenario matrix for reproducing issues against postures OpenClaw explicitly ships and exercises.

The reverse-proxy profile validates sources with the same address matcher as authentication and rejects listener/source combinations that cannot connect; it remains a configuration observation rather than a synthetic ingress request. Node-mode uses OpenClaw's current pairing owner, pairing generations, and canonical command policy, so a stale or merely connected node cannot satisfy readiness. A timed-out pairing read permits one bounded replacement read, never more than two concurrent reads, and errors are redacted. Profile and activation identity remain present even when outer readiness evaluation fails.

## Implementation

Exact profile head: `864c8d25459`, based on readiness head `8fbc1210762`. Profile-only diff: 39 files, 2,027 insertions, 16 deletions, including tests and documentation. The profile-only comparison remains available in [fork PR 94](https://github.com/giodl73-repo/openclaw/pull/94).

## Validation

- Focused profile, activation, startup precedence, node-mode, reverse-proxy, unprofiled compatibility, Gateway, config, CLI, Docker-plan, and release-wiring assertions pass.
- Production TypeScript checking, type-aware lint, unused-export checks, protocol generation/guard, documentation indexing, and `git diff --check` pass on the exact head.
- The package workflow passed 90 of 91 tests; the sole failure is an unrelated archive test because this WSL image has no `zip` executable. The hosting-profile package assertion passes.
- Prior package-installed Docker proof covered all four profiles, expected listener/auth/node/workspace failures, recovery, and unprofiled compatibility. Exact-head remote proof remains a landing gate and is currently blocked by remote allocator authentication.

## Deliberate v1 Boundary

RFC 0023 standardizes the four built-in profiles, optional selection, provenance, activation identity, readiness composition, and packaged scenario checks. Custom profile inheritance, host assertions, immutable conformance records, and attestation are future work rather than promises in this PR.
