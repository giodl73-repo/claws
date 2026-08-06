# Knowledge, Context, and Continuity Implementation Package

Status: reconciled implementation package  
Last validated: 2026-08-02  
EnterpriseClaw contracts: EC-017, EC-018, EC-019, EC-020, EC-021, EC-035

## Executive Decision

This area does not need a new enterprise knowledge platform inside OpenClaw.
The portable runtime already has real owners for sessions, context engines,
memory retrieval, workspace access, filesystem safety, and recovery points.

The implementation strategy is:

1. extend the existing session export with stable source/export identity and
   machine-readable omissions;
2. add source-level context inclusion/omission evidence only if a bounded proof
   shows that existing context-engine diagnostics cannot carry it;
3. finish the already-open memory API and governance decisions rather than
   filing parallel list, delete, or write contracts;
4. keep tenant policy, consent, retention, context-budget UX, and cross-copy
   assurance in Lobster;
5. adopt the existing recovery-point stack for EC-021; and
6. extend existing safe workspace surfaces for specific artifact classes
   instead of creating a universal filesystem API.

The highest-risk mistake would be to collapse session, memory, context,
workspace, and retention into one managed knowledge store. They are related
owners with different identity, authorization, lifecycle, and recovery rules.

## Owner Model

```text
session owner
  -> transcript generation, branch, reset, archive, export production

context assembly owner
  -> ordered run inputs, budgets, projection, fallback, inclusion evidence

memory owner
  -> canonical memory, retrieval, semantic mutation, derived indexes

workspace owner
  -> workspace identity, safe paths, sandbox binding, artifacts

checkpoint owner
  -> generation-bound capture and compatible restore

Lobster managed composition
  -> tenant policy, consent, retention, audit, UI, assurance, rollout
```

Paths and files are locations or copies. They do not replace the semantic
identity of sessions, memory items, workspaces, checkpoints, or exports.

## Area RFC Boundaries

| Area RFC | EnterpriseClaw source | Boundary |
| --- | --- | --- |
| KCC-01 Session continuity and export | EC-017 | Session generation, branch, export identity, omissions, artifact production, and retained copies |
| KCC-02 Context assembly and budget evidence | EC-018 | Ordered run inputs, inclusion/omission reasons, budgets, projection, fallback, and reproducibility |
| KCC-03 Memory read authority and discovery | EC-019 | Agent/resource scope, retrieval authority, persisted-memory enumeration, and read provenance |
| KCC-04 Memory semantic mutation and consent | EC-019 | Save/correct/delete authority, protected memory paths, background writers, and mutation evidence |
| KCC-05 Memory corpus and derived-copy lifecycle | EC-020 | Canonical memory, indexes, caches, exports, rebuild, revocation, deletion, and per-copy settlement |
| KCC-06 Checkpoint capture and restore adoption | EC-021 | Existing recovery-point aggregation, final capture, compatibility, and restored admission |
| KCC-07 Workspace, path, and artifact boundaries | EC-035 | Stable workspace identity, safe access, sandbox binding, copies, temporary artifacts, and retained artifacts |

These seven boundaries are local planning units. They are not seven automatic
upstream RFCs.

## Current OpenClaw Owner Seams

| Concern | Current seam | What already exists | Residual gap |
| --- | --- | --- | --- |
| Session export | `src/auto-reply/reply/commands-export-session.ts` and `commands-export-session-file.ts` | Real HTML export, system prompt/tool projection, malformed-row warnings, backend-delegated omission warning, and fs-safe workspace writes | Stable export operation/copy identity, exact source generation, structured omission manifest, integrity, and replay |
| Context assembly | `src/context-engine/types.ts` and embedded runner integration | Pluggable engine, ordered messages, token estimate, projection mode/epoch/fingerprint, runtime mode, selection source, host capabilities, fallback/degraded reasons, and compaction ownership | Per-source identity, ordering evidence, inclusion/omission reason, and budget settlement |
| Memory retrieval | `extensions/memory-core/src/tools.ts` | `memory_search`, `memory_get`, corpus selection, citations, visibility filtering, index identity checks, deadlines, and retrieval diagnostics | Stable host read/list API and enterprise policy/ACL composition |
| Memory mutation | Current file-backed memory plus extension-specific tools | Canonical Markdown memory and backend-specific mutation behavior | One accepted semantic write/delete owner contract, protected-path enforcement, and non-interactive consent |
| Workspace reads | `agents.workspace.list` and `agents.workspace.get` | Read-only relative-path browsing, traversal rejection, safe stat/read, byte bounds, UTF-8/image validation, and no mutation surface | Specific semantic artifact projections and stable workspace-generation evidence |
| Workspace edits | `agents.files.*` | Narrow allowlisted root-file read/write, including `MEMORY.md`, with symlink/hardlink protections | Decision on whether persisted memory extends this surface or keeps dedicated memory methods |
| Filesystem containment | `src/infra/fs-safe.ts` and `@openclaw/fs-safe` | Canonical roots, safe read/write/create, symlink/hardlink policy, bounded walks, and external-file staging | Owner-level authorization and generation binding above path containment |
| Recovery | #112385, #112865, #112896 | Aggregate recovery points, final closed-state capture, restored admission/status | Adoption, conformance, and Lobster composition rather than a duplicate contract |

## Existing-Investment Crosswalk

### Session continuity and export

| Investment | State on 2026-08-02 | Classification | Package consequence |
| --- | --- | --- | --- |
| Existing `/export-session` implementation | Present in current source | Reuse | Do not create a second export subsystem |
| Backend-delegated omission warning | Present in current source | Extend existing | Convert warnings and omissions into a stable manifest rather than inferring completeness |
| fs-safe export artifact writer | Present in current source | Reuse | Preserve safe workspace-relative defaults and explicit external destination handling |
| EC-017 protected-effect/delivery simulations | Local evidence | Reuse | Keep export production separate from later EC-016 delivery settlement |

Residual upstream delta: one focused extension to the existing export owner,
not a new export service.

### Context assembly and budget

| Investment | State on 2026-08-02 | Classification | Package consequence |
| --- | --- | --- | --- |
| OpenClaw #84676 pre-prompt compaction fit diagnostics | Merged 2026-05-21 | Reuse | Context pressure and compaction decisions already have native signals |
| OpenClaw #84830 estimated context budget status | Merged 2026-05-23 | Reuse | Do not file another generic context-budget framework |
| OpenClaw #84800 pressure-classification proposal | Closed without merge | Delete/replace | Do not revive as a parallel pressure abstraction |
| Lobster #3371 quarantined context-budget plugin | Merged 2026-06-20 | Downstream-only | Keep managed policy/analysis in a plugin consuming native signals |
| Lobster #3379 context-budget tool insights UI | Merged 2026-06-21 | Downstream-only | Reuse the existing operator projection |
| Lobster #3700 context-budget roadmap | Merged 2026-06-28 | Reuse | Treat as adoption roadmap, not evidence that OpenClaw needs a new core owner |
| Lobster #3713 plugin hardening | Closed without merge | Delete/replace | Re-plan only missing tests; do not treat the closed PR as active delivery |
| Current context-engine contract | Present in source | Extend existing | Add only the smallest portable inclusion/omission evidence seam proven necessary |

Residual upstream delta: at most one narrow context evidence extension.
Context-budget policy, thresholds, and UX remain Lobster-owned.

### Memory read and persisted-memory discovery

| Investment | State on 2026-08-02 | Classification | Package consequence |
| --- | --- | --- | --- |
| OpenClaw #115303 read-capability umbrella | Open | Reuse | Use as the decision and patch-retirement umbrella |
| OpenClaw #115330 public read contract | Open | Reuse | Do not define a competing method or response shape |
| OpenClaw #115331 discovery semantics | Open | Reuse | Reuse accepted file grammar, path safety, ordering, and bounds |
| OpenClaw #115329 `memory.list` draft | Open draft, head `a2a894f5c087` | Extend existing | Park implementation until #115330 and #115331 settle |
| OpenClaw #115323 earlier candidate | Closed without merge | Delete/replace | #115329 is the current implementation sketch |
| OpenClaw #116494 `agents.files.*` alternative | Open | Reuse | Resolve dedicated memory API versus scoped generic file API before landing |
| Lobster carried memory-list patch | Active in #5402 live patch baseline | B3 compatibility | Retire only after an accepted upstream release is adopted |

Residual upstream delta: none until the existing owner decisions settle.

### Memory delete and semantic writes

| Investment | State on 2026-08-02 | Classification | Package consequence |
| --- | --- | --- | --- |
| OpenClaw #116484 Gateway delete contract | Open | Reuse | Keep delete namespace/path grammar aligned with the accepted read contract |
| OpenClaw #116485 safe deletion semantics | Open | Reuse | Require containment, race resistance, persistence/sync, and idempotence decisions |
| OpenClaw #116499 semantic write tools | Open | Reuse | Decide memory-core Save/Delete semantics before implementation |
| OpenClaw #116500 protected memory paths | Open | Reuse | Prevent raw workspace/shell mutation from bypassing semantic consent |
| OpenClaw #116501 standing consent | Open | Reuse | Govern dreaming, promotion, hooks, and other non-interactive writers |
| Lobster #6149 memory delete tracking | Existing downstream ask | Adopt | Bind the host experience to the accepted upstream owner |
| Lobster #6336-#6338 write-governance tracking | Existing downstream asks | Adopt | Keep tenant consent and UX downstream while upstream owns portable enforcement seams |

Residual upstream delta: none before #116484, #116485, and #116499-#116501
resolve. A new implementation PR before those decisions would create a second
authority path.

### Memory corpus lifecycle

| Investment | State on 2026-08-02 | Classification | Package consequence |
| --- | --- | --- | --- |
| File-backed canonical memory | Present | Reuse | Treat Markdown memory as canonical for memory-core, not its index |
| SQLite/vector/QMD indexes | Present | Reuse | Treat as derived copies with independent freshness and rebuild state |
| Index identity mismatch handling | Present | Reuse | Preserve fail-closed paused-search behavior |
| Backend-specific row deletion | Present in some providers | Reuse with limits | Never claim whole-memory deletion from one backend row |
| EC-030 lifecycle vocabulary | Existing EnterpriseClaw contract | Reuse | Express complete, partial, blocked, deferred, retained, and unknown per copy |

Residual upstream delta: after the mutation-owner decisions settle, determine
whether current status/doctor/audit events can represent per-derived-copy
settlement. File a new ask only if that proof fails.

### Recovery and continuity

| Investment | State on 2026-08-02 | Classification | Package consequence |
| --- | --- | --- | --- |
| OpenClaw #112385 recovery-point aggregation | Open | Adopt | Base checkpoint enumeration on this owner |
| OpenClaw #112865 final closed-state capture | Open | Adopt | Use for terminal session/owner state capture |
| OpenClaw #112896 restored admission/status | Open | Adopt | Use compatibility-aware restore admission and status |
| Lobster #5481 host acceptance | Open | Adopt | Use as the managed-host adoption path |
| Lobster fork #25-#28 continuity proofs | Existing evidence | Reuse | Preserve as bounded evidence, not permanent semantics |

Residual upstream delta: none. EC-021 is an adoption and conformance track.

### Workspace and filesystem boundaries

| Investment | State on 2026-08-02 | Classification | Package consequence |
| --- | --- | --- | --- |
| `agents.workspace.list/get` | Present | Reuse | Use for broad read-only operator browsing |
| `agents.files.list/get/set` | Present | Reuse/extend existing | Keep allowlisted semantic root-file editing narrow |
| `@openclaw/fs-safe` | Present | Reuse | Do not create another path-containment library |
| Sandbox/workspace bindings | Present | Reuse | Add owner identity and evidence above existing containment |
| Temporary/private workspace helpers | Present | Reuse | Preserve owner-specific artifact cleanup rather than centralizing every file |

Residual upstream delta: no universal filesystem RFC. Extend a current surface
only for a named semantic artifact and only after its owner is clear.

## Residual Upstream Workstreams

### U-KCC-01: Session export identity and omission manifest

Extend the existing session export owner with:

- stable `exportId`;
- artifact contract version;
- exact session key, session id, branch/leaf, transcript generation, and
  lifecycle revision;
- replay key and already-produced outcome;
- structured included and omitted source classes with reason codes;
- backend transcript coverage state;
- content digest and production timestamp;
- destination/copy reference without taking over delivery settlement; and
- expiry/retained-copy metadata references compatible with EC-030.

This may be a focused PR after a simulation proves the shape. It must not create
a second transcript store or imply that export equals backup or purge.

### U-KCC-02: Context source inclusion and omission evidence

First prove whether the existing context-engine result and runtime diagnostics
can carry:

- ordered source identities and generations;
- included, truncated, omitted, failed, or deferred state;
- reason codes and consumed token/byte budgets;
- selected projection mode/epoch/fingerprint;
- fallback/degraded engine identity; and
- final model-input digest.

If current diagnostics can carry this without a public contract change, keep it
downstream. If not, add one optional portable evidence result to the existing
context-engine lifecycle. Do not create a central context item database.

### U-KCC-03: Memory derived-copy settlement, conditional

Do not start until the read/delete/write owner decisions settle.

Then test whether existing memory status, index identity, audit, and lifecycle
events can report canonical and derived-copy outcomes separately. Only if they
cannot, propose the smallest owner-native settlement event or status result.

### Not residual upstream work

- another memory list API;
- another memory delete API;
- memory write implementation before #116499-#116501 decisions;
- another context-budget framework;
- a universal workspace/filesystem API;
- a second checkpoint/recovery stack;
- Microsoft tenant policy, retention rules, consent UI, legal hold, or audit
  storage.

## Fork and Adapter Ledger

| Ledger item | Class | Purpose | Current relationship | Exit |
| --- | --- | --- | --- | --- |
| Memory-list Gateway patch in Lobster #5402 | B3 | Keep current viewer working | Replaced by #115303/#115329 decision stack | Delete after accepted upstream release and Lobster adoption |
| Session export manifest proof | B1 | Prove identity, replay, omissions, and artifact settlement | Extends current export command | Upstream U-KCC-01 or delete |
| Context source-ledger proof | B1 | Compare native and plugin context assembly evidence | Extends existing context-engine result/diagnostics | Upstream U-KCC-02 or delete |
| Context-budget plugin | B2 | Scout thresholds, policy analysis, and operator insight | Lobster #3371/#3379 | Remain downstream plugin while native signals are sufficient |
| Memory policy adapter | B2 | Resolve tenant/user/app authority for read and mutation | Consumes accepted memory owner seams | Remain Lobster adapter; no portable policy values in OpenClaw |
| Memory consent adapter | B2 | Map Save/Delete operations to interactive or standing consent | Depends on #116499-#116501 | Remain Lobster adapter |
| Memory delete compatibility adapter | B3 | Bridge current Lobster API to accepted OpenClaw contract | Depends on #116484/#116485/#116494 | Delete after migration |
| Memory lifecycle assurance adapter | B2 | Track canonical/index/cache/export obligations | Consumes EC-030 vocabulary | Move to Lobster service or delete if owner-native evidence suffices |
| Recovery-point adoption adapter | B3 | Bridge #112385/#112865/#112896 into Lobster | Lobster #5481 and fork proof stack | Delete after accepted release adoption |
| Workspace policy adapter | B2 | Apply tenant path classes, disclosure, retention, and remote-workspace policy | Sits above `agents.workspace.*`, `agents.files.*`, and fs-safe | Remain Lobster policy adapter |
| Legacy export or memory path inference | B3 | Temporary compatibility with existing path-shaped references | Must not become semantic identity | Delete after stable owner identities are adopted |

No B1 item may become a long-lived semantic fork. Each requires an upstream
link, owner, expiry, replacement target, and deletion proof.

## Lobster Managed Capabilities

| Capability | Lobster responsibility | OpenClaw dependency |
| --- | --- | --- |
| Managed session export | Tenant authorization, destination policy, retention, download/share UX, and audit | U-KCC-01 or current export owner |
| Context-budget policy | Thresholds, tenant profiles, alerts, recommendations, and operator projection | #84676, #84830, context-engine diagnostics |
| Memory explorer | Agent/tenant scoped list, search, provenance, and safe content display | #115303 decision stack and memory search |
| Memory consent broker | Save/Delete Ask/Allow/Off, standing consent, and user/admin UX | #116499-#116501 |
| Memory retention and deletion coordinator | Cross-copy obligation plan, hold/exception handling, retries, and assurance | #116484/#116485 plus EC-020/EC-030 evidence |
| Memory ACL/policy decision | Tenant, user, app, agent, channel, purpose, and classification rules | Portable retrieval/mutation enforcement hooks |
| Recovery coordinator | Capture policy, compatibility, restore admission, quarantine, and fleet projection | #112385/#112865/#112896 |
| Workspace governance | Remote-workspace policy, allowed roots, artifact classes, retention, DLP/disclosure, and operator UX | Existing workspace/sandbox/fs-safe seams |
| Knowledge assurance | Distinguish operational completion from evidence completeness across session, memory, checkpoint, and artifact copies | Owner-native status/evidence references |

Lobster must not directly edit OpenClaw state files to simulate owner
operations. It must call or adapt stable owner boundaries.

## Rust Replacement Boundaries

Rust extraction is late and owner-based, not a broad rewrite.

| Candidate | Extraction trigger | Not included |
| --- | --- | --- |
| `ec-artifact-manifest` | Export, retained-copy, digest, and lifecycle manifest is stable across owners | Transcript, memory, or workspace storage |
| `ec-context-evidence` | Inclusion/omission/budget evidence shape is proven across native and plugin engines | Prompt construction or model-provider logic |
| `ec-obligation-settlement` | Cross-copy lifecycle settlement is stable and EC-030 semantics are proven | Tenant policy values or backend-specific deletion |
| `ec-path-authority` | A portable owner-level path decision is needed beyond fs-safe containment | Reimplementation of `@openclaw/fs-safe` |

Memory retrieval, context assembly, and workspace filesystem implementation do
not move to Rust merely because they are important. Extraction requires a
stable complete owner boundary and a TypeScript deletion plan.

## Operator Journey

```text
select agent/session
  -> inspect exact source generation and export coverage
  -> preview destination, omissions, retention, and disclosure
  -> request export
  -> receive durable production identity
  -> optionally deliver/share under a separate operation

inspect context health
  -> see selected engine, budget, included/omitted sources, and fallback
  -> change managed policy without rewriting canonical transcript or memory

inspect memory
  -> list/search under current authority
  -> request Save/Delete through semantic operation
  -> resolve consent
  -> settle canonical mutation
  -> reconcile indexes, caches, exports, and retained exceptions
  -> report operational and assurance status separately

restore owner state
  -> select compatible recovery point
  -> restore exact owner generation
  -> validate admission
  -> quarantine incompatible or uncertain state
```

## Acceptance Gates

### Runtime

- Export is replay-safe by export identity and exact source generation.
- Context fallback does not mutate canonical session state or submit twice.
- Memory retrieval and mutation enforce the accepted owner authority.
- Recovery restores compatible code and state, not code alone.

### Security

- Prompt projection is never the sole ACL or consent boundary.
- Raw file writes cannot bypass protected memory mutation policy.
- Paths are workspace-relative where required and remain contained through
  symlink, hardlink, traversal, and race checks.
- Unknown or stale protected authority fails closed.

### Operator

- Omitted export/context/memory sources are explicit.
- Save and Delete appear as semantic operations, not generic filesystem calls.
- Canonical mutation and derived-copy settlement are shown separately.
- Retained and externally retained copies remain visible.

### Release and compatibility

- Existing Lobster memory patches have named upstream replacements.
- Closed or superseded PRs are not counted as active delivery.
- Mixed-version hosts do not broaden memory or workspace authority.
- Every B1/B3 item has a release adoption and deletion gate.

### Ecosystem

- Local OpenClaw remains complete without Lobster.
- Plugins can consume native signals without replacing core owners.
- Context-budget, tenant policy, consent, and managed UX remain optional
  downstream composition.

## Dependency-Ordered Work Items

| ID | Work item | Inventory classification | Layer | Depends on | Acceptance | Deletion target |
| --- | --- | --- | --- | --- | --- | --- |
| KCC-001 | Freeze live source and delivery inventory for EC-017-EC-021/EC-035 | Reuse | Planning | - | Source seams, PRs, issues, Lobster work, and patches recorded with date | Stale duplicate inventories |
| KCC-002 | Record memory API decision graph | Reuse | Planning | KCC-001 | #115303/#115330/#115331/#115329/#116494 and #116484/#116485 relationships explicit | Parallel memory API proposals |
| KCC-003 | Record memory write-governance decision graph | Reuse | Planning | KCC-001 | #116499-#116501 and Lobster #6336-#6338 relationships explicit | Premature write implementation |
| KCC-004 | Record context-budget adoption baseline | Reuse | Planning | KCC-001 | #84676/#84830 and Lobster #3371/#3379/#3700 states explicit | New core context-budget framework |
| KCC-005 | Model exact session export source identity | New ask candidate | Evidence | KCC-001 | Session key/id, branch/leaf, generation, revision, and backend coverage represented | File path as export identity |
| KCC-006 | Model export operation and copy identity | New ask candidate | Evidence | KCC-005 | Replay, digest, destination, production settlement, expiry, and retained copy represented | Duplicate export artifacts on retry |
| KCC-007 | Simulate session export omissions and replay | New ask candidate | B1 | KCC-005, KCC-006 | Backend-delegated and malformed-row omissions are structured; replay returns prior result | Ad hoc warning-only completeness |
| KCC-008 | Draft U-KCC-01 contract delta | Extend existing | Upstream | KCC-007 | Existing export owner extended without new transcript store | B1 export proof |
| KCC-009 | Model context source evidence | New ask candidate | Evidence | KCC-004 | Ordered source id/generation, state, reason, and budget fields represented | Hidden source ordering |
| KCC-010 | Compare native and plugin context assembly | Reuse | Evidence | KCC-009 | Same evidence vocabulary covers both without central context storage | Duplicate context models |
| KCC-011 | Prove fallback and truncation observability | Extend existing | B1 | KCC-010 | Fallback/degraded/omitted states are explicit and no duplicate submission occurs | Context source-ledger proof |
| KCC-012 | Decide U-KCC-02 necessity | Extend existing | Upstream | KCC-011 | Use current diagnostics if sufficient; otherwise one optional evidence seam | Unnecessary public API |
| KCC-013 | Adopt native context-budget signals | Adopt | Lobster | KCC-004 | Plugin consumes #84676/#84830 without patching core | Lobster-native signal duplication |
| KCC-014 | Reconcile closed Lobster #3713 coverage | Delete/replace | Lobster | KCC-004 | Missing tests are identified and rehomed or explicitly dropped | Closed PR as phantom work |
| KCC-015 | Resolve persisted-memory read namespace | Reuse | Upstream decision | KCC-002 | Dedicated memory versus scoped `agents.files.*` choice is accepted | Competing public namespaces |
| KCC-016 | Finalize memory discovery semantics | Reuse | Upstream decision | KCC-015 | Safe file grammar, root memory choice, bounds, ordering, and empty state accepted | Downstream-only path grammar |
| KCC-017 | Land/adopt accepted memory read implementation | Extend existing | Upstream/Lobster | KCC-016 | Accepted capability ships and Lobster viewer passes conformance | Lobster memory-list patch |
| KCC-018 | Resolve memory delete contract and safety | Reuse | Upstream decision | KCC-015 | #116484/#116485 settle namespace, containment, races, sync, and idempotence | Independent delete grammar |
| KCC-019 | Resolve semantic memory write tools | Reuse | Upstream decision | KCC-003 | Save/correct/delete owner, stable reference, reindex, and evidence accepted | Generic file mutation as memory API |
| KCC-020 | Resolve protected memory path enforcement | Reuse | Upstream decision | KCC-019 | Generic tools, shell, and fs bridges cannot bypass semantic owner | Prompt-only mutation policy |
| KCC-021 | Resolve standing consent for background writers | Reuse | Upstream decision | KCC-019 | Ask/Off/stale/unresolved behavior and deferred work semantics accepted | Ungoverned dreaming/promotion writes |
| KCC-021A | Land/adopt the accepted memory mutation owner | Extend existing | Upstream/Lobster | KCC-017 through KCC-021 | Read, retrieve, save, correct, and delete enforce owner authorization before access or mutation; generic paths cannot bypass it | Decision-only memory governance |
| KCC-022 | Implement Lobster memory consent adapter | Downstream-only | B2/Lobster | KCC-020, KCC-021, KCC-021A, XPK-004 | Interactive and background operations use one current consent decision through the canonical mutation contract | Direct file-write consent inference |
| KCC-023 | Implement Lobster memory policy adapter | Downstream-only | B2/Lobster | KCC-017 through KCC-021A, XPK-004 | Read/retrieve/write/delete authority is tenant/user/app/agent/channel scoped before owner access; rejection is actionable and sanitized | Post-retrieval filtering as sole control |
| KCC-024 | Prove canonical versus derived memory settlement | New ask candidate | Evidence | KCC-018, KCC-021A, XPK-002, XPK-003 | Source, indexes, caches, exports, retained exceptions, and unknown state settle separately | Single-backend deletion claims |
| KCC-025 | Decide U-KCC-03 necessity | Extend existing | Upstream | KCC-024 | Existing status/audit reused if sufficient; otherwise smallest owner-native event | Parallel lifecycle ledger |
| KCC-026 | Emit memory-native copy and mutation settlement for DGR | Downstream-only | Lobster/owner adopter | KCC-022 through KCC-025 | KCC owns memory semantics and copy facts; DGR owns cross-owner obligation planning, retry, and aggregation | Duplicate memory lifecycle coordinator |
| KCC-027 | Adopt recovery-point aggregation | Adopt | Upstream/Lobster | KCC-001 | #112385 capability mapped to exact EnterpriseClaw owners | Duplicate checkpoint enumeration |
| KCC-028 | Adopt final capture and restored admission | Adopt | Upstream/Lobster | KCC-027 | #112865/#112896 and Lobster #5481 pass compatibility-aware conformance | Fork-only recovery semantics |
| KCC-029 | Inventory workspace read/write surfaces by semantic owner | Reuse | Planning | KCC-001 | `agents.workspace.*`, `agents.files.*`, fs-safe, sandbox, and artifact owners separated | Universal filesystem assumption |
| KCC-030 | Prove workspace generation and path authority | Extend existing | Evidence | KCC-029 | Recreate/reseed changes generation; stale work and alias escape are rejected | Caller path as authorization |
| KCC-031 | Define managed artifact classes | Downstream-only | Lobster | KCC-029, KCC-030 | Temporary, export, retained, remote, and held copies have owner/lifetime/evidence | One generic artifact bucket |
| KCC-032 | Implement Lobster workspace policy adapter | Downstream-only | B2/Lobster | KCC-030, KCC-031 | Tenant roots, remote copies, disclosure, retention, and DLP stay above fs-safe | OpenClaw tenant-policy fork |
| KCC-033 | Run cross-area operational/assurance proof | Extend existing | Evidence | KCC-008, KCC-012, KCC-013, KCC-017, KCC-026, KCC-028, KCC-032, XPK-003 | Export, context, memory, restore, and retained-copy statuses remain independent and integrity-bearing | Success-shaped aggregate status |
| KCC-034 | Perform B1/B3 patch retirement review | Delete | Release | KCC-017, KCC-028, KCC-033 | Adopted release replaces memory-list and recovery adapters with deletion evidence | Permanent compatibility patches |
| KCC-035 | Evaluate Rust extraction gates | Reuse | Rust | KCC-033 | Extract only stable shared manifest/evidence/settlement boundaries with TS deletion plan | Premature broad rewrite |

## Sequencing

```text
inventory
  -> export/context simulations
  -> existing memory owner decisions
  -> accepted memory implementation and owner-side authorization proof
  -> memory conformance and Lobster adapters
  -> memory-native copy facts consumed by DGR
  -> recovery adoption
  -> workspace/artifact evidence
  -> cross-area proof
  -> patch deletion
  -> optional Rust extraction
```

Memory implementation is intentionally decision-gated. Session export and
context evidence can progress independently. Recovery adoption can progress in
parallel because its owner stack is already identified.

## Findings

1. **The session export gap is identity and completeness, not export
   creation.** Current OpenClaw already exports a real artifact and reports
   malformed rows and backend-delegated omissions.
2. **Context-budget is a successful downstream-plugin pattern.** OpenClaw owns
   portable pressure signals; Lobster owns managed analysis and UX.
3. **Memory APIs are already decomposed into the right decisions.** New
   EnterpriseClaw list/delete/write proposals would duplicate active work.
4. **Memory consent requires path enforcement.** Semantic Save/Delete controls
   are ineffective while raw file and shell mutation can bypass them.
5. **File deletion is not semantic memory deletion.** Canonical memory,
   indexes, caches, exports, remote copies, and retained exceptions settle
   independently.
6. **Workspace safety is strong but not owner authorization.** fs-safe proves
   containment; the semantic owner still decides whether a contained
   operation is authorized.
7. **EC-021 is already an adoption track.** A new checkpoint RFC would compete
   with the active recovery-point stack.

## Package Exit

This package is complete when:

- U-KCC-01 and U-KCC-02 have evidence-backed accept/reject decisions;
- memory read/delete/write governance decisions are accepted without parallel
  EnterpriseClaw APIs;
- the accepted memory implementation enforces authorization before retrieval
  and mutation and cannot be bypassed through generic file or shell paths;
- Lobster uses accepted owner seams for memory and recovery;
- KCC emits memory-native copy facts while DGR alone coordinates cross-owner
  lifecycle obligations;
- the carried memory-list and continuity compatibility patches have deletion
  evidence;
- operational and assurance status remain separate across canonical and
  derived copies; and
- any Rust extraction deletes a proven TypeScript boundary rather than
  duplicating it.
