# Claws Hapi Workspace

This checkout is the local operating notebook for OpenClaw and Lobster work. It
is not only a source package checkout; it also tracks PR queues, project notes,
local tools, and wave research.

For agent and harness entry points, start with `CONTEXT.md`.

## Active Map

| Area                                | Home                             | Purpose                                                                                                                                  |
| ----------------------------------- | -------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Icelines                            | `projects/icelines/`             | ICELINES forecasting, matchup/edge product surfaces, validation, publication, and TRACKER snapshot coordination.                        |
| LIFT                                | `projects/lift/`                 | Public management framework: M/S/E scoring, substantial Gravity rewrite, evidence policy, roles, and golden modules.                    |
| OpenClaw system design              | `projects/openclaw-design/`      | Cross-RFC conceptual model, major objects, facility capabilities, ownership boundaries, and contract summaries.                         |
| EnterpriseClaw                      | `projects/enterpriseclaw/`       | Desired owner-first OpenClaw architecture: layers, domains, trust, control loops, local/managed profiles, and evolution rules.          |
| OpenClaw PR work                    | `projects/openclaw/`             | Current OpenClaw branches, PR notes, review loops, proof, and RFC tracking.                                                              |
| Lobster work                        | `projects/lobster/`              | Lobster worktrees, dashboard links, PR notes, and local runtime notes.                                                                   |
| Policy                              | `projects/policy/`               | Active policy conformance, evidence, RFC, and Lobster baseline work.                                                                     |
| Doctor                              | `projects/doctor/`               | Active doctor health and structured-repair PR stacks.                                                                                    |
| Feeds                               | `projects/feeds/`                | OpenClaw feed support and Lobster Scout feed PR stacks.                                                                                  |
| Catalog                             | `projects/catalog/`              | OpenClaw command/tool catalog metadata, generated docs, prompt/audit lenses, and PR/RFC stack notes.                                     |
| OpenClaw dependency governance      | `projects/dependencies/`         | Complete dependency inventory, technical and supply-chain ratings, Microsoft governance evidence, and remediation priorities.           |
| UX state                            | `projects/ux-state/`             | Gated Lobster Feeds, Policy, and Context Budget UX previews, flags, and design-review notes.                                             |
| Admin                               | `projects/admin/`                | Lobster admin spaces, managed policy baselines, and Partner Center notes.                                                                |
| Config admin UX                     | `projects/config-admin/`         | Shared Lobster/OpenClaw admin-config UX framework: settings descriptors, preview-first validation, governed save, and Scout CLI parity.  |
| Staffing                            | `projects/staffing/`             | Lobster and ClawPilot staffing analysis and gap mapping; WorkIQ only as a search term.                                                   |
| Context budget                      | `projects/context-budget/`       | Context-budget PR plan, branches, and proof notes.                                                                                       |
| Snapshot                            | `projects/snapshot/`             | SQLite-safe snapshot/restore plugin, backup integration, failover substrate, and RFC coordination.                                       |
| OpenClaw hosting profiles           | `projects/hosting-profiles/`     | Standard hostee profiles, ready checks, status conditions, and container/platform hosting conventions for OpenClaw.                      |
| Lobster/OpenClaw layering contracts | `projects/layering-contracts/`   | Umbrella host-runtime contract portfolio, Lobster boundary audit, and upstream contract extraction.                                      |
| Managed Configuration               | `projects/managed-config/`       | Host/operator config authority, effective generations, conformance, and Lobster config-writer removal.                                   |
| Hosted Integration                  | `projects/hosted-integration/`   | Host integration bundles, owner-selected capability bindings, Hosting Profiles, narrow carriers, and ProxyPipe retirement.               |
| Runtime State Continuity            | `projects/state-continuity/`     | State ownership, checkpoints, publication, dirty/synced status, fencing, restore, and persistence removal.                               |
| PromoteClaw                         | `projects/promoteclaw/`          | Regular Lobster OpenClaw version promotion from quarantine-cleared LTS releases, with patch carry-forward validation.                    |
| TypeClaw                            | `projects/typeclaw/`             | OpenClaw TypeScript native / TS7 performance and compatibility evaluation.                                                               |
| Codeprints                          | `projects/codeprints/`           | Language-neutral repository factorization, first-language analyzers, owner-led evidence, and native-authority preservation.               |
| OpenClaw Rust node                  | `projects/openclaw-rust-node/`   | Rust node client/headless host RFC, node-contract conformance, release ownership, and first Lobster embedding evidence.                  |
| Memory                              | `projects/memory/`               | Agent memory strategy, OpenClaw assessment, and XAI report notes.                                                                        |
| Mail                                | `projects/mail/`                 | Mail-channel research, mail plugin options, and Exchange/Microsoft Graph integration framing.                                            |
| Claws                               | `projects/claws/`                | OpenClaw RFC direction for runnable starter setups across skills, plugins, MCP servers, workspace files, persona files, and automations. |
| Control UI hosting                  | `projects/control-ui/`           | Version-matched OpenClaw Control UI hosted in Lobster, with Lobster auth, runtime routing, rollout, and enforced lockdown.               |
| OpenClaw Control Model              | `projects/control-model/`      | Headless OpenClaw state, commands, and renderer-neutral UI artifacts for Lobster-owned React experiences.                              |
| Claws Review Bot                    | `projects/claws-review-bot/`   | `@bic/claws-review-bot` package notes; primary Lobster PR reviewer lane plus separate ClawPilot issue-classifier experiment.             |
| Localization                        | `projects/localization/`         | OpenClaw localization architecture, surface coverage, runtime errors, channel messages, and bounded evidence slices.                     |
| oc-path                             | `projects/oc-path/`              | oc-path worktrees, specs, and follow-up PRs.                                                                                             |
| ClawPilot                           | `projects/clawpilot/`            | ClawPilot feedback-to-issue tracking and issue-loop notes.                                                                               |
| Rendezvous                          | `projects/rendezvous/`           | Gio-owned Lobster M5 commitments, July 31 forecasts, project ownership, and blockers.                                                    |
| Bugs                                | `projects/bugs/`                 | Cross-cutting bugfix triage, reproduction notes, and fix proof.                                                                          |
| Local tools                         | `tools/`                         | Repo-local operator tools and launch notes.                                                                                              |
| WSL tools                           | `tools/wsl/` and `projects/wsl/` | Stable wrappers and WSL worktree index for OpenClaw/Lobster work under `/root/src`.                                                      |
| PR loop                             | `projects/pr-loop/`              | Active stacked-PR operations, dependency restacks, review refreshes, and CI gate handoffs.                                               |
| PR queues                           | `projects/prs/`                  | Cross-project PR tracking, staleness, proof, and watcher notes.                                                                          |
| Disk management                     | `projects/disk-mgmt/`            | Laptop disk reclaim: managed-repo inventory, merged/closed PR worktree prune, stale branch cleanup, and reclaim techniques.              |
| Archived waves                      | `.craft/waves/`                  | Historical research, panels, proposals, and generated wave artifacts. Do not use this as the active task surface.                        |

## Current External Worktrees

| Project            | Path                                                            | Notes                                                                  |
| ------------------ | --------------------------------------------------------------- | ---------------------------------------------------------------------- |
| OpenClaw           | `C:\src\openclaw` and PR-specific `C:\src\openclaw-*` worktrees | Use for upstream OpenClaw implementation and PR stacks.                |
| OpenClaw Rust node | `C:\src\openclaw-rust-node`                                     | Experimental Rust node RFC and future conformance implementation.      |
| Lobster            | `C:\src\lobster`                                                | Main Lobster checkout.                                                 |
| LobsterTank        | `C:\src\lobster-lobstertank`                                    | Dashboard worktree; current dashboard code is in `tools/lobstertank/`. |
| RFCs               | `C:\src\openclaw-rfcs` or the active RFC worktree when present  | Use for RFC text and discussion follow-up.                             |
| WSL active index   | `/root/src/_hapi`                                               | Symlinks to active WSL OpenClaw/RFC worktrees.                         |

## Rules

- Put active operating notes under `projects/`, not inside `.craft/waves/`.
- Treat `.craft/waves/` as archive/source material unless intentionally promoting an artifact.
- Put runnable local helper tools under `tools/<name>/` with a README and a stop command.
- Keep PR proof and review-loop notes close to the project they belong to.
- Before moving old wave artifacts, add an index first and move only obvious, named artifacts.
