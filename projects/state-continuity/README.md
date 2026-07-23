# Runtime State Continuity Project

Use this area to define OpenClaw checkpoint and lifecycle semantics for backup,
recovery portability, and scale from zero without changing canonical live
storage.

## Objective

Define:

- online and final closed-state checkpoints;
- exact publication and retrieval semantics;
- explicit restore and compatibility validation;
- clean shutdown, final handoff, hibernate, wake, and restored startup;
- retained ingress and cron reconciliation across absent compute;
- generation fencing, quarantine, readiness, Status, Doctor, and conformance;
  and
- the operator-facing CAPE levels: Conventional, Archived, Portable, Elastic.

Runtime State Continuity owns publication, retrieval, lifecycle authority, and
restored admission directly. It does not depend on Hosted Integration bundles,
reverse dispatch, or a bundled `lobster-host` extension. It may reuse ordinary
plugin registration plus existing readiness, Status, and Doctor conventions.
Elastic may later consume independently justified hosted networking seams.

## Active Notes

| Area                                                      | File                                                                          |
| --------------------------------------------------------- | ----------------------------------------------------------------------------- |
| Current session and resume state                          | `SESSION.md`                                                                  |
| Revised falsifiable thesis and boundaries                 | `frame.md`                                                                    |
| OpenClaw, readiness, and Lobster source audit             | `source-audit-2026-07-11.md`                                                  |
| Credential-safe continuity capture treatment              | `continuity-capture-treatment.md`                                             |
| Local Archived activation contract and blockers           | `local-archived-activation-contract.md`                                       |
| Multi-role review of local activation                     | `local-archived-activation-role-review.md`                                    |
| Artifact-specific reconstruction and external obligations | `reconstruction-obligations.md`                                               |
| Non-active exact-target restore plan and journal slice    | `restore-plan-journal-slice.md`                                               |
| Forward-only claim-and-assembly journal                   | `claim-assembly-journal.md`                                                   |
| Managed restore executor and E4 binding                   | `restore-executor-binding.md`                                                 |
| Exact E4c managed executor paper fixture                  | `e4c-executor-fixture.md`                                                     |
| Final handoff closed-state capture contract               | `final-handoff-capture.md`                                                    |
| Final publication and destruction authority               | `final-handoff-publication.md`                                                |
| Elastic host lifecycle and activation contract            | RFC sidecar `rfcs/0021/elastic-host-lifecycle-v1-spec.md` in the RFC worktree |
| Portable source-to-fresh-compute round trip               | `portable-roundtrip.md`                                                       |
| V1 closeout and V2 horizon                                | `v1-closeout-v2-horizon.md`                                                   |
| Fleet cell isolation and destruction scope                | `fleet-cell-boundary.md`                                                      |
| Internal and external comparison matrix                   | `comparison-matrix.md`                                                        |
| Revised multi-role evaluation                             | `role-review-2026-07-11.md`                                                   |
| PR-body value proposition review                          | `pr-body-role-review-2026-07-11.md`                                           |
| RFC 0013 PR 3D source and role audit                      | `pr3d-source-audit-2026-07-22.md`                                             |
| RFC 0013 final-capture source and role audit              | `final-capture-source-audit-2026-07-22.md`                                    |
| RFC 0013 PR 3E live-seams audit                           | `pr3e-live-seams-audit-2026-07-22.md`                                         |
| RFC 0013 restored-admission source audit                  | `restored-admission-source-audit-2026-07-22.md`                               |
| RFC 0013 replacement PR plan                              | `rfc-0013-follow-on-pr-plan.md`                                               |
| Main-first validation lanes and gates                     | `validation-first-plan.md`                                                    |
| Six implementation PR execution briefs                    | `pr-plans/README.md`                                                          |
| PR-plan multi-role review                                 | `pr-plans/role-review-2026-07-11.md`                                          |
| Superseded initial provider hypothesis                    | `slice-1-readiness-shaped-provider.md`                                        |
| Next design-only evidence slice                           | `slice-2-local-archived-roundtrip.md`                                         |
| Hosted Integration project                                | `../hosted-integration/README.md`                                             |
| Hosting Profiles project                                  | `../hosting-profiles/README.md`                                               |
| Snapshot project                                          | `../snapshot/README.md`                                                       |
| Portfolio deletion ledger                                 | `../layering-contracts/lobster-deletion-ledger.md`                            |

## Active Work

| Repo                    | PR                                                               | Branch                                                  | Status                                 | Purpose                                                                                                                                          |
| ----------------------- | ---------------------------------------------------------------- | ------------------------------------------------------- | -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `openclaw/rfcs`         | [RFC PR 46](https://github.com/openclaw/rfcs/pull/46)            | `user/giodl/rfc-0013-continuity-sidecars`               | Ready for review                       | RFC 0013 recovery-point, portable-handoff, and restored-admission sidecars.                                                                      |
| `openclaw/openclaw`     | [PR 112385](https://github.com/openclaw/openclaw/pull/112385)    | `user/giodl/rfc-0013-recovery-points`                   | Ready for review                       | Aggregate verified RFC 0013 recovery point and closed acceptance-set identity.                                                                   |
| `openclaw/openclaw`     | [PR 112865](https://github.com/openclaw/openclaw/pull/112865)    | `user/giodl/rfc-0013-final-capture`                     | Ready; stacked on PR 112385            | Hidden host-closed final capture, exact local replay, and full acceptance inventory.                                                             |
| `openclaw/openclaw`     | [PR 112896](https://github.com/openclaw/openclaw/pull/112896)    | `user/giodl/rfc-0013-restored-admission`                | Ready; stacked on PR 112865            | Fresh-target accepted restore, exact replay, private restored startup, and admission gated on owner readiness.                                   |
| `bic/lobster`           | [PR 5481](https://microsoft.ghe.com/bic/lobster/pull/5481)       | `user/giodl/rfc-0013-host-acceptance-contract`          | Draft                                  | Strict host acceptance, replay, and conflict-quarantine contract.                                                                                |
| `giodl/lobster`         | [Fork PR 25](https://microsoft.ghe.com/giodl/lobster/pull/25)    | `user/giodl/rfc-0013-permanent-acceptance`              | Draft, fork-only; stacked on PR 5481   | Permanent Azure Blob CAS acceptance authority.                                                                                                   |
| `giodl/lobster`         | [Fork PR 26](https://microsoft.ghe.com/giodl/lobster/pull/26)    | `user/giodl/rfc-0013-lifecycle-authority`               | Draft, fork-only; stacked on PR 25     | Atomic revocation and generation-scoped destruction finalization.                                                                                |
| `giodl/lobster`         | [Fork PR 27](https://microsoft.ghe.com/giodl/lobster/pull/27)    | `user/giodl/rfc-0013-destruction-consumption`           | Draft, fork-only; stacked on PR 26     | Crash-replayable destruction consumption and permanent completion.                                                                               |
| `giodl/lobster`         | [Fork PR 28](https://microsoft.ghe.com/giodl/lobster/pull/28)    | `user/giodl/rfc-0013-final-capture-adopter`              | Draft, fork-only; stacked on PR 27     | Fixed final-capture route, irreversible ingress fence, Gateway suspension/clean stop, and strict PR 112865 adoption.                             |
| `giodl73-repo/rfcs`     | [Fork PR 5](https://github.com/giodl73-repo/rfcs/pull/5)         | `user/giodl/rfc-0021-state-continuity`                  | Draft, fork-only                       | Revised lifecycle/checkpoint/CAPE architecture.                                                                                                  |
| `giodl73-repo/openclaw` | [Fork PR 41](https://github.com/giodl73-repo/openclaw/pull/41)   | `user/giodl/state-continuity-owner-model`               | Draft, fork-only                       | CAPE config, state inventory, and desired/effective Status contract.                                                                             |
| `giodl73-repo/openclaw` | [Fork PR 55](https://github.com/giodl73-repo/openclaw/pull/55)   | `user/giodl/state-continuity-archived-verify`           | Draft, fork-only; stacked on PR 41     | Exact artifact identity, bounded retrieval, restore-component graph, and fail-closed Archived assessment.                                        |
| `giodl73-repo/openclaw` | [Fork PR 56](https://github.com/giodl73-repo/openclaw/pull/56)   | `user/giodl/state-continuity-archived-capture`          | Draft, fork-only; stacked on PR 55     | Config dependency classification, copied-SQLite sanitation, capture planning/staging, and immutable continuity artifacts.                        |
| `giodl73-repo/openclaw` | [Fork PR 57](https://github.com/giodl73-repo/openclaw/pull/57)   | `user/giodl/state-continuity-archived-materialize`      | Draft, fork-only; stacked on PR 56     | Offline materialization, compatibility validation, and closed artifact-specific obligations.                                                     |
| `giodl73-repo/openclaw` | [Fork PR 58](https://github.com/giodl73-repo/openclaw/pull/58)   | `user/giodl/state-continuity-archived-preview`          | Draft, fork-only; stacked on PR 57     | Read-only exact-target restore preview with explicit execution blockers.                                                                         |
| `giodl73-repo/openclaw` | [Fork PR 64](https://github.com/giodl73-repo/openclaw/pull/64)   | `user/giodl/state-continuity-e4c-executor`              | Draft, fork-only; stacked on PR 58     | Launcher-fenced managed restore execution, forward-only evidence, exact assembly, and same-incarnation replay.                                   |
| `giodl73-repo/openclaw` | [Fork PR 101](https://github.com/giodl73-repo/openclaw/pull/101) | `user/giodl/state-continuity-e5a-final-capture`         | Draft, fork-only; stacked on PR 64     | Strict managed final capture, atomic durable replay journal, credential-safe immutable archive, and exact local receipt.                         |
| `giodl73-repo/openclaw` | [Fork PR 112](https://github.com/giodl73-repo/openclaw/pull/112) | `user/giodl/state-continuity-e5b-direct-publication`    | Draft, fork-only; stacked on PR 101    | Direct external-plugin Portable publication and independent-process retrieval.                                                                   |
| `giodl73-repo/openclaw` | [Fork PR 115](https://github.com/giodl73-repo/openclaw/pull/115) | `user/giodl/state-continuity-e6-elastic-lifecycle`      | Draft, fork-only; stacked on PR 112    | Closed scheduler generation and reconciled semantic wake descriptor bound to final capture.                                                      |
| `giodl/lobster`         | [Fork PR 15](https://microsoft.ghe.com/giodl/lobster/pull/15)    | `user/giodl/state-continuity-e4d-operation`             | Draft, fork-only; stacked on PR 8      | Strict allocation attestation, adapter execution, E4 replay/commit/quarantine, and exact-route restored startup.                                 |
| `giodl/lobster`         | [Fork PR 16](https://microsoft.ghe.com/giodl/lobster/pull/16)    | `user/giodl/state-continuity-e5a-final-capture`         | Draft, fork-only; stacked on PR 15     | Durable final-handoff authority, exact-route capture, asynchronous turn drain, authoritative Gateway suspension, and closed-state local receipt. |
| `giodl/lobster`         | [Fork PR 17](https://microsoft.ghe.com/giodl/lobster/pull/17)    | `user/giodl/state-continuity-e5b-publication-authority` | Draft, fork-only; stacked on PR 16     | Accepted Portable publication, strict source finalization, and generation-bound destruction authority.                                           |
| `giodl/lobster`         | [Fork PR 18](https://microsoft.ghe.com/giodl/lobster/pull/18)    | `user/giodl/state-continuity-e6-elastic-activation`     | Draft, fork-only; stacked on PR 17     | Wake registration plus revocable sleep authorization; fail closed until host scheduler consumption.                                              |
| `giodl73-repo/rfcs`     | [Fork PR 2](https://github.com/giodl73-repo/rfcs/pull/2)         | `user/giodl/rfc-duplex-transport`                       | Prerequisite                           | Hosted Integration architecture and implementation patterns.                                                                                     |
| `openclaw/rfcs`         | [Snapshot RFC 20](https://github.com/openclaw/rfcs/pull/20)      | Existing                                                | Related                                | SQLite-safe component capture primitive.                                                                                                         |
| `bic/lobster`           | TBD                                                              | `user/giodl/layering-contract-audit`                    | Evidence                               | Current workspace persistence, Teams inbox, cron wake, credentials, and lifecycle behavior.                                                      |

## Delivery Gates

1. Complete the core state-surface inventory and treatment.
2. Prove local Archived capture, publication, retrieval, and restore on paper.
3. Bound online-capture runtime, memory, disk, and I/O impact.
4. Keep continuity providers owner-specific and independent from Hosted
   Integration bundles and carriers.
5. Prove Portable clean-shutdown capture, dependency closure, generation
   fencing, and restore-gated readiness.
6. Prove Elastic Teams/API/cron wake, retained delivery, quarantine, and cold
   restore SLO.
7. Run mixed-version shadow migration before deleting Lobster private paths.

## Boundaries

- Existing OpenClaw stores, schemas, writers, transactions, and acknowledgement
  semantics remain unchanged.
- Host-managed credentials are re-issued or re-resolved, never checkpointed.
- One tenant Gateway cell maps to one continuity owner lineage; continuity
  identities never substitute for the cell isolation boundary.
- `safeToDestroy` authorizes compute/container lifecycle only and never
  persistent tenant-data purge.
- Recurring capture does not pause the runtime.
- Final capture follows clean shutdown and uses closed persisted state.
- CAPE is an operator setting/projection, not an implementation decomposition.
- No global consistency, mutation generation, `/synced`, generic provider bus,
  normalized ingress API, or continuity-specific composition framework.

## Related Areas

- `projects/hosted-integration/README.md`
- `projects/hosting-profiles/README.md`
- `projects/snapshot/README.md`
- `projects/layering-contracts/README.md`
