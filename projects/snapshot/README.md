# Snapshot Project

Use this area for the OpenClaw `snapshot` RFC, SQLite-safe snapshot/restore
semantics, backup command integration, and failover substrate
coordination.

## Active Notes

| Area | File |
| --- | --- |
| Session handoff | `SESSION.md` |

## Active Work

| Repo | PR / Issue | Branch | Status | Purpose |
| --- | --- | --- | --- | --- |
| `openclaw/rfcs` | [PR #20](https://github.com/openclaw/rfcs/pull/20) | `rfc/cloud-serializable-sqlite-state` | Draft | Define the SQLite state snapshot RFC. |
| `openclaw/openclaw` | [PR #94694](https://github.com/openclaw/openclaw/pull/94694) | `giodl/snapshot-provider-proof` | Draft | Add the core snapshot provider proof. |
| `openclaw/openclaw` | [PR #94717](https://github.com/openclaw/openclaw/pull/94717) | `giodl/snapshot-cli-pr2` | Draft | Add the core `openclaw snapshot` CLI on top of PR #94694. |
| `openclaw/openclaw` | [PR #94799](https://github.com/openclaw/openclaw/pull/94799) | `giodl/snapshot-named-targets-pr3` | Draft | Add named OpenClaw database targets for snapshot create. |
| `openclaw/openclaw` | [PR #94805](https://github.com/openclaw/openclaw/pull/94805) | `giodl/snapshot-restore-proof-pr4` | Draft | Prove and document safe sync/restore from snapshot artifacts. |
| `openclaw/openclaw` | [PR #94967](https://github.com/openclaw/openclaw/pull/94967) | `giodl/snapshot-stress-pr5` | Draft | Add opt-in SQLite snapshot stress harness for global and per-agent DBs. |
| `openclaw/openclaw` | [#90370](https://github.com/openclaw/openclaw/issues/90370) | n/a | Open | Canonical storage-backend product/design tracker. |
| `openclaw/openclaw` | [#94675](https://github.com/openclaw/openclaw/issues/94675) | n/a | Closed duplicate | Detailed SQLite/Postgres inventory routed to #90370. |
| `openclaw/openclaw` | [#88838](https://github.com/openclaw/openclaw/issues/88838) | n/a | Open | Session/transcript SQLite migration and accessor seam. |

## Scope

The snapshot project focuses on making OpenClaw-owned SQLite state portable,
restorable, and verifiable as an owned artifact. The project does not choose a
replacement database backend.

The first RFC should keep SQLite as the hot local runtime database and define
how an opt-in `snapshot` feature can provide:

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
