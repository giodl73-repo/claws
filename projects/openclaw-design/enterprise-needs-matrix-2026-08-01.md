# OpenClaw Enterprise Needs Matrix - 2026-08-01

## Scope

This matrix applies `enterprise-needs-framework.md` to the current facility
map. It scores:

- **enterprise criticality** (`E0-E4`); and
- **current enterprise contract coverage** (`C0-C4`).

It does not replace the source-maturity scorecard. A mature personal/runtime
feature can still lack enterprise authority, data, fleet, or evidence
semantics.

## Layer Validation

| Layer | Enterprise criticality | Current portfolio coverage | Validated enterprise need | Principal gap |
| ----- | ---------------------- | -------------------------- | ------------------------- | ------------- |
| Owner domain | E4 | C2 | Scoped administration, tenant/project isolation, lifecycle control, data governance, quotas, rollback/kill, migration, and owner evidence. | Strong local owners rarely define tenant, retention, residency, legal hold, cost, and fleet administration together. |
| Runtime relationship | E4 | C2 | Principal and endpoint identity, credential generation, delegated authority, policy/approval, network path, revocation, version negotiation, cancellation, and correlation. | Relationships are source-real but credential, tenant, network, policy, and attempt identities are not consistently portable. |
| Evidence contract | E4 | C2 | Subject/generation, policy/config version, freshness, integrity, redaction, retention, export, and fleet aggregation. | Readiness and Doctor are strong analogues; audit integrity, disclosure, retention, and missing/stale fleet evidence remain uneven. |
| Projection | E3 | C2 | Role-based authorization, redaction, stable machine meaning, accessibility/localization, fleet automation, SIEM/support export, and partial-capability rendering. | CLI/events are stronger than fleet admin, auditor, support, accessibility, and data-governance projections. |

## Facility Matrix

Obligations use:

- `A`: administration/governance;
- `I`: identity/access/trust;
- `D`: data governance/privacy;
- `O`: operations/fleet/reliability;
- `N`: network/private connectivity/isolation;
- `E`: evidence/compliance/support;
- `R`: resource/financial governance;
- `X`: integration/portability/evolution; and
- `U`: user/admin experience.

| Facility | Primary layer | Need | Obligations | Coverage | Enterprise adoption blocker |
| -------- | ------------- | ---- | ----------- | -------- | --------------------------- |
| Catalog and discovery | Projection/composition | E3 | A O E X U | C2 | No complete org-approved catalog, provenance/trust, compatibility, entitlement, or fleet-drift contract. |
| Configuration and activation | Owner domain | E4 | A I D O N E X U | C3 | Ordered enterprise authority, tenant scope, provenance, staged fleet rollout, and portable accepted generation remain proposed. |
| Extensions and composition | Composition | E4 | A I D O N E X | C2 | Plugin/skill/Claw manifests, install, policy, records, and activation are source-real; composition ownership, dependency conflicts, portable bundles, and cross-family compatibility remain incomplete. |
| Identity and lifetimes | Cross-cutting relationship lens | E4 | I D O E X | C2 | Principal, tenant, credential, policy, resource, and retention identities are not yet mapped with the runtime objects. |
| Agent execution | Owner domain | E4 | I D O N E R X | C3 | Per-run policy/credential/data/network/budget attribution and fleet kill/support evidence are incomplete. |
| Delegated execution | Runtime relationship/child owner | E4 | I O N E R X | C2 | Durable child admission, proxy completion authority, cross-store settlement, network scope, and enterprise A2A default-deny evidence need strengthening. |
| Models and provider routing | Composition/execution | E4 | A I D O N E R X | C2 | Credential governance, provider allow/deny policy, private endpoints, egress, cost controls, attempt identity, and portable usage evidence are incomplete. |
| Tools, MCP, and external actions | Composition/authority/execution | E4 | I D O N E R X | C2 | Trusted target, approval, side-effect idempotency, DLP, network boundary, and cross-runtime evidence remain owner-fragmented. |
| Session continuity | Owner domain | E4 | A I D O N E X | C2 | Retention, legal hold, eDiscovery/export, deletion, residency, encryption/key ownership, remote-store boundaries, and tenant isolation are not complete. |
| Context assembly and compaction | Projection/runtime relationship | E4 | I D N E R X | C2 | Input provenance, classification/DLP, remote retrieval boundaries, hidden-context disclosure, token/cost budgets, and engine compatibility need explicit contracts. |
| Memory | Owner domain/projection | E4 | A I D N E R X | C1 | Corpus ownership, classification, consent, retention, correction, deletion, legal hold, embedding/index residency, and cross-source conflict are open. |
| Messaging and channels | Owner domain/projection/transport | E4 | I D O N E X U | C2 | Enterprise identity, DLP, retention/eDiscovery, data residency, network policy, malware scanning, approved channels, and durable delivery evidence are incomplete. |
| Scheduling and background work | Owner domain | E3 | A I O E R X | C2 | Durable leases, fleet ownership, quotas, missed-run policy, maintenance windows, and operator evidence need consolidation. |
| State continuity | Owner/composition | E4 | A I D O N E X | C3 | Encryption/key ownership, residency, private backup paths, retention/legal hold, deletion across backups, and fleet restore authority remain incomplete. |
| Hosting and lifecycle | Owner boundary | E4 | A I O N E R X | C3 | Tenant isolation, private networking, autoscale/capacity, fleet rollout, maintenance windows, and SLO ownership need a complete profile. |
| Readiness | Evidence contract | E3 | A O E X U | C3 | Authorization scope, redaction, retained evidence integrity, fleet freshness, and mixed-version comparability remain open. |
| Policy, trust, and approval | Owner/cross-cutting | E4 | A I D O N E X | C2 | Principal/tenant model, stable runtime gates, network/data-movement policy, fail posture, attestation integrity, delegated administration, and fleet rollout need consolidation. |
| Diagnostics and repair | Evidence/action | E3 | A I D O N E X U | C3 | Support-bundle redaction, tenant scoping, controlled remote collection, evidence retention, fleet repair authority, and auditor-safe export need completion. |
| Signals, telemetry, and audit | Projection/cross-cutting | E4 | I D O N E R X | C2 | Audit integrity, access, retention/legal hold, tenant partitioning, controlled export, SIEM integration, schema/versioning, and telemetry-versus-audit guarantees are incomplete. |
| Localization and presentation | Projection | E2 | D E X U | C3 | Enterprise admin/auditor accessibility, locale policy, translated support evidence, and complete surface coverage remain uneven. |
| Hosting integration | Composition | E4 | A I D O N E X | C3 | Tenant-aware host bindings, managed identity, credential renewal, private connectivity, data-boundary propagation, and portable conformance need completion. |
| Credentials, secrets, and auth profiles | Owner/binding portfolio | E4 | A I D O N E X U | C3 | SecretRef, profile, refresh/cooldown, active-surface, degraded-state, and redaction contracts are strong; federation, tenant/KMS, governed break-glass, private retrieval, revocation proof, and fleet rollout remain incomplete. |
| Workspace and filesystem ownership | Owner/cross-cutting resource model | E4 | A I D O N E R X U | C2 | Strong local path ownership and containment; tenant/project scope, classification, DLP, KMS, malware scanning, retention/legal hold, governed remote providers, and fleet attestation remain external. |
| Privacy, retention, export, and deletion | Cross-cutting obligation/evidence portfolio | E4 | A I D O N E X U | C2 | Owner-specific cleanup, archive, redaction, snapshot, and delete paths exist; classification, legal hold, eDiscovery, residency/KMS, copy propagation, backup/provider purge, and fleet completion evidence are incomplete. |
| Resource governance | Cross-cutting policy/relationship/projection portfolio | E4 | A I D O N E R X U | C2 | Strong local limits, admission, leases, and usage observations exist; tenant/project quotas, fairness, reservations, durable cross-node leases, chargeback, fleet capacity, and SLO evidence are incomplete. |
| Transport, protocol, and API evolution | Runtime relationship/projection portfolio | E4 | A I D O N E R X U | C3 | Gateway v4, min/max ranges, N-1 node/probe skew, capabilities, structured errors, additive fields, idempotency, reconnect, and ACP replay are strong; cross-surface inventory, support windows, replay declarations, portable settlement, fleet conformance, and removal gates remain incomplete. |
| Supply-chain and artifact trust | Composition/policy/evidence/lifecycle portfolio | E4 | A I D O N E R X U | C2 | Strong manifests, integrity, path/archive safety, install policy, scanning, rollback, quarantine, provenance records, update/removal, and activation separation; signed publisher/build provenance, SBOM, org trust, revocation, fleet inventory, and promotion evidence remain incomplete. |
| Nodes, devices, pairing, and remote capabilities | Owner/relationship/execution/evidence portfolio | E4 | A I D O N E R X U | C3 | Strong pairing, role-bound tokens, generation fencing, capability catalogs, command policy, invocation streaming/cancellation, presence/wake, disconnect settlement, removal, and N-1 skew; federated attestation, posture, tenant administration, cross-Gateway ownership, offline revocation convergence, and host-peer identity remain incomplete. |
| Install, update, release, and compatibility | Owner/composition/evidence portfolio | E4 | A I D O N E R X U | C3 | Strong target/channel resolution, local activation/recovery, schema refusal, migration ownership, plugin convergence, release proof, and upgrade-survivor evidence; portable component manifests, rollout rings/windows/holds, semantic fleet gates, exception expiry, and convergence evidence remain incomplete. |

## Enterprise Table Stakes

The matrix identifies these as common blockers across multiple facilities:

1. **Scoped enterprise identity**: principal, tenant/org/project/workspace, role,
   delegated authority, service identity, and revocation.
2. **Credential and binding generation**: which credential, policy, endpoint,
   and accepted config governed a relationship or action.
3. **Data governance**: classification, residency, encryption, retention, legal
   hold, export/eDiscovery, deletion, and backup interaction.
4. **Fleet operation**: desired/accepted generation, staged rollout, drift,
   partial failure, rollback, mixed versions, and kill/drain.
5. **Decision evidence**: subject, time, owner, policy/config generation,
   result, integrity, redaction, retention, and correlation.
6. **Resource governance**: tokens, model cost, rate limits, concurrency,
   queues, storage, and capacity.
7. **Private and portable integration**: managed identity, private network,
   stable API/protocol contracts, export, replacement, and no mandatory hosted
   dependency.

## Strongest Enterprise Foundations

- Configuration activation already has candidate, accepted generation,
  conflict, rollback, supersession, and restart-recovery semantics.
- Readiness provides bounded current-state evidence with freshness and
  required/advisory meaning.
- Doctor provides explainable findings and explicit repair effects.
- State continuity provides fencing, recovery, dirty/synced, quarantine, and
  restore concepts.
- Hosting integration demonstrates owner-first bindings instead of a universal
  service bus.
- Agent execution, session continuity, model runtimes, tools, and delegation
  now expose enough identities to attach enterprise policy and evidence without
  redesigning the runtime.

## Highest Enterprise Gaps

### P0: E4 with C1

- memory governance.

### P1: E4 with C2

- identity and lifetimes;
- extensions and composition;
- delegated execution;
- models/provider routing;
- tools/MCP/actions;
- session continuity;
- context assembly;
- messaging/channels;
- policy/trust/approval;
- audit/telemetry;
- workspace/filesystem ownership;
- privacy/retention/export/deletion; and
- resource governance;
- supply-chain and artifact trust.

### P2: E4 with C3

- configuration activation;
- agent execution;
- credentials/secrets/auth profiles;
- state continuity;
- hosting/lifecycle;
- hosting integration;
- transport/protocol/API evolution; and
- nodes/devices/pairing and remote capabilities; and
- install/update/release compatibility.

P2 does not mean low importance. It means these areas have strong native seams
that enterprise extensions can reuse.

## Product Boundary

Enterprise support should add optional contracts and integrations for:

- federation and managed identity;
- tenant/fleet administration;
- policy and attestation;
- private networking;
- audit/SIEM/compliance export;
- data governance and legal workflows;
- cost/resource management; and
- staged rollout and support.

It should not require:

- an enterprise control plane for local personal operation;
- one central store for all owner state;
- one universal policy or resource object;
- one mandatory UI;
- hosted connectivity for core runtime behavior; or
- enterprise terminology in ordinary owner-native workflows.

External comparison:
`enterprise-comparators-2026-08-01.md`.
