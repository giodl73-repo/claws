# EnterpriseClaw Initial Implementation Map

## Purpose

This map assigns the first implementation strategy for each EnterpriseClaw
swim lane.

It does not select detailed APIs or packages. It decides whether each
architectural piece should begin as:

- **Existing OpenClaw** - use the current owner and substantially current
  behavior.
- **Fork + focused RFC** - adapt an existing OpenClaw owner in the
  EnterpriseClaw fork, prove the contract, then propose the smallest upstream
  RFC or PR.
- **New component** - introduce a missing owner or projection only when no
  existing component can coherently own the capability.

## Portfolio Rule

Do not classify an entire swim lane as a rewrite.

The normal pattern is:

```text
existing owner
+ forked contract improvements
+ one small missing component
-> target lane
```

New components should usually be optional control, evidence, conformance, or
supervision surfaces around existing runtime owners.

## Summary

| Lane | Existing OpenClaw foundation | Fork + focused RFC | New component |
| ---- | ---------------------------- | ------------------ | ------------- |
| Experience and administration | CLI, Control UI surfaces, Doctor patterns, catalog/localization foundations | Consistent owner/generation/certainty projection and previewable mutation | Managed administration projection if existing UI cannot remain owner-neutral |
| Identity, authority, and trust | Credentials, auth profiles, policies, approvals, pairing | Bind authority generations to actual invocations and settlement | Optional federation adapters and durable authority-evidence projection |
| Configuration and activation | Config owner, schema validation, reload paths | Accepted/active/ready generations, conflict and rollback contracts | Optional managed desired-state projection |
| Agent runtime and orchestration | Runs, attempts, delegated execution, cancellation | Durable binding, settlement, cleanup, and scheduling boundaries | Independent scheduler only if it proves a distinct lifecycle owner |
| Models, providers, and compute | Provider catalog, routing, fallback, model-call diagnostics | Candidate-attempt identity, usage reconciliation, credential fencing | Optional cost/allocation projection |
| Actions, tools, and integrations | Tools, MCP, plugin and host invocation, approvals | Approval-to-invocation-to-effect correlation | Owner-neutral effect reconciliation service only for asynchronous effects |
| Conversations, channels, and delivery | Messaging core and channel owners | Delivery identity, certainty, retry, and lifecycle contracts | Durable delivery worker only where current owners cannot recover |
| Knowledge, context, and continuity | Sessions, transcripts, context engine, memory, workspace | Copy/lifecycle evidence and explicit generation boundaries | State-continuity coordinator and owner-checkpoint composition |
| Runtime fabric and protocols | Gateway, ACP, MCP, plugin transports | Negotiation, replay, cancellation, mixed-version, and evidence contracts | Language-neutral conformance suite |
| Nodes, devices, and edge | Gateway node registry, invocation, pairing | Public trust envelope and settlement semantics | Rust Node Mode |
| Extensibility, artifacts, and release | Plugins, skills, installers, update/release paths | Capability metadata, provenance, compatibility, activation, recovery | Owner-neutral catalog/provenance projection where missing |
| Data governance and resource control | Owner cleanup, retention fragments, local limits and usage | Owner lifecycle capabilities, settlement, admission, and usage correlation | Optional lifecycle coordinator and managed obligation service |
| Operations, assurance, and fleet | Process lifecycle, readiness fragments, Doctor, diagnostics | Hosting lifecycle, readiness conditions, containment, audit distinctions | Rust supervisor, fleet posture projection, durable assurance components |

## 1. Experience and Administration

| Architectural piece | Initial implementation | Designation | Reason |
| ------------------- | ---------------------- | ----------- | ------ |
| Local operator shell | OpenClaw CLI | Existing OpenClaw | It is the natural local projection and must remain usable without managed infrastructure. |
| Findings and repair | Doctor-style findings and repair paths | Fork + focused RFC | Preserve existing repair owners while standardizing preview, conflict, partial result, and evidence. |
| Control experience | Existing Control UI surfaces | Fork + focused RFC | Adapt projections to show owner, generation, freshness, certainty, and remediation without mirroring runtime state. |
| Discovery | Existing catalog and list/status surfaces | Fork + focused RFC | Keep definitions inert and owner-attributed; separate discovery from activation. |
| Localization/presentation | Existing localization and channel renderers | Fork + focused RFC | Establish stable machine meaning and fallback without centralizing rendering. |
| Managed administration | Owner-neutral administrative projection | New component | Needed only if existing Control UI cannot support governed multi-owner workflows without becoming canonical state. |

**Initial lane owner**: existing OpenClaw experience surfaces.

## 2. Identity, Authority, and Trust

| Architectural piece | Initial implementation | Designation | Reason |
| ------------------- | ---------------------- | ----------- | ------ |
| Credential and auth-profile ownership | Current credential/profile owners | Existing OpenClaw | Secret resolution, refresh, and redaction already have concrete owners. |
| Policy evaluation | Existing tool/plugin/host policy seams | Fork + focused RFC | Retain owner policy semantics but expose generation, decision, constraints, and reason. |
| Approval | Existing approval flows | Fork + focused RFC | Preserve approval behavior while carrying its identity into execution/effect evidence. |
| Pairing and device trust | Current pairing owner | Fork + focused RFC | Add trust-generation and revocation settlement without replacing pairing. |
| Federation | Identity and secret-provider adapters | New component | Enterprise federation should be optional adapters, not a new universal identity database. |
| Authority evidence | Disclosure-safe decision/use projection | New component | Existing runtime facts need durable composition without storing secrets or raw parameters. |

**Initial lane owner**: existing credential, policy, approval, and pairing
owners; no universal identity service.

## 3. Configuration and Activation

| Architectural piece | Initial implementation | Designation | Reason |
| ------------------- | ---------------------- | ----------- | ------ |
| Local authored configuration | Current OpenClaw configuration owner | Existing OpenClaw | It is already the local source of intent. |
| Validation | Existing schema and semantic validation | Fork + focused RFC | Compose owner findings and compatibility before mutation. |
| Effective generation | Current config resolution and runtime snapshot | Fork + focused RFC | Make provenance, conflicts, accepted generation, and rejection explicit. |
| Activation | Existing owner reload/activation seams | Fork + focused RFC | Separate accepted, active, degraded, rolled-back, and ready states. |
| Managed desired state | Optional managed-config projection | New component | It expresses authority and desired generations but must not become runtime truth. |
| Fleet convergence | Operations projection over host evidence | New component | No existing owner should become a central fleet-state database. |

**Initial lane owner**: current OpenClaw configuration owner.

## 4. Agent Runtime and Orchestration

| Architectural piece | Initial implementation | Designation | Reason |
| ------------------- | ---------------------- | ----------- | ------ |
| Run and attempt lifecycle | Current agent execution | Existing OpenClaw | Mature execution semantics should remain authoritative. |
| Delegated execution | Current subagent/delegation runtime | Existing OpenClaw | Existing lineage and child execution provide the base owner. |
| Binding evidence | Run/attempt metadata extended in the fork | Fork + focused RFC | Bind context, model, credential, policy, tool, and runtime generations. |
| Cancellation and settlement | Existing abort/cancel paths | Fork + focused RFC | Distinguish requested cancellation from terminal owner/effect settlement. |
| Cleanup and recovery | Existing session/run cleanup | Fork + focused RFC | Make child and in-flight settlement durable through restart. |
| Scheduling/background ownership | Existing scheduling seams if coherent; otherwise a bounded scheduler | Fork + focused RFC first | Create a new component only if schedules, leases, retries, and terminal state prove an independent owner. |

**Initial lane owner**: current agent and delegated-execution runtimes.

## 5. Models, Providers, and Compute

| Architectural piece | Initial implementation | Designation | Reason |
| ------------------- | ---------------------- | ----------- | ------ |
| Model/provider definitions | Current provider/model catalog | Existing OpenClaw | Preserve provider-specific capabilities and compatibility. |
| Routing and fallback | Current routing owner | Existing OpenClaw | Selection and fallback behavior already exist. |
| Candidate-attempt identity | Extend fallback attempt model | Fork + focused RFC | Add the missing parent between run and actual provider calls. |
| Model-call correlation | Existing diagnostic model-call events | Fork + focused RFC | Stabilize redacted correlation and owner evidence. |
| Usage reconciliation | Existing run usage plus per-candidate partitions | Fork + focused RFC | Preserve failed/retried usage while making allocation inspectable. |
| Cost/allocation posture | Optional administrative projection | New component | Aggregate owner usage without becoming a global execution owner. |

**Initial lane owner**: current provider routing and model-call runtime.

## 6. Actions, Tools, and Integrations

| Architectural piece | Initial implementation | Designation | Reason |
| ------------------- | ---------------------- | ----------- | ------ |
| Tool definitions and run surfaces | Current tool/plugin registry | Existing OpenClaw | Existing definitions and per-run surfaces are mature. |
| Local and plugin invocation | Current tool runtime | Existing OpenClaw | Preserve tool-local execution semantics. |
| MCP invocation | Current MCP support | Existing OpenClaw | Keep MCP as one transport, not the universal owner. |
| Policy and approval binding | Existing policy/approval path extended through invocation | Fork + focused RFC | Prevent authority correlation from being discarded before execution. |
| Effect identity and certainty | Owner-specific adapters and result contracts | Fork + focused RFC | External systems must retain idempotency and effect semantics. |
| Asynchronous effect reconciliation | Small owner-neutral reconciliation coordinator | New component when needed | Only for effects that cannot settle in the original invocation; it stores correlation, not business state. |

**Initial lane owner**: current tool runtime plus external effect owners.

## 7. Conversations, Channels, and Delivery

| Architectural piece | Initial implementation | Designation | Reason |
| ------------------- | ---------------------- | ----------- | ------ |
| Shared semantic messaging | Current messaging core | Existing OpenClaw | Preserve semantic turns and routing. |
| Channel-native owners | Existing channel plugins/adapters | Existing OpenClaw | Provider message, thread, attachment, and receipt semantics remain channel-owned. |
| Identity correlation | Extend current message/session mappings | Fork + focused RFC | Keep semantic turn and provider identities distinct but linked. |
| Delivery attempts and receipts | Extend current delivery state | Fork + focused RFC | Expose accepted, delivered, failed, retrying, and unknown certainty. |
| Rendering and localization | Existing renderers | Fork + focused RFC | Bind rendering to capability and locale generation. |
| Durable delivery worker | Isolated worker for channels requiring recovery | New component only where needed | Do not impose one queue on channels that already own reliable delivery. |

**Initial lane owner**: current messaging core and channel owners.

## 8. Knowledge, Context, and Continuity

| Architectural piece | Initial implementation | Designation | Reason |
| ------------------- | ---------------------- | ----------- | ------ |
| Session continuity and transcripts | Current session owner | Existing OpenClaw | Mature identity, append, branch, and lifecycle behavior exists. |
| Context assembly | Current context engine and runner seams | Existing OpenClaw | Preserve run-scoped projection as distinct from durable state. |
| Memory corpus and retrieval | Current memory owners/plugins | Existing OpenClaw | Corpus and index semantics remain owner-specific. |
| Workspace/filesystem | Current path and artifact owners | Existing OpenClaw | Preserve local-first path ownership. |
| Copy/lifecycle evidence | Owner emissions plus shared projection | Fork + focused RFC | Make source, index, export, archive, backup, and external relationships explicit. |
| State continuity | Owner-checkpoint coordinator | New component | Compose captures and restore fences without introducing one universal state store. |

**Initial lane owner**: current session, context, memory, and workspace owners.

## 9. Runtime Fabric and Protocols

| Architectural piece | Initial implementation | Designation | Reason |
| ------------------- | ---------------------- | ----------- | ------ |
| Gateway transport | Current Gateway | Existing OpenClaw | It is the primary runtime coordination transport. |
| Agent protocol | Current ACP seams | Existing OpenClaw | Preserve existing agent/runtime compatibility. |
| Tool protocol | Current MCP support | Existing OpenClaw | MCP remains a bounded tool transport. |
| Version/capability negotiation | Extend existing protocols | Fork + focused RFC | Make mixed-version compatibility and unsupported behavior explicit. |
| Replay/cancel/stream settlement | Extend protocol contracts | Fork + focused RFC | Fence late results and distinguish transport from owner settlement. |
| Cross-language conformance | Protocol fixture and conformance suite | New component | Required to keep TypeScript and Rust implementations behaviorally aligned. |

**Initial lane owner**: existing Gateway/ACP/MCP protocol owners.

## 10. Nodes, Devices, and Edge

| Architectural piece | Initial implementation | Designation | Reason |
| ------------------- | ---------------------- | ----------- | ------ |
| Gateway node registry and routing | Current Gateway node owner | Existing OpenClaw | Pairing-bound connections and invocation fencing already exist. |
| Pairing and capability advertisement | Current pairing/node paths | Fork + focused RFC | Expose generations, freshness, revocation, and non-authoritative capability semantics. |
| Invocation trust envelope | Extend current node invocation results/evidence | Fork + focused RFC | Project invocation, route, policy, pairing, and settlement facts. |
| Node runtime | Rust Node Mode | New component | First memory-safe, language-neutral EnterpriseClaw reference owner. |
| Edge update/lifecycle | Rust Node Mode lifecycle | New component | Node-owned update, restart, readiness, and recovery belong with the Rust runtime. |
| TypeScript node path | Compatibility implementation during transition | Existing OpenClaw, then delete | Retain only until Rust conformance and ecosystem gates pass. |

**Initial lane owner**: Gateway remains coordinator; Rust Node Mode becomes the
new node-runtime owner.

## 11. Extensibility, Artifacts, and Release

| Architectural piece | Initial implementation | Designation | Reason |
| ------------------- | ---------------------- | ----------- | ------ |
| Plugins and extension runtime | Current plugin system | Existing OpenClaw | Preserve the existing extension ecosystem. |
| Skills and workspace composition | Current skill/workspace model | Existing OpenClaw | These assets remain portable and language-neutral data. |
| Capability metadata/catalog | Current manifests and catalog work | Fork + focused RFC | Standardize inert ownership, versions, dependencies, and compatibility. |
| Artifact verification | Existing install/integrity paths | Fork + focused RFC | Add provenance, policy admission, revocation, and evidence. |
| Release activation | Existing update/release/doctor/service seams | Fork + focused RFC | Compose exact target, migration, handoff, readiness, and recovery. |
| Provenance/catalog projection | Owner-neutral metadata service if required | New component | It may index definitions and trust facts but never activate or own extensions. |

**Initial lane owner**: current plugin, skill, package, and release owners.

## 12. Data Governance and Resource Control

| Architectural piece | Initial implementation | Designation | Reason |
| ------------------- | ---------------------- | ----------- | ------ |
| Owner-native cleanup | Current session, memory, workspace, channel, and audit owners | Existing OpenClaw | Lifecycle mutation must remain with semantic owners. |
| Local resource guards | Existing context, disk, concurrency, provider, and tool limits | Existing OpenClaw | Mature local controls should remain scoped. |
| Lifecycle capability/result | Extend each owner with declared modes and settlement | Fork + focused RFC | Support hold/export/delete/expire without one global switch. |
| Admission and usage correlation | Extend existing guards and usage events | Fork + focused RFC | Bind resource decisions to operations and evidence. |
| Lifecycle coordinator | Optional operation/evidence coordinator | New component | Tracks per-owner settlement and retained exceptions, not canonical content. |
| Managed obligations | Optional policy service/adapters | New component | Adds tenant, jurisdiction, hold, residency, and key requirements. |

**Initial lane owner**: semantic data owners and scoped resource owners.

## 13. Operations, Assurance, and Fleet

| Architectural piece | Initial implementation | Designation | Reason |
| ------------------- | ---------------------- | ----------- | ------ |
| Runtime process lifecycle | Existing service/process owners | Existing OpenClaw | Preserve current runtime ownership during transition. |
| Diagnostics and repair | Current Doctor and diagnostic paths | Existing OpenClaw + focused RFC | Extend to owner generations, plans, partial results, and recovery evidence. |
| Hosting profile/lifecycle | Existing hosting and layering seams | Fork + focused RFC | Define start, ready, drain, stop, restart, and host/runtime boundaries. |
| Readiness | Existing health/status foundations | Fork + focused RFC | Owner-contributed conditions with freshness and generation. |
| Telemetry and audit distinction | Existing events plus explicit assurance contracts | Fork + focused RFC | Separate operational observations from durable integrity evidence. |
| Rust host supervisor | Small reliable host lifecycle owner | New component | Survives TypeScript runtime failure and owns containment/update handoff. |
| Fleet posture | Desired/observed/converged projection | New component | Aggregates per-host evidence without mirroring canonical state. |
| Durable assurance | Audit-chain, integrity, and export components | New component where current owners are insufficient | Security evidence may need an independently durable boundary. |

**Initial lane owner**: existing runtime owners, with a new Rust supervisor and
optional fleet/assurance projections.

## Initial New Components

The first portfolio intentionally limits new components.

### Commit now

1. **Rust Node Mode**
2. **Cross-language protocol conformance suite**

### Design next, implement only after bounded proof

3. **Rust host supervisor**
4. **State-continuity coordinator**
5. **Lifecycle operation/evidence coordinator**
6. **Fleet posture projection**
7. **Durable authority/audit evidence projection**

### Conditional

- managed administration projection;
- identity/secret federation adapters;
- asynchronous effect reconciliation;
- durable delivery workers;
- cost/allocation projection;
- owner-neutral catalog/provenance index; and
- independent scheduler.

Conditional components are created only when adaptation of an existing owner
would violate ownership or cohesion.

## Fork and RFC Policy

Use the fork to move quickly, but keep every adaptation shaped for extraction:

- one owner boundary;
- one missing contract;
- one accepted and one structured failure;
- compatibility and migration;
- evidence;
- a TypeScript or workaround deletion target; and
- no dependency on the broader EnterpriseClaw control plane.

Do not file an EnterpriseClaw umbrella RFC. Promote focused contracts that are
useful to ordinary OpenClaw independently of the fork.

## First Implementation Sequence

1. Freeze the Gateway/node protocol behavior in a conformance suite.
2. Complete Rust Node Mode against that contract.
3. Add node invocation trust evidence in the fork.
4. Run TypeScript and Rust node implementations in conformance and canary
   modes.
5. Delete behavior-specific TypeScript node code after replacement gates pass.
6. Begin the Rust supervisor only after the node lifecycle is operationally
   proven.
7. In parallel, adapt existing OpenClaw owners through the smallest
   authority/effect, lifecycle, provider-attempt, and readiness contracts.

## Scout September Priority Overlay

Omar's current priority list changes sequencing but not the owner-first
architecture:

| Priority | Initial disposition |
| -------- | ------------------- |
| Claws | Existing extension/configuration/experience foundations plus fork/RFC; clarify its owner boundary before adding a new platform |
| Memory | Existing OpenClaw memory owners plus fork/RFC for scope, lifecycle, provenance, and evidence |
| Mail authentication | Existing credentials, policy, actions, and channel owners plus focused provider adapters and OBO contracts |
| Memory ACL | Fork/RFC spanning memory and policy owners; avoid a separate ACL database unless enforcement requires an independent owner |
| Node / Rust | Commit to new Rust Node Mode and cross-language conformance first |
| SQL and Dolt | Keep at `Assess` until the current Scout runtime, canonical state, synchronization, and recovery constraints are documented |

Detailed stakeholder input and alignment sequence:
`stakeholder-guidance-omar-2026-08-01.md`.
