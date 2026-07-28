## Summary

Adds the live OpenClaw side of durable cron wake projection as an image-present, **baked-disabled** Lobster plugin. It consumes OpenClaw's shipped reconciled scheduler hooks, publishes only bounded wake facts through the stacked prepare/commit/abort protocol, and treats lifecycle cancellation as a durable host operation rather than assuming a disconnected request did not commit.

This is a **fork-only draft** stacked on giodl/lobster#41. It follows:

- public RFC and ownership proposal: https://github.com/openclaw/rfcs/pull/46
- umbrella scale-to-zero issue, user reports, competitor evidence, and Microsoft Scout context: https://github.com/openclaw/openclaw/issues/114145
- permanent projection replacement/recovery: https://microsoft.ghe.com/giodl/lobster/pull/39
- durable prepare/commit/abort authority: https://microsoft.ghe.com/giodl/lobster/pull/41

Microsoft GHE links require Microsoft access.

## Why this slice exists

OpenClaw issue https://github.com/openclaw/openclaw/issues/104412 shows the user-visible failure mode: recurring work can be missed while Gateway compute is absent. The umbrella issue explains why solving that safely is part of scale-to-zero and compares the experience with Fly Machines, E2B, Daytona, Azure Container Apps, Cloudflare Durable Objects, and Modal. It also calls out that Microsoft Scout is already composing host-side scale-to-zero outside OpenClaw core.

This plugin reuses the lifecycle seams Peter already shipped instead of adding another scheduler or wake API:

- https://github.com/openclaw/openclaw/pull/103647 emits post-commit `cron_changed: scheduled` reread hints.
- https://github.com/openclaw/openclaw/pull/104368 publishes complete `cron_reconciled` state with lifecycle-owned cancellation.
- https://github.com/openclaw/openclaw/pull/103618 keeps tracked projection work visible to cooperative suspension.

The host journal in PRs #39 and #41 supplies the other half: permanent CAS state, monotonic replacement, stale-writer supersession, and an explicit commit/abort winner across fungible pods.

## Contract and behavior

- `cron_reconciled` adopts the exact scheduler baseline; disabled reconciliation publishes `replaceAll([])`.
- `cron_changed` is only a coalescible hint. The plugin rereads the complete scheduler rather than treating an event as a delta.
- a newer reconciliation aborts the active host attempt before rereading; `gateway_stop` aborts, waits for settlement, then closes the client.
- the permanent projection contains only sorted `{ jobId, enabled, nextRunAtMs? }` facts. It excludes schedules, cron expressions, prompts, payloads, credentials, and execution authority.
- malformed or oversized scheduler state fails closed rather than publishing an incomplete projection.
- the bounded host client uses prepare, commit, and abort operations with attempt IDs and expected revisions. Superseded attempts reread; indeterminate prepares receive best-effort durable abort cleanup.
- if commit wins the host race, the client records the authoritative revision but still reports cancellation to the retiring lifecycle. It does not overclaim that client wall-clock abort ordering can reverse an already committed CAS winner.
- remote endpoints require HTTPS and a bounded bearer token; the stacked production-wiring draft instead uses Lobster's existing loopback-only proxy-pipe bridge and needs no reusable bearer.

## Deliberate boundary

The plugin is copied into the image but absent from `plugins.allow` and `plugins.load.paths`, with `entries.cron-projection.enabled=false`. This PR therefore cannot turn the feature on.

Stacked fork-only draft [giodl/lobster#43](https://microsoft.ghe.com/giodl/lobster/pull/43) resolves the endpoint/auth/storage route without a new public callback: it uses the existing `127.0.0.1:18791` adapter bridge, Peter's trusted proxy-pipe runtime context, PR #41's Blob CAS journal, and PR #39's existing Redis scheduler mirror. [giodl/lobster#45](https://microsoft.ghe.com/giodl/lobster/pull/45) then provisions the private permanent Blob container, projects an explicit per-user ECS opt-in through the shared Gateway start path with pooled-slot reset, and keeps PR #39's explicit `Due` recovery outcome in the tracked retry/sleep-veto path. It remains default-off; missing ECS, scheduler, or storage grants no sleep, destruction, or delivery authority.

That separation is intentional: reviewers can accept or replace this small hook/protocol adapter without implicitly accepting a deployment topology. If Vincent, Peter, Josh Lehman, or other maintainers prefer a smaller or different composition that satisfies RFC PR #46 and issue #114145, please use it.

## Review size

The stacked diff is 700 additions and 1 deletion across 11 files. Of those additions, 297 lines are dependency-free behavioral tests. The production code is one 224-line protocol client, one 121-line hook loop, and small manifest/image wiring.

## Verification

- `just cron-projection-plugin-test` — 12/12 pass
- `scripts/validate-code-mode-container.sh` through `just code-mode-container-check` — plugin packaging and exact inventory pass
- `git diff --check` — pass
- the remainder of `just code-mode-container-check` cannot start in this isolated worktree because its optional sibling `../agent-tools/packages/agents-tools` checkout is absent; it stops before the wider TypeScript test set and reports no changed-code failure

The focused proof covers prepare/commit, stale revision supersession, abort-wins and commit-wins races, indeterminate cleanup, fail-closed configuration, redaction and completeness, disabled clearing, post-baseline hints, active-attempt cancellation/reread, Gateway shutdown, and malformed facts.
