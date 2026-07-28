## Summary

Connects the baked-disabled OpenClaw cron-projection plugin to Lobster's permanent wake authority through the existing loopback proxy-pipe bridge. A reconciled OpenClaw wake set now has a complete reviewable path: loopback HTTP → Peter's trusted Gateway pipe context → Blob CAS prepare/commit/abort → the existing Redis wake scheduler mirror.

This is a **fork-only draft** stacked on [giodl/lobster#42](https://microsoft.ghe.com/giodl/lobster/pull/42). It follows:

- public RFC and ownership proposal: https://github.com/openclaw/rfcs/pull/46
- umbrella scale-to-zero issue, user reports, competitor evidence, and Microsoft Scout context: https://github.com/openclaw/openclaw/issues/114145
- concrete missed-recurring-work report: https://github.com/openclaw/openclaw/issues/104412
- permanent replacement/recovery: https://microsoft.ghe.com/giodl/lobster/pull/39
- durable prepare/commit/abort arbitration: https://microsoft.ghe.com/giodl/lobster/pull/41

Microsoft GHE links require Microsoft access.

## Why this slice exists

The source-side lifecycle is already present in OpenClaw:

- https://github.com/openclaw/openclaw/pull/103647 emits post-commit `cron_changed: scheduled` reread hints.
- https://github.com/openclaw/openclaw/pull/104368 publishes complete cancellation-aware `cron_reconciled` state.
- https://github.com/openclaw/openclaw/pull/103618 keeps projection work visible to cooperative suspension.

PR #42 consumes those seams, but intentionally stopped before guessing a deployment callback/auth design. This slice shows that no new public callback or bearer-token system is needed. The plugin can call the adapter's existing loopback-only bridge, and the runtime can derive tenant, user, provider, container role, and scheduler authority from the trusted `RuntimeContainerContext` Peter's proxy-pipe path already supplies.

That keeps the protocol small and the pods fungible: the adapter holds no correctness state, and every winner is recorded in shared Blob CAS state before temporary Redis scheduling is rebuilt.

## Contract and behavior

- adds loopback routes for prepare, commit, and abort on `127.0.0.1:18791`; HTTP remains forbidden for non-loopback plugin origins
- forwards only three fixed operation names over the existing gRPC proxy pipe
- accepts projection authority only from a Gateway context with `cron_schedule` capability; request JSON cannot choose tenant, user, provider, container, or storage coordinates
- validates a bounded full replacement (at most 10,000 unique 256-byte job IDs and JavaScript-safe integer fields)
- canonicalizes only `{ jobId, enabled, nextRunAtMs? }`, computes its digest, and derives the earliest future enabled wake
- maps prepare/commit/abort onto PR #41's permanent Blob CAS journal
- after any accepted receipt path—prepare replay, commit install/replay, or abort-after-commit—rehydrates PR #39's existing Redis scheduler mirror before reporting success
- if scheduler rehydration fails after Blob commit, later retries heal the mirror from the permanent winning receipt instead of falsely reporting success
- caps runtime request bodies at 2 MiB, adapter responses at 15 seconds, and returns `no-store` fail-closed responses
- requires both the existing cron scheduler and valid Blob account/container configuration; otherwise all projection calls return unavailable

## Deliberate rollout boundary

The plugin remains absent from `plugins.allow` and `plugins.load.paths`, with `entries.cron-projection.enabled=false`. This PR does **not** turn the feature on for anyone and does not grant sleep, destruction, or delivery authority.

Stacked fork-only draft [giodl/lobster#45](https://microsoft.ghe.com/giodl/lobster/pull/45) completes that activation/lifecycle boundary: it provisions the permanent private Blob container, adds the explicit per-user ECS flag through the shared Gateway start overlay, resets it across pooled-user reuse, and routes PR #39's explicit `Due` recovery outcome into the plugin's tracked retry/sleep-veto path. It remains default-off; missing ECS, scheduler, or storage continues to fail closed, and the actual ECS cohort remains an owner rollout decision.

The public RFC and umbrella issue explain the product case: recurring work must survive zero Gateway compute; Fly Machines, E2B, Daytona, Azure Container Apps, Cloudflare Durable Objects, and Modal expose comparable scale-to-zero primitives; and Microsoft Scout is already composing this behavior outside OpenClaw core. Josh Lehman's SQLite work is also relevant to the broader ownership choice, but this fork draft deliberately keeps permanent host authority outside a fungible pod's local filesystem.

If Vincent, Peter, Josh, or other maintainers prefer a smaller or different implementation that satisfies RFC PR #46 and issue #114145, please use it. These drafts are evidence slices, not a demand to preserve this exact composition.

## Review size

The stacked diff is 974 additions and 10 deletions across 12 files. Of those additions, 289 lines are focused sibling/adapter tests. The largest production file is the 467-line trusted protocol/authority adapter; the remaining changes are small route, state, storage-bootstrap, loopback-client, and image-contract wiring.

## Verification

- `just cargo check --lib` — pass
- `just cargo clippy --lib` — pass with warnings denied by the workspace
- `just cron-projection-plugin-test` — 13/13 pass
- `scripts/validate-code-mode-container.sh` through `just code-mode-container-check` — plugin packaging and exact inventory pass
- `git diff --check` — pass

Focused native-Windows Rust test binaries remain blocked before execution by existing unrelated workspace defects: missing `windows_sys` imports in `mip/engine/staging.rs`, Unix-only `aether-priv-bridge` targets being compiled on Windows, and the baseline `openclaw-adapter` unused `compute_manifest_digest` import / missing `find_git_binary` test helper. The production library and strict Clippy compile report no changed-code diagnostics. Linux CI remains the focused Rust execution lane; no unrelated platform workaround is included here.
