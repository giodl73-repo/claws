# Lobster Budget Plugin Design

Date: 2026-06-19

## Status

Implemented locally in `C:\src\lobster-context-budget-plugin` on branch
`user/giodl/context-budget-plugin`. No PR has been filed.

## Target

Build Budget as a Lobster-owned OpenClaw plugin parallel to:

`src/openclaw_container/plugins/tools-code-mode`

Target repo/path:

`microsoft.ghe.com/bic/lobster/src/openclaw_container/plugins/context-budget`

This keeps Budget quarantined in the Lobster OpenClaw container and avoids
filing the existing OpenClaw core stack.

## Existing Plugin Pattern

`tools-code-mode` is a private ESM plugin with:

- `package.json` using `type: "module"` and `openclaw.extensions: ["./index.js"]`.
- `openclaw.plugin.json` with `id`, activation, contracts, optional tool
  metadata, and strict `configSchema`.
- `index.ts` exporting `definePluginEntry(...)`.
- Checked-in generated `*.js` and `*.d.ts` next to TypeScript sources.
- Runtime loading through `config/openclaw.plugins.json`:
  - add plugin id to `plugins.allow`
  - add `/app/plugins/<id>` to `plugins.load.paths`
  - add `plugins.entries.<id>.enabled`
- Tool exposure through `config/openclaw.tools.json` when the plugin registers
  agent tools.

Lobster copies all plugin directories into `/app/plugins/` during the container
build and later makes that tree root-owned/read-only.

## Proposed Plugin Shape

Directory:

```text
src/openclaw_container/plugins/context-budget/
  package.json
  openclaw.plugin.json
  index.ts
  index.js
  index.d.ts
  src/
    audit.ts
    management.ts
    recommendations.ts
    report.ts
    runtime-evidence.ts
    schema.ts
    token-estimate.ts
    tool.ts
    types.ts
```

Initial package metadata:

```json
{
  "name": "@openclaw/context-budget-plugin",
  "version": "2026.6.19",
  "private": true,
  "description": "Lobster quarantined context budget plugin",
  "type": "module",
  "exports": {
    ".": "./index.js"
  },
  "dependencies": {},
  "devDependencies": {
    "@openclaw/plugin-sdk": "workspace:*"
  },
  "openclaw": {
    "extensions": ["./index.js"]
  }
}
```

Initial manifest:

```json
{
  "id": "context-budget",
  "name": "Context Budget",
  "description": "Quarantined context budget audit and recommendation plugin",
  "activation": {
    "onStartup": true
  },
  "contracts": {
    "tools": ["context_budget"]
  },
  "toolMetadata": {
    "context_budget": {
      "optional": true
    }
  },
  "configSchema": {
    "type": "object",
    "additionalProperties": false,
    "properties": {
      "softTokenLimit": { "type": "integer" },
      "skillRoots": {
        "type": "array",
        "items": { "type": "string" }
      },
      "runtimeEvidenceFiles": {
        "type": "array",
        "items": { "type": "string" }
      }
    }
  }
}
```

## Tool Surface

Start with one optional tool:

`context_budget`

Parameters:

- `action`: `"audit" | "report" | "explain" | "recommend" | "manage"`
- `format`: optional `"json" | "markdown"` for `report`
- `source`: required only for `explain`; one of:
  `workspace-file`, `skill`, `system`, `runtime`, `tool`, `transcript`,
  `provider-usage`
- `workspace`: optional override; default resolved from
  `api.runtime.agent.resolveAgentWorkspaceDir(api.config)`
- `softTokenLimit`: optional integer override
- `runtimeEvidenceFiles`: optional string array
- `skillRoots`: optional string array

Return shape:

- `content[0].text` contains markdown for human-readable `report`, otherwise
  pretty JSON.
- `details` contains the same structured report/recommendation/management
  object for machine consumers.

This keeps the first plugin surface narrow and avoids adding native CLI commands
or OpenClaw core packages.

## Porting Plan

Reuse the existing reference prototype logic from the rebased OpenClaw stack:

- `packages/context-budget/src/audit.ts`
- `packages/context-budget/src/runtime-evidence.ts`
- `packages/context-budget/src/management.ts`
- `packages/context-budget/src/recommendations.ts`
- `packages/context-budget/src/report.ts`
- `packages/context-budget/src/schema.ts`
- `packages/context-budget/src/token-estimate.ts`
- `packages/context-budget/src/types.ts`

Do not port the native OpenClaw CLI registration as-is. Re-express the command
handlers as a plugin tool implementation in `src/tool.ts`.

## Container Config Changes

Add to `src/openclaw_container/config/openclaw.plugins.json`:

```json
{
  "allow": ["context-budget"],
  "load": {
    "paths": ["/app/plugins/context-budget"]
  },
  "entries": {
    "context-budget": {
      "enabled": true,
      "config": {
        "softTokenLimit": 12000
      }
    }
  }
}
```

The actual edit should merge with existing arrays/objects, not replace them.

Add to `src/openclaw_container/config/openclaw.tools.json`:

```json
{
  "alsoAllow": ["context_budget"]
}
```

Again, merge into the existing `alsoAllow` array.

## Validation

Minimum local proof for the plugin PR:

- TypeScript/source parity for checked-in `*.ts`, `*.js`, and `*.d.ts` outputs.
- Unit tests for:
  - static workspace file audit
  - skill root audit
  - `context_budget` action routing
  - `explain` source validation
  - optional runtime evidence inclusion
  - management output stays read-only
- Container build/config proof that:
  - `/app/plugins/context-budget/openclaw.plugin.json` exists
  - plugin id is in `openclaw.plugins.json` allow/load/entries
  - `context_budget` is in `openclaw.tools.json` `alsoAllow`

## Open Questions

- Should the plugin be enabled by default in all Lobster rings, or gated by a
  config/env flag while Galin dogfoods it?
- Should Budget expose one `context_budget` tool or separate
  `context_budget_audit`, `context_budget_report`, and
  `context_budget_recommend` tools?
- Which runtime evidence files can the Lobster container produce today without
  adding OpenClaw core hooks?
- Should a plugin-local skill be added later to teach agents when to call
  `context_budget`, or should the tool description be enough for the first
  quarantine phase?
