Related RFC: https://github.com/openclaw/rfcs/pull/46

Umbrella outcome: https://github.com/openclaw/openclaw/issues/114145

Stacked follow-up: https://github.com/openclaw/openclaw/pull/112865

Exact current head: `32809a14fc6b9feca7faecc377fa394c5260fd31`

## What problem this solves

A verified RFC 0013 SQLite snapshot represents one owner database, not one
complete OpenClaw recovery point. Recovery orchestration needs one exact
identity spanning the owner-selected global and per-agent inventory without
inventing a second snapshot implementation or host lifecycle framework.

This PR adds a private aggregate recovery-point slice above the existing
`SqliteSnapshotProvider`. It:

- re-verifies every owner snapshot and manifest;
- binds a canonical state-owner inventory, source generation, and revision;
- rejects missing, extra, duplicate, traversal-shaped, and non-canonical owner
  entries;
- binds exact artifact and owner-manifest digests and sizes;
- validates a closed, value-free obligation vocabulary; and
- derives deterministic recovery-point and acceptance-set identities.

The result remains `host-protected`. This PR adds no CLI, plugin API, storage
provider, suspension, wake, restore, or destruction authority.

## Latest restack

The branch was rebuilt on OpenClaw `main` at
`c43847313da1160852499618fb140779288f8faa` and remained mergeable after `main`
advanced again. The complete three-branch ancestry is linear:

`32809a14fc6` (#112385) -> `77e09a8f5c9` (#112865) ->
`247457d3544` (#112896).

GitHub cannot target a cross-fork PR at another fork-only branch, so the child
PRs continue to target `main` and display cumulative diffs.

## Real behavior proof

- `src/snapshot/recovery-point.test.ts`: eight composition, verification,
  inventory, ordering, obligation, and rewrite-race tests passed in the
  integrated restack.
- `pnpm tsgo:core` and the core test typecheck passed on the complete stack.
- The protocol registry check and the restored-admission integration suite also
  passed on the complete stack.

## Review gate

This remains owner-review evidence. Before merge, maintainers must accept the
authoritative activation-pinned inventory source and decide whether the
scale-to-zero lifecycle contract stays under RFC 0013 or moves to a standalone
draft RFC. Credential-free portability, durable host acceptance, retained
ingress, wake, placement, and restored admission are outside this PR.
