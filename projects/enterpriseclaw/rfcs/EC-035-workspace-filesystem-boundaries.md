# RFC Scope: Workspace and Filesystem Boundaries

- ID: EC-035
- Lane: Knowledge, context, and continuity
- Status: Source-backed scoped draft
- Initial posture: Fork + focused RFC
- Primary owner: Existing workspace, sandbox, state-path, and artifact owners

## Scope

- Define workspace identity and generation, filesystem root and path identity,
  sandbox access, bind-root authority, local/remote workspace relationships,
  temporary and retained artifact lifetimes, containment, recreation, cleanup,
  and evidence.
- Relate existing workspace, sandbox, state-path, transcript, skill, memory,
  attachment, and temporary-artifact owners without creating a universal
  filesystem owner.

## Current Owner Baseline

Current OpenClaw source already distinguishes:

- per-agent workspace directory and derived workspace key;
- workspace bootstrap/onboarding and attestation state;
- sandbox scope, backend, workspace access mode, root, and allowed bind roots;
- config/state roots and owner-specific database, credential, queue, and
  transcript paths;
- canonical transcript stores from export/archive paths;
- workspace and plugin skill precedence with realpath policy;
- private temporary workspaces and owner-specific staged/retained artifacts;
  and
- local, Docker, Podman, SSH, and OpenShell workspace behavior.

Local path selection, canonicalization, realpath/symlink containment, recovery,
reseed/recreate, export, archive, and cleanup are strongly source-backed.

Current Gateway surfaces intentionally separate broad read-only workspace
browsing (`agents.workspace.list/get`) from narrow allowlisted root-file
mutation (`agents.files.*`). Both sit above `@openclaw/fs-safe` containment.
New session, memory, or artifact behavior should extend the appropriate
semantic owner or one of these bounded surfaces; it should not collapse them
into a universal read/write filesystem API.

## Contract Objects

| Object | Owner | Identity/lifetime |
| --- | --- | --- |
| Workspace | Agent workspace owner | Stable workspace key plus selected root and workspace generation |
| Workspace bootstrap state | Workspace state owner | Bootstrap/context signatures, onboarding state, and attestation freshness |
| Sandbox | Sandbox runtime | Scope, backend, access mode, runtime root, bind roots, and sandbox generation |
| Workspace binding | Workspace/sandbox relationship | Exact source workspace, runtime projection, access mode, and generation |
| State root | Config/state owner | Owner-specific state path generation and recovery policy |
| Canonical owner file/store | Semantic owner | Owner-native identity; path is location, not semantic identity |
| External/remote workspace copy | Remote provider or sandbox owner | Explicit copy/binding identity and reseed/recreate semantics |
| Temporary artifact | Producing owner | Stable artifact identity, private root, TTL, cleanup owner, and terminal disposition |
| Retained artifact | Producing/lifecycle owner | Source identity, reason, retention/hold, disclosure, and deletion settlement |
| Path authorization | Workspace/sandbox owner | Requested path, canonical path, allowed root, operation, authority generation, and decision |

A path string is never sufficient semantic identity for a workspace, session,
memory corpus, credential, skill, attachment, or checkpoint.

## State and Relationship Model

```text
workspace:
  selected -> initialized -> attested -> active
    | recreate/reseed -> new generation
    | unavailable | incompatible | quarantined | retired

sandbox binding:
  proposed -> validated -> materialized -> active
    | stale | revoked | recreate_required | removed

artifact:
  created -> active -> retained | expired -> cleaned
    | blocked_by_hold | externally_retained | cleanup_failed | unknown
```

Workspace recreation, remote reseed, root movement, sandbox replacement, and
authority changes create new generations or binding identities. Existing work
cannot silently continue against a different canonical root.

## Explicit Exclusions

- One universal virtual filesystem, artifact database, or path namespace.
- Taking ownership of session transcripts, memory corpora, configuration,
  credentials, skills, attachments, checkpoints, or provider files.
- Treating skill/workspace precedence as artifact trust or installation
  eligibility.
- Treating sandbox containment as enterprise classification, DLP, residency,
  retention, or legal-hold policy.
- Requiring remote workspaces, sandboxes, or managed governance for ordinary
  local operation.

## Required Outcomes

- Workspace identity remains stable and distinguishable from its current path.
- Commands and file effects bind to the workspace/sandbox generation and
  canonical path authorization actually accepted.
- Path normalization, realpath/symlink checks, bind roots, and access mode
  prevent traversal or alias escape.
- Local source, sandbox projection, and remote-canonical workspace copies are
  explicit relationships with provenance and recreation semantics.
- State, transcript, memory, skill, attachment, checkpoint, and temporary
  paths retain their semantic owners.
- Temporary and retained artifacts identify producer, source operation,
  lifetime, cleanup owner, retention/hold, disclosure, and terminal outcome.
- Missing, malformed, stale, incompatible, inaccessible, cleanup-failed, and
  externally retained states remain explicit.
- EC-030 lifecycle obligations apply per owner/copy; deletion of one path never
  proves deletion of another copy.
- EC-021 restore and EC-029 release operations use exact target/root identity
  and do not authorize mutation from a caller-supplied path alone.
- Local operation remains complete with local workspace and owner-native
  cleanup.

## Compatibility and Operations

- Workspace contract, sandbox backend, state schema, artifact format, and
  remote-provider versions evolve independently.
- Unknown required access or containment semantics fail closed.
- Mixed versions may preserve read-only or reduced access only when explicitly
  declared; they never broaden bind roots.
- Startup/bootstrap, remote seed, recreation, path validation, temporary
  cleanup, disk use, and failure isolation have profile-specific budgets.
- Sandbox or remote-provider failure does not corrupt the local source
  workspace or unrelated owner roots.
- Quarantine preserves evidence and prevents automatic adoption or deletion of
  unattributed files.

## Dependencies

- EC-004, EC-006, EC-017, EC-020, EC-021, EC-027, EC-028, EC-030,
  EC-031, and EC-033.

## Proof and Deletion Gate

- Resolve one local workspace, create one sandbox projection, and recreate it
  under a new generation without stale work crossing the boundary.
- Reject traversal, symlink/realpath escape, and an unauthorized bind root.
- Prove one remote workspace reseed while preserving source/copy identity.
- Create one temporary artifact that expires and one retained artifact blocked
  by a hold; report their settlements separately.
- Restore one exact owner target without treating its path as authorization.
- Delete duplicated path inference, broad allowlists, unowned temp cleanup,
  and scripts that treat exports or remote copies as canonical owner state.
- Disprove the separate contract if current owners already expose portable
  workspace/binding generations, path authority, copy relationships, artifact
  lifecycle, and evidence without cross-owner inference.
