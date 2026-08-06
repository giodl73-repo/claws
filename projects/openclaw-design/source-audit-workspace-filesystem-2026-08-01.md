# Workspace and Filesystem Ownership Source Audit - 2026-08-01

## Source Baseline

- Worktree: `C:\src\openclaw-design-audit`
- Head: `bde1602e6e86fd91dd0bec3aae714e059e556c4d`

## Finding

OpenClaw has strong local filesystem ownership and containment. Workspace,
sandbox, state, transcript, skill, and temporary-artifact paths are distinct
objects with real selection, precedence, persistence, recovery, and path-safety
contracts.

The enterprise gap is not basic path correctness. It is the absence of
first-class tenant/project, classification, residency, retention/legal hold,
DLP, malware scanning, encryption/KMS, and remote-provider governance
relationships across those mature local owners.

## Current Architecture

```text
profile/config/env + agent scope
        |
        v
workspace owner + bootstrap/attestation
        |
        +--> context/bootstrap files
        +--> workspace skills and memory
        +--> tool-visible files
        |
        v
sandbox projection
scope + backend + workspace access + bind roots
        |
        +--> local/Docker/Podman/SSH/OpenShell execution
        |
        v
separate state owners
config + SQLite + credentials + transcripts + delivery media
        |
        v
export/archive/backup/restore/temp cleanup
```

## Objects and Lifetimes

| Object | Owner | Identity / renewal |
| ------ | ----- | ------------------ |
| Workspace | Agent workspace owner | `workspaceDir` plus derived `workspaceKey`; renewed by selection, setup, bootstrap state, or attestation. |
| Workspace bootstrap state | Workspace state store | File signatures, onboarding/bootstrap state, and attestation freshness. |
| Sandbox | Sandbox runtime | Scope, backend, workspace access, workspace root, and allowed bind roots; renewed on recreate or remote reseed. |
| State root | Config/state owner | `stateDir` with config, SQLite, credentials, queues, and owner subpaths. |
| Transcript store | Session/transcript owner | `sessionKey` and `sessionId` mapped to canonical SQLite storage plus export/archive paths. |
| Skill source | Skill/plugin owners | Workspace skills and plugin-published skills with explicit precedence and realpath policy. |
| Temporary workspace/artifact | Infrastructure/tool owner | Preferred OpenClaw temp root plus task-specific subpath and cleanup lifecycle. |
| Attachment/media artifact | Message/delivery owner | Owner-specific staged or queued media path and delivery cleanup. |

## Workspace Selection and Bootstrap

The default workspace is selected from:

1. `OPENCLAW_WORKSPACE_DIR`;
2. `OPENCLAW_PROFILE`; then
3. the default `~/.openclaw/workspace`.

See `src/agents/workspace-default.ts:12-25`.

Per-agent workspace selection is resolved by agent-scope configuration
(`src/agents/agent-scope-config.ts:263-285`).

Workspace creation and bootstrap maintain expected context/persona files,
onboarding state, bootstrap analysis, and warnings
(`src/agents/workspace.ts:703-1233`).

The workspace state store tracks bootstrap and attestation state separately
from ordinary workspace content
(`src/agents/workspace-state-store.ts:111-179`, `298-358`, `470-516`,
`623-673`).

## Sandbox Authority

Sandbox configuration distinguishes:

- sandbox scope;
- backend;
- workspace access mode;
- workspace root; and
- bind roots.

See `src/agents/sandbox/config.ts:247-261`.

Workspace authority resolves whether and how a sandbox may access the agent
workspace (`src/agents/sandbox/workspace-authority.ts:132-239`).

Sandbox path resolution canonicalizes roots and constrains bind/path traversal
(`src/agents/sandbox-paths.ts:68-367`). Security validation rejects unsafe
combinations (`src/agents/sandbox/validate-sandbox-security.ts:319-388`).

Docker, Podman, SSH, and OpenShell backends can own different physical runtime
locations. Remote SSH/OpenShell workspaces may become runtime-canonical after
seed; recreate re-seeds from the local source
(`docs/gateway/sandboxing.md:230-268`, `545-546`).

## State and Transcript Paths

State-path ownership distinguishes:

- config path;
- runtime state root;
- Gateway/session SQLite;
- per-agent state;
- credentials;
- delivery queue media; and
- related owner directories.

See `src/config/paths.ts:68-76`, `277-333`, `416-431` and
`src/config/sessions/paths.ts:11-70`.

Config recovery uses last-known-good and suspicious-read policy rather than
silently accepting malformed state (`src/config/recovery-policy.ts:56-83`).

Canonical transcripts are SQLite-backed. Human/export artifacts live under a
separate transcript export tree, and archives have their own compression and
cleanup lifecycle:

- `docs/cli/transcripts.md:16-128`;
- `src/gateway/session-transcript-files.fs.ts:317-482`; and
- `src/config/sessions/archive-compression.ts:39-101`.

The export is not the canonical session store.

## Skills and Plugin Files

Workspace `skills/` has highest precedence. Plugin skills are published through
a plugin-skill directory and symlinked with realpath checks:

- `docs/concepts/agent-workspace.md:89-96`;
- `src/skills/loading/workspace-precedence.test.ts:1-73`; and
- `src/skills/loading/plugin-skills.ts:22-197`.

This is a definition precedence contract, not a trust or install-eligibility
contract.

## Temporary and Leaf-Write Paths

OpenClaw selects a private preferred temp root and creates bounded temporary
workspaces (`src/infra/tmp-openclaw-dir.ts:55-66`,
`src/infra/private-temp-workspace.ts:1-14`).

Archives, attachments, MCP/config intermediates, and tool operations use
owner-specific temporary or retained paths rather than one global artifact
store.

`oc-path` is intentionally a narrow leaf-write layer. It does not absorb memory
or configuration ownership (`docs/plugins/oc-path.md:10-159`).

## Recovery and Portability

Current source provides:

- workspace Git backup patterns;
- config last-known-good recovery;
- transcript export and archives;
- Doctor import/restore behavior;
- sandbox recreation/reseed; and
- alternate local and remote sandbox backends.

These are strong operational primitives, but they do not yet form one
enterprise data-governance policy.

## Enterprise Validation

### Covered

- Local per-agent workspace roots.
- Canonical path and realpath containment.
- Explicit sandbox workspace-access modes and bind roots.
- Separation of workspace, state, transcript, credential, queue, skill, and
  temporary paths.
- Export versus canonical transcript distinction.
- Recovery, archive, cleanup, and remote sandbox portability.

### Missing enterprise contracts

- tenant/org/project ownership and administrative scope;
- data classification and DLP;
- storage residency and cross-boundary transfer;
- encryption/KMS and customer-managed key relationships;
- retention, legal hold, eDiscovery, and deletion across backups;
- malware/content scanning for attachments, skills, and imported artifacts;
- governed remote workspace providers and private connectivity;
- support-bundle disclosure and redaction;
- fleet-wide workspace generation, drift, and attestation; and
- storage quota, cost, and chargeback.

## Separation Decision

Preserve separate owner contracts:

1. **Workspace owner**: agent, workspace directory/key, bootstrap, attestation,
   and context-file ownership.
2. **Sandbox owner**: scope, backend, workspace access, root, bind roots, seed,
   and recreate.
3. **State-path owner**: state root and owner-specific config/database/
   credential/queue paths.
4. **Transcript owner**: canonical store, session identity, export, archive,
   and cleanup.
5. **Skill/file definition owner**: source, precedence, realpath, and trust
   metadata.
6. **Artifact owner**: temporary/retained path, TTL, cleanup, export, and
   disclosure policy.

Enterprise data governance should bind to these owners. It should not create
one universal virtual filesystem or artifact database.

## Revised Rubric

| Dimension | Score | Reason |
| --------- | ----- | ------ |
| Ownership | 4 | Workspace, sandbox, state, transcript, skill, and artifact owners are distinct. |
| Object model | 4 | Roots, keys, access modes, stores, exports, archives, binds, and temp artifacts are concrete. |
| Contract completeness | 4 | Selection, precedence, containment, persistence, export, recovery, and cleanup are well covered locally. |
| Separation/cohesion | 3 | Boundaries are strong, but many owner paths remain operationally cross-cutting. |
| Evidence | 4 | Path, precedence, sandbox, transcript, recovery, and workspace tests/docs are extensive. |
| Evolution/operations | 4 | Alternate backends, reseed/recreate, migration, export, and restore are explicit. |

**Total: 23/24 (A), high confidence for local/runtime behavior.**

Enterprise contract coverage remains **C2** because governance semantics are
mostly external policy and host responsibility.
