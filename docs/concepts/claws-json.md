# What's in claws.json?

<!-- atom:claws-json (C35) -->

`claws.json` is the governance config for your workspace. It lives at the root
of your project, next to your platform files.

## The minimal config

After `claws init`, you get this:

```json
{
  "version": 2,
  "enabled": true,
  "trustTier": 2
}
```

Three fields. That's a valid, governed workspace.

## A typical config after a week

```json
{
  "version": 2,
  "enabled": true,
  "trustTier": 2,
  "template": "soc2",
  "policies": [".claws/policies/soc2-baseline.yaml"]
}
```

## Field by field

| Field | Required | Default | What it does |
|-------|----------|---------|-------------|
| `version` | Yes | -- | Schema version. Always `2`. |
| `enabled` | Yes | -- | Master toggle. `false` disables all governance. |
| `trustTier` | No | `2` | How much you trust your agent (0-4). Always defaults to T2 if omitted -- never undefined. |
| `platform` | No | auto | Override platform detection (`openclaw`, `cursor`, `claude`, etc). |
| `template` | No | `minimal` | Policy template: `soc2`, `hipaa`, `eu-ai-act`, `minimal`. |
| `policies` | No | `[]` | Paths to policy YAML files. |
| `audit` | No | -- | Audit chain settings (retention, SIEM format). |
| `budget` | No | -- | Token budget limits. |
| `targets` | No | -- | Per-platform overrides for cross-compilation. |

## Trust tiers

| Tier | Meaning | Example |
|------|---------|---------|
| T0 | No trust (R1 max) | Read-only, no tool access |
| T1 | Minimal (R2 max) | Safe tools only (search, read) |
| T2 | Standard (R3 max) | Most tools, some restrictions (default) |
| T3 | Elevated (R4 max) | Sensitive tools (file write, network) |
| T4 | Full (R5 max) | Everything, including system-level access |

If `claws check` says a tool needs a higher tier, either raise the tier or
remove the tool.

## How `claws init` creates it

```bash
claws init                       # minimal config (3 fields)
claws init --template soc2       # config with SOC 2 policies pre-loaded
claws init --template hipaa      # config with HIPAA defaults
```

Init never overwrites an existing claws.json. It tells you to run `claws doctor` instead.

## Editing manually

claws.json is plain JSON. Edit it in any editor, then `claws check` to validate.
Add `"$schema": "https://claws.dev/schema/v2.json"` for VS Code autocomplete.

## Cross-compilation targets

Building for multiple platforms? Add per-target overrides:

```json
{
  "version": 2,
  "enabled": true,
  "trustTier": 2,
  "targets": {
    "cursor": { "trustTier": 1 },
    "bedrock": { "trustTier": 3 }
  }
}
```

Per-target trust can only raise, never lower. Governance only gets stricter.

Just ran `claws init`? The 3-field minimal config is enough to build and check.
Add fields as you need them -- everything optional stays optional.

## Scenario-Driven Additions

### From obo-elicitation scenarios (68 findings applied)
- Standing approval schema: claws.json supports structured pre-authorization with conditions (time-bound, scope-limited, tool-specific) for scheduled R5 tools
- Standing approval compile-time validation: unconditional R5 standing approval produces a warning/error; overlapping standing approvals are detected
- Three-source precedence for elicitation: SOUL.md deny > claws.json policy > USER.md pre-authorization
- Elicitation rate limiting configurable per-agent (max N approval requests per minute) to prevent approval fatigue attacks
- Per-tool timeout overrides and approval mode selection (inline, async, pre-approved) declared in claws.json

### From platform-detection scenarios (47 findings applied)
- Per-target trust tier overrides in the `targets` section enable cross-compilation with platform-specific governance levels
- `targets.bedrock.guardrailId` supports the Bedrock guardrail update workflow; `targets.crewai.version` enables version-targeted emission
- Platform field supports explicit override of auto-detection; zero-config mode works without claws.json via synthetic defaults
- claws.json accepts JSON with BOM on Windows (UTF-8 BOM stripped before parse)
