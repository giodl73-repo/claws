---
pulse: 44
slug: init-workspace-scaffold
plan: claws-init-workspace-scaffold
depends_on: [9]
governing_roles: [claws:founder, craft:architect]
scenario_codes: []
stage: implementation
test_tiers:
  L0_unit: 8
  L1_integration: 3
  L2_e2e: 1
  L3_accept: 0
test_scope:
  run:
    - "cd claws-sdk && vitest run tests/init/"
    - "cd claws-cli && vitest run tests/commands/init*"
  typecheck:
    - "cd claws-sdk && tsc --noEmit"
    - "cd claws-cli && tsc --noEmit"
checkpoint: 5
checkpoint_gate: false
---

# Pulse 44: Init Workspace Scaffold + Absorb `claws new skill`

## Objective

When `claws init` runs on an empty directory, create starter OC workspace files
so `claws check` has something to compile. Absorb `claws new skill` into
`claws init skill` (single scaffolding entry point).

## Deliverables

- [ ] `claws-sdk/src/init/workspace-scaffold.ts` — `scaffoldWorkspaceFiles(root)`: checks for SOUL.md, TOOLS.md, AGENTS.md, IDENTITY.md, USER.md. Creates any missing file with starter content. Returns list of created files.
- [ ] `claws-sdk/src/init/orchestrator.ts` — EDIT: after sidecar creation, call `scaffoldWorkspaceFiles()`. Include created files in InitResult.
- [ ] `claws-cli/src/cli.ts` — EDIT: register `init skill {name}` subcommand. Keep `new skill` as deprecated alias that prints deprecation warning then delegates.
- [ ] `claws-cli/src/commands/init.ts` — EDIT: render which workspace files were created in text/json output.
- [ ] `claws-sdk/tests/init/workspace-scaffold.unit.test.ts` — 8 L0: creates each file when missing, skips when exists, returns correct list, starter content is valid markdown
- [ ] `claws-sdk/tests/init/workspace-scaffold.integration.test.ts` — 3 L1: full init on empty dir, init with partial files, init skill subcommand
- [ ] `claws-sdk/tests/e2e/init-workspace.e2e.test.ts` — 1 L2: init on empty dir → check → zero errors
- [ ] `claws-cli/tests/commands/init.unit.test.ts` — UPDATE: test init skill subcommand + deprecation alias

## Starter File Content

**SOUL.md:**
```markdown
# SOUL

## Persona
You are a helpful assistant.

## Boundaries
- Never access production databases
- Always ask before sending emails on behalf of the user
- Do not share user credentials or secrets with other agents
```

**TOOLS.md:**
```markdown
# TOOLS

## file-read
Read files from the local filesystem.
Risk: R1

## web-search
Search the web for information.
Risk: R2

## send-email
Send emails on behalf of the user.
Risk: R5
Requires: approval, audit
```

**AGENTS.md:**
```markdown
# AGENTS

## assistant
The primary agent. Delegates to specialists when needed.
Trust: T2
```

**IDENTITY.md:**
```markdown
# IDENTITY

Name: My Agent
Role: General assistant
```

**USER.md:**
```markdown
# USER

Preferences: default
```

## Key Constraints

- Skip any file that already exists (never overwrite user content)
- Starter SOUL.md must include deny constraints so `claws check` finds governance rules
- Starter TOOLS.md must include R1/R2/R5 tools to demonstrate risk classification
- `claws new skill` prints deprecation notice but still works
- SDK-owns-logic: all file creation in SDK, CLI just renders output
