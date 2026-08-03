# EC-035 Workspace and Filesystem Evidence Packet

## Evidence Baseline

- Source worktree: `C:\src\openclaw-design-audit`.
- Audited revision: `bde1602e6e86fd91dd0bec3aae714e059e556c4d`.
- Source audit:
  `projects/openclaw-design/source-audit-workspace-filesystem-2026-08-01.md`.
- Facility specification:
  `projects/openclaw-design/specs/workspace-filesystem.md`.
- Current source audit score: 23/24, high confidence.
- Proposal status: EC-035 is a local scoped draft; no upstream acceptance is
  claimed.
- Evidence grade: A.

## Closure Reason

The prior 34-contract portfolio named workspace/filesystem as a first-class
owner in the target architecture and implementation map but did not assign its
identity, containment, sandbox binding, remote-copy, temporary-artifact, or
cleanup relationships to an EC contract.

EC-030 supplies lifecycle vocabulary but does not own workspace paths.
EC-021 supplies restore composition but does not own target roots.
EC-027/EC-028 cover skill/extension metadata and trust but not workspace
selection or path authority.

EC-035 closes that owner-domain gap without creating a universal filesystem.

## Claim Classification

| Claim | Classification | Evidence |
| --- | --- | --- |
| Workspace, sandbox, state, transcript, skill, and temporary paths are distinct current objects. | Current source | Workspace/filesystem source audit |
| Current source enforces canonicalization, realpath/symlink containment, bind roots, and access modes. | Current source/proof | Sandbox/path source and tests referenced by the audit |
| Local and remote sandbox workspaces have explicit seed/recreate behavior. | Current source | Sandbox documentation and source audit |
| One portable workspace generation and path-authorization envelope exists across all owners. | Target hypothesis | Not found |
| Temporary/retained artifacts have one common lifecycle correlation. | Target hypothesis | Owner-specific behavior exists; shared relationship remains incomplete |

## Current Objects

| Object | Current owner | Current evidence |
| --- | --- | --- |
| Workspace root/key | Agent workspace owner | Environment/profile/agent selection and workspace setup |
| Bootstrap/attestation state | Workspace state store | File signatures, onboarding, bootstrap, freshness |
| Sandbox root/access/binds | Sandbox runtime | Scope/backend/access/root/bind validation |
| State root | Config/state owners | Config, SQLite, credentials, queues, owner subpaths |
| Transcript store/export/archive | Session owner | Canonical SQLite versus derived export/archive paths |
| Skill source | Workspace/plugin owners | Precedence, publication, realpath checks |
| Temporary workspace/artifact | Producing infrastructure/tool owner | Private roots and owner-specific cleanup |
| Attachment/media artifact | Messaging/delivery owner | Staging, queueing, send, and cleanup |

## Representative Fixtures

1. Local workspace selection and bootstrap.
2. Sandbox read/write/none access with exact bind roots.
3. Traversal and symlink/realpath escape rejection.
4. Sandbox recreation or remote reseed with new binding generation.
5. Canonical transcript versus export/archive path distinction.
6. Workspace skill precedence without granting install trust.
7. Temporary artifact expiry and cleanup.
8. Retained artifact blocked by legal/operational hold.
9. Exact restore target authorized by owner identity, not path alone.
10. Mixed backend/version behavior with no access broadening.

## Operational and Security Constraints

- Path evidence is redacted for audiences that do not need host-private roots.
- Reusable credentials never enter workspace/path evidence.
- Remote provider and sandbox identities remain distinct from user/device
  pairing identity.
- Unknown containment or bind semantics fail closed.
- Cleanup failure preserves attribution and does not trigger broad recursive
  deletion.
- Local mode requires no sandbox, remote provider, fleet service, or central
  artifact store.

## Migration, Deletion, and Disproof

- Adapt current workspace and sandbox owners.
- Add portable identity/generation and relationship evidence rather than a new
  storage layer.
- Keep lifecycle mutation with each semantic owner.
- Delete path-string identity inference, broad bind allowlists, duplicated
  containment logic, and unowned temp cleanup.
- Disprove EC-035 if current owner surfaces already provide portable
  generation, path authority, copy, lifecycle, and evidence semantics without
  shared inference.

## Unproven Normative Claims

| Target claim | Required proof | Status |
| --- | --- | --- |
| Workspace identity survives path movement without ambiguity. | Move/rebind fixture | Planned |
| Commands uniformly bind accepted workspace/sandbox generation. | Cross-tool stale-generation fixture | Planned |
| Remote-canonical copies preserve source/copy lifecycle. | Remote reseed/delete fixture | Planned |
| Temporary/retained artifacts share portable settlement vocabulary. | Multi-owner artifact fixture | Planned |
| Mixed backend versions never broaden access. | Compatibility matrix | Planned |

## Evidence-Ready Disposition

EC-035 is A-grade but not evidence-ready. Current owner behavior and
representative containment/path evidence are strong; portable generation,
cross-tool fencing, remote-copy lifecycle, and mixed-version proof remain.
