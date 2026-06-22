# Doctor Project

Doctor work belongs in OpenClaw PR branches. This folder tracks the structured
repair and health-finding stack.

## Active PRs

| Repo | PR | Branch | Status | Purpose |
| --- | --- | --- | --- | --- |
| openclaw/openclaw | [#84472](https://github.com/openclaw/openclaw/pull/84472) | `doctor-dry-run-contribution-guard` | Draft open | Expose dry-run preview reports. |
| openclaw/openclaw | [#84450](https://github.com/openclaw/openclaw/pull/84450) | `doctor-cron-audit-structured-repairs` | Draft open | Expose config audit scrub findings. |
| openclaw/openclaw | [#84366](https://github.com/openclaw/openclaw/pull/84366) | `doctor-state-session-structured-repairs` | Draft open | Expose session lock findings. |
| openclaw/openclaw | [#84340](https://github.com/openclaw/openclaw/pull/84340) | `doctor-gateway-services-structured-repairs` | Open | Expose extra gateway service findings. |
| openclaw/openclaw | [#84326](https://github.com/openclaw/openclaw/pull/84326) | `doctor-sandbox-structured-repairs` | Open | Expose sandbox registry findings. |

## Landed PRs

| Repo | PR | Purpose |
| --- | --- | --- |
| openclaw/openclaw | [#86627](https://github.com/openclaw/openclaw/pull/86627) | Keep core doctor health in contribution order. |
| openclaw/openclaw | [#88100](https://github.com/openclaw/openclaw/pull/88100) | Quiet tool policy removal audits. |
| openclaw/openclaw | [#87361](https://github.com/openclaw/openclaw/pull/87361) | Make restart follow-up actionable. |
| openclaw/openclaw | [#86101](https://github.com/openclaw/openclaw/pull/86101) | Keep hooks model checks read-only. |
| openclaw/openclaw | [#86081](https://github.com/openclaw/openclaw/pull/86081) | Migrate Feishu account bot names. |
| openclaw/openclaw | [#85924](https://github.com/openclaw/openclaw/pull/85924) | Label auth health by agent. |
| openclaw/openclaw | [#85735](https://github.com/openclaw/openclaw/pull/85735) | Canonicalize git checkout detection. |
| openclaw/openclaw | [#85566](https://github.com/openclaw/openclaw/pull/85566) | Expose shell completion health findings. |
| openclaw/openclaw | [#85038](https://github.com/openclaw/openclaw/pull/85038) | Prune stale bundled plugin load paths. |
| openclaw/openclaw | [#84626](https://github.com/openclaw/openclaw/pull/84626) | Migrate invalid thinking formats. |
| openclaw/openclaw | [#84290](https://github.com/openclaw/openclaw/pull/84290) | Expose UI freshness health findings. |
| openclaw/openclaw | [#84221](https://github.com/openclaw/openclaw/pull/84221) | Clear stale runtime override pins. |
| openclaw/openclaw | [#83753](https://github.com/openclaw/openclaw/pull/83753) | Normalize repair checks inside runner. |
| openclaw/rfcs | [#1](https://github.com/openclaw/rfcs/pull/1) | Doctor health upgrades RFC. |

## Severity Bar

Doctor findings should use `warning` when the detected state is actionably wrong
or stale enough that the user should correct it, even if OpenClaw can still run.
That includes state that can affect reliability, correctness, safety, security
posture, upgrade behavior, or future repair behavior; creates ambiguity between
legacy and canonical storage, config, or runtime paths; is no longer
authoritative but can still confuse debugging or support; or has a normal user
or admin correction path such as `openclaw doctor --fix`.

Use `info` when the state is noteworthy but not wrong: advisory,
discoverability, or FYI output that a user can reasonably leave unchanged
indefinitely, with no effect on canonical behavior, repair clarity, upgrade
safety, or operational reliability.

Legacy sandbox registry residue meets the `warning` bar because it is stale,
noncanonical state with an existing corrective path.

## Next

- Keep the stack about observable doctor findings and structured repair output.
- Avoid adding new config/plugin surface while cleaning up existing checks.
- Use focused tests per doctor area before updating PR bodies.
