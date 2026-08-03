# Runtime Fabric, Nodes, and Rust Implementation Package

Status: reconciled implementation package  
Last validated: 2026-08-02  
EnterpriseClaw contracts: EC-022, EC-023, EC-024, EC-025, EC-026

## Executive Decision

The TypeScript Gateway and node runtime are the current compatibility oracle.
They already provide version negotiation, pairing, generation fencing,
capability declaration, invocation admission, ordered streaming, deadlines,
cancellation signaling, disconnect settlement, wake, and N-1 node/probe skew.

Rust is therefore not a greenfield remote-execution design. It is a bounded
replacement candidate that must conform to and eventually delete one existing
owner profile.

The package strategy is:

1. publish language-neutral fixtures from current protocol and node behavior;
2. adopt the active command-inventory stack rather than creating another node
   catalog;
3. preserve device/node pairing and invocation ownership in OpenClaw;
4. keep reverse-carrier work as a separate plugin connection-owner contract,
   not a node/device protocol;
5. grow the current side-effect-free Rust validator into an installable node
   profile only through shared conformance;
6. select TypeScript or Rust before admission so one implementation owns each
   effect through settlement;
7. keep deployment, tenant enrollment, placement, routing, rollout, and repair
   in Lobster; and
8. delete the supported TypeScript node-host path only after fresh-install,
   canary, migration, rollback, operations, ecosystem, and security proof.

```text
current TypeScript owner
  -> language-neutral contract and fixtures
  -> side-effect-free Rust conformance
  -> single-authority Rust canary
  -> Rust primary for one declared profile
  -> TypeScript owner deletion
```

## Owner Model

| Owner | Responsibility |
| --- | --- |
| Gateway protocol owner | Wire version, envelope, errors, connection negotiation, compatibility |
| Stream/transport owner | Ordering, buffering, deadlines, cancellation signals, reconnect, late frames |
| Pairing/trust owner | Device/node identity, grants, pairing generation, renewal, revocation |
| Node runtime owner | Connection incarnation, capabilities, presence, wake, command execution, local state |
| Invocation relationship | Node/route/pairing/connection/policy/approval binding and result settlement |
| Command owner | Command semantics, parameters, idempotency, effect certainty |
| Rust node owner | Supported Rust profile implementation, artifact, state, lifecycle, readiness, evidence |
| Lobster | Tenant enrollment, placement, network reachability, rollout, update, fleet repair, policy |

Protocol transport does not become the semantic owner of commands, external
effects, sessions, or tenant placement.

## Area RFC Boundaries

| Area RFC | EnterpriseClaw source | Boundary |
| --- | --- | --- |
| RFN-01 Protocol negotiation and compatibility | EC-022 | Peer role, wire/schema version, capabilities, structured failure, skew, deprecation, and fixtures |
| RFN-02 Streaming, cancellation, reconnect, and replay | EC-023 | Correlation, ordering, backpressure, deadlines, cancellation signaling, late frames, and replay posture |
| RFN-03 Node identity, pairing, and trust | EC-024 | Device/node identity, grant generation, token renewal/revocation, connection binding, and evidence |
| RFN-04 Node capability, presence, and wake | EC-024 | Declared/effective commands, permissions, tools, skills, freshness, pending work, and wake |
| RFN-05 Remote node invocation and settlement | EC-025 | Admission, route, authority, idempotency, stream, cancellation, result, disconnect, and effect certainty |
| RFN-06 Rust node supported profile | EC-026 | Exact protocol role, command subset, state, resources, lifecycle, readiness, security, and evidence |
| RFN-07 Rust migration, release, and TypeScript deletion | EC-026 | Shadow/canary authority, state import, compatibility tuple, update/rollback, packaging, and deletion |

These seven boundaries are planning units, not seven automatic upstream RFCs.

## Current OpenClaw Owner Seams

| Concern | Existing seam | Current strength | Residual gap |
| --- | --- | --- | --- |
| Gateway protocol | `@openclaw/gateway-protocol` | Typed request/response/event/error envelopes, separate wire/package versions, min/max negotiation, structured mismatch errors, additive owner payloads | Cross-language normative fixture publication and removal windows |
| Gateway client lifecycle | `@openclaw/gateway-client` | Auth selection, hello, request timing, reconnect supervision, terminal mismatch suppression | Semantic operation recovery remains owner-specific |
| ACP | Translator, server, event ledger | Session lifecycle, ordered replay, incomplete replay, scoped cancellation, stall/resume handling | No generic authority for replaying unrelated owner effects |
| Pairing | Device/node schemas and pairing handlers | Public-key proof, request/approve/reject/remove, role-bound tokens, rotate/revoke, generation fencing | Federation and fleet revocation propagation remain managed concerns |
| Node session | `NodeRegistry` | Node/connection mapping, pairing lease, catalog state, pending invokes, disconnect cleanup | Registry combines several lifecycles and lacks cross-Gateway handoff |
| Invocation stream | Node invoke handlers and stream controller | Policy/approval gates, idempotency transport, ordered progress/input, hard/idle deadlines, cancel, late-result rejection | Remote stop/effect certainty remains command-owner specific |
| Presence/wake | Presence, wake, pending-work, watch polling | Freshness, activity, wake attempts, offline work, authenticated polling | Presence is not readiness or permanent trust |
| Command inventory | #100960/#104158/#104159 stack | Owner-preserving command inventory, live paired-node observation, bounded prompt projection | Stack is open; records remain observational, not authority |
| Rust profile | Fork-only `rust-node-profile` Cargo experiment | One accepted connect, one accepted `system.which`, three structured failures, immutable build output | No Gateway connection, execution, lifecycle, state, canary, packaging, or deletion proof |

## Existing-Investment Crosswalk

### Protocol and stream lifecycle

| Investment | State on 2026-08-02 | Classification | Package consequence |
| --- | --- | --- | --- |
| Gateway wire protocol v4 and package contract | Present | Reuse | Use as current compatibility baseline |
| Node/probe N-1 support | Present | Reuse | Do not claim universal N-1 compatibility |
| ACP lifecycle/replay/cancellation | Present | Reuse | Keep ACP semantics owner-specific |
| Native-client protocol guard tests | Present | Reuse | Extend into cross-language fixtures rather than replacing |
| Reverse-carrier O11-O14/G1-G2 fork proof | Fork-only | B1 | Keep separate from node/device identity; upstream only after O4 and explicit authorization |
| Lobster reverse-carrier adopter/lifecycle proofs | Fork-only | B2/B3 | Keep inactive until a matching OpenClaw contract ships |

Residual upstream delta: a published language-neutral conformance fixture
format and explicit compatibility/deprecation matrix, not a new protocol.

### Command and capability inventory

| Investment | State on 2026-08-02 | Classification | Package consequence |
| --- | --- | --- | --- |
| OpenClaw #100960 command list/inspect | Open, non-draft, head `37ca7c7668c2` | Adopt | Foundation inventory; no dispatcher or authority |
| OpenClaw #104158 live paired-node commands | Open draft, head `4a2d0ad06fee` | Adopt | Reuses existing `node.describe`; identifier-only observation |
| OpenClaw #104159 scoped prompt projection | Open draft, head `651cef48e4d3` | Adopt | Guidance only; does not grant invocation |
| Lobster #4297 node catalog prompt projection | Merged 2026-07-21 | Downstream-only | Existing Scout adopter |
| Lobster #4648 governed node invocation | Open, head `41c0201f4474` | Downstream-only | Reuse existing node approval/invocation rails |
| Lobster #5460 offline-node recovery explanation | Open, head `3c11c572b482` | Downstream-only | Existing operator recovery UX |
| Node-mode built-ins parity stack | Existing downstream plan | Downstream-only | Preserve Desktop-owned policy, approval, auth, and execution |

Residual upstream delta: none until the command inventory stack settles.

### Pairing, trust, and invocation

| Investment | State on 2026-08-02 | Classification | Package consequence |
| --- | --- | --- | --- |
| Device/node pairing and role tokens | Present | Reuse | Treat as authoritative portable node trust |
| Pairing-generation revalidation | Present | Reuse | Required for every TypeScript and Rust dispatch |
| Node invocation stream | Present | Reuse | Preserve invocation/node/connection correlation |
| Command policy and approvals | Present | Reuse | Rust must consume the same decisions; no bypass |
| Wake and pending work | Present | Reuse | Include in later profile only if explicitly supported |
| Cross-Gateway handoff | Not present | New ask candidate only after proof | Do not make Rust depend on an unproven fleet transfer contract |

Residual upstream delta: current node contracts are already substantial. Add
portable fields only when shared TypeScript/Rust fixtures expose a real gap.

### Rust implementation

| Investment | State on 2026-08-02 | Classification | Package consequence |
| --- | --- | --- | --- |
| `C:\src\openclaw-rust-node` worktree | Branch `user/giodl/ec026-rust-node-evidence`; base `bde1602e6e86fd91dd0bec3aae714e059e556c4d`; experiment untracked | B1 evidence | Preserve as fork-only proof, not an accepted project |
| `rust-node-profile` Cargo artifact | Builds and one test passes | Reuse evidence | Current validator baseline |
| Five shared fixtures | Present under Gateway protocol fixtures | Reuse evidence | Expand into normative accepted/failure matrix |
| Gateway connection | Absent | New component work | Required before canary |
| Command execution | Absent | New component work | Add only for one safe bounded profile |
| State and lifecycle | Absent | New component work | Required before ownership transfer |
| Packaging and clean install | Absent | New component work | Required before release claims |
| TypeScript deletion inventory | Absent | New component work | Required before calling the migration complete |

## Residual Upstream Workstreams

### U-RFN-01: Language-neutral protocol and node conformance fixtures

Publish a versioned fixture contract consumable by TypeScript, Rust, and other
peers:

- peer role and protocol range;
- selected version and capabilities;
- accepted and structured-failure outcome;
- pairing and connection generations;
- command/capability support;
- invocation identity and idempotency;
- ordered progress/input;
- deadlines and cancellation;
- disconnect and late-result behavior;
- unknown optional field preservation where required; and
- compatibility/deprecation metadata.

Start with current source behavior. The fixtures do not create another runtime
or claim semantic effect success.

### U-RFN-02: Command inventory stack adoption

Adopt #100960, #104158, and #104159. Keep the contract:

- observational;
- owner-preserving;
- explicit about collection completeness;
- bounded to authenticated node observations;
- identifier-only where semantics are unknown; and
- non-authorizing in prompts and UIs.

No competing node command catalog should be filed.

### U-RFN-03: Bounded reverse-provider connection owner, conditional

This is not a node protocol. It remains a plugin-owned reverse connection
contract dependent on #114783 or a maintainer-approved replacement.

If explicitly authorized, replay the reviewed O11-O14/G1-G2 source as one
bounded issue-linked draft. Keep route, socket, peer proof, serialization, and
cleanup with the plugin; keep provider semantics and traffic policy with their
owners.

### U-RFN-04: Rust node profile contract

The portable contribution is the profile and conformance contract. Upstream
OpenClaw need not absorb the Rust repository.

The profile declares:

- exact node role and identity model;
- supported protocol range and command subset;
- pairing, policy, approval, and capability inputs;
- command effect and certainty semantics;
- local state and migration generation;
- startup, ready, drain, stop, reconnect, quarantine, and recovery;
- resource/network budgets;
- artifact and conformance versions; and
- unsupported TypeScript-node capabilities.

### Not residual upstream work

- a new Gateway protocol;
- a second node registry;
- a universal replay or exactly-once layer;
- Lobster tenant enrollment, placement, network, rollout, or repair;
- Desktop built-in implementation;
- reverse-carrier credentials or deployment policy;
- Rust source inside OpenClaw solely for convenience; or
- TypeScript deletion before an authoritative Rust canary.

## Fork and Adapter Ledger

| Ledger item | Class | Purpose | Current relationship | Exit |
| --- | --- | --- | --- | --- |
| Rust connect/invoke validator | B1 | Prove cross-language parse/admission subset | Untracked Cargo experiment | Promote into independent Rust project or delete |
| Shared five-fixture seed | B1 | Seed language-neutral conformance | Stored beside Gateway protocol fixtures in fork | U-RFN-01 or delete |
| TypeScript conformance runner | B1 | Establish current source as oracle | Not yet implemented | Upstream fixture suite or delete |
| Rust Gateway client adapter | B1 | Connect Rust profile to disposable Gateway | Not implemented | Independent Rust owner |
| Rust command-execution adapter | B1 | Execute one bounded command | Not implemented | Independent Rust owner |
| Rust state import adapter | B3 | Import fenced TypeScript state into new Rust generation | Not implemented | Delete after migration window |
| TypeScript/Rust canary selector | B3 | Select one owner before admission | Not implemented | Delete when Rust-only profile is reached |
| TypeScript compatibility fallback | B3 | Preserve unsupported profiles during migration | Existing TypeScript owner | Delete only for promoted Rust profile |
| Reverse-carrier O11-O14/G1-G2 | B1 | Prove plugin connection-owner contract | Fork-only, blocked on O4 and filing authorization | Upstream bounded owner contract or archive |
| Lobster reverse-carrier adopter | B2 | Deploy optional runtime peer | Fork-only inactive proof | Remain Lobster plugin/adopter |
| Lobster node command catalog/invoke | B2 | Scout operator and Code Mode surface | #4297/#4648 | Remain downstream |
| Desktop node-mode built-ins bridge | B2 | Preserve local Desktop tool semantics | Existing ClawPilot/Lobster plan | Remain Desktop/Lobster owner |
| Passport/placement execution fence | B2 | Regional placement and duplicate-execution policy | Lobster-specific patch | Remain downstream |

No B1 artifact is production authority. No B3 path may become a permanent dual
writer.

## Lobster Managed Capabilities

| Capability | Lobster responsibility | OpenClaw/Rust dependency |
| --- | --- | --- |
| Node enrollment and inventory | Tenant ownership, device/workload mapping, organization policy, operator UX | EC-024 owner facts |
| Node placement and routing | Select reachable node/unit, network zone, route, and deployment generation | EC-025 admission contract |
| Managed capability composition | `scout-standard`, Desktop/WorkIQ/built-ins selection, tenant enablement | #100960/#104158/#104159 and owner catalogs |
| Governed invocation | Actor policy, approval UX, command selection, audit retention | Current node invoke and EC-014 |
| Offline recovery UX | Explain unavailable/offline state and safe remediation | Presence/wake/pending-work facts |
| Rust deployment | Package, configure, update, monitor, quarantine, and repair Rust units | RFN-06/RFN-07 profile |
| Canary and rollback | Select TypeScript or Rust before admission, observe mismatch, rollback code within state limits | Shared conformance and release manifest |
| Fleet revocation | Distribute trust revocation and expose offline/unsettled units | EC-024 revocation facts |
| Reverse runtime peer | Own peer deployment, reconnect, cooldown, drain, and rollout | Conditional U-RFN-03 |

Lobster controls deployment and selection. It cannot claim an invocation or
external effect succeeded because a container, socket, or carrier completed.

## Independent Rust Components

| Component | Purpose | Promotion gate |
| --- | --- | --- |
| `openclaw-node-protocol` | Language-neutral frame/schema types and fixture runner | U-RFN-01 accepted and versioned |
| `openclaw-node-runtime` | Bounded node profile: identity, connection, admission, one command subset, lifecycle | Live Gateway conformance and single-authority canary |
| `openclaw-node-state` | Rust-owned local state, import receipt, schema/version compatibility | Fenced migration and rollback limits proven |
| `openclaw-node-supervisor` | Optional later start/drain/stop/restart/resource containment | Runtime profile stable; not required for first validator |

The first durable home should be an independent open-source Rust repository or
workspace usable by upstream OpenClaw, EnterpriseClaw, Scout, and other hosts.

## Supported Rust Profile V1

| Dimension | V1 requirement |
| --- | --- |
| Role | First-party node peer; no host/provider identity reuse |
| Protocol | Declared adjacent range with exact selected version |
| Identity | Device/node identity, pairing generation, local runtime ID, connection incarnation |
| Commands | One side-effect-free command first; expand only through conformance |
| Authority | Current pairing, command policy, approval, route, and operation binding |
| Streaming | Ordered progress/input only if the command needs it |
| Cancellation | Signal and acknowledgement state; never claim remote effect reversal |
| State | Minimal Rust-owned state plus explicit imported-state receipt |
| Lifecycle | Start, connect, ready, drain, stop, restart, reconnect, quarantine |
| Resources | Measured startup, CPU, RSS, disk, concurrency, queue, timeout, network exposure |
| Release | Artifact digest/version, protocol/conformance version, state schema, security owner |
| Evidence | Redacted connection, readiness, invocation, migration, update, and recovery facts |

`system.which` remains validation-only until a real Gateway path proves that
the profile can connect, admit, execute, and settle without widening command
authority.

## Migration State Machine

```text
typescript_only
  -> shadow_safe
  -> rust_canary
  -> rust_primary_supported_profile
  -> rust_only_supported_profile

failure:
  -> quarantine
  -> typescript_only when code/state compatibility permits
  -> blocked when prior Rust state cannot be safely downgraded
```

- Shadow compares parsing, validation, and other effect-free results only.
- Canary selection occurs before invocation admission.
- One runtime owns an invocation through terminal or unknown settlement.
- Post-dispatch failover requires command-owner replay proof.
- Old TypeScript writers are fenced before state import.
- Binary rollback is separate from state rollback and effect reconciliation.

## Operator Journey

```text
inspect node
  -> see identity, pairing generation, connection incarnation
  -> see protocol range and selected version
  -> see effective commands/capabilities and freshness
  -> see TypeScript or Rust runtime owner and artifact

invoke command
  -> validate route/pairing/connection/policy/approval
  -> bind one invocation and idempotency identity
  -> stream ordered progress
  -> cancel or time out without claiming remote stop
  -> settle completed / failed / disconnected / unknown

roll out Rust
  -> verify shared conformance
  -> install candidate
  -> shadow safe inputs
  -> select canary before admission
  -> prove restart/update/recovery
  -> promote supported profile
  -> delete superseded TypeScript path
```

## Acceptance Gates

### Protocol

- Version negotiation never infers compatibility from package/build identity.
- Unknown required fields fail closed; declared compatible optional fields
  survive where required.
- Protocol mismatch is terminal or explicitly retryable; it cannot loop
  indefinitely.
- Fixtures are language-neutral and versioned.

### Trust and authority

- Reconnect never restores stale or revoked pairing authority.
- Capability advertisement and presence do not grant invocation.
- Every invocation binds current node, pairing, connection, route, policy,
  approval, and deadline facts.
- Rust consumes the same authority boundaries as TypeScript.

### Stream and effect safety

- Duplicate, out-of-order, stale, and late frames are fenced.
- Cancellation is signaling; remote stop/effect certainty is explicit.
- Disconnect and timeout preserve unknown settlement where required.
- No TypeScript/Rust dual dispatch is permitted.

### Operations and release

- Readiness binds exact artifact, state, protocol, connection, and capability
  generations.
- Fresh install, upgrade, downgrade refusal, binary rollback, state limits,
  drain, restart, and quarantine are proven.
- Resource and failure-isolation budgets are measured.
- Release/security ownership and minimum supported matrices are explicit.

### Ecosystem and deletion

- Existing plugins, skills, channels, and provider adapters do not require a
  Rust rewrite.
- Unsupported TypeScript capabilities remain explicit.
- The exact TypeScript execution path and obsolete tests are named before
  promotion.
- Rust-only is reached only after code and migration adapters are deleted.

## Dependency-Ordered Work Items

| ID | Work item | Classification | Layer | Depends on | Acceptance | Deletion target |
| --- | --- | --- | --- | --- | --- | --- |
| RFN-001 | Freeze protocol/node/Rust inventory | Reuse | Planning | - | Current source, PRs, Lobster work, fork proofs, artifact state, and dates recorded | Stale duplicate inventory |
| RFN-002 | Define protocol owner/version matrix | Reuse | Planning | RFN-001 | Gateway, ACP, node, MCP, channel, provider, and reverse-carrier ranges separated | Universal protocol claim |
| RFN-003 | Define node object/lifetime matrix | Reuse | Planning | RFN-001 | Device, grant, pairing generation, connection, capability, invocation, presence, and state identities separated | Connection-as-device identity |
| RFN-004 | Build TypeScript fixture runner | New ask candidate | B1 evidence | RFN-002, RFN-003 | Current owner accepts/rejects shared fixtures deterministically | Hand-authored Rust-only oracle |
| RFN-005 | Expand connect fixtures | Extend existing | Evidence | RFN-004 | Current, adjacent, unsupported, stale pairing, unknown optional field, and role mismatch cases pass | Build-version inference |
| RFN-006 | Expand invocation fixtures | Extend existing | Evidence | RFN-004 | Accepted, unsupported command, missing idempotency, stale route/connection, policy deny, and approval deny pass | Incomplete five-case seed |
| RFN-007 | Expand stream fixtures | Extend existing | Evidence | RFN-004 | Ordered progress/input, duplicate, gap overflow, deadline, idle timeout, cancellation, disconnect, and late result pass | Transport ack as semantic success |
| RFN-008 | Publish U-RFN-01 fixture contract | New ask candidate | Upstream | RFN-005, RFN-006, RFN-007 | Versioned language-neutral schema, manifest, runners, and compatibility metadata accepted | Fork-only fixture copies |
| RFN-009 | Adopt command inventory #100960 | Adopt | Upstream | RFN-001 | Owner-preserving list/inspect ships with completeness status | Parallel node catalog |
| RFN-010 | Adopt live node inventory #104158 | Adopt | Upstream | RFN-009 | Authenticated bounded identifiers from requested paired node | Inferred live capability |
| RFN-011 | Adopt prompt projection #104159 | Adopt | Upstream | RFN-009, RFN-010 | Explicit opt-in guidance remains non-authorizing | Prompt presence as permission |
| RFN-012 | Reconcile Lobster #4297/#4648 | Adopt | Lobster | RFN-010, RFN-011 | Scout catalog/invoke consume current owner identities and approvals | Duplicate command definitions |
| RFN-013 | Reconcile offline recovery #5460 | Adopt | Lobster | RFN-003 | UX distinguishes offline, unavailable, stale, unpaired, and unsupported | Generic connection error |
| RFN-014 | Prove pairing revoke/reconnect | Reuse | Evidence | RFN-003, RFN-005 | Revocation fences new work and reconnect requires current grant | Connection-presence authority |
| RFN-015 | Prove invocation timeout/disconnect certainty | Extend existing | Evidence | RFN-006, RFN-007 | Local terminal state does not claim confirmed remote stop/effect | Timeout as no-effect proof |
| RFN-016 | Decide node contract residuals | Extend existing | Upstream | RFN-014, RFN-015 | Reuse current owner fields unless fixtures expose a portable gap | Unnecessary node RFC |
| RFN-017 | Hold reverse-carrier filing gate | Reuse | Planning | RFN-001 | #114783 dependency, second-owner disproof, and explicit authorization remain visible | Accidental node/host conflation |
| RFN-018 | Replay bounded reverse-carrier owner, if authorized | New ask candidate | Upstream | RFN-017 | One plugin-owned connection contract; no node identity, listener, provider semantics, or deployment policy in core | O11-O14 duplicate forks |
| RFN-019 | Adopt Lobster reverse-carrier peer | Downstream-only | B2/Lobster | RFN-018 | Inactive plugin/peer proves selection, retry, cooldown, drain, stop-before-start, and rollback | ProxyPipe mapped frames |
| RFN-020 | Commit clean Rust project baseline | New component | Rust | RFN-001 | Source and fixtures committed without `target/`; reproducible lockfile and README | Untracked experiment state |
| RFN-020A | Select the exact Rust V1 command and TypeScript deletion seam | New component | Planning | RFN-006, RFN-020 | One exact command, authority path, unsupported surface, state owner, TypeScript files/tests, and retained compatibility path are named before implementation | Vague bounded-command claim |
| RFN-020B | Inventory exact TypeScript node-host deletion | Delete | Planning | RFN-020A, XPK-009 | Supported files/functions/tests/adapters, minimum release, zero-old-path evidence, and retained surfaces are recorded before canary | Post-hoc deletion scope |
| RFN-021 | Run shared fixtures in Rust | New component | Rust | RFN-008, RFN-020 | Rust and TypeScript produce equivalent accepted/failure results | Rust-specific fixture semantics |
| RFN-022 | Package fresh-install Rust artifact | New component | Rust | RFN-020, EAR-033, XPK-008 | Signed immutable published artifact installs in a clean local environment after verify-before-parse checks | Working-tree-only binary |
| RFN-023 | Implement disposable Gateway connection | New component | Rust | RFN-005, RFN-021, RFN-022 | Authenticated connect, negotiation, disconnect, reconnect, and stale-generation failures pass | Offline validator-only proof |
| RFN-024 | Implement the selected bounded command execution | New component | Rust | RFN-020A, RFN-023 | The named command admits, executes, and returns structured settlement; unsupported commands fail explicitly | Admission-only proof |
| RFN-025 | Implement stream/deadline/cancel subset | New component | Rust | RFN-007, RFN-024 | Declared ordered progress, timeout, cancellation, disconnect, and late-result behavior matches profile | Unbounded/implicit stream behavior |
| RFN-026 | Define Rust-owned state generation | New component | Rust | RFN-023 | Canonical state, schema, corruption, quarantine, and recovery are explicit | Process state as authority |
| RFN-027 | Implement fenced TypeScript state import | New component | B3/Rust | RFN-026 | Old writer fenced; import receipt creates new Rust generation; no bidirectional authority | Migration adapter after cutover |
| RFN-028 | Define readiness and resource budgets | New component | Rust | RFN-023, RFN-026, XPK-005 | Exact artifact/state/protocol/capability readiness and measured startup/CPU/RSS/disk/queue/network/reconnect budgets satisfy the selected profile | Process-alive readiness |
| RFN-029 | Implement admission-time runtime selector | New component | B3/OpenClaw | RFN-024, RFN-028, XPK-006 | Lobster may request desired placement; the local owner selects TypeScript or Rust before admission and binds the selected generation | Dual dispatch |
| RFN-030 | Run shadow-safe comparison | New component | Migration | RFN-021, RFN-029 | Only effect-free parse/validation outputs compared; mismatch evidence retained | Permanent shadow mode |
| RFN-030A | Prove pre-cutover node migration, release, and rollback readiness | New component | Release | RFN-020B, RFN-025, RFN-027, RFN-028, RFN-030, EAR-033, EAR-039, XPK-006, XPK-008, XPK-009 | Current TypeScript published-artifact recovery, Rust state import, mixed versions, reconnect, downgrade refusal, rollback limits, and unknown settlement are proven before authority changes | Canary-first node migration |
| RFN-031 | Canary Rust-authoritative node | New component | Migration | RFN-030A, XPK-010 | One bounded unit executes through restart/reconnect with no TypeScript effect path and only trusted artifacts | Rust process without authority |
| RFN-032 | Confirm post-canary update, downgrade refusal, and rollback | New component | Release | RFN-031 | Artifact/state/protocol tuple remains valid under canary; unsafe state downgrade blocks and rollback limits remain explicit | Code rollback as state rollback |
| RFN-033 | Prove local and managed profiles | New component | Release | RFN-031, RFN-032 | Ordinary local use needs no Lobster; managed deployment adds policy/rollout only | Enterprise-only Rust node |
| RFN-034 | Confirm the predeclared TypeScript deletion inventory | Delete | Planning | RFN-020B, RFN-031 | Canary evidence matches the predeclared files/functions/tests/adapters and retained compatibility surfaces | Expanding rewrite completion |
| RFN-035 | Promote Rust primary supported profile | New component | Release | RFN-032, RFN-033, RFN-034, XPK-006 | Conformance, security, operations, ecosystem, migration, and support owners approve | TypeScript authority for promoted profile |
| RFN-036 | Delete TypeScript owner and migration adapters | Delete | Release | RFN-035 | Superseded code/tests/fallback/import paths removed; Rust-only evidence recorded | Permanent dual implementation |

## Sequencing

```text
current source inventory
  -> TypeScript conformance oracle
  -> language-neutral fixtures
  -> command inventory adoption
  -> committed Rust baseline
  -> exact V1 command and TypeScript deletion inventory
  -> trusted clean package
  -> disposable Gateway connection
  -> bounded execution and lifecycle
  -> state import and admission-time selection
  -> shadow-safe comparison
  -> current-owner release/recovery and pre-cutover migration proof
  -> Rust-authoritative canary
  -> post-canary release/rollback confirmation
  -> TypeScript deletion
```

## Findings

1. **OpenClaw already has the runtime contract Rust must match.** The missing
   work is cross-language publication and implementation proof, not protocol
   invention.
2. **The current Rust slice is useful but deliberately tiny.** It validates
   admission shapes only and remains untracked fork evidence.
3. **Command discovery is already an active stack.** #100960/#104158/#104159
   should be adopted, not duplicated by a Rust-specific catalog.
4. **Node identity, trust, connection, presence, capability, and invocation
   are distinct lifetimes.** Rust must preserve those distinctions.
5. **Cancellation is not remote-stop proof.** Both TypeScript and Rust must
   report acknowledged, unknown, or unsupported stop certainty honestly.
6. **Reverse carrier is not Node Mode.** It is a plugin connection-owner seam
   with separate peer identity and deployment ownership.
7. **Rust authority begins at admission, not process startup.** One selector
   binds each invocation to one runtime generation before effect.
8. **The deletion gate is the outcome.** A permanent TypeScript/Rust dual
   implementation is migration debt, not a successful Rust strategy.

## Package Exit

This package is complete when:

- TypeScript and Rust consume the same accepted/failure fixture suite;
- the command inventory stack is adopted without a competing catalog;
- a committed, clean-install Rust artifact connects to a disposable Gateway;
- the exact first command and exact TypeScript deletion seam are named before
  implementation or canary;
- the artifact passes EAR trust and actual-published-byte proof before managed
  execution;
- one bounded Rust profile executes with correct authority, stream, lifecycle,
  readiness, state, and certainty semantics;
- a Rust-authoritative canary proves restart, update, rollback limits, local
  operation, and managed deployment;
- reverse-carrier work remains owner-correct and separately gated; and
- the superseded TypeScript node-host path and migration adapters are deleted
  for the promoted profile.
