# Lobster Image Patch Manifest - 2026-08-06

## Purpose

This manifest fixes the branch/count ambiguity before the next Lobster
OpenClaw image attempt. A fork/image line must name one of these manifests
before `scripts/ensure-openclaw-image.sh` is rerun.

## Recommendation

Default to the 28-file pinfix manifest for the first usable Lobster image. It
has prior Dockerized JS proof, package-pin fixes, a fork push, and the smallest
known downstream carry.

Use the 30-file current-promote manifest only if the team intentionally accepts
two current-main carries before the first image:

- `0031-cron-wake-only-payload-kind.patch`
- `0032-channel-participant-capability-surface.patch`

Do not call the target a 31-patch fork unless a 31st physical patch is named,
applied cleanly against signed `v2026.6.33`, validated, and assigned a deletion
condition.

## Feed Gate

The image build remains externally gated on the Lobster npm feed exposing
`openclaw@2026.6.33`.

Latest local probe:

```text
wsl -d Ubuntu-24.04 -- bash
source ./.env.cargo-auth
NPM_CONFIG_USERCONFIG=<temporary Lobster feed npmrc> npm view openclaw@2026.6.33 version --json
```

Result: authenticated feed access works after `just rust-auth`, but
`openclaw@2026.6.33` still returns `E404 No match found for version
2026.6.33`.

## Manifest A: 28-File Pinfix

- Worktree: `C:\src\lobster-promote-633-pinfix`
- Branch: `promoteclaw/openclaw-2026.6.33-pinfix`
- Head: `e97922975fc779f4dde207192c16a9318ebc17a4`
- Fork remote branch: `giodl/promoteclaw/openclaw-2026.6.33`
- Status: validated conservative path
- Structural gate: previously passed
  `just openclaw-patches-check --offline` from this worktree.

Patch files:

```text
0000-enterpriseclaw-upstream-evidence-slices.patch
0001-msteams-upstream.patch
0002-msteams-lobster.patch
0003-secrets-fast-path-keyless-webiq.patch
0004-cron-delivery-target-optional.patch
0005-cron-toolless-run-guard.patch
0006-cron-gateway-restart-interrupt-skipped.patch
0007-cron-hook-job-identity.patch
0008-cron-passport-execution-fence.patch
0009-cron-preapproval-creation.patch
0010-personality-extra-system-prompt.patch
0011-cron-nested-tool-authorization.patch
0012-msteams-brokered-bot-framework-attachment-download.patch
0013-node-approved-followup-output.patch
0015-agent-hook-channel-field.patch
0016-memory-list-gateway-rpc.patch
0017-exec-approval-capability-token-relay.patch
0018-msteams-agent-reactions.patch
0019-hosted-control-ui-policy.patch
0022-node-exec-deadlines.patch
0024-cron-drain-quiescence.patch
0026-msteams-reaction-target-text.patch
0028-node-invoke-session-binding.patch
0029-agent-harness-host-adapter.patch
0030-msteams-native-audience-route.patch
0031-hosted-replay-integration.patch
0032-node-command-policy-structured-commands.patch
0033-scoped-enterprise-test-stability.patch
```

## Manifest B: 30-File Current Promote

- Worktree: `C:\src\lobster-promote-633`
- Branch: `promoteclaw/openclaw-2026.6.33`
- Head: `3d09706faaf8d47306be3fa334f48dc5e53f5138`
- Status: structurally valid and Dockerized-JS-validated candidate, not yet
  the default image path
- Structural gate:
  `wsl -d Ubuntu-24.04 -- bash -lc 'cd /mnt/c/src/lobster-promote-633 && just openclaw-patches-check --offline'`
  passed. It reported all 30 patches documented, applied by Dockerfile order,
  covered by the shared scoped Vitest runner, and pinned to `openclaw 2026.6.33`
  / `v2026.6.33` / `7af0cfc9c548`.
- Dockerized JS gate:
  `wsl -d Ubuntu-24.04 -- bash -lc 'cd /mnt/c/src/lobster-promote-633 && just openclaw-js-unit-tests'`
  passed after refreshing repo-local auth with `just rust-auth`. The first
  attempt reached the m365mail dependency stage and failed with Azure
  Artifacts `401` for `@types/sanitize-html`; after token refresh,
  `npm view @types/sanitize-html version` resolved `2.16.1`, and the rerun
  passed msteams patched-source tests, upstream evidence/readiness/hosting
  scoped tests, and vendored m365mail tests.

Patch files:

```text
0000-enterpriseclaw-upstream-evidence-slices.patch
0001-msteams-upstream.patch
0002-msteams-lobster.patch
0003-secrets-fast-path-keyless-webiq.patch
0004-cron-delivery-target-optional.patch
0005-cron-toolless-run-guard.patch
0006-cron-gateway-restart-interrupt-skipped.patch
0007-cron-hook-job-identity.patch
0008-cron-passport-execution-fence.patch
0009-cron-preapproval-creation.patch
0010-personality-extra-system-prompt.patch
0011-cron-nested-tool-authorization.patch
0012-msteams-brokered-bot-framework-attachment-download.patch
0013-node-approved-followup-output.patch
0015-agent-hook-channel-field.patch
0016-memory-list-gateway-rpc.patch
0017-exec-approval-capability-token-relay.patch
0018-msteams-agent-reactions.patch
0019-hosted-control-ui-policy.patch
0022-node-exec-deadlines.patch
0024-cron-drain-quiescence.patch
0026-msteams-reaction-target-text.patch
0028-node-invoke-session-binding.patch
0029-agent-harness-host-adapter.patch
0030-msteams-native-audience-route.patch
0031-cron-wake-only-payload-kind.patch
0032-channel-participant-capability-surface.patch
0033-hosted-readiness-ui-integration.patch
0034-node-command-policy-structured-commands.patch
0035-scoped-enterprise-test-stability.patch
```

Differences from the 28-file manifest:

- Adds `0031-cron-wake-only-payload-kind.patch`.
- Adds `0032-channel-participant-capability-surface.patch`.
- Renames/reindexes the three final fixups from `0031`-`0033` to `0033`-`0035`.
- Changes `0002-msteams-lobster.patch` to accept per-thread Teams
  conversation session keys and preserve the parent surface key as
  `mainSessionKey`.

## Decision Rule

Choose 28 when the priority is the first Lobster-usable image with the smallest
validated downstream carry.

Choose 30 when the priority is current Lobster main parity and the team accepts
the two additional current-main carries plus the per-thread Teams route update
as part of the initial fork image.

Anything else is a new manifest, not a renamed 28/30 queue.
