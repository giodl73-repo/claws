# Lesson 1: Init and First Check

<!-- atoms: claws-init, check, claws-compiler -->

Set up governance for an OpenClaw agent workspace with `claws init`, then run your first compliance check.

## What You'll Learn

- How `claws init` scaffolds governance for an existing agent workspace
- What the four enforcement layers are and how they activate
- How `claws check` validates governance rules

## Prerequisites

- An OpenClaw agent workspace (a directory with `SOUL.md`)
- claws CLI installed (`npm i -g @claws/cli`)

## Step by Step

### 1. Initialize governance

Navigate to your agent workspace and run:

```bash
claws init
```

```
  Detected: OpenClaw (SOUL.md found)
  Template: minimal (default)

  Governance setup:
  + Created claws.json                            governance config
  + Created .claws/                               policies, audit, cache, keys

  Runtime enforcement:
  + Installed governance SKILL    → skills/claws-governance/SKILL.md    (L1 advisory)
  + Registered governance PLUGIN  → plugins/claws-governance/           (L2+L3 enforcement)
  + Synced exec-approvals bridge  → exec-approvals.json                 (L4 backup)

  Modified (with backups to ~/.claws-backups/):
    openclaw.json              registered governance plugin
    exec-approvals.json        synced allowlists
    .gitignore                 added .claws/ exclusions

  4 enforcement layers active. Run 'claws check' to validate.
```

claws creates 16 files and modifies 3 existing files. Every modified file is backed up to `~/.claws-backups/<timestamp>/` first. Your workspace source files -- SOUL.md, AGENTS.md, TOOLS.md -- are never touched. Governance is add-only for source files.

### 2. The four enforcement layers

claws installs four layers, each catching what the previous misses:

| Layer | Mechanism        | When it runs           | What it catches                  |
| ----- | ---------------- | ---------------------- | -------------------------------- |
| L1    | Governance skill | Agent asks for advice  | Soft guidance, best practices    |
| L2    | Plugin pre-hook  | Before tool execution  | Policy violations, tool blocking |
| L3    | Plugin post-hook | After tool execution   | Output validation, audit logging |
| L4    | exec-approvals   | When L2/L3 unavailable | Fallback allowlist enforcement   |

L1 is advisory -- the agent can ignore it. L2 and L3 are enforcement -- the plugin intercepts tool calls. L4 is the backup gate for environments where plugins aren't supported.

### 3. Run your first check

```bash
claws check
```

```
  G-CLASS      Tool risk classification          PASS
  G-ELICIT     OBO elicitation gates             PASS
  G-A2A-TRUST  Inter-agent trust boundaries      PASS
  G-INPUT      Input sanitization                PASS
  G-BUDGET     Token budget enforcement          PASS

  5 rules checked, 0 violations in 0.3s
```

Each line is one governance rule. The number of rules checked depends on your workspace -- not all 29 rules apply to every configuration. A workspace with no external tools skips the tool classification rules.

### 4. Trigger a violation

Add a tool without proper classification. Edit `TOOLS.md` to add:

```markdown
## external-api

- **URL**: https://api.example.com
- **Method**: POST
```

Run the check again:

```bash
claws check
```

```
  G-CLASS      Tool risk classification          FAIL  [HIGH]
      TOOLS.md:8 -- tool "external-api" has no risk classification
      Fix: add '- **Risk**: medium' (or low/high/critical) to the tool block
  G-ELICIT     OBO elicitation gates             PASS
  G-A2A-TRUST  Inter-agent trust boundaries      PASS
  G-INPUT      Input sanitization                PASS
  G-BUDGET     Token budget enforcement          PASS

  1 violation (1 high) in 0.3s
```

Every violation includes three pieces: **where** (file and line), **what** (the problem), and **how to fix it** (a concrete action).

### 5. The three-engine model

Under the hood, `claws check` runs three engines in sequence:

```
  Parse Engine → Governance Engine → Report Engine
```

1. **Parse Engine** reads the 9 workspace files (SOUL.md, AGENTS.md, TOOLS.md, etc.) and builds a GovernanceIR
2. **Governance Engine** evaluates rules against the GovernanceIR and produces findings
3. **Report Engine** formats findings for terminal output, JSON, or CI integration

The parse engine is the compiler part of claws. It reads workspace files the same way every time -- deterministic, no LLM involvement. The governance engine applies rules. The report engine formats output.

### 6. Fix and re-check

Add the risk classification to fix the violation:

```markdown
## external-api

- **URL**: https://api.example.com
- **Method**: POST
- **Risk**: medium
```

```bash
claws check
```

```
  G-CLASS      Tool risk classification          PASS
  ...
  5 rules checked, 0 violations in 0.3s
```

The development loop is: edit workspace files, run `claws check`, fix violations, repeat. Like running `npm test` for governance.

## What You Learned

- `claws init` scaffolds governance without modifying source files (add-only)
- Four enforcement layers provide defense in depth (L1 advisory through L4 backup)
- `claws check` evaluates governance rules with file-and-line error reporting
- The three-engine model (parse, governance, report) is deterministic -- no LLM
- The development loop mirrors `npm test`: edit, check, fix, repeat

## Next

[Lesson 2: Three Rings Security](02-three-rings-security.md) explains the concentric ring architecture that governs when and where checks run.
