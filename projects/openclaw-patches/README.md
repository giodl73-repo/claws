# OpenClaw Patch Upstream Project

Use this area to inventory Lobster-carried OpenClaw source patches, find related
upstream issues and pull requests, and drive generic fixes or host-extension
contracts into `openclaw/openclaw`.

## Active Notes

| Area | File |
| ---- | ---- |
| Patch inventory and upstream disposition | `inventory.md` |

## Active Work

| Repo | PR / Issue | Branch | Status | Purpose |
| ---- | ---------- | ------ | ------ | ------- |
| `bic/lobster` | PR #5402 | `promoteclaw/openclaw-2026.7.1` | Draft | Current 20-patch OpenClaw 2026.7.1 carry set |
| `openclaw/openclaw` | Issue #107154 | — | Open | Keyless WebIQ secrets fast path |
| `openclaw/openclaw` | Issue #102376 / PR #102379 | `bug-052-msteams-inbound-normalize` | Open, dirty | Teams inbound mention, quote, forward, and debounce normalization |
| `openclaw/openclaw` | Issue #113402 / PR #113403 | `user/giodl/cron-toolless-run-guard` | Open | Explicit tool-less Automation runs |
| `openclaw/openclaw` | Issue #77298 | — | Open | Cron restart interruption health semantics |
| `openclaw/openclaw` | PR #102366 | — | Merged | Native CJS plugin runtime entrypoints |
| `openclaw/openclaw` | PR #102357 | — | Merged | Teams streaming whitespace-collapse fix |
| `openclaw/openclaw` | PR #110357 | — | Merged | Durable Teams ingress and `activity.id` redelivery dedupe |
| `openclaw/rfcs` | PR #50 / RFC 0026 | — | Draft | Automations terminology and configurable feature naming |

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
