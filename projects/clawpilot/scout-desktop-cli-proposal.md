# Scout Desktop CLI Proposal

Last updated: 2026-06-22

## Working Thesis

Scout Desktop should have a first-class CLI because agent-native products need
capability parity across user and agent surfaces: if a user can do an outcome in
the desktop UI, an agent should be able to do that outcome through a stable tool
surface, with explicit security carveouts.

The CLI should not be a second product implementation. It should be a typed,
scriptable front door over the same desktop primitives already exposed through
the IPC layer, plus a small set of headless-only inspection and eval commands.

## Agent-Native Rationale

The Every "Agent-native Architectures" guide frames the useful bar as:

- parity: agents can accomplish the same outcomes as users;
- granularity: tools expose atomic primitives rather than bundled judgment;
- composability: new workflows can be assembled by prompts and scripts;
- inspectability: files and structured outputs are easier for agents and users
  to reason about;
- explicit completion/progress signals for long-running agent work.

For Scout, the CLI is the practical way to make these properties cross-platform,
headless, mobile-hostable, and evaluable. A UI-only feature is hard for agents to
drive reliably. A CLI command with JSON and stream output is directly usable by
agents, CI, remote shells, mobile terminals, and eval harnesses.

Reference:

- https://every.to/guides/agent-native

## Local Architecture Fit

The current Scout Desktop architecture already has the right boundary:

- `common/ipc-contract.ts` is the single source of truth for IPC types.
- `electron/ipc/*-ipc.ts` handlers own main-process behavior.
- `electron/preload.cjs` exposes one renderer global per namespace.
- IPC handlers return `{ success: boolean; error?: string; ...data }`.

The CLI should align with this contract:

- Derive command schemas from `IpcInvokeMap` where practical.
- Preserve the existing result envelope for `--json`.
- Add newline-delimited event output for long-running or streaming commands.
- Keep security decisions in the existing permission, auth, and backend layers.
- Treat token material and cleartext secret reads as explicit non-goals.

## Product Goals

1. Make Scout outcomes runnable from terminals, scripts, agents, and CI.
2. Give evals a deterministic interface for setup, action, observation, and
   assertions.
3. Avoid duplicating business logic outside the desktop main-process/runtime
   layer.
4. Support both local desktop control and future Gateway-backed/headless control.
5. Keep user-consent and enterprise-policy boundaries intact.

## Non-Goals

- Do not expose raw token values, credential stores, OAuth refresh tokens, or
  managed `.env` file bodies.
- Do not bypass shell/MCP permission policy.
- Do not require every command to work without an installed desktop runtime in
  v1.
- Do not turn every UI widget into a command. The unit is user outcome or IPC
  primitive, not visual control.

## Proposed Top-Level Shape

Use `scout` as the public command and preserve room for branded aliases if
needed.

```text
scout <command> [subcommand] [options]
```

Global flags:

```text
--json                 Emit one JSON result envelope.
--stream-json          Emit newline-delimited events for long-running commands.
--profile <name>       Select a local/Gateway/profile context.
--workspace <path>     Set working directory for commands that need one.
--timeout <duration>   Bound command runtime.
--no-open-ui           Do not launch or focus desktop UI as a side effect.
--require-running      Fail if the desktop runtime is not already running.
--explain-permissions  Print required permission classes before execution.
```

## Command Families

### Runtime

```text
scout status
scout doctor
scout daemon start
scout daemon status
scout daemon stop
scout logs [--tail N] [--follow]
```

Purpose: make the desktop/headless runtime observable and recoverable.

Notes:

- `status` should report version, platform, active backend, signed-in state,
  desktop-running state, Gateway state, sync state, and policy gates.
- `doctor` should run preflights that already exist or belong in IPC:
  PowerShell/Python/PATH, auth health, MCP child process readiness, feed
  readiness, update state, and permission policy.

### Auth

```text
scout auth status
scout auth login [--provider copilot|m365|gateway]
scout auth logout [--provider copilot|m365|gateway]
```

Purpose: let scripts and agents verify readiness without scraping UI.

Security carveout:

- `auth status --json` may report signed-in/signed-out, account hints, tenant
  IDs, expiry warnings, and action URLs.
- It must not print tokens or secret material.

### Sessions

```text
scout sessions list
scout sessions show <session-id>
scout sessions create [--model <id>] [--personality <id>] [--name <name>]
scout sessions rename <session-id> <name>
scout sessions delete <session-id>
scout sessions pin <session-id>
scout sessions unpin <session-id>
scout sessions mark-read <session-id>
scout sessions mark-unread <session-id>
```

Purpose: expose the current session lifecycle IPC surface.

Result contract:

- List/show commands return metadata and stable IDs.
- Content-bearing session export should require an explicit later command and
  privacy review.

### Run

```text
scout run "task prompt"
scout run --session <session-id> "follow-up prompt"
scout run --file prompt.md
scout run --stream-json --session <session-id> "task prompt"
scout stop <session-id>
```

Purpose: let agents and evals ask Scout to do work and observe progress without
UI automation.

Behavior:

- `run` maps to the existing send/abort/session event model.
- `--stream-json` emits session events, permission requests, progress, final
  result, and completion status.
- Non-interactive permission prompts should surface as structured
  `permission_required` events, not hang silently.

Open question:

- Whether non-interactive permission responses should be driven by a CLI flag,
  an external approval MCP/tool callback, or a local policy profile.

### Models And Personas

```text
scout models list
scout models default get
scout models default set <model-id>
scout sessions model get <session-id>
scout sessions model set <session-id> <model-id>

scout personalities list
scout personalities default get
scout personalities default set <personality-id>
```

Purpose: expose model/personality settings already represented in IPC.

Security carveout:

- Token-related usage, hidden account quotas, and provider secrets stay out of
  the CLI unless there is an approved product contract.

### MCP And Tools

```text
scout mcp list
scout mcp add --name <name> --command <cmd> [--args ...]
scout mcp add --name <name> --url <url>
scout mcp remove <name>
scout mcp enable <name>
scout mcp disable <name>
scout mcp oauth start <name>
scout mcp oauth signout <name>
scout mcp env open <name>
scout mcp env reveal <name>

scout tools list
scout tools permissions explain [tool-or-command]
```

Purpose: make the tool surface inspectable and manageable by agents.

Security carveout:

- Keep the current env-file rule: opening/revealing managed env files is allowed,
  reading or printing their contents through IPC/CLI is not.

### Skills, Extensions, And Feeds

```text
scout skills list
scout skills add --name <name> --description <text>
scout skills update <id> [--name ...] [--description ...]
scout skills delete <id>
scout skills import-url <url>
scout skills export <name>
scout skills publish-personal <name>

scout catalog list
scout catalog search <query>
scout feeds status
scout feeds refresh
scout feeds diagnostics
```

Purpose: map current skill/catalog/feed proof work to scriptable outcomes.

Current local anchors:

- `skills:publish-personal`
- `extensions-catalog:list`
- `common/scout-feed-publish.ts`
- `common/scout-feed-catalog.ts`

### Settings And Policy

```text
scout settings get [path]
scout settings set <path> <value>
scout settings export
scout settings import <file>

scout policy status
scout permissions list
scout permissions clear [--session <session-id>]
```

Purpose: let agents inspect configuration and policy state without relying on
renderer state.

Guardrail:

- Settings writes should use typed schema validation and should not accept raw
  arbitrary JSON merges into persisted state.

### Workspace And Files

```text
scout workspace list
scout workspace add <path-or-provider-ref>
scout workspace remove <id>
scout workspace tree <id> [path]
scout workspace read <id> <path>
scout workspace write <id> <path> --file <local-file>
```

Purpose: provide parity with workspace-backed file operations while preserving
provider abstractions.

Guardrail:

- Commands should address files through `WorkspaceItemRef`-style identifiers
  and provider capabilities, not assume local filesystem paths for every
  workspace.

### Automations, Heartbeat, Sync

```text
scout automations list
scout automations run <id>
scout automations export <id>
scout automations import <file>

scout heartbeat status
scout heartbeat run-now
scout heartbeat logs

scout sync status
scout sync force-pull
```

Purpose: make scheduled/background behavior testable and operable without UI.

### Eval Harness

```text
scout eval run <scenario-file>
scout eval record --session <session-id> --out <trace.ndjson>
scout eval assert <trace.ndjson> --expect <expectation-file>
```

Purpose: make Scout behavior measurable.

Scenario files should be plain JSON/YAML:

- setup commands;
- prompt/run commands;
- expected IPC/event stream patterns;
- expected state reads;
- teardown commands.

This gives product, QA, and agents the same action/observe/assert loop.

## Output Contracts

Default human output should be terse and stable. Automation should use JSON.

Single-result commands:

```json
{
  "success": true,
  "data": {},
  "diagnostics": []
}
```

Error result:

```json
{
  "success": false,
  "error": "mcp server not found",
  "code": "MCP_SERVER_NOT_FOUND",
  "diagnostics": []
}
```

Streaming commands:

```json
{"type":"started","sessionId":"..."}
{"type":"event","sessionId":"...","event":{}}
{"type":"permission_required","requestId":"...","summary":"..."}
{"type":"completed","sessionId":"...","status":"success"}
```

## Comparison With Other Agentic CLIs

Claude Code:

- Strong precedent for interactive and non-interactive modes.
- Has `-p` print mode, JSON/stream JSON, session resume, background agents,
  daemon management, MCP/plugins, permission modes, and an external permission
  prompt tool.
- Scout should borrow the scriptability, background-session, and permission
  event ideas, but focus commands on Scout product primitives instead of only a
  coding-agent loop.

Reference:

- https://code.claude.com/docs/en/cli-reference

Gemini CLI:

- Strong precedent for terminal-first UX, `-p` prompt mode, JSON/stream JSON,
  built-in file/shell/web tools, MCP integration, and headless workflows.
- Scout should borrow the `--output-format json|stream-json` shape and
  extension posture, while preserving Scout-specific auth, feeds, workspace,
  M365, and desktop runtime semantics.

Reference:

- https://github.com/google-gemini/gemini-cli

Codex CLI:

- Strong precedent for a terminal coding agent with sandboxing, approvals,
  session persistence, and repo-local execution.
- Scout should borrow the principle that the terminal is a first-class control
  surface, but should not collapse into a code-only tool; the Scout CLI needs to
  expose app/runtime/IPC capabilities across desktop, M365, MCP, feeds, and
  sessions.

Reference:

- https://github.com/openai/codex

Aider:

- Strong precedent for Git-native, scriptable LLM workflows.
- Scout can learn from its bias toward simple terminal workflows, but Scout's
  differentiator should be typed app capability parity and governed enterprise
  surfaces, not just repo editing.

Reference:

- https://aider.chat/docs/usage.html

## Phasing

### Phase 0: Discovery Spec

- Generate an inventory from `IpcInvokeMap`, `preload.cjs`, and
  `electron/ipc/*`.
- Classify each IPC method:
  - safe read;
  - safe write;
  - permission-gated action;
  - interactive-only action;
  - token/secret non-goal;
  - dev-only action.
- Produce a command map with parity gaps.

### Phase 1: Read-Only And Diagnostics

- `status`
- `doctor`
- `auth status`
- `sessions list/show`
- `models list/default get`
- `personalities list/default get`
- `mcp list`
- `skills list`
- `catalog list`
- `feeds diagnostics`
- `settings get`
- `heartbeat status/logs`
- `sync status`

### Phase 2: Low-Risk Mutations

- session create/rename/pin/read state;
- settings writes through schema paths;
- skills import/export/publish-personal;
- feed refresh;
- MCP add/remove/update without printing secrets;
- sync force-pull;
- heartbeat run-now.

### Phase 3: Agent Run And Permission Events

- `scout run`;
- `scout stop`;
- stream events;
- structured non-interactive permission requests;
- approval callback integration.

### Phase 4: Eval Harness

- scenario runner;
- trace recorder;
- assertion runner;
- CI-friendly fixtures;
- product regression suites.

### Phase 5: Headless Runtime

- launch without renderer when possible;
- connect to a running desktop runtime when required;
- support Gateway-backed remote profiles;
- support mobile/remote shells through the same command contract.

## Open Questions For Jakob

1. Should `scout` be a desktop companion CLI that requires the app runtime, or a
   shared package that can also launch a headless main-process runtime?
2. Which IPC namespaces are intentionally UI-only and should never be exposed?
3. What is the approval model for non-interactive permission prompts?
4. Should CLI command generation be schema-driven from `IpcInvokeMap`, or should
   commands be hand-curated and backed by typed adapters?
5. Which commands are allowed in enterprise-managed environments where policy
   blocks user-level settings changes?
6. What is the minimal v1 that would materially improve evals?

## Recommended V1 Proposal

Start with read-only diagnostics plus feed/skill catalog parity:

```text
scout status --json
scout doctor --json
scout auth status --json
scout sessions list --json
scout mcp list --json
scout skills list --json
scout catalog list --json
scout feeds diagnostics --json
```

Then add:

```text
scout run --stream-json "..."
scout skills publish-personal <name> --json
scout eval run <scenario-file> --json
```

This keeps the first proposal small, proves agent-native parity, helps evals
immediately, and creates a clean path to broader IPC coverage.
