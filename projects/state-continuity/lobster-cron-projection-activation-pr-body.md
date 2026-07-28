## Summary

Completes the default-off activation boundary for durable OpenClaw cron wake projection. This slice provisions the permanent private Blob container, adds an explicit per-user ECS opt-in, projects it through the shared Gateway start path, resets it across pooled-user reuse, and keeps an already-due recovered projection visible as retryable Gateway work instead of allowing cooperative suspension to settle.

This is a **fork-only draft** stacked on [giodl/lobster#43](https://microsoft.ghe.com/giodl/lobster/pull/43). It follows:

- public RFC and ownership proposal: https://github.com/openclaw/rfcs/pull/46
- umbrella scale-to-zero issue, user reports, competitor evidence, and Microsoft Scout context: https://github.com/openclaw/openclaw/issues/114145
- concrete missed-recurring-work report: https://github.com/openclaw/openclaw/issues/104412
- permanent replacement/recovery: https://microsoft.ghe.com/giodl/lobster/pull/39
- durable prepare/commit/abort arbitration: https://microsoft.ghe.com/giodl/lobster/pull/41
- baked-disabled OpenClaw projection plugin: https://microsoft.ghe.com/giodl/lobster/pull/42
- trusted loopback proxy-pipe wiring: https://microsoft.ghe.com/giodl/lobster/pull/43
- retained-wake authority/core proof: https://microsoft.ghe.com/giodl/lobster/pull/46

Microsoft GHE links require Microsoft access.

## Why this slice exists

PR #43 deliberately left the plugin disabled until storage, per-user rollout, pooled-slot isolation, and already-due recovery were reviewed together. Activating only part of that boundary would either make permanent acceptance unavailable, leak a prior user's opt-in into a reused slot, or let a wake that became due during recovery disappear from Peter's tracked hook-work suspension barrier.

This slice uses the mechanisms Vincent and Peter already added rather than creating another lifecycle API: the existing user-scoped ECS inventory, shared Gateway `extra_env` start projection, managed pooled-environment restoration, baked plugin overlay, Blob deployment task, Redis scheduler recovery result, and tracked plugin retry loop.

## Contract and behavior

- provisions the private `cron-wake-projections-v1` Blob container under the existing runtime Blob account
- adds `lobster.openclaw_cron_projection_enabled` as `Option<bool>` at user scope; only explicit `true` activates projection
- projects `OPENCLAW_CRON_PROJECTION_ENABLED=true` through the shared Gateway start body and child-process allowlist
- manages that key across pooled starts so an omitted flag restores the slot baseline instead of retaining the previous user's opt-in
- retains the baked loopback-only plugin configuration through the normal code-mode filter, then reversibly adds/removes plugin allow/load membership
- keeps the existing master plugin gate authoritative: disabling plugins suppresses this opt-in too
- treats `WakeProjectionRehydrateOutcome::Due` as retryable scheduler work; the plugin's existing tracked retry loop therefore remains non-idle and continues vetoing ordinary cooperative suspension until OpenClaw rereads and reconciles the due job
- treats a missing accepted projection as corrupt and keeps missing ECS, scheduler, or Blob configuration fail-closed

No user is enabled by this PR. The ECS default is null, false is inactive, and the actual ECS rule/cohort remains an owner rollout decision.

The stacked follow-on [giodl/lobster#46](https://microsoft.ghe.com/giodl/lobster/pull/46) proves the payload-free permanent coalescing authority that joins already-retained Teams/API/cron/operator causes into one destination generation. Production owner adapters and readiness-gated delivery remain deliberately separate follow-ups.

## Ownership and alternatives

The public RFC and umbrella issue explain the product case: recurring work must survive zero Gateway compute; Fly Machines, E2B, Daytona, Azure Container Apps, Cloudflare Durable Objects, and Modal expose comparable scale-to-zero primitives; and Microsoft Scout is already composing this behavior outside OpenClaw core. Josh Lehman's SQLite work remains relevant to the broader ownership decision, while this proof keeps permanent wake authority outside a fungible pod's local filesystem.

If Vincent, Peter, Josh, or other maintainers prefer a smaller or different implementation that satisfies RFC PR #46 and issue #114145, please use it. These fork drafts demonstrate one bounded composition of existing owner seams; they do not require this exact implementation.

## Review size

The stacked diff is 340 additions and 15 deletions across 15 files. Most production edits are small flag, environment, overlay, recovery-result, and deployment changes; 208 additions are focused Rust/Python tests and deployment assertions, including inline start-option tests.

## Verification

- `just cargo check --lib` — pass
- `just cargo clippy --lib` — pass with warnings denied by the workspace
- `just cron-projection-plugin-test` — 13/13 pass
- `just openclaw-container-fmt-check` — pass
- `python scripts/ci/check-ecs-settings-inventory.py` — pass (`just ecs-settings-inventory-check` is locally blocked only by the unavailable Windows Store `python3` alias)
- `python -m unittest scripts.ev2_gateway_public_host_test` — 33/33 pass
- `just code-mode-container-check` — packaging and exact inventory pass; the wider plugin suite then stops because the optional sibling `../agent-tools/packages/agents-tools` checkout is absent
- `git diff --check` — pass

Focused native-Windows adapter Rust tests remain blocked before execution by inherited workspace defects, including the baseline unused `compute_manifest_digest` import and Unix-only workspace targets. The production Lobster library and strict Clippy compile report no changed-code diagnostics; Linux CI remains the focused adapter execution lane.
