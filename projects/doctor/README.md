# Doctor Project

Doctor work belongs in OpenClaw PR branches. This folder tracks the structured
repair and health-finding stack.

## Active PRs

| Repo | PR | Branch | Status | Purpose |
| --- | --- | --- | --- | --- |
| openclaw/openclaw | [#97514](https://github.com/openclaw/openclaw/pull/97514) | `doctor-systemd-linger-lint-findings` | Merged 2026-07-05 from `65ec5a0acfe` as `7bb686c14012`; completion comment posted | Expose default-off systemd-linger findings without enabling linger from lint. |
| openclaw/openclaw | [#98869](https://github.com/openclaw/openclaw/pull/98869) | `doctor-channel-plugin-blocker-dry-run-effects` | Parked at `9c44766ab5`; branch diff empty after accepting Omar reachability finding | Dry-run backfill paused until core structured repair has a supported entry point. |
| openclaw/openclaw | [#99255](https://github.com/openclaw/openclaw/pull/99255) | `doctor-config-write-dry-run` | Draft open at `3adfe2f2a1`; focused proof passed, ClawSweeper review requested | Preview Doctor config writes during dry-run without adding CLI, SDK, plugin, or config contract surface. |
| openclaw/openclaw | [#84472](https://github.com/openclaw/openclaw/pull/84472) | `doctor-dry-run-contribution-guard` | Draft open, paused | Expose dry-run preview reports after more rule slices are structured. |

## Landed PRs

| Repo | PR | Purpose |
| --- | --- | --- |
| openclaw/openclaw | [#100361](https://github.com/openclaw/openclaw/pull/100361) | Audit Doctor lint defaults after 44/44 tracked rule families gained lint findings; keep legacy state, skills readiness, session transcripts, and session snapshots explicit-only via `--all`/`--only` with no plugin/SDK public contract change. |
| openclaw/openclaw | [#100093](https://github.com/openclaw/openclaw/pull/100093) | Expose default-off write-config blocker findings for Nix/config write directory blockers; completes 44/44 tracked Doctor rule families with structured lint findings. |
| openclaw/openclaw | [#99238](https://github.com/openclaw/openclaw/pull/99238) | Expose default-off generic channel preview warning findings under `core/doctor/channel-preview-warnings`. |
| openclaw/openclaw | [#99250](https://github.com/openclaw/openclaw/pull/99250) | Keep legacy WhatsApp crontab shell-backed findings out of default lint while preserving `--all`/`--only`. |
| openclaw/openclaw | [#99249](https://github.com/openclaw/openclaw/pull/99249) | Keep advisory workspace suggestion info findings out of default lint while preserving `--all`/`--only`. |
| openclaw/openclaw | [#98729](https://github.com/openclaw/openclaw/pull/98729) | Expose default-off stale plugin-runtime symlink findings; real cleanup remains in legacy `doctor --fix`. |
| openclaw/openclaw | [#99211](https://github.com/openclaw/openclaw/pull/99211) | Expose default-off legacy cron store/run-log/payload findings; real repair remains in legacy `doctor --fix`. |
| openclaw/openclaw | [#98406](https://github.com/openclaw/openclaw/pull/98406) | Expose default-off WhatsApp responsiveness findings without selected lint resolving exec SecretRefs or creating Gateway device identity. |
| openclaw/openclaw | [#98725](https://github.com/openclaw/openclaw/pull/98725) | Expose default-off legacy plugin dependency state findings; real cleanup remains in legacy `doctor --fix`. |
| openclaw/openclaw | [#98400](https://github.com/openclaw/openclaw/pull/98400) | Expose default-off heartbeat template findings; real rewrite remains in legacy `doctor --fix`. |
| openclaw/openclaw | [#98695](https://github.com/openclaw/openclaw/pull/98695) | Expose default-off legacy plugin manifest findings; real rewrites remain in legacy `doctor --fix`. |
| openclaw/openclaw | [#97496](https://github.com/openclaw/openclaw/pull/97496) | Expose default-off channel plugin blocker findings. |
| openclaw/openclaw | [#97500](https://github.com/openclaw/openclaw/pull/97500) | Expose default-off tool-result-cap findings for explicit and inherited cap settings. |
| openclaw/openclaw | [#98391](https://github.com/openclaw/openclaw/pull/98391) | Expose default-off disk-space findings using existing Doctor thresholds. |
| openclaw/openclaw | [#97366](https://github.com/openclaw/openclaw/pull/97366) | Expose default-off device-pairing findings without Gateway probes in lint. |
| openclaw/openclaw | [#97358](https://github.com/openclaw/openclaw/pull/97358) | Expose default-off workspace-status findings for plugin diagnostics and TaskFlow recovery hints. |
| openclaw/openclaw | [#97137](https://github.com/openclaw/openclaw/pull/97137) | Expose default-off memory-search lint findings without runtime probes or auth-profile mutation. |
| openclaw/openclaw | [#97125](https://github.com/openclaw/openclaw/pull/97125) | Expose opt-in auth profile findings. |
| openclaw/openclaw | [#97075](https://github.com/openclaw/openclaw/pull/97075) | Expose opt-in gateway health and daemon findings. |
| openclaw/openclaw | [#96171](https://github.com/openclaw/openclaw/pull/96171) | Expose configured plugin install findings. |
| openclaw/openclaw | [#96169](https://github.com/openclaw/openclaw/pull/96169) | Expose plugin registry findings. |
| openclaw/openclaw | [#95979](https://github.com/openclaw/openclaw/pull/95979) | Expose state integrity findings. |
| openclaw/openclaw | [#96471](https://github.com/openclaw/openclaw/pull/96471) | Add lint-only `doctor --lint --all` so operators can include opt-in checks. |
| openclaw/openclaw | [#95976](https://github.com/openclaw/openclaw/pull/95976) | Expose session transcript and snapshot findings. |
| openclaw/openclaw | [#84450](https://github.com/openclaw/openclaw/pull/84450) | Expose config audit scrub findings. |
| openclaw/openclaw | [#84366](https://github.com/openclaw/openclaw/pull/84366) | Expose session lock findings. |
| openclaw/openclaw | [#84340](https://github.com/openclaw/openclaw/pull/84340) | Expose extra gateway service findings. |
| openclaw/openclaw | [#84326](https://github.com/openclaw/openclaw/pull/84326) | Expose sandbox registry findings. |
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

- Keep #96471 `doctor --lint --all` reviewed after #84450 config audit scrub
  merged.
- Add more narrow Doctor rule slices before returning to #84472 dry-run preview.
  The preview PR should prove richer existing structured rules, not introduce
  the reporting substrate before enough rules can exercise it.
- Prefer slices that already have legacy Doctor behavior and can expose
  structured findings or dry-run effects without adding config, plugin, or SDK
  surface.
- Use focused tests per doctor area before updating PR bodies.

## Structured Slice Queue

Target order before refreshing #84472:

1. Session transcripts and session snapshots. Landed as #95976.
   - Same state/session neighborhood as #84366.
   - Track stale, missing, corrupt, or noncanonical session artifacts as
     structured findings before broad dry-run preview.
2. State integrity. Landed as #95979.
   - User-visible repair/debug surface with existing legacy Doctor behavior.
   - Good dry-run candidate because state mutation previews need to be clear.
3. Plugin registry. Landed as #96169.
   - Existing repair surface, but higher blast radius. Keep this as one narrow
     slice only if the change can stay focused on structured findings/effects.
4. Configured plugin installs. Landed as #96171.
   - Adjacent to plugin registry, but split out to avoid broadening the plugin
     contract surface while the registry findings are reviewed.
5. Gateway daemon and gateway health. Landed as #97075.
   - Important runtime surface, but platform-sensitive. The first slice is
     opt-in/read-only and leaves real service install/start/restart in the
     legacy Doctor run path.
6. Auth profiles.
   - Landed as #97125.
   - User-facing setup/debug surface with existing Doctor output, but needs a
     careful default-lint bar so local account shape does not become noisy.
7. Workspace, memory, and status.
   - First slice in progress as #97137 for memory-search lint findings.
   - Second slice in progress as #97358 for workspace-status plugin/TaskFlow
     findings.
   - Candidate families: workspace status, memory search, and any remaining
     workspace-suggestion gaps. Prefer read-only findings first.
8. Runtime/channel health.
   - Candidate families: startup channel maintenance, WhatsApp responsiveness,
     and device pairing. Keep behind the gateway runtime work because these are
     live-environment sensitive.
   - Channel plugin blockers are in progress as #97496.
   - Device pairing is in progress as #97366.
   - Tool result cap landed as #97500.
   - Systemd linger landed as #97514.
   - WhatsApp responsiveness is in progress as #98406.
9. Disk space.
   - Landed as #98391.
   - Uses the existing legacy Doctor thresholds and note text as
     default-disabled structured lint findings.
10. Heartbeat template repair/readiness.
   - Draft open as #98400.
   - Uses the existing legacy heartbeat template analyzer as default-disabled
     structured lint findings; real rewrite remains in `doctor --fix`.
11. Config/write path.
   - Candidate families: write config and final config validation follow-ups.
     Treat as late-stage work because this is the highest-blast-radius repair
     surface.

## Dry-Run Backfill Queue

Backfill dry-run effects when a structured finding corresponds to an existing
`doctor --fix` mutation. Finding-only remains correct for read-only diagnostics
or live/service-sensitive areas.

1. Heartbeat template repair/readiness (#98400).
   - Existing template rewrite remains in `doctor --fix`; add previewable
     dry-run effects for the rewrite target.
2. Legacy plugin manifests (#98695).
   - Existing manifest rewriting should preview affected manifest paths before
     mutation.
3. Legacy plugin dependencies (#98725).
   - Verify the cleanup path, then preview dependency/package metadata changes
     if `doctor --fix` mutates them.
4. Stale plugin-runtime symlinks (#98729).
   - Stale symlink unlinking should preview each removed link target.
5. Channel plugin blockers (#97496 follow-up).
   - Draft open as #98869.
   - Preview the explicit plugin activation work needed before startup
     maintenance can help, without broadening plugin contracts or mutating
     plugin enablement.
6. Session locks and config audit scrub audit (#84366/#84450 follow-up).
   - Current `main` already has structured dry-run repair effects for both
     stale session locks and config-audit scrub, so no follow-up PR is needed
     unless reviewers ask for additional proof or wording.

Hold #84472 until at least one additional post-#84450 rule slice is ready, and
prefer two if the first slice stays small.

## Major Area Order

1. Finish the plugin state slices already in flight: #96169 plugin registry and
   #96171 configured plugin installs.
2. Gateway health / gateway daemon structured findings. Landed as #97075.
3. Author auth profile structured findings after gateway runtime behavior is
   understood.
4. Move to workspace/memory/status once the user-facing setup/runtime slices are
   covered.
5. Defer runtime/channel and config/write-path work until later because they are
   more live-environment and mutation sensitive.

## Tracking Criteria

Track each Doctor rule family by:

- Structured detect: emits `HealthFinding` with stable `checkId`, severity,
  path/target, and actionable `fixHint`.
- Structured repair: implements `repair` only when the legacy behavior is
  understood and the mutation path is safe.
- Dry-run effects: preview reports include specific effect targets and
  `dryRunSafe` where relevant.
- Real fix owner: note whether real mutation is still owned by the legacy
  `run` path or moved into structured repair.
- Default lint: broad lint enabled vs explicit opt-in only.
- Public surface: no config/plugin/SDK contract expansion unless separately
  approved.
- Proof: focused tests, source/live command proof when behavior is user-facing,
  ClawSweeper review, and maintainer comments.
