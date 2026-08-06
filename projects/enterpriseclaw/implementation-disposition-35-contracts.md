# EnterpriseClaw Implementation Disposition for All 35 Contracts

## Decision

Every EnterpriseClaw contract is assigned across four implementation tracks:

| Track | Purpose | Durable rule |
| --- | --- | --- |
| **A. Upstream OpenClaw** | The smallest portable owner semantics, local behavior, public protocol, and conformance deltas | Improve ordinary OpenClaw independently of Scout or Lobster; do not file all 35 EnterpriseClaw contracts upstream |
| **B. OpenClaw fork integration** | Incubation, compatibility adapters, private-host adoption, and temporary composition | Bounded and replaceable; never the permanent semantic owner |
| **C. Lobster/Scout service** | Tenant, fleet, managed identity, policy, storage, rollout, evidence, and administration | Own enterprise hosting decisions, not OpenClaw facility semantics |
| **R. Independent Rust component** | Replace a complete owner behind a language-neutral contract | Public and reusable beyond the fork; delete the superseded TypeScript owner |

The first three tracks answer where work happens now. The Rust track preserves
the ability to become broader than one OpenClaw fork.

The 35 contracts are the EnterpriseClaw architecture portfolio. They are not
35 upstream RFCs, 35 services, or 35 implementation projects.

## Portfolio Rule

```text
portable semantics
  -> upstream OpenClaw contract

Scout-specific adoption
  -> bounded fork or plugin adapter

cross-tenant managed composition
  -> Lobster/Scout service

stable owner boundary
  -> independently reusable Rust implementation
```

A fork component is acceptable when it proves or adopts a contract. It becomes
architecture debt when it owns portable semantics indefinitely.

## Planning Levels

```text
35 EnterpriseClaw contracts
  -> 13 area implementation packages
     -> minimal upstream asks
     -> bounded fork patches and adapters
     -> Lobster/Scout services and adopters
     -> independent Rust owner components
        -> repo-specific work items and release gates
```

One area package may produce:

- no upstream ask because the requirement is purely managed composition;
- one upstream ask covering a narrow portable seam;
- several upstream asks owned by different OpenClaw facilities; or
- one upstream ask shared by multiple EnterpriseClaw contracts.

Do not use the EC identifier as the automatic upstream issue or RFC boundary.

## What Each Track May Own

### A. Upstream OpenClaw

Upstream owns:

- local owner identity and state;
- public configuration and runtime semantics;
- agent, tool, channel, provider, session, memory, node, workspace, and plugin
  contracts;
- local failure, retry, compatibility, and lifecycle behavior;
- language-neutral protocols and conformance fixtures; and
- local CLI, Status, Doctor, and Control UI projections.

An upstream proposal must:

- start from a current OpenClaw owner and concrete missing behavior;
- be independently useful without EnterpriseClaw, Scout, or Lobster;
- avoid enterprise tenancy, Microsoft product, and fleet-control vocabulary;
- name the smallest API, state, event, protocol, or lifecycle delta;
- include accepted and structured failure proof;
- preserve local behavior and compatibility; and
- identify the fork patch or inference it deletes.

### B. OpenClaw fork integration

The fork may own:

- feature-gated prototypes;
- Scout-specific adapters and compatibility shims;
- private connector or transport adoption;
- temporary patch carry-forward;
- migration readers and writers; and
- canary selection between TypeScript and Rust owners.

Fork work is managed in three classes:

| Class | Meaning | Required exit |
| --- | --- | --- |
| **B1 Core incubation patch** | A missing portable seam is proven against current OpenClaw source | Upstream or delete |
| **B2 Scout adopter/plugin** | OpenClaw-specific integration with a managed Scout capability | Stable plugin/host seam, Lobster move, or delete |
| **B3 Compatibility/release patch** | Temporary patch carry-forward, migration, mixed-version, or canary wiring | Upstream release, migration completion, Rust cutover, or delete |

Every fork component must name one exit:

1. upstream;
2. move into a normal plugin/extension;
3. move into Lobster;
4. replacement by a Rust owner; or
5. deletion.

### C. Lobster/Scout service

Lobster may own:

- tenant desired state and administration;
- Microsoft identity and enterprise federation;
- managed secret materialization;
- deployment, allocation, rollout, quarantine, and repair;
- cross-owner restore and lifecycle orchestration;
- fleet posture and containment;
- durable audit retention, signing, and compliance export;
- enterprise budgets, obligations, and reporting; and
- Microsoft 365 and private-service physical integration.

Lobster must not become canonical owner of OpenClaw sessions, memory, tools,
channels, provider effects, plugin state, or workspace content.

### R. Independent Rust components

Rust components are published as owner implementations, protocol peers, or
conformance tools that can run:

- in the EnterpriseClaw fork;
- with upstream OpenClaw;
- inside Lobster/Scout hosting;
- in another OpenClaw distribution; or
- as independently useful open-source components.

The Rust strategy replaces owner components, not utility files or arbitrary
TypeScript directories.

Every Rust process also needs a deployment profile:

- startup and ready-time budget;
- CPU and memory budget;
- loopback/network exposure;
- health and crash-recovery semantics;
- initialization ordering;
- protocol and artifact compatibility;
- security-patch ownership; and
- install, upgrade, downgrade, and rollback proof outside the source workspace.

## Cross-Cutting Acceptance Gates

These gates apply before an area package is implementation-ready.

### Runtime gate

- No unbounded network or storage call is added to the Gateway hot path.
- Governance hooks declare latency, timeout, cancellation, and failure posture.
- Protected effects fail closed when authority is missing or unverifiable.
- Low-risk observation may degrade only with explicit evidence and no false
  success.

### Write-path gate

- Local, Cowork, Loop, Graph, CLI, and managed writes use the same owner
  validation and activation path.
- No connector writes directly to canonical OpenClaw files or owner stores.
- Bidirectional connectors declare conflict, loop, retry, and idempotency
  semantics.

### Operator gate

- Operators see owner status, readiness, findings, and safe actions rather than
  A/B/C/R implementation tracks.
- Raw OpenClaw local operation remains available when managed infrastructure is
  absent.
- Each managed capability replaces a manual script or names the unavoidable
  new operational cost.

### Security gate

- High-risk authority is bound to the exact normalized target and generations
  used by execution.
- There is one authoritative enforcement point and no fast-path bypass.
- Kill, revoke, quarantine, and containment operations report per-owner or
  per-unit settlement rather than optimistic fleet success.
- Evidence is disclosure-safe, durable where required, and distinct from
  telemetry.

### Release gate

- The supported tuple of upstream base, fork generation, Lobster services,
  Rust components, and protocol versions is explicit.
- Upgrade order, downgrade, rollback, partial activation, and stale-component
  behavior are proved.
- Published artifacts install and run in a fresh environment without workspace
  dependencies.
- Fork proof is tied to the current base revision and current patch head.

### Ecosystem and repository gate

- Skills, plugins, channels, and workspaces remain usable without Rust rewrites.
- Independent Rust components have a public contract and no private
  Lobster/Scout dependency.
- Cross-repository dependencies follow one direction and do not make upstream
  OpenClaw depend on the EnterpriseClaw design repository.
- Every new security-sensitive command is distinct; duplicate command,
  approval, and audit surfaces are rejected.

### Fleet gate

- Rollout and repair settle per deployment unit.
- Partial failure does not rewrite successful units or require a whole-fleet
  retry.
- Desired, observed, converged, quarantined, and unknown remain distinct.
- A failed managed control plane does not fabricate healthy local state.

## Contract-by-Contract Disposition

### Experience and administration

| ID | A. Upstream OpenClaw | B. Fork integration | C. Lobster/Scout | R. Rust/generalization |
| --- | --- | --- | --- | --- |
| **EC-001 Owner State Projection** | Publish the versioned owner-state envelope and use it in local Status, CLI, Control UI, and Doctor surfaces. | Adapt current Scout-specific status DTOs to the envelope until consumers migrate. | Aggregate audience-bound tenant and fleet projections; never mutate owners through the projection store. | Keep the envelope language-neutral so Rust owners and supervisors emit the same facts. |
| **EC-002 Diagnostic and Repair Plans** | Standardize structured findings, preview, repair authority, partial settlement, and rollback in Doctor. | Carry private Scout repair adapters only where upstream has no owner command yet. | Orchestrate fleet repair, approvals, maintenance windows, and cross-unit result collection. | Rust supervisor and node implementations emit owner-native findings and execute only their bounded repairs. |

### Identity, authority, and trust

| ID | A. Upstream OpenClaw | B. Fork integration | C. Lobster/Scout | R. Rust/generalization |
| --- | --- | --- | --- | --- |
| **EC-003 Credential Runtime Binding** | Preserve opaque credential/profile identity, principal continuity, runtime binding, revocation, and non-secret operation evidence. | Host credential-slot and origin-binding adapters while upstream seams mature. | Materialize Microsoft/tenant credentials, rotate them, and attest the exact runtime binding without exporting reusable secrets. | Candidate Rust credential broker/verifier after the contract stabilizes; provider-specific token owners remain pluggable. |
| **EC-004 Authorization and Approval Decisions** | Define allow, deny, review, and modify decisions bound to normalized intent, generations, expiry, and revocation. | Adapt existing approval hooks to Scout policy and approval experiences without bypass paths. | Own enterprise policy distribution, approver identity, separation of duties, decision retention, and admin UX. | Rust decision verifier/enforcement boundary is a later security component; policy authorship remains external. |
| **EC-005 Trust Revocation and Federation** | Keep pairing, local trust, device identity, and revocation settlement portable. | Bridge existing OpenClaw trust identities to Microsoft/Scout principals during migration. | Own Entra/tenant federation, organization trust, emergency revocation, and cross-cell propagation. | Rust node/supervisor enforce trust generations locally; federation remains adapter-driven rather than hard-coded to Microsoft. |

### Configuration and activation

| ID | A. Upstream OpenClaw | B. Fork integration | C. Lobster/Scout | R. Rust/generalization |
| --- | --- | --- | --- | --- |
| **EC-006 Effective Configuration Generations** | Land ordered configuration sources, field authority, validation, accepted/effective generations, conflict, and transactional activation. | Maintain the current managed-config loader/adopter only until the upstream contract ships. | Own global, tenant, and operator desired-state documents, source materialization, rollout, and admin editing. | Rust owners consume the same effective-generation envelope; a Rust config parser is optional, not a new semantic owner. |
| **EC-007 Owner Readiness Observations** | Let each owner publish generation-bound readiness conditions, reasons, freshness, and remediation. | Add hosting-profile adapters for owners that cannot yet emit the portable observation. | Aggregate host, tenant, and fleet readiness; schedule repair without redefining owner readiness. | Rust node and supervisor become first-class readiness producers through the same public contract. |

### Agent runtime and orchestration

| ID | A. Upstream OpenClaw | B. Fork integration | C. Lobster/Scout | R. Rust/generalization |
| --- | --- | --- | --- | --- |
| **EC-008 Run and Attempt Bindings** | Stabilize run, attempt, context, model, policy, credential, runtime, and terminal settlement correlation. | Add evidence adapters where current Scout paths lose correlation. | Project and retain managed run facts; do not become the run owner. | A future Rust agent kernel must conform before it can replace the TypeScript run owner. |
| **EC-009 Delegated Execution Lifecycle** | Strengthen parent/child identity, delegated authority, cancellation, cleanup, restart, and terminal child settlement. | Carry only Scout-specific delegation adapters or policy gates. | Apply tenant admission, quotas, and operator visibility across delegated work. | Candidate for a later Rust execution kernel; not an early rewrite because it depends on sessions, tools, and models. |
| **EC-010 Scheduled Activation Lifecycle** | Keep schedule identity, occurrence identity, catch-up, cancellation, one-shot settlement, and downstream operation correlation in OpenClaw. | Host the payload-free wake projection adapter while scale-to-zero contracts mature. | Own durable wake retention, allocation timing, cross-pod arbitration, and compute activation. | A Rust scheduler/lease owner is a later replacement candidate once wake and occurrence contracts are portable. |

### Models, providers, and compute

| ID | A. Upstream OpenClaw | B. Fork integration | C. Lobster/Scout | R. Rust/generalization |
| --- | --- | --- | --- | --- |
| **EC-011 Provider Candidate Attempts** | Add stable candidate-attempt identity, credential/runtime fencing, fallback reason, and per-attempt settlement to provider routing. | Adapt private provider dispatch or traffic-governance paths without changing provider semantics. | Apply enterprise provider allowlists, network routing, capacity policy, and managed credentials. | Model transport workers may move to Rust after provider compatibility and effect boundaries stabilize. |
| **EC-012 Usage and Cost Reconciliation** | Emit complete per-run, per-candidate, retried, failed, cached, and settled usage facts. | Export normalized usage from private providers until upstream events cover them. | Own tenant budgets, allocation, chargeback, reporting, and admission policy. | Rust workers emit the same usage facts; a standalone reconciliation library can remain provider-neutral. |

### Actions, tools, and integrations

| ID | A. Upstream OpenClaw | B. Fork integration | C. Lobster/Scout | R. Rust/generalization |
| --- | --- | --- | --- | --- |
| **EC-013 Capability Surface Negotiation** | Standardize inert tool/plugin/node capability identity, versions, requirements, and unsupported behavior. | Maintain host integration bundles and private capability adapters until normal extension seams suffice. | Own enterprise admission, catalog curation, tenant enablement, and approved connector availability. | Rust nodes and workers consume and emit the same capability contract; JavaScript plugins remain supported. |
| **EC-014 Authorized External Effects** | Carry authority from decision through invocation to owner-native effect settlement and uncertainty. | Adapt hosted physical dispatch and private effect owners without creating a generic service bus. | Own enterprise authority, managed reconciliation, high-risk approval UX, and durable cross-owner evidence. | Rust enforcement and effect workers are candidates only when one owner can remain authoritative and unsafe dual execution is impossible. |

### Conversations, channels, and delivery

| ID | A. Upstream OpenClaw | B. Fork integration | C. Lobster/Scout | R. Rust/generalization |
| --- | --- | --- | --- | --- |
| **EC-015 Conversation Identity** | Preserve provider conversation, account, thread, route, session, turn, attachment, and provider-copy relationships. | Keep private Teams/Microsoft connector mappings in bounded channel adapters. | Own tenant routing policy and Microsoft 365 connector administration, not provider conversation truth. | Channel transport may later move to Rust, but conversation semantics stay channel-owned and protocol-neutral. |
| **EC-016 Delivery Settlement** | Add durable operation identity, fenced attempts, receipt revisions, replay declarations, partial effects, and unknown settlement. | Maintain private-channel durable delivery or reconciliation workers only where upstream owners cannot recover. | Own hosted queue capacity, managed reconciliation, and enterprise delivery reporting for Scout channels. | Durable delivery workers are later Rust candidates; accepted channel parts and provider IDs remain owner-native. |

### Knowledge, context, and continuity

| ID | A. Upstream OpenClaw | B. Fork integration | C. Lobster/Scout | R. Rust/generalization |
| --- | --- | --- | --- | --- |
| **EC-017 Session Continuity and Export** | Stabilize session/transcript generations, branch/reset/archive distinctions, export identity, omissions, and copy settlement. | Adapt Scout export destinations or legacy transcript assumptions during migration. | Own managed export destinations, retention policy, tenant administration, and delivery of produced artifacts. | A Rust agent kernel may later own sessions only after explicit migration and plugin compatibility; export formats remain language-neutral. |
| **EC-018 Context Assembly Contract** | Keep context assembly run-scoped, attributable, bounded, and separate from durable session or memory state. | Add Microsoft/Scout context providers through normal adapters, not core forks where possible. | Supply enterprise context sources and disclosure policy; do not store the canonical assembled prompt as business truth. | Rust kernel can implement the context contract later; provider and plugin context sources remain out-of-process compatible. |
| **EC-019 Memory Scope and ACL** | Define memory subjects, scopes, provenance, retrieval/write authority, revocation, and enforcement hooks in memory owners. | Carry private Microsoft memory providers or ACL adapters while public seams mature. | Own tenant policy, group membership, administration, and managed memory-service integration. | Rust memory index/enforcement components are possible later; no mandatory rewrite of existing memory plugins. |
| **EC-020 Memory Corpus Lifecycle** | Give corpora, derived indexes, imports, exports, rebuilds, retention, correction, and deletion explicit owner semantics. | Adapt Scout-specific corpus stores and migrations behind the public owner interface. | Own managed storage choices, residency, legal hold, backup, and administrative lifecycle policy. | Rust storage/index implementations may conform independently, but long-lived dual writes are prohibited. |
| **EC-021 Owner Checkpoints and Restore** | Publish owner checkpoint, compatibility, restore preview, admission fence, and local recovery-point contracts. | Maintain continuity providers, capture adapters, and restore adopters until portable interfaces land. | Own cross-owner acceptance, durable publication, allocation, restore orchestration, quarantine, and destruction authority. | Rust supervisor/continuity coordinator is a strong later owner for assembly and admission; owner-native state formats remain independent. |
| **EC-035 Workspace and Filesystem Boundaries** | Define workspace identity, path authority, sandbox binding, file/copy identity, temporary artifacts, containment, and cleanup. | Adapt managed volume, remote workspace, or private file-provider integrations. | Own hosted volume allocation, backup, residency, malware policy, and tenant storage administration. | Rust sandbox/filesystem worker is a later candidate; workspace data remains portable and usable outside Scout. |

### Runtime fabric and protocols

| ID | A. Upstream OpenClaw | B. Fork integration | C. Lobster/Scout | R. Rust/generalization |
| --- | --- | --- | --- | --- |
| **EC-022 Protocol Negotiation and Evolution** | Publish protocol/capability versions, required/optional fields, mixed-version behavior, upgrade order, and conformance fixtures. | Carry compatibility bridges only for bounded migration windows. | Enforce supported deployment matrices and prevent incompatible fleet admission. | The cross-language conformance suite is an independent public component and the foundation for all Rust replacements. |
| **EC-023 Streaming, Cancellation, and Replay** | Define ordering, backpressure, cancellation, deadlines, reconnect, replay, late results, and transport-versus-owner settlement. | Maintain bounded reverse-carrier or hosted transport adapters without semantic widening. | Own carrier deployment, connection lifecycle, scale, and network policy. | Rust protocol peers and carriers are early candidates because the contract is language-neutral and security-sensitive. |

### Nodes, devices, and edge

| ID | A. Upstream OpenClaw | B. Fork integration | C. Lobster/Scout | R. Rust/generalization |
| --- | --- | --- | --- | --- |
| **EC-024 Node Pairing and Trust** | Publish portable node identity, pairing, trust generation, revocation, connection incarnation, and capability freshness. | Bridge Scout device identities and private deployment metadata. | Own tenant enrollment, device inventory, organization policy, and fleet revocation propagation. | Rust Node Mode becomes the first authoritative replacement owner and remains usable with upstream OpenClaw. |
| **EC-025 Remote Node Invocation** | Stabilize invocation admission, routing, authority, operation identity, cancellation, settlement, and evidence. | Maintain hosted dispatch adapters while the public node contract evolves. | Own placement, network reachability, managed routing, and deployment policy. | Rust Node Mode owns execution for its supported profile; TypeScript Gateway remains a compatible coordinator. |
| **EC-026 Rust Node Runtime Profile** | Upstream the profile, protocol, capability, lifecycle, and conformance contract; upstream need not absorb all Rust source. | Keep the OpenClaw integration adapter, canary selector, packaging hooks, and compatibility fallback during migration. | Deploy, configure, update, monitor, and repair Rust nodes as Scout units. | Primary durable home is an independent open-source Rust project/crate that can serve upstream OpenClaw, the fork, Scout, or other hosts. Delete the superseded TypeScript node owner after conformance. |

### Extensibility, artifacts, and release

| ID | A. Upstream OpenClaw | B. Fork integration | C. Lobster/Scout | R. Rust/generalization |
| --- | --- | --- | --- | --- |
| **EC-027 Extension Capability Metadata** | Extend plugin/skill manifests with owner identity, versions, requirements, compatibility, lifecycle, and unknown-required fail-closed behavior. | Maintain Scout host-bundle and private-extension adapters until standard manifests cover them. | Own enterprise catalog, approval, distribution, enablement, and tenant policy. | Rust hosts consume metadata but do not require extensions to be rewritten from TypeScript/JavaScript. |
| **EC-028 Artifact Trust and Provenance** | Add digest, source, signature/provenance, dependency, revocation, install admission, and evidence to package/plugin paths. | Carry enterprise verifier and private feed adapters where upstream stays provider-neutral. | Own signing policy, trusted feeds, quarantine, organization admission, and compliance reporting. | Rust verifier/updater is a strong bounded security component with a reusable public contract. |
| **EC-029 Release Activation and Recovery** | Define exact target artifact, migration, process handoff, readiness, rollback, recovery, and current-version truth. | Maintain LTS patch carry-forward and compatibility adapters while upstream contracts land. | Own release promotion, staged rollout, fleet policy, quarantine, rollback coordination, and support posture. | Rust supervisor/updater should eventually own host-critical activation while remaining compatible with upstream artifacts. |

### Data governance and resource control

| ID | A. Upstream OpenClaw | B. Fork integration | C. Lobster/Scout | R. Rust/generalization |
| --- | --- | --- | --- | --- |
| **EC-030 Data Lifecycle Obligations** | Give each semantic owner export, delete, expire, hold, retained, blocked, and unknown settlement capabilities. | Adapt private stores and connectors to the common lifecycle result model. | Own tenant obligations, legal hold, residency, retention schedules, keys, and cross-owner operation tracking. | Rust lifecycle/evidence coordinator may track settlement but never owns the underlying content. |
| **EC-031 Resource Admission and Usage** | Publish owner-scoped limits, admission decisions, leases/claims where required, usage, exhaustion, and settlement. | Carry enterprise policy and managed-runtime adapters during rollout. | Own tenant quotas, budgets, placement, allocation, fairness, and fleet capacity. | Rust supervisor, scheduler, and isolated workers are natural enforcement candidates after durable lease proof. |

### Operations, assurance, and fleet

| ID | A. Upstream OpenClaw | B. Fork integration | C. Lobster/Scout | R. Rust/generalization |
| --- | --- | --- | --- | --- |
| **EC-032 Hosting Lifecycle and Readiness** | Publish standard hosting profiles and start, ready, drain, stop, restart, upgrade, and failure contracts. | Maintain Scout host adapters and profile-specific runtime wiring until public seams suffice. | Own allocation, deployment topology, service lifecycle, SLOs, routing, and host repair. | Rust host supervisor is the intended reusable owner for process lifecycle and containment. |
| **EC-033 Evidence, Audit, and Attestation** | Emit typed, redacted owner evidence and distinguish it from telemetry; publish evidence-reference contracts. | Carry exporters and compatibility transforms for private events. | Own durable append, signing, verification, retention, disclosure, SIEM export, and compliance packaging. | Rust audit-chain writer/verifier is a strong independent security component; owners still produce their own facts. |
| **EC-034 Fleet Convergence and Containment** | Expose per-unit generations, conditions, repair capabilities, and containment settlements required by any host. | Maintain deployment adapters mapping Scout units to the public per-unit contract. | Primary managed home: desired target sets, rollout, per-child settlement, targeted repair, quarantine, break-glass, and fleet projection. | Rust supervisor provides reliable unit-local enforcement; fleet desired state remains a managed projection rather than a Rust runtime database. |

## Durable Home Summary

### Must become upstream/public contracts

All 35 contracts need explicit EnterpriseClaw architecture definitions. Only
their portable owner-facing deltas should become upstream proposals. Many
contracts also require upstream TypeScript implementation because they
strengthen current OpenClaw owners; their enterprise composition remains in
Lobster specifications.

The upstream bar is:

- useful to ordinary OpenClaw;
- no Scout or Lobster dependency;
- local mode remains complete;
- owner semantics stay owner-native; and
- accepted and failure fixtures are public.

The upstream unit is the smallest maintainable OpenClaw change, not the
EnterpriseClaw contract document.

### Appropriate long-lived fork components

Only OpenClaw-specific integration pieces should remain in the fork:

- compatibility adapters for Scout-hosted identity, config, channels, and
  transports;
- canary and selection wiring for Rust components;
- private Microsoft connector adoption;
- bounded migration code; and
- release composition while upstream support is incomplete.

These components remain small and must not accumulate portable semantics.

### Appropriate Lobster/Scout services

The durable Lobster service set is:

1. desired configuration and tenant administration;
2. identity/federation and managed credential materialization;
3. enterprise policy, approval, and high-risk effect administration;
4. deployment, allocation, hosting, rollout, and repair;
5. durable wake and scale-to-zero coordination;
6. cross-owner checkpoint publication and restore;
7. lifecycle obligations, quotas, and budgets;
8. durable audit, signing, retention, and compliance export; and
9. fleet convergence, quarantine, and containment.

None of these services should become a second owner of OpenClaw runtime state.

Managed decisions must still be enforced at the authoritative OpenClaw or Rust
owner boundary. A cloud policy response, projection, queue entry, or fleet
record is not proof that the local operation was admitted or completed.

### Independent Rust roadmap

The recommended extraction order remains:

1. cross-language conformance suite;
2. Rust Node Mode;
3. Rust host supervisor/updater;
4. protocol parser and secure carrier;
5. artifact verifier and evidence writer;
6. scheduler, resource admission, and isolated workers;
7. model/tool/channel transport workers;
8. optional agent execution kernel; and
9. session or memory owners only after explicit migration proof.

## Migration and Deletion Gates

For every contract:

1. define the public owner/relationship contract;
2. prove accepted, rejected, stale, incompatible, cancelled, restart, and
   unknown behavior as applicable;
3. land or publish the portable contract;
4. keep the fork adapter feature-gated;
5. implement Lobster only for managed composition;
6. introduce Rust in shadow mode behind the same contract;
7. select exactly one authoritative owner at admission;
8. canary and prove rollback without dual effects;
9. delete the fork workaround or superseded TypeScript owner; and
10. retain the contract so another host or distribution can implement it.

## Next-Level Decomposition

After this portfolio plan is accepted, create one implementation package for
each of the thirteen areas. Each package must contain:

1. **Delivery inventory reconciliation** - existing OpenClaw source, live
   upstream PRs/issues/RFCs, Lobster implementations, current carried patches,
   and replacement/deletion state.
2. **Current owner and source seams** - the exact OpenClaw, fork, Lobster, and
   prospective Rust owners involved.
3. **Final upstream asks** - issue/RFC-sized residual portable deltas with current
   behavior, proposed behavior, proof, compatibility, and deleted inference.
4. **Fork ledger** - every B1, B2, and B3 patch with base revision, owner,
   purpose, risk, tests, upstream link, and exit.
5. **Lobster work** - services, adopters, schemas, operations, data ownership,
   SLOs, and failure behavior.
6. **Rust work** - owner boundary, protocol, conformance suite, deployment
   profile, canary, rollback, and TypeScript deletion target.
7. **Operator journey** - status, readiness, finding, approve/repair/retry/
   rollback/restore behavior.
8. **Work items** - repo, component owner, dependency, acceptance proof,
   release gate, and deletion mapping.

Start with the areas that exercise the architecture most strongly:

1. operations, assurance, and fleet - initial package now lives at
   `implementation-packages/operations-assurance-fleet.md`;
2. knowledge, context, and continuity;
3. identity, authority, actions, and effects;
4. runtime fabric, nodes, and Rust;
5. configuration and activation.

## Disproof Conditions

Revise this map if:

- an allegedly portable contract is useful only to Scout;
- a proposed Lobster service actually owns OpenClaw semantic state;
- a fork component cannot name an upstream, plugin, Lobster, Rust, or deletion
  exit;
- a Rust boundary cannot name a complete owner lifecycle and TypeScript
  deletion target; or
- upstream compatibility requires permanent dual authority.
