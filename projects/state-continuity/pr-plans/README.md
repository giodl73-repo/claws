# Runtime State Continuity PR Plans

These execution briefs refine RFC 0021's six implementation slices. Each slice
must remain independently reviewable and must not pull a later CAPE guarantee
into an earlier PR.

Evidence collection starts before implementation. See
`../validation-first-plan.md` for the inventory, shutdown, local round-trip,
runtime-budget, failure, Lobster wake, and deletion lanes that run from current
`main`.

| Stage | Actual PRs                                       | Plan                            | Primary outcome                                                       |
| ----- | ------------------------------------------------ | ------------------------------- | --------------------------------------------------------------------- |
| 1     | 1                                                | `01-continuity-owner-model.md`  | Stable continuity vocabulary, config, inventory, status, and fixtures |
| 2     | 2                                                | `02-checkpoint-and-restore.md`  | Local Archived round trip                                             |
| 3     | 3A OpenClaw, then 3B Lobster                     | `03-hosted-publication.md`      | Hosted Integration publication binding                                |
| 4     | 4A OpenClaw, then 4B Lobster                     | `04-replacement-and-handoff.md` | Portable fresh-compute replacement                                    |
| 5     | 5A OpenClaw, then 5B Lobster                     | `05-hibernate-and-wake.md`      | Elastic scale-from-zero                                               |
| 6     | 6A optional observation support, then 6B Lobster | `06-migration-and-deletion.md`  | Lobster authority cutover and private-path deletion                   |

The RFC has six implementation stages, not necessarily six GitHub PRs. A
cross-repository stage is explicitly split into independently reviewable A/B
PRs; no PR spans repositories.

## Shared Merge Rules

- Branch from the latest upstream `main` by default and rebase as prerequisites
  land.
- PR 1 and the local Archived work may start before Hosted Integration lands.
- Hosted publication, Portable, and Elastic cannot merge before the exact
  Hosted Integration seams they consume.
- Temporarily stack only for a direct compile-time or test dependency; do not
  copy provisional prerequisite types into a compatibility layer.
- Conventional behavior remains unchanged when continuity is not configured.
- Existing stores, schemas, writes, transactions, and acknowledgement
  semantics remain unchanged.
- Periodic capture never requires a runtime-wide pause.
- Host-managed credentials never enter recovery artifacts.
- Unknown required versions, bindings, generations, or artifact integrity fail
  closed.
- CAPE is reported operator posture, not implementation decomposition.
- Status, Doctor, and readiness reuse Hosted Integration conventions.
- No Lobster deletion occurs before shadow comparison, authority cutover,
  rollback expiry, and minimum-version enforcement.
- Every temporary compatibility path has an owner and removal gate.

## Dependency order

```text
main -> PR 1 owner model -> PR 2 local Archived

Hosted Integration seams on main
  + PR 2 local Archived
  -> PR 3A hosted seam -> PR 3B Lobster binding
  -> PR 4A Portable contract -> PR 4B Lobster orchestration
  -> PR 5A Elastic contract -> PR 5B Lobster wake
  -> PR 6A optional observation support -> PR 6B migration and deletion
```
