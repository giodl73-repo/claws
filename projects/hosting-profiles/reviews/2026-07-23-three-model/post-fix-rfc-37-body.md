## Decision Requested

Should OpenClaw ship a small catalog of named, release-tested hosting postures over the readiness facility proposed in [RFC 0018](https://github.com/openclaw/rfcs/pull/33)? Readiness remains independently useful: operators can select required and advisory criteria without choosing a profile.

## Normative Specification

The [Standard Hosting Profile v1 specification](https://github.com/giodl73-repo/rfcs/blob/user/giodl/rfc-0023-standard-hosting-profiles/rfcs/0023/hosting-profile-v1-spec.md) defines the built-in catalog, optional selection, activation identity, readiness projection, and packaged conformance requirements.

## Problem

OpenClaw runs locally, in containers, behind identity proxies, and as a controller for paired execution targets, but those labels are not reproducible support contracts. Their posture is spread across startup flags, environment, config, probes, and adapter code. A running Gateway cannot name the posture it is expected to satisfy, and a release cannot exercise that posture as one coherent packaged scenario.

## Proposed v1

| Profile | Supported posture | Additional required evidence |
| --- | --- | --- |
| `local` | Explicit foreground/local Gateway | Writable workspace |
| `container` | Directly reachable container listener | Non-loopback listener and writable workspace |
| `reverse-proxy` | Gateway behind a trusted identity proxy | Trusted-proxy auth, identity header, trusted source, explicit loopback allowance when applicable, and writable workspace |
| `node-mode` | Gateway controlling execution targets | Approved pairing, connected target, canonical command-policy approval, control channel, and writable workspace |

Profiles are declarative compositions of RFC 0018 conditions, not another evaluator. Selection is optional with precedence `gateway startup argument > environment > openclaw.json`. Unprofiled startup remains unchanged and emits no profile/activation fields. Selected results identify the profile, selection source, logical runtime, and process/container incarnation.

The standard catalog creates a bounded support promise: OpenClaw names the posture, reports the exact activation and unmet conditions, and runs packaged scenario checks for the postures it ships. Docker, Kubernetes, systemd, OCC, and downstream hosts continue to consume ordinary readiness.

## Implementation Evidence

- Readiness dependency: [openclaw/openclaw#104018](https://github.com/openclaw/openclaw/pull/104018), exact head `c1919669c3f`
- Profile implementation: [openclaw/openclaw#107765](https://github.com/openclaw/openclaw/pull/107765), exact head `40b5b2e59d9`
- Profile-only comparison: [giodl73-repo/openclaw#94](https://github.com/giodl73-repo/openclaw/pull/94)
- Profile-only size: 39 files, 2,027 insertions, 16 deletions, including docs and tests

Focused profile and safety assertions, production typing, type-aware lint, unused-export checks, protocol generation/guard, documentation indexing, and diff checks pass. Timed-out pairing reads recover through one bounded replacement without unbounded overlap, and failed evaluations retain profile and activation attribution. Prior package-installed proof covered the four profiles, expected failure/recovery cases, and unprofiled compatibility. Exact-head remote container proof remains a landing gate.

## Deliberate v1 Boundary

This RFC does not promise custom profile inheritance, host assertions, immutable conformance records, attestation, config generation/repair, scheduler policy, or Lobster/OCC resources. Those can evolve later without weakening the initial standard catalog.

## Promotion Order

1. Accept and land RFC 0018 and PR 104018 independently.
2. Decide whether the four named postures are the right initial support catalog.
3. Reduce PR 107765 to its profile-only diff and refresh exact-head packaged proof before landing.

## Maintainer Questions

1. Are these four postures the right initial standard catalog?
2. Should runtime activation identity remain in the initial contract?
3. Should packaged profile conformance become release-blocking after adoption?
