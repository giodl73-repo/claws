## Why

The canonical readiness result is useful for one-shot probes, but operators still need private polling and JSON-diff scripts to answer a basic operational question: what changed while OpenClaw moved between ready, degraded, unavailable, and recovered states?

This follow-up to RFC 0018 turns the existing result into a bounded runtime-operations facility. It does not add a second readiness evaluator, alter `/ready`, select conditions, or depend on Hosting Profiles.

## What changes

- add `openclaw ready --watch` with a 2-second default and 250 ms polling floor
- keep evaluations sequential and apply the existing timeout to every Gateway call
- cancel both the active Gateway call and polling delay on `SIGINT`/`SIGTERM`
- emit the initial snapshot, then only semantic transitions
- compare conditions by `(subjectRef, type)` and subjects by `ref`
- report producer changes and subject replacement when identity, generation, kind, or parent changes
- ignore evaluation and observation timestamp churn
- continue through not-ready and unavailable states so recovery remains observable
- emit versioned JSON Lines with `--watch --json`
- preserve one-shot output and exit behavior unchanged

Human output expands both important availability boundaries: entering an outage includes the structured Gateway error, while recovery includes the complete canonical result so a recovered-but-still-degraded Gateway cannot be mistaken for ready.

The package proof also found that the HTTP readiness path received the live evaluator while the WebSocket request context did not. That made `/readyz` change correctly while the `ready` RPC continuously returned `UNAVAILABLE`. This branch now carries the evaluator through runtime preparation into the Gateway request context and adds a real-startup RPC regression assertion.

## Resilience

Polling never overlaps. Gateway requests retain their per-call timeout and receive the watch cancellation signal. Unchanged results produce no output. Signal handlers are removed on exit, and cancellation is not projected as a false Gateway outage.

## Validation

- 52 focused assertions across transition diffing, CLI registration, and the ready command
- real-startup regression coverage for the HTTP/RPC readiness handoff
- type-aware Oxlint on all touched TypeScript
- Oxfmt and `git diff --check`
- final `codex review --uncommitted`: no actionable defects before the proof-driven wiring fix
- package-installed Docker proof at the exact current implementation head

The local dependency graph could not be fully rehydrated because the configured Microsoft package proxy returned `404` for `@agentclientprotocol/sdk@1.3.0`. The earlier ready-command shard therefore used a test-only alias to the matching checked-out `@openclaw/fs-safe/durability` build; no alias or dependency change is included in this branch. The GitHub-hosted proof installed the repository dependency graph normally.

## Real behavior proof

Behavior or issue addressed:
`openclaw ready --watch --json` must observe a real Gateway moving through ready, condition-degraded, unavailable, recovered-but-still-degraded, and ready states without overlapping polls, losing identity continuity, or treating cancellation as an outage.

Real environment tested:
GitHub-hosted Ubuntu 24.04 with Node 24 and Docker. The proof branch contains only the driver and workflow above immutable implementation parent `3d59eebb8ea292caab13b4216e47a60558849852`. OpenClaw was packed as an npm tarball, installed into the repository's functional Docker image, and exercised through a real Gateway process, real `openclaw ready` CLI process, WebSocket RPC, HTTP `/readyz`, and a bounded 1 MiB tmpfs workspace. Focused Gateway/RPC regression tests run before packaging.

Exact steps or command run after this patch:

1. Build the functional Docker image from the exact OpenClaw package tarball.
2. Configure required criterion `openclaw.workspace-writable` and start the Gateway.
3. Start `openclaw ready --watch --json --interval 250 --timeout 500`.
4. Fill and clear the tmpfs workspace to force `200 -> 503 -> 200`.
5. Stop the Gateway, fill the workspace while it is down, and restart it to force unavailable -> recovered-but-degraded.
6. Clear the workspace for final recovery, interrupt the watcher with `SIGINT`, and validate the complete JSON Lines transcript.

Evidence after fix:
[GitHub Actions run 30224900928](https://github.com/giodl73-repo/openclaw/actions/runs/30224900928) passed and published the `readiness-watch-proof-1` artifact containing the JSONL transcript, watcher stderr, Gateway log, and summary. The asserted summary was:

```json
{
  "exactEventCount": 9,
  "sequence": [
    "ready",
    "workspace-degraded",
    "ready",
    "gateway-unavailable",
    "recovered-but-degraded",
    "ready"
  ],
  "hostIdentityStable": true,
  "gatewayIdentityRenewed": true,
  "processIdentityRenewed": true,
  "unavailableReason": "GatewayReadinessUnavailable",
  "signalExitCode": 130
}
```

Observed result after fix:
The watcher emitted an initial ready snapshot, required workspace condition failure and recovery, structured Gateway unavailability, recovery with `ready: false`, and final readiness. Timestamp-only polls emitted nothing. The host subject stayed stable across restart, while process and Gateway IDs renewed at their declared lifetimes. `SIGINT` stopped the watcher with exit code 130 and did not emit a false outage.

What was not tested:
This proof covers Linux package/Docker behavior. macOS, Windows, profile-selected criteria, plugin-contributed criteria, and long-duration network partitions were not exercised by this run.

## Stack

- RFC: https://github.com/openclaw/rfcs/pull/33
- Base implementation: https://github.com/openclaw/openclaw/pull/104018
- This fork PR is an independent follow-up review slice based on exact foundation head `6dce3555a511`.
