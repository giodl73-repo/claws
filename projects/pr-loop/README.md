# PR Loop Project

Use this area for active PR-loop operations that need durable handoff: stacked
PR dependency order, restacks after merges, review refreshes, CI gate status,
and next-action notes.

This project is narrower than `projects/prs/`: `prs` is the broad watcher and
archive surface, while `pr-loop` is the live operator lane for turning a stack
into mergeable, reviewed, useful PRs.

## Active Notes

| Area            | File         |
| --------------- | ------------ |
| Session handoff | `SESSION.md` |

## Active Work

| Repo                | PR / Issue                    | Branch                        | Status         | Purpose                                                                                                                                                         |
| ------------------- | ----------------------------- | ----------------------------- | -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `bic/lobster`       | Scout feeds stack             | `user/giodl/scout-feeds-*`    | Active         | Marketplace/admin feed PR dependency loop.                                                                                                                      |
| `openclaw/openclaw` | Maintainer merge wrapper flow | `/root/src/openclaw-workflow` | Active pattern | Use WSL `scripts/pr-review`, `scripts/pr-prepare`, and `scripts/pr-merge`; see `SESSION.md` for auth pin, ClawSweeper, exact-head CI, and drift handling notes. |

## Related Areas

- `projects/lobster/README.md`
- `projects/feeds/README.md`
- `projects/prs/README.md`
