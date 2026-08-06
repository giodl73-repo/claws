## Decision Requested

Should OpenClaw ship a small catalog of named, release-tested hosting postures over the readiness facility proposed in [RFC 0018](https://github.com/openclaw/rfcs/pull/33)? Readiness remains independently useful without a profile.

## Why

OpenClaw runs locally, in containers, behind identity proxies, and as a controller for paired execution targets, but those labels are not reproducible support contracts. Their intent is scattered across startup flags, environment, config, probes, and private checklists. A release cannot exercise or support the posture as one coherent packaged scenario.

## Proposed V1

Profiles are optional compositions of RFC 0018 criteria, not another evaluator.

| Profile         | Supported posture                       | Profile-specific evidence                                                             |
| --------------- | --------------------------------------- | ------------------------------------------------------------------------------------- |
| `local`         | Foreground/local Gateway                | Shared serving baseline                                                               |
| `container`     | Directly reachable container listener   | Non-loopback effective listener                                                       |
| `reverse-proxy` | Gateway behind a trusted identity proxy | Trusted-proxy auth, identity header, trusted source, and viable topology              |
| `node-mode`     | Gateway controlling execution targets   | Approved pairing, connected target, command-policy approval, and live control channel |

Every profile selects the same required serving baseline and advisory operational facts. Selection precedence is `gateway argument > environment > openclaw.json`; unprofiled startup remains unchanged, and operators can add criteria directly.

The [Standard Hosting Profile v1 sidecar](https://github.com/giodl73-repo/rfcs/blob/user/giodl/rfc-0023-standard-hosting-profiles/rfcs/0023/hosting-profile-v1-spec.md) is normative.

## Support And Identity Contract

A profile provides a reproducible support subset: OpenClaw names the posture, reports its unmet conditions, attributes them to RFC 0018 identities that renew with their owner lifecycles, and executes matching packaged scenarios.

`ProfileSelected` identifies one profile subject. Container and proxy checks relate it to the Gateway. Node mode identifies the controller and related paired-node subjects. Repeated results distinguish a red condition from a changed runtime, and restart conformance proves stable host/profile identity with renewed process and Gateway identities.

Docker, Kubernetes, systemd, OCC, and downstream hosts continue to consume ordinary `/readyz`. Profiles observe effective state; they do not generate or repair config, add Lobster/OCC resources, encode scheduler policy, or initiate subsystems.

## Operator Inspection And Validation

The built-in catalog is directly inspectable through `openclaw hosting profiles list|inspect`, including versioned JSON descriptors for profile-owned conditions and required/advisory readiness criteria. These commands are local and inert: they do not load config or plugins, contact a Gateway, evaluate readiness, or guess which profile is active.

[Fork PR 173](https://github.com/giodl73-repo/openclaw/pull/173) implements this first operator facility at exact head `99449434cb4c`. Its [exact-head proof](https://github.com/giodl73-repo/openclaw/actions/runs/30273004269) passes formatting, 35 focused assertions, type-aware lint, and core type checking. Runtime condition names are tested against the catalog so support inventory cannot drift from evaluation.

[Fork PR 174](https://github.com/giodl73-repo/openclaw/pull/174) adds `hosting profiles validate [profile]` at exact head `84227d246d00`. It calls canonical readiness once, validates exact active identity, version, and profile-condition coverage, and reports `conformant` separately from `ready`. It fails closed on unavailable or malformed evidence and never runs a second evaluator.

## Implementation Evidence

- Readiness framework: [openclaw/openclaw#104018](https://github.com/openclaw/openclaw/pull/104018), head `6dce3555a511`
- Core criteria: [openclaw/openclaw#113421](https://github.com/openclaw/openclaw/pull/113421), head `9cc02c5d89c`
- Profiles: [openclaw/openclaw#113422](https://github.com/openclaw/openclaw/pull/113422), head `e9c1988c5e59`
- Profile-only comparison: [giodl73-repo/openclaw#157](https://github.com/giodl73-repo/openclaw/pull/157)

The integrated tree passes 120 focused assertions plus formatting, lint, shell syntax, and diff checks. [Exact-head package-installed Docker proof](https://github.com/giodl73-repo/openclaw/actions/runs/30214165737) passes every V1 scenario on GitHub-hosted Actions using an immutable no-push package/image artifact.

## Deliberate V1 Boundary

This RFC does not promise custom profile inheritance, host assertions, immutable conformance records, attestation, config generation/repair, scheduler policy, or Lobster/OCC resources.

## Promotion Order

1. Accept RFC 0018 and PR 104018 independently.
2. Land reusable owner observations in PR 113421.
3. Decide whether the four named postures are the right initial support catalog.
4. Land PR 113422 with its exact-head packaged conformance evidence.
5. Land catalog inspection and live validation independently; portable release-conformance artifacts remain a follow-up.
