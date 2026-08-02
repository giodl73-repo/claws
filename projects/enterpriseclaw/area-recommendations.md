# EnterpriseClaw Area Recommendations

## Purpose

This is the concise decision view of the EnterpriseClaw swim lanes. It states
the top initial recommendation for each area and how that area should evolve.

Detailed ownership and candidate analysis remains in:

- `swim-lanes/README.md`;
- `initial-implementation-map.md`; and
- `technology-fit-framework.md`.

## Recommendations

| Area | Top recommendation | Evolution posture |
| ---- | ------------------ | ----------------- |
| Experience and administration | Reuse the CLI, Control UI, and Doctor; standardize owner, generation, freshness, certainty, and remediation projections. | Replace projections freely while preserving owner APIs and raw local operation. |
| Identity, authority, and trust | Reuse credentials, policies, approvals, and pairing; bind authority evidence to the invocation that consumes it. | Adapt existing owners; add optional federation and evidence components without a universal identity database. |
| Configuration and activation | Extend existing configuration with explicit authored, accepted, active, ready, and converged generations. | Adapt in place through focused contracts; add managed desired-state projection later. |
| Agent runtime and orchestration | Keep the existing runtime; strengthen attempt bindings, delegation, cancellation, recovery, and terminal settlement. | Adapt first; replace bounded schedulers or workers only after stable contracts. |
| Models, providers, and compute | Keep provider routing; add explicit fallback candidate-attempt identity and per-candidate usage reconciliation. | Adapt routing and diagnostics; optionally replace isolated transport workers later. |
| Actions, tools, and integrations | Keep tools, plugins, MCP, and host integrations; retain approval correlation through invocation and external-effect settlement. | Adapt owner contracts; add reconciliation only for genuinely asynchronous effects. |
| Conversations, channels, and delivery | Keep messaging core and channel owners; add durable delivery identity, retry, receipt, and certainty. | Adapt existing owners; add durable workers only for channels that cannot recover themselves. |
| Knowledge, context, and continuity | Keep sessions, context, memory, workspace, and owner-native state; add copy/lifecycle evidence and checkpoint composition. | Preserve owners and durable formats carefully; evolve through adapters and explicit migrations. |
| Runtime fabric and protocols | Keep Gateway, ACP, and MCP; add version negotiation, replay/cancellation rules, and a language-neutral conformance suite. | Adapt protocols continuously; replace implementations behind stable contracts. |
| Nodes, devices, and edge | Build Rust Node Mode while retaining Gateway as coordinator and compatibility boundary. | First authoritative Rust replacement area, gated by an explicit deployment profile, resource budget, and compatibility proof. |
| Extensibility, artifacts, and release | Keep plugins, skills, and the extension ecosystem; strengthen provenance, compatibility, activation, upgrade, and recovery. | Adapt in place; avoid forcing existing extensions into Rust. |
| Data governance and resource control | Keep lifecycle mutation and limits with semantic owners; add cross-owner settlement only where required. | Preserve owners; introduce optional lifecycle, obligation, and allocation projections after proof. |
| Operations, assurance, and fleet | Reuse Doctor, readiness, and process owners; build a Rust supervisor after Rust Node Mode is proven. | Replace supervision and assurance boundaries progressively; budget every new process and keep fleet state as a projection. |

## What We Replace Over Time

These areas have clear process, trust, or isolation boundaries suitable for
progressive Rust replacement:

1. Node and edge runtime.
2. Host supervisor and updater.
3. Protocol parsing, validation, and cross-language conformance.
4. Security enforcement, containment, and durable assurance.
5. Scheduling, leases, and isolated execution workers.
6. Model, tool, channel, or remote-action transport workers where isolation
   provides clear value.
7. An optional agent execution kernel only after its dependencies have stable
   contracts.

Replacement means Rust becomes the authoritative owner and the superseded
TypeScript implementation is deleted.

## What We Upgrade in Place

These areas already have coherent OpenClaw owners and ecosystems:

- identity, credentials, policy, approval, and pairing;
- configuration and activation;
- agent and delegated execution;
- provider routing and model calls;
- tools, MCP, and integrations;
- messaging and channels; and
- plugins, skills, artifacts, and release flows.

The work is primarily explicit identity, generation, lifecycle, compatibility,
authority, settlement, and evidence contracts.

## What We Preserve Carefully

These areas contain mature semantics, durable state, or high migration risk:

- session continuity and transcripts;
- context assembly;
- memory corpora and indexes;
- workspaces and filesystem state;
- backups, snapshots, and recovery points;
- privacy lifecycle and retained exceptions; and
- owner-scoped resource controls.

Preservation does not mean no change. It means:

- keep one clear owner;
- avoid long-lived dual writes;
- migrate through explicit generations;
- prove rebuildability of derived state;
- preserve rollback and recovery;
- report retained and external copies; and
- delete old state only under an owner-specific lifecycle contract.

## What Can Be Reimplemented Behind Stable Contracts

Projections are intentionally replaceable:

- CLI presentation;
- Control UI;
- administrative workflows;
- catalog views;
- fleet posture;
- dashboards;
- diagnostics presentation;
- compliance reports; and
- localized rendering.

They may be rebuilt as long as they:

- consume stable, versioned owner contracts;
- preserve automation and connector compatibility;
- retain accessibility, localization, and redaction behavior;
- keep compliance exports semantically stable;
- do not become canonical runtime state; and
- leave raw local owner operation available.

## Cross-Cutting Acceptance Gates

### Risk-tiered enforcement

- Protected and high-risk effects fail closed when authority is missing,
  malformed, stale, or unverifiable.
- Low-risk observation may degrade only with explicit status and evidence.
- Unknown actions remain protected until classified.
- Allow, deny, review, and modify are explicit outcomes.
- No connector, plugin, or performance fast path bypasses enforcement.

### Deployment and performance

- Every Rust process declares startup, readiness, CPU, memory, network,
  shutdown, recovery, and reconnect behavior.
- Gateway hot-path additions have measured latency and failure budgets.
- Fleet failures remain isolated per deployment unit.

### Ecosystem compatibility

- Skills remain portable workspace assets.
- JavaScript/TypeScript plugins remain supported through stable compatibility
  boundaries.
- Connector writes use the same validation and authority path as local writes.
- Retry, replay, conflict, and bidirectional-loop semantics are explicit.

### Release and deletion

- Published artifacts install in a fresh environment.
- Mixed TypeScript/Rust versions have a declared compatibility profile.
- Upgrade, downgrade, rollback, and partial-publication recovery are proven.
- TypeScript deletion occurs only after runtime, ecosystem, and release gates
  pass.

### Policy and compliance

- Policy defines requirements rather than copying owner settings.
- Owners extract their own evidence.
- Attestations identify policy, evidence, owner/workspace generations, time,
  and integrity.
- Durable audit remains distinct from ordinary telemetry.

## Evolution Sequence

### Phase 0: establish the operating baseline

1. Document the current Scout deployment and runtime architecture.
2. Select the upstream/LTS baseline.
3. Inventory patches and assign drop, carry, adapt, upstream, or delete
   dispositions.
4. Define mixed TypeScript/Rust release and security-patch ownership.
5. Establish latency, cold-start, memory, readiness, recovery, and rollback
   budgets.
6. Run fresh-install, representative workspace, skill/plugin, connector, and
   upgrade compatibility baselines.

### Phase 1: establish replacement mechanics

1. Cross-language Gateway/node conformance.
2. Rust Node Mode.
3. Node trust and settlement evidence.
4. Canary, restart, update, and rollback proof.
5. Delete superseded TypeScript node behavior.

### Phase 2: establish reliable host boundaries

1. Rust host supervisor.
2. Start, ready, drain, stop, restart, and recovery.
3. Configuration-generation handoff.
4. Resource isolation and containment.
5. Update staging and process handoff.

### Phase 3: strengthen existing owner contracts

1. Authority-to-invocation-to-effect correlation.
2. Configuration accepted/active/ready generations.
3. Provider candidate-attempt identity and usage.
4. Delivery identity and certainty.
5. Session/memory/export/deletion copy relationships.
6. Artifact provenance, activation, and recovery.

### Phase 4: add optional managed composition

1. Lifecycle operation and settlement projection.
2. Fleet desired/observed/converged posture.
3. Durable authority and audit evidence.
4. Managed identity, secret, and policy adapters.
5. Cost, allocation, and compliance projections.

### Phase 5: evaluate deeper Rust ownership

Consider schedulers, workers, and an agent kernel only when prior phases
provide stable contracts and measurable deletion targets.

## Lobster's Role

Use Lobster to validate:

- service and cloud-runtime constraints;
- managed administration;
- host lifecycle and fleet operations;
- state continuity;
- identity and policy integration;
- update/LTS and patch management;
- SQL/Dolt requirements; and
- September Scout rollout needs.

Lobster should host, compose, govern, or project OpenClaw owner capabilities.
It should not become the default semantic owner of sessions, memory, tools,
channels, providers, or node effects.

## Input to Enterprise RFC Naming

The next step is to identify focused RFCs by architectural contract, not by
the EnterpriseClaw product name.

Good RFC candidates will:

- improve ordinary OpenClaw independently of managed deployment;
- have one primary owner;
- define one missing relationship or lifecycle contract;
- support TypeScript and Rust implementations where relevant;
- include compatibility and migration;
- expose accepted and structured failure outcomes; and
- delete an inference, workaround, patch, or duplicate implementation.
