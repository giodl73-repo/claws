# Lobster `system.run` Node Policy Handoff

Date: 2026-07-02

## Current Finding

Lorant's fresh node-pairing test proved the Cloud Gateway is filtering node
commands at approval time. The node advertised:

- `mcp.help`
- `mcp.invoke`
- `system.run`

The approved pairing persisted only:

- `mcp.help`
- `mcp.invoke`

That matches Lobster's baked Gateway config posture:

- `src/openclaw_container/config/openclaw.gateway.json`
- `gateway.nodes.allowCommands = ["mcp.help", "mcp.invoke"]`

Re-pairing, renaming, or rotating the node identity will not fix this. The
Gateway intersects requested node commands with `gateway.nodes.allowCommands`
before storing the approved command surface.

## Existing Lobster Gate

The policy-baseline branch already has the intended `system.run` widening path:

- Runtime ECS flag:
  `lobster.openclaw_system_run_nodes_enabled`
- Runtime-to-container env:
  `OPENCLAW_GATEWAY_ALLOW_SYSTEM_RUN`
- Container overlay:
  `gateway.nodes.allowCommands = ["mcp.help", "mcp.invoke", "system.run", "system.run.prepare", "system.which"]`

This is fail-to-disabled. If the ECS flag is absent/false, or the
`system-run-nodes` kill switch is active, the Gateway stays at the baked
`mcp.help`/`mcp.invoke` allowlist.

The adapter also keeps two user approval gates:

- Gate A: a node declaring `system.run`-class commands requires explicit node
  pair approval.
- Gate B: each `system.run` invocation requires per-command exec approval.

## What Lorant Should Check

1. Confirm the deployed Lobster container image includes the branch/code with
   `OPENCLAW_GATEWAY_ALLOW_SYSTEM_RUN` overlay support.
2. Confirm ECS for the target user/ring has:
   `lobster.openclaw_system_run_nodes_enabled = true`.
3. Confirm the process kill switch is not active:
   `7a3e1c92-6b4d-4f80-9c1a-2d5e8f0b3a47`
   (`system-run-nodes`).
4. Restart or cold-start the user's OpenClaw container after the ECS flag is
   active, because the Gateway allowlist overlay is applied before Gateway
   start.
5. Verify `$HOME/.openclaw/openclaw.json` in the container has inline:
   `gateway.nodes.allowCommands` containing `system.run`,
   `system.run.prepare`, and `system.which`.
6. Pair the node again. If the stored approved command list still drops
   `system.run`, the live cluster is not running the overlay-capable build or
   Gateway is resolving a different config source than expected.

## Policy Follow-Up

This exposed a missing policy surface. The effective policy baseline currently
covers OpenClaw tool posture and Gateway auth/http/exposure posture, but not
`gateway.nodes.allowCommands`.

Do not add ad hoc `gateway.nodes` keys to `policy.global.jsonc` unless the
OpenClaw Policy schema supports them. The right follow-up is one of:

- Add OpenClaw Policy schema/doctor support for Gateway node-command posture,
  then make Lobster's effective baseline express the default deny posture and
  the controlled `system.run` exception.
- Or, if node commands remain Lobster-runtime-governed, add Lobster posture
  tests proving the baked allowlist stays minimal and the only widening path is
  the ECS-gated `OPENCLAW_GATEWAY_ALLOW_SYSTEM_RUN` overlay.

MCP tools called through `mcp.invoke` do not need `gateway.nodes.allowCommands`
entries. Only top-level node commands do.
