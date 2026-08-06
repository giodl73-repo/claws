# OpenClaw Patch Upstream Project

Use this area to inventory Lobster-carried OpenClaw source patches, find related
upstream issues and pull requests, and drive generic fixes or host-extension
contracts into `openclaw/openclaw`.

## Active Notes

| Area                                       | File                               |
| ------------------------------------------ | ---------------------------------- |
| Team-facing issues and PR plan             | `team-report-2026-07-24.md`        |
| Executive 21-patch status and next actions | `status-report.md`                 |
| Patch inventory and upstream disposition   | `inventory.md`                     |
| PR #107155 plugin/core capability decision | `pr-107155-capability-decision.md` |

## Active Work

| Repo                | PR / Issue                 | Branch                               | Status                                                                                                                      | Purpose                                                                           |
| ------------------- | -------------------------- | ------------------------------------ | --------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| `bic/lobster`       | PR #5402                   | `promoteclaw/openclaw-2026.7.1`      | Open, approved, clean at `f807270d0b90`                                                                                     | Current 21-patch OpenClaw 2026.7.1 carry set                                      |
| `openclaw/openclaw` | Issue #107154 / PR #107155 | `bug-054-keyless-webiq-fast-path`    | Code, CI, and proof green at `ff85c33c553d`; not merge-ready: P1 manifest contract decision and current-main rebuild needed | Keyless WebIQ secrets fast path                                                   |
| `openclaw/openclaw` | Issue #102376 / PR #102379 | `bug-052-msteams-inbound-normalize`  | Code/CI green at `0fc04b3cbd2a`; real Teams proof still needed                                                              | Teams inbound mention, quote, forward, debounce, and authored-format preservation |
| `openclaw/openclaw` | Issue #113402 / PR #113403 | `user/giodl/cron-toolless-run-guard` | Ready for maintainer look                                                                                                   | Explicit tool-less Automation runs; proof sufficient, Peter assigned              |
| `openclaw/openclaw` | Issue #77298               | —                                    | Open                                                                                                                        | Cron restart interruption health semantics                                        |
| `openclaw/openclaw` | PR #102366                 | —                                    | Merged                                                                                                                      | Native CJS plugin runtime entrypoints                                             |
| `openclaw/openclaw` | PR #102357                 | —                                    | Merged                                                                                                                      | Teams streaming whitespace-collapse fix                                           |
| `openclaw/openclaw` | PR #110357                 | —                                    | Merged                                                                                                                      | Durable Teams ingress and `activity.id` redelivery dedupe                         |
| `openclaw/openclaw` | PR #105801                 | —                                    | Merged                                                                                                                      | Unified bundled catalogs, making Teams eligible for official-install trust        |
| `openclaw/rfcs`     | PR #50 / RFC 0026          | —                                    | Draft                                                                                                                       | Automations terminology and configurable feature naming                           |

## Workflow

1. Prove the behavior against current OpenClaw `main`, not only Lobster's pinned
   tag.
2. Search Gitcrawl first, then live GitHub issues and PRs by symptom and code
   identifier.
3. Record exact, related, and conflicting threads in `inventory.md`.
4. File an upstream issue only when no matching issue exists and the problem has
   a bounded reproduction, current-main source proof, and a proposed owner
   surface.
5. Prefer one upstream issue and one focused PR per independently droppable
   patch.
6. Add a visible `Scout patch provenance` banner naming the Lobster patch to
   every upstream issue and PR produced by this project.
7. For Lobster policy patches, upstream only the generic extension contract;
   keep runtime policy and Microsoft-specific trust decisions downstream.
8. When an upstream fix ships in a released OpenClaw tag, remove the Lobster
   patch during the next PromoteClaw audit.

## Related Areas

- `projects/promoteclaw/README.md`
- `projects/layering-contracts/README.md`
- `projects/hosted-integration/README.md`
- `projects/lobster/README.md`
