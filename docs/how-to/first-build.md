# Run Your First Build

Compile governance artifacts from your workspace using `claws build`.

## Prerequisites

- A workspace initialized with `claws init` (see [Initialize a workspace](initialize-workspace.md))
- `claws.json` and `.claws/` directory present

## Steps

### 1. Run `claws build`

From your workspace root:

```bash
claws build
```

The compiler reads your workspace files (SOUL.md, AGENTS.md, TOOLS.md, claws.json), classifies every tool by risk level (R1-R5), compiles governance rules, and emits four artifacts:

| Artifact | What it does |
|----------|-------------|
| `skills/claws-governance/SKILL.md` | L1 advisory -- natural-language governance instructions the agent reads in its prompt context |
| `plugins/claws-governance/index.ts` | L2+L3 enforcement -- Gateway plugin that intercepts tool calls and blocks violations at runtime |
| `exec-approvals.json` | L4 host-level backup -- configures which tools require human approval |
| `lobster.compiled.yaml` | Governance-injected workflow DAG (only emitted if your workspace has a `lobster.yaml`) |

The advisory skill can be ignored by the agent. The enforcement plugin cannot -- it blocks tool calls via `before_tool_call` hooks before they execute.

### 2. Interpret the auto-check output

Every build automatically runs `claws check` after compilation. Look at the terminal output:

```
  Check (auto):
    15 policy checks passed in 0.3s
```

If violations appear, the build still succeeds (artifacts are emitted), but fix the violations before deploying. Each violation includes the file, line number, and a concrete fix suggestion.

Skip the auto-check during rapid iteration with `claws build --skip-check`.

### 3. Review diagnostics

Common diagnostic messages after a first build:

- **"N governance rules, M tools classified"** -- confirms the compiler read your workspace. More tools means more classification work.
- **Tool classified higher than trust tier** -- a tool's risk level (e.g., R5) exceeds your `trustTier` ceiling (e.g., T2 allows up to R3). Either raise the trust tier or override the tool's classification in claws.json.
- **"OBO detected"** -- the compiler found tools that act on behalf of the user (send email, post to Slack). These receive the full elicitation gate.

### 4. Cross-compile for a teammate (optional)

Compile the same governance rules for a teammate who uses a different platform:

```bash
claws build cursor
```

Cross-compiled output goes to `build/<target>/`. Available targets: `openclaw`, `cursor`, `claude`, `github`, `bedrock`, `langgraph`, `crewai`.

### 5. Rebuild after changes

Run `claws build` after changing SOUL.md, TOOLS.md, AGENTS.md, or claws.json. Builds are fast (under 2 seconds). Repeated builds with unchanged sources produce byte-identical output -- deterministic serialization ensures no unnecessary file rewrites.

For continuous rebuilds, use `claws watch` instead. It auto-rebuilds on every file save.

## What to do next

- Run `claws check` anytime to check without rebuilding
- [Write a governance rule](write-governance-rule.md) to add custom policies
- [Set up three-ring security](three-ring-setup.md) for real-time governance feedback
