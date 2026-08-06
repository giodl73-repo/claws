# Claws Main Lifecycle Validation

Date: 2026-07-23

## Scope

- Baseline: `openclaw/openclaw` main at
  `f3b4f9cfa208aff19dc98b8a2e8e8658195adf7d`.
- Environment: Ubuntu 24.04 under WSL2 with isolated config, state, workspace,
  and Gateway profiles.
- Inputs: local CLAW.md packages with workspace files, MCP configuration, and
  scheduled work.

## Proven

- Experimental command gating, inspect, and integrity-bound add preview/apply.
- Status and doctor diagnostics after apply.
- Update preview/apply with a changed managed workspace file.
- Export and byte-identical reapply into a second isolated profile.
- Stale removal consent rejection after operator drift.
- Preservation of a modified operator file during removal.
- Clean removal of unchanged managed workspace state.
- Real MCP configuration and real Gateway cron creation/provenance.
- Retry from truthful partial removal state to complete cleanup.

## Findings And Disposition

1. **Cron removal default mismatch:** confirmed product bug. The Gateway stores
   the canonical default `payload.toolsAllow: ["*"]`, while Claw removal
   compared against the manifest's omitted value. Fixed with symmetric
   canonicalization and a regression test in OpenClaw PR
   [#113045](https://github.com/openclaw/openclaw/pull/113045). Real retry
   removed the cron, agent, workspace, and provenance and left zero Claw refs.
2. **Workspace isolation:** intentional behavior needing clarity.
   `OPENCLAW_STATE_DIR` does not relocate the default workspace. PR #113045
   documents using the same explicit `--workspace` for preview and apply in
   disposable or parallel profiles.
3. **Inherited update-policy escalations:** existing addendum work. Main can
   report omitted effective heartbeat/sandbox defaults as escalations during
   update. OpenClaw PR
   [#112773](https://github.com/openclaw/openclaw/pull/112773) owns effective
   inherited policy resolution; no duplicate fix was added here.

## Remaining Integration Lanes

- A live model turn using the created agent and real provider credentials.
- Real ClawHub skill and plugin artifact installation in one Claw lifecycle.
- Whole-Claw ClawHub search, publication, and installation.
- Control UI preview/apply/status/remove behavior.
