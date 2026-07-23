# Snapshot Project

Use this area for the OpenClaw `snapshot` RFC, SQLite-safe snapshot/restore
semantics, backup command integration, and failover substrate
coordination.

## Active Notes

| Area            | File         |
| --------------- | ------------ |
| Session handoff | `SESSION.md` |

## Active Work

| Repo                            | PR / Issue                                                   | Branch                                     | Status           | Purpose                                                                                                       |
| ------------------------------- | ------------------------------------------------------------ | ------------------------------------------ | ---------------- | ------------------------------------------------------------------------------------------------------------- |
| `openclaw/rfcs`                 | [PR #20](https://github.com/openclaw/rfcs/pull/20)           | `rfc/cloud-serializable-sqlite-state`      | Draft            | Define the SQLite state snapshot RFC.                                                                         |
| `openclaw/openclaw`             | [PR #94805](https://github.com/openclaw/openclaw/pull/94805) | `giodl/snapshot-restore-proof-pr4`         | Draft            | Combined SQLite snapshot provider, `backup sqlite snapshot` CLI, named targets, and safe-sync artifact proof. |
| `openclaw/openclaw`             | [PR #94967](https://github.com/openclaw/openclaw/pull/94967) | `giodl/snapshot-stress-pr5`                | Draft            | Add opt-in SQLite snapshot stress harness for global and per-agent DBs.                                       |
| `microsoft.ghe.com/bic/lobster` | [PR #4064](https://microsoft.ghe.com/bic/lobster/pull/4064)  | `user/giodl/openclaw-snapshot-auto-create` | Open             | Enable opt-in startup snapshot creation in the Lobster trial so telemetry includes actual snapshot artifacts. |
| `openclaw/openclaw`             | [#90370](https://github.com/openclaw/openclaw/issues/90370)  | n/a                                        | Open             | Canonical storage-backend product/design tracker.                                                             |
| `openclaw/openclaw`             | [#94675](https://github.com/openclaw/openclaw/issues/94675)  | n/a                                        | Closed duplicate | Detailed SQLite/Postgres inventory routed to #90370.                                                          |
| `openclaw/openclaw`             | [#88838](https://github.com/openclaw/openclaw/issues/88838)  | n/a                                        | Open             | Session/transcript SQLite migration and accessor seam.                                                        |

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

- `projects/layering-contracts/synchronization-model.md` - project-note hypothesis for composing SQLite snapshot evidence into broader state synchronization
- `projects/openclaw/README.md`
- `projects/prs/README.md`
- `projects/policy/README.md`
