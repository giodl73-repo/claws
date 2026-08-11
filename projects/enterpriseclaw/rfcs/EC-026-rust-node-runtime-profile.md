# RFC Scope: Rust Node Runtime Profile

- ID: EC-026
- Lane: Nodes, devices, and edge
- Status: Fork-proof scoped draft
- Initial posture: New component contract
- Primary owner: Node runtime owner; proposed Rust implementation for a bounded
  supported profile

## Scope

- Define the first bounded Rust replacement profile for the existing
  TypeScript node runtime: identity, pairing consumption, protocol,
  capabilities, invocation execution, isolation, state, update, readiness,
  recovery, evidence, compatibility, migration, and deletion.

## Current Owner Baseline

The current TypeScript node/device runtime is the authoritative compatibility
baseline. It already provides:

- stable device/node identity and public-key connect proof;
- pairing request/approval, role-bound tokens, and pairing-generation fencing;
- connection incarnation and N-1 protocol negotiation;
- declared and policy-narrowed capabilities, commands, tools, skills, and
  permissions;
- connection-bound invocation identity, idempotency, deadlines, ordered
  streaming, cancellation requests, late-result rejection, and disconnect
  settlement;
- presence, wake, pending work, and stale-session cleanup; and
- command policy, approval, dangerousness, and operator-scope gates.

A sixth merged controlled-fork proof now exists in
`giodl73-repo/openclaw` PR #227 at
`b2d6cc9edfcff2ff737727d35d71b75bf361f099`. Building on PR #222 admission,
PR #223 invocation, PR #224 replacement fencing, PR #225 clean restart, and
PR #226 crash fencing, it dispatches side-effect-free work through a
Gateway-owned hard deadline. The caller receives node `TIMEOUT`, Rust observes
the correlated cancel, the Gateway ignores Rust's later result, and a distinct
fresh process settles one fresh request without renewed approval or pairing
rotation. It does not prove a general runtime profile, cooperative effect
interruption, readiness, durable crash recovery, Rust-owned state, migration,
or runtime authority. The earlier
`C:\src\openclaw-rust-node` protocol-v1 validator is historical evidence only.
TypeScript remains the authoritative owner.

## Investment Reconciliation

- OpenClaw #100960/#104158/#104159 are the active command inventory,
  live-node observation, and prompt-projection stack. The Rust profile adopts
  them rather than creating another catalog.
- Lobster #4297 already projects node catalog guidance; #4648 is the governed
  invocation adopter; #5460 is the offline recovery surface.
- The reverse-carrier O11-O14/G1-G2 proof is a separate plugin connection
  owner, not a Rust node identity or transport dependency.
- No live OpenClaw issue or PR currently owns a Rust node runtime or
  language-neutral node conformance package.
- The immediate next proof is ordered side-effect-free streaming plus idle
  timeout behavior for the same bounded profile: preserve progress order,
  observe correlated cancellation, fence late frames, and settle one fresh
  stream. It is not an effect-owning production canary.

## Supported Profile

The first profile must declare:

| Dimension | Required declaration |
| --- | --- |
| Peer role | Exact Gateway/node protocol role and trust model |
| Identity | Node/device identity, local runtime identity, connection incarnation, and key storage |
| Protocol | Supported min/max versions, selected version, capabilities, and unknown-field behavior |
| Commands | Explicit supported command/capability subset and unsupported settlement |
| Authority | Pairing, policy, approval, and invocation generations consumed from existing contracts |
| Effects | Which node-local/external effects Rust owns and how certainty is reported |
| State | Canonical Rust-owned state, imported state, derived caches, and migration generation |
| Operations | Startup, ready, drain, stop, restart, reconnect, quarantine, and recovery |
| Resources | CPU, memory, disk, concurrency, queue, timeout, and network exposure budgets |
| Release | Artifact identity, install/update owner, compatibility tuple, rollback, and security patch owner |
| Evidence | Invocation, readiness, version, migration, update, and recovery evidence |

Unsupported TypeScript-node capabilities remain explicit. The Rust profile
does not approximate them silently or require plugins/skills to be rewritten.

## Authority and Migration Modes

```text
TypeScript only
  -> shadow-safe comparison
  -> Rust canary for selected node/deployment units
  -> Rust primary for supported profile
  -> Rust only after TypeScript deletion gate
```

- Shadow mode may compare parsing, validation, policy inputs, and other
  side-effect-free results.
- Shadow mode must not dispatch the same external effect through both
  implementations.
- Canary selection occurs before invocation admission and binds node,
  connection, pairing, protocol, capability, and runtime generations.
- Once admitted, one implementation owns the invocation through settlement.
- Fallback after dispatch is allowed only when the command owner proves replay
  safety. Otherwise failure/unknown remains with the selected owner.
- TypeScript and Rust state must not remain bidirectionally authoritative.
  Migration fences the old writer before Rust activation.

## Explicit Exclusions

- A full Rust OpenClaw rewrite.
- Requiring skills/plugins to be rewritten in Rust.
- Any migration mode where TypeScript and Rust nodes can perform the same
  external effect concurrently.
- Reusing user-device node identity for host/runtime peers.
- Claiming Rust authority from process startup, artifact installation, or
  protocol connection alone.
- Deleting the TypeScript path before fresh-install, upgrade, downgrade,
  rollback, ecosystem, and security-owner proof.

## Required Outcomes

- TypeScript and Rust implementations pass the same language-neutral
  conformance fixtures for the supported profile.
- Conformance covers accepted, rejected, unsupported, stale-pairing,
  stale-connection, deadline, idle-timeout, cancellation, disconnect,
  late-result, restart, reconnect, mixed-version, and unknown-effect outcomes.
- Deployment profile declares startup, readiness, CPU, memory, loopback/network
  exposure, initialization ordering, drain/shutdown, recovery,
  reconnect/idempotency, and deployment-unit failure isolation.
- The supported Rust node profile remains usable for ordinary local operation
  without fleet services, centralized evidence, or enterprise policy
  infrastructure; managed controls are additive.
- Rust becomes authoritative for supported node-local execution behavior;
  pairing, protocol negotiation, invocation, and external-effect authority
  remain governed by EC-024, EC-022, EC-025, and EC-014.
- Readiness identifies exact Rust artifact/runtime, state generation,
  connection compatibility, and supported capability profile. Process
  existence is insufficient.
- Fresh install, TypeScript-to-Rust migration, Rust upgrade, downgrade refusal,
  binary rollback, state rollback limits, and mixed TypeScript/Rust operation
  are explicit.
- Crash or quarantine of one Rust node does not compromise Gateway or other
  node units.
- Ordinary local operation requires no fleet controller, centralized evidence
  store, or enterprise policy service.

## Compatibility and Release

Each release identifies:

- OpenClaw/Gateway version;
- node protocol range and selected level;
- Rust artifact digest and runtime version;
- conformance-suite version;
- state schema/import version;
- supported capability profile;
- TypeScript compatibility/fallback limits; and
- security and update ownership.

Unknown required protocol or state semantics fail closed. Unknown optional
capabilities remain unsupported/degraded without blocking the base profile.
Code rollback never implies state or external-effect rollback.

## Dependencies

- EC-006, EC-007, EC-014, EC-022, EC-023, EC-024, EC-025, EC-029,
  EC-031, and EC-032.

## Proof and Deletion Gate

- Build and install one real Rust node artifact in a fresh local environment.
- Run the shared accepted and structured-failure conformance suite against
  TypeScript and Rust.
- Canary a real Rust node through connection loss, process restart, state
  migration, update, downgrade refusal, and binary rollback.
- Route each effect to one authoritative implementation during shadow/canary
  migration and prove no dual dispatch.
- Measure startup, readiness, CPU, memory, concurrency, reconnect, drain, and
  failure-isolation budgets.
- Name and delete the superseded TypeScript node-host execution path for the
  supported profile only after runtime, ecosystem, fresh-install,
  mixed-version, upgrade, rollback, and security-owner release gates pass.
- Delete the TypeScript/Rust selector and state-import adapters after the
  supported profile reaches Rust-only authority.
- Disprove the separate Rust profile if the existing node runtime can satisfy
  the same language-neutral conformance, isolation, operational, and deletion
  gates without a distinct implementation boundary.
