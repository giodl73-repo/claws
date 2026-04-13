# Write a Governance Rule

Create a custom governance rule that claws evaluates during `claws check` and enforces at runtime.

## Prerequisites

- A workspace initialized with `claws init`
- At least one successful `claws build`

## Steps

### 1. Create a policy YAML file

Add a file under `.claws/policies/`:

```yaml
# .claws/policies/no-public-api-keys.yaml
rule: G-INPUT-API-KEYS
description: "Tool arguments must not contain plaintext API keys"
severity: critical
scope: tool-call
match:
  pattern: "(sk-|api_key=|AKIA)[A-Za-z0-9]+"
  target: params
action: block
message: "Plaintext API key detected in tool arguments. Use a secrets reference instead."
```

### 2. Understand severity levels

Choose the severity that matches the rule's impact:

| Severity | Meaning | Check behavior | Runtime behavior |
|----------|---------|---------------|-----------------|
| `critical` | Security or compliance violation | Red, blocks `--strict` | Blocks the tool call |
| `high` | Significant governance gap | Red, blocks `--strict` | Blocks the tool call |
| `medium` | Governance improvement needed | Yellow, warning | Logged, not blocked |
| `low` | Advisory recommendation | Dim, informational | Logged, not blocked |

Rules with `critical` or `high` severity produce violations that fail CI when running `claws check --strict`.

### 3. Set the enforcement scope

The `scope` field determines where the rule is evaluated:

| Scope | What it checks | Ring |
|-------|---------------|------|
| `tool-call` | Tool call arguments before execution | Inner + middle |
| `output` | Tool call return values | Middle |
| `delegation` | Agent-to-agent trust boundaries | Middle |
| `workspace` | Static workspace configuration | Middle |
| `fleet` | Cross-workspace compliance | Outer |

A `tool-call` scope rule runs in both the inner ring (real-time, on file save) and the middle ring (on `claws check`). A `fleet` scope rule runs only during outer ring operations like `claws scan`.

### 4. Compose with the three-ring model

Rules participate in different rings depending on their scope. Custom rules follow the same ring boundaries as built-in rules:

- **Inner ring** rules must evaluate in under 300ms (the batch window). Keep patterns simple and avoid network calls.
- **Middle ring** rules can take up to 5 seconds (the `claws check` latency budget). More complex validation is acceptable here.
- **Outer ring** rules run at fleet scale across multiple workspaces. These check cross-workspace consistency, drift, and compliance baselines.

### 5. Validate the rule

Run `claws check` to see your new rule in action:

```bash
claws check
```

Look for your rule ID (e.g., `G-INPUT-API-KEYS`) in the output. Then run `claws build` to compile the rule into the enforcement plugin. The generated `index.ts` includes the rule in the `before_tool_call` handler for `critical` and `high` severity rules.

## What to do next

- [Run a build](first-build.md) to compile the new rule into enforcement artifacts
- [Set up three-ring security](three-ring-setup.md) for real-time inner ring feedback
- [Publish a skill](publish-skill.md) that includes your governance rules
