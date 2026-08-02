# Nodes, Devices, and Edge

## Architectural Goal

Extend OpenClaw to remote and constrained environments with explicit pairing,
route, capability, invocation, and settlement trust.

## Responsibilities

- Establish device identity and pairing generations.
- Manage connection, presence, wake, and revocation.
- Advertise remote capabilities without granting authority.
- Route and invoke commands under bounded policy.
- Fence results by invocation, node, connection, and trust generation.
- Report cancellation and remote-effect certainty honestly.

## Explicit Non-Ownership

- A host is not automatically a device.
- Presence is not readiness.
- Capability advertisement is not authorization.
- Cancellation dispatch is not proof that remote effects stopped.

## Conceptual Pieces

| Piece | Purpose | Owner expectation |
| ----- | ------- | ----------------- |
| Device identity | Stable remote subject | Pairing owner |
| Pairing generation | Current trust relationship | Revocable and renewable |
| Connection | One live route incarnation | Distinct from device identity |
| Capability advertisement | Current supported operations | Fresh and non-authoritative |
| Invocation | One remote command | Correlated and fenced |
| Remote settlement | Result and effect certainty | Handles disconnect and late result |

## Core Contracts

- Invocation binds node, pairing, route, policy, deadline, and idempotency.
- Results are accepted only from the expected connection and invocation.
- Wake and reconnect never silently replay expired work.
- Revocation and disconnect settle or expose unknown in-flight work.

## Quality Attributes

- Intermittent connectivity and constrained-device support.
- Strong trust fencing and minimal remote authority.
- Language-neutral contracts.
- Offline-safe recovery and update behavior.

## Candidate Fit

| Need | Existing or adjacent candidate | Initial disposition | What must be proven |
| ---- | ------------------------------ | ------------------- | ------------------- |
| Node gateway | Current node registry/invoke flow | Reuse/adapt | Public trust-envelope evidence |
| Device pairing | Current pairing | Reuse/adapt | Generation and revocation settlement |
| Headless node | Rust node project | Assess | Language-neutral conformance |
| Wake/presence | Current node status | Adapt | Freshness and readiness distinction |
| Edge management suite | External device platforms | Assess | Preserve OpenClaw owner authority |

## Cross-Lane Dependencies

- Depends on identity, protocols, actions, configuration, and operations.
- Serves remote tools and host capabilities.
- Must not absorb host lifecycle or fleet desired state.
