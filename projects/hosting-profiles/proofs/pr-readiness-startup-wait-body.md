## Summary

- add `openclaw ready --wait [duration]` as a bounded startup gate over the canonical `ready` RPC
- poll sequentially with a `60s` default total budget and `500ms` default interval
- cap each RPC timeout by the remaining budget and independently abort the entire attempt at the deadline
- emit only the final observation while preserving the canonical readiness JSON on success or observed non-readiness

## Why

Hosts currently have to write their own retry loop around `/ready`, decide how connection failures interact with not-ready results, and ensure a slow Gateway connection setup cannot stall startup forever.

This command gives Docker, Kubernetes, systemd, OCC, CI, and local operators one bounded wait contract after they start OpenClaw. It lives on `openclaw ready` rather than one launcher, so it works equally with `gateway start`, `gateway run`, a container entrypoint, or an external supervisor.

## Contract

`--wait` uses `60s`; `--wait 2m` selects an explicit total duration. Calls never overlap. `--timeout` remains the per-call limit but is capped by the remaining total budget. An independent abort deadline covers Gateway config, credential, TLS, connection, and request setup, not only the RPC request itself.

Unavailable and not-ready observations are retried until ready or timeout. No intermediate output is emitted. On success, JSON is the unchanged canonical readiness result. On timeout, the command exits `1` and emits the last canonical result when available; when the Gateway was never reachable, it emits `GatewayReadinessTimeout`. `--watch` and `--wait` are mutually exclusive.

## Stack

- Depends on fork PR #169 for the current `openclaw ready` CLI and criterion-catalog stack.
- Does not depend on Standard Hosting Profiles; direct `gateway.readiness` users receive identical behavior.
- A future `gateway start --wait-ready` can delegate to this command without owning another evaluator or deadline model.

## Validation

- [Exact-head GitHub proof](https://github.com/giodl73-repo/openclaw/actions/runs/30246240331) passes formatting, 59 focused assertions, and type-aware lint against immutable implementation parent `5201c5558cd7`.

- 59 focused command and CLI-registration assertions pass.
- Tests cover unavailable to not-ready to ready recovery, sequential polling, remaining-budget timeout capping, final-result timeout output, never-reachable timeout, mode validation, and stalled pre-request cancellation at the total deadline.
- Formatting, `git diff --check`, docs inventory, and type-aware lint pass.
- Codex review found and prompted the independent total-deadline abort; the post-fix review reports no actionable correctness issues.

The WSL worktree uses a test-only `node_modules` symlink to a checkout with the exact same lockfile. No dependency or lockfile changes are included.
