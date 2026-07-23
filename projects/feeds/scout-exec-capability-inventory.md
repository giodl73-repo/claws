# Scout exec capability inventory

Status: evidence-backed delivery inventory for Lobster PR #5336
Updated: 2026-07-22

## Decision

Do not solve exec approval volume with a blanket allowlist or a plugin that
accepts arbitrary shell text. Use three layers:

1. typed tools for recurring product scenarios;
2. OpenClaw's constrained `safeBins` and exact exec rules for the small shell
   remainder;
3. human approval for unknown commands.

The immediate posture should be OpenClaw exec mode `ask`
(`security=allowlist`, `ask=on-miss`). Lobster currently sets `ask=always`,
which guarantees a dialog even when a command is otherwise trusted.

## Production evidence

CAP `TraceEventsOT` for `logSourceName == "openclaw-adapter"`, trailing 24
hours on 2026-07-22:

| Outcome                      | Distinct approval IDs |
| ---------------------------- | --------------------: |
| Approved once                |                    64 |
| Disabled / denied            |                    17 |
| Timed out / denied           |                     8 |
| No approval surface / denied |                     1 |
| Total                        |                    90 |

Host split: gateway 56, node 17, unknown 17 distinct approvals. The trace had
163 request-event rows because request relay/replay can emit more than one row
per approval; approval ID is the correct counting unit.

Lobster also has A365/Spectra `execute_tool` spans. They already carry
`gen_ai.tool.name` and `gen_ai.tool.call.id`, and their ECS gate defaults on.
Use that path for the overall tool-name inventory; do not create a duplicate
general tool-call event. The checked-in documentation does not provide a
local query endpoint for the A365/Spectra trace store, so production tool-name
counts require the A365 observability surface or its owning team's query path.

The CAP exec-approval telemetry cannot inventory commands. The adapter receives OpenClaw's
`command`, `commandPreview`, `commandArgv`, `cwd`, `agentId`, `sessionKey`,
`resolvedPath`, and `turnSourceChannel`, but promotes only approval ID, host,
node ID, and risk. It also has no explicit skill/plugin provenance field.

The telemetry PR must record privacy-safe derived fields, not raw commands:

- executable family from normalized argv[0];
- known safe subcommand enum where applicable;
- compound, pipeline, redirection, substitution, and inline-eval flags;
- workspace scope: workspace, temporary, outside, or unknown;
- host and source-channel class;
- approval outcome and approval ID, correlated to the existing tool-call span
  with a non-content identifier where available;
- plugin/skill provenance when OpenClaw supplies it.

Tests must prove that arguments, paths, file contents, prompts, tokens, and
secret values are never emitted. Include checked-in KQL that counts distinct
approval IDs and groups by the derived fields.

## Concrete scenario inventory

| Current source or need                                    | Delivery                                                           | Kind                                | Shell deletion                                                                                           |
| --------------------------------------------------------- | ------------------------------------------------------------------ | ----------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Bug filing via raw `curl`                                 | `Diagnostics.fileBug(...)` from Lobster #5350                      | Existing typed plugin               | Complete                                                                                                 |
| Workspace listing and discovery (`ls`, `find`)            | `WorkspaceFiles.list(...)`                                         | New first-party typed plugin        | Delete ad hoc listing commands                                                                           |
| Workspace text search (`grep`, `rg`)                      | `WorkspaceFiles.search(...)`                                       | New first-party typed plugin        | Delete file-oriented grep/rg commands                                                                    |
| Workspace metadata                                        | `WorkspaceFiles.stat(...)`                                         | New first-party typed plugin        | Delete shell metadata probes                                                                             |
| File reads                                                | Existing core `read` tool                                          | Core tool                           | Do not route through `cat`                                                                               |
| Repository status prompted by the shipped AGENTS template | `WorkspaceFiles.gitStatus(...)`                                    | New first-party typed plugin        | Delete `git status` recipe; an exact temporary rule is acceptable during rollout                         |
| Session-history skill's `bash` + `jq` + `awk` script      | Rewrite skill over existing `sessions_list` and `sessions_history` | Existing core tools                 | Delete script and binary requirements; add a typed operation only if parity testing finds a concrete gap |
| Microsoft 365 attachment saving                           | `M365.messages.saveAttachment(...)`                                | Existing WorkIQ namespace extension | No standalone plugin                                                                                     |
| GitHub and Azure DevOps work items                        | Exact connector MCP tools plus paired skills                       | MCP                                 | Do not wrap as custom shell plugins                                                                      |
| Repeated diagnostic families found by the new telemetry   | Narrow `Diagnostics.*` operations with explicit schemas            | Existing plugin extension           | Required only for measured families that survive the above migrations                                    |

`WorkspaceFiles` must accept structured arguments only. It must be confined to
the active workspace, resolve symlinks safely, bound traversal and output, and
have one plugin-level enable/disable switch. It must never accept a command
string, executable name, arbitrary argv, or an unrestricted path.

## #5336 implementation stack

### PR 1: exec observability and approval safety

- Query the existing A365/Spectra `execute_tool` spans for the overall
  tool-name inventory.
- Add the missing privacy-safe exec fields, correlation, and distinct-ID KQL
  to the CAP approval path above; do not duplicate general tool-name spans.
- Add source/provenance to the OpenClaw approval payload if it is not already
  available at the Lobster boundary.
- Hide or disable Lobster's current `Always allow` choice for host exec. Its
  browser-local rule is effectively `system.run::write` and is not scoped to
  command, argv, host, cwd, workspace, risk, or tenant policy.

### PR 2: activate the intended exec policy

- Generate exec mode `ask`, not `ask=always`.
- Keep `security=allowlist`; forbid `auto` and `full` in managed Scout policy.
- Use OpenClaw's authoritative exec-approval store for exact gateway/node
  rules instead of a second Lobster-only rule schema.
- Start with only source-proven exact command shapes needed during migration,
  such as the shipped `git status` recipe.
- Keep `autoAllowSkills` disabled.

Delivered as draft Lobster PR
[#5506](https://microsoft.ghe.com/bic/lobster/pull/5506), stacked on #5491:

- baked policy is `security=allowlist`, `ask=on-miss`, `safeBins: []`;
- no command is pre-allowlisted and no safe-bin default bypasses first approval;
- OpenClaw's per-request `allowedDecisions` is authoritative and missing data
  degrades to one-shot;
- eligible host-exec **Always allow** decisions round-trip to OpenClaw's
  exact-command store through browser or Teams;
- plugin and proxy-egress approvals reject durable decisions;
- cross-pod and Teams callbacks preserve safe behavior during mixed-version
  rollout; and
- the active client, broker, Teams, and ADR contracts were updated with the
  same ownership and fallback rules.

OpenClaw `safeBins` are only for stdin filters. Defaults include `cut`, `uniq`,
`head`, `tail`, `tr`, and `wc`. A constrained `grep` profile may process stdin,
but it must not read positional files. `awk`, `sed`, and `jq` are always denied
as safe bins. Do not blanket-allow `ls`, `cat`, `grep`, interpreters, or shells.

### PR 3: workspace inspection plugin

- Ship `WorkspaceFiles.list`, `search`, `stat`, and `gitStatus`.
- Include schemas, workspace-boundary tests, symlink escape tests, output
  bounds, plugin telemetry, plugin manifest/configuration, and paired skill
  guidance.
- Remove the corresponding shell recipes once the typed tools are available.

### PR 4: session-history shell deletion

- Rewrite the bundled session-history skill to use `sessions_list` and
  `sessions_history`.
- Remove `session-history.sh` and its `jq` requirement after parity proof.
- If one exact aggregation remains unavailable, add that bounded typed method;
  do not expose transcript paths or a generic query language.

### PR 5: inventory and administration

- Extend the existing catalog/inventory surface to show effective core,
  plugin, MCP, and exec capabilities with their policy source.
- User UX: Allow once; for eligible commands, allow the exact normalized shape
  in this workspace with visible scope and expiry; list and revoke rules.
- Admin UX: plugin enable/disable, managed exec bundles, deny precedence,
  effective-policy preview, audit, and kill switch.
- Project OpenClaw's `exec.approvals.*` model into Lobster rather than inventing
  a parallel matching model.

## Stack completion gate

The stack is complete when:

- production telemetry identifies the command families behind at least 90% of
  distinct gateway approval requests over a representative seven-day window;
- each identified family is mapped to a typed/core/MCP capability, a reviewed
  exact exec rule, or an intentional human prompt;
- no broad `system.run::write` auto-approval is possible;
- unknown commands fail closed and remain auditable;
- the source-audited `git status` and session-history shell recipes are gone.

## User questions, answered

- Allowlist `ls` and `grep` broadly: **no**.
- Create a "safe shell commands" plugin: **no** if it accepts shell text;
  **yes** to the structured `WorkspaceFiles` plugin above.
- Audit command origins and build scenario tools now: **yes**; two shipped
  origins are already identified, and telemetry PR 1 supplies the rest.
- Add a quick "Always allow": **not with the current Lobster matching key**.
  Switch to `ask=on-miss` and exact server-authoritative rules instead.
- Management UX: OpenClaw already owns gateway/node exec approval policy;
  Lobster should present that effective policy alongside plugin and tenant
  policy controls, with user rules narrower than the admin floor.
