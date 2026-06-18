# Snapshot Project

Use this area for the OpenClaw `snapshot` plugin RFC, SQLite-safe
snapshot/restore semantics, backup command integration, and failover substrate
coordination.

## Active Notes

| Area | File |
| --- | --- |
| Session handoff | `SESSION.md` |

## Active Work

| Repo | PR / Issue | Branch | Status | Purpose |
| --- | --- | --- | --- | --- |
| `openclaw/rfcs` | [PR #20](https://github.com/openclaw/rfcs/pull/20) | `rfc/cloud-serializable-sqlite-state` | Draft | Define the SQLite State Snapshot Plugin RFC. |
| `openclaw/openclaw` | [#90370](https://github.com/openclaw/openclaw/issues/90370) | n/a | Open | Canonical storage-backend product/design tracker. |
| `openclaw/openclaw` | [#94675](https://github.com/openclaw/openclaw/issues/94675) | n/a | Closed duplicate | Detailed SQLite/Postgres inventory routed to #90370. |
| `openclaw/openclaw` | [#88838](https://github.com/openclaw/openclaw/issues/88838) | n/a | Open | Session/transcript SQLite migration and accessor seam. |

## Scope

The snapshot project focuses on making OpenClaw-owned SQLite state portable,
restorable, and verifiable as an owned artifact. The project does not choose a
replacement database backend.

The first RFC should keep SQLite as the hot local runtime database and define
how an opt-in `snapshot` plugin can provide:

- consistent SQLite-safe snapshots
- verified restore on a fresh host/container
- optional `openclaw backup` command integration
- a reusable provider contract for all OpenClaw-owned SQLite databases
- lifecycle metadata for integrity, schema version, and restore points
- a substrate for future failover without promising automatic failover first

## Related Areas

- `projects/openclaw/README.md`
- `projects/prs/README.md`
- `projects/policy/README.md`
