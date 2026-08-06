# OpenClaw Facility Map

## Purpose

This is the working inventory of major OpenClaw facilities. It is a map for
source audits and focused specs, not a claim that every row is already a formal
subsystem.

The first graded assessment and missing-area inventory are in
`area-scorecard-2026-08-01.md`.

## Map Kinds

- **Owner domain**: owns semantic state, mutation, and lifecycle.
- **Composition facility**: connects definitions or owner capabilities.
- **Evidence facility**: evaluates or explains bounded owner facts.
- **Projection facility**: renders or transports facts without taking ownership.
- **Cross-cutting concern**: a review dimension that may use multiple
  owner-native contracts and does not automatically earn one shared runtime.

## Candidate Design Areas

| Design area | Kind | Maturity | Purpose and principal objects | Current source area |
| ----------- | ---- | -------- | ----------------------------- | ------------------- |
| Catalog and discovery | Projection/composition facility | Proposed | Describe definitions, ownership, versions, and compatibility without activating them. | `projects/catalog/` |
| Configuration and activation | Owner domain | Current source owner; managed-source extension proposed | Resolve selections and config sources into validated effective generations with explicit reload or rejection. | `specs/configuration-activation.md`, `source-audit-configuration-activation-2026-08-01.md` |
| Credentials, secrets, and auth profiles | Owner and binding portfolio | Current source-audited core; enterprise federation incomplete | Resolve credential references and profiles into redacted runtime snapshots and owner-specific bindings with refresh, rotation, degraded state, and evidence. | `specs/credentials-secrets-auth.md`, `source-audit-credentials-secrets-auth-2026-08-01.md` |
| Extensions and composition | Composition facility | Hypothesis | Install and compose plugins, skills, hooks, providers, tools, manifests, registrations, and dependencies. | `projects/claws/`, `projects/feeds/` |
| Supply-chain and artifact trust | Composition, policy, evidence, and lifecycle portfolio | Current local integrity/install core; signed provenance and fleet trust incomplete | Resolve immutable artifacts, validate trust evidence, admit and transactionally install, bind activation, revoke/remove, and promote releases without one marketplace owner. | `specs/supply-chain-artifact-trust.md`, `source-audit-supply-chain-artifact-trust-2026-08-01.md` |
| Identity and lifetimes | Cross-cutting concern | Source-backed matrix; incomplete | Compare owner-native instance, config, session, run, message, tool, delivery, node, resource, and generation renewal boundaries. | `identity-lifetime-matrix.md` |
| Nodes, devices, pairing, and remote capabilities | Owner, relationship, execution, and evidence portfolio | Current source-audited node/device runtime; enterprise federation/fleet incomplete | Establish device trust, approve pairing, issue role grants, connect nodes, advertise capabilities, invoke remotely, manage presence/wake, and revoke/remove without treating hosts as devices. | `specs/nodes-devices-pairing.md`, `source-audit-nodes-devices-pairing-2026-08-01.md`, `projects/openclaw-rust-node/` |
| Install, update, release, and compatibility | Owner, composition, and evidence portfolio | Current source-audited local/release core; optional fleet rollout incomplete | Select immutable releases through mutable channels, preflight compatibility, stage and activate locally, migrate owner state, recover precisely, prove publication, and optionally converge a fleet without replacing package/service/state owners. | `specs/install-update-release-compatibility.md`, `source-audit-install-update-release-compatibility-2026-08-01.md`, `projects/promoteclaw/` |
| Agent execution | Owner domain | Current source-audited core | Run bounded agent work through sessions, runs, attempts, tool calls, context assembly, cancellation, and terminal outcomes. | `specs/agent-execution.md`, `source-audit-agent-execution-2026-08-01.md` |
| Delegated execution | Agent Execution child domain | Current source-audited core | Spawn and supervise child sessions/runs with separate lineage, control, completion, recovery, and cleanup contracts. | `specs/delegated-execution.md`, `source-audit-delegated-execution-2026-08-01.md` |
| Models and provider routing | Composition and execution portfolio | Current source-audited core | Select and invoke providers through catalog routes, credentials, prepared runtimes, fallbacks, attempts, usage, and status projections. | `specs/models-provider-routing.md`, `source-audit-models-provider-routing-2026-08-01.md` |
| Tools, MCP, and external actions | Composition, authority, and execution portfolio | Current source-audited core | Expose definitions and per-run surfaces while mediating MCP transport, approvals, sandboxing, calls, results, and external effects. | `specs/tools-mcp-actions.md`, `source-audit-tools-mcp-actions-2026-08-01.md` |
| Transport, protocol, and API evolution | Runtime relationship and projection portfolio | Current Gateway/ACP foundations; cross-surface compatibility incomplete | Version, negotiate, authenticate, correlate, stream, cancel, replay, evolve, and prove compatibility for owner-native operations without one universal bus. | `specs/transport-protocol-api-evolution.md`, `source-audit-transport-protocol-api-evolution-2026-08-01.md` |
| Session continuity | Owner domain | Current source-audited core | Preserve session-key and session-ID continuity through registry state, transcripts, branches, reset/fork, cursor, and compatibility contracts. | `specs/session-continuity.md`, `source-audit-sessions-context-memory-2026-08-01.md` |
| Context assembly and compaction | Projection facility plus runtime relationship | Current source-audited core | Construct bounded run-scoped model context and transform transcripts under context pressure without absorbing source owners. | `specs/context-assembly.md`, `source-audit-sessions-context-memory-2026-08-01.md`, `projects/context-budget/` |
| Memory | Owner domain plus projection | Current source-audited core; retention semantics incomplete | Own corpora, indexing, retrieval, scoped writes, provenance, and bounded prompt projection. | `specs/memory.md`, `source-audit-sessions-context-memory-2026-08-01.md`, `projects/memory/` |
| Workspace and filesystem ownership | Owner domains plus cross-cutting resource relationships | Current source-audited local core; enterprise governance incomplete | Own workspace, sandbox, state, transcript, skill, and artifact paths with explicit containment, precedence, export, recovery, and cleanup. | `specs/workspace-filesystem.md`, `source-audit-workspace-filesystem-2026-08-01.md`, `projects/oc-path/` |
| Privacy, retention, export, and deletion | Cross-cutting obligation and evidence portfolio | Current owner-specific controls; shared lifecycle contract proposed | Bind classification, copies, holds, exports, deletion operations, retained exceptions, and completion evidence to owner-native stores. | `specs/privacy-retention-deletion.md`, `source-audit-privacy-retention-deletion-2026-08-01.md` |
| Resource governance | Cross-cutting policy, runtime relationship, and projection portfolio | Strong current local controls; enterprise allocation/fleet contracts incomplete | Connect scoped limits, admission outcomes, runtime leases, usage observations, allocation, cost, and capacity without one global budget manager. | `specs/resource-governance.md`, `source-audit-resource-governance-2026-08-01.md` |
| Messaging and channels | Owner domain plus projection/transport | Current source-audited core and representative channels | Receive, route, render, and deliver accounts, conversations, messages, attachments, drafts, retries, and receipts. | `specs/messaging-channels.md`, `source-audit-messaging-channels-2026-08-01.md` |
| Scheduling and background work | Owner domain | Proposed | Represent schedules, wakes, retained activations, retries, leases, cancellation, and terminal state. | `projects/state-continuity/` |
| State continuity | Owner domain/composition facility | Proposed | Capture, restore, migrate, publish, and hand off checkpoints, recovery points, journals, fences, and dirty/synced state. | `projects/state-continuity/`, `projects/snapshot/` |
| Hosting and lifecycle | Owner domain boundary | Proposed | Define hostee start, readiness, drain, stop, profile, lifecycle-transition, and host-binding behavior. | `projects/hosting-profiles/`, `projects/layering-contracts/` |
| Readiness | Evidence facility | Proposed and partially implemented | Publish subjects, criteria, providers, conditions, results, and bounded inspect/watch/wait facilities. | `specs/readiness.md`, `projects/hosting-profiles/` |
| Policy, trust, and approval | Owner domain/cross-cutting concern | Proposed | Decide whether behavior is permitted using principals, policies, decisions, approvals, restrictions, and audit facts. | `projects/policy/` |
| Diagnostics and repair | Evidence and action facility | Current concepts; broader contract proposed | Explain failures through findings and support artifacts; expose explicit repair plans, dry runs, and applied repairs. | `projects/doctor/` |
| Signals, telemetry, and audit | Projection facility/cross-cutting concern | Proposed | Project bounded events, observations, outcomes, correlation, redaction, metrics, and audit records from semantic owners. | `projects/signals/` |
| Localization and presentation | Projection facility | Proposed | Render stable machine meaning through message keys, locale selection, fallback, and channel-safe output. | `projects/localization/` |
| Hosting integration | Composition facility | Proposed | Bind host-owned providers, credentials, bundles, reverse carriers, and owner status without transferring semantic ownership. | `projects/hosted-integration/` |

Maturity is a notebook assessment, not an upstream status claim. A facility
spec must replace directory-level references with exact source, RFC, test, and
PR evidence before marking a behavior **Current**.

## Audit Order

Completed foundation:

1. readiness;
2. configuration and activation;
3. agent and delegated execution;
4. messaging and channels;
5. models/provider routing;
6. tools/MCP/actions; and
7. session continuity, context assembly/compaction, and memory.

Completed cross-owner audits:

1. credentials, secrets, and auth profiles;
2. workspace and filesystem ownership;
3. privacy, retention, export, and deletion; and
4. resource governance;
5. transport, protocol, and API evolution; and
6. supply-chain and artifact trust; and
7. nodes, devices, pairing, and remote capabilities; and
8. install, update, release, and compatibility.

Next:

The first portfolio pass is complete. Remaining work is cross-facility
relationship validation and targeted evidence slices rather than another
unaudited major owner domain. See `relationship-model.md` and
`enterprise-evidence-slices-2026-08-01.md`.

## Cross-Cutting Questions

- Which identifiers are globally stable, process-stable, generation-bound, or
  attempt-local?
- Which facilities own definitions versus selections versus live activations?
- Where are unknown, degraded, retryable, and terminal states represented?
- Which catalogs are inert, and which inspections invoke live owners?
- What evidence can be retained and trusted after the producing runtime is gone?
- Which current concepts are implementation details that should not become
  contracts?
- Can operators compare generations, capabilities, and evidence across a
  partially upgraded fleet without treating stale or missing data as success?
