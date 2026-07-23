# How do I start?

<!-- atom:claws-init (C32) -->

You have an agent workspace. Someone told you to "set up governance." Here's how.

## Run `claws init`

```
$ claws init

  Detected: OpenClaw (SOUL.md found)
  Template: minimal (default)

  Governance setup:
  + Created claws.json                            governance config
  + Created .claws/                               policies, audit, cache, keys

  Runtime enforcement:
  + Installed governance SKILL    -> skills/claws-governance/SKILL.md    (L1 advisory)
  + Registered governance PLUGIN  -> plugins/claws-governance/           (L2+L3 enforcement)
  + Synced exec-approvals bridge  -> exec-approvals.json                 (L4 backup)

  Modified (with backups to ~/.claws-backups/):
    openclaw.json              registered governance plugin
    exec-approvals.json        synced allowlists
    .gitignore                 added .claws/ exclusions

  4 enforcement layers active. Run 'claws check' to validate.
```

16 files created, 3 existing files modified (with originals backed up to
`~/.claws-backups/<timestamp>/`). Your workspace source files -- SOUL.md,
AGENTS.md, TOOLS.md, and everything else -- are never touched.
Governance is add-only for source files.

## What got created

```
my-agent/
  SOUL.md                          <-- yours, untouched
  TOOLS.md                         <-- yours, untouched
  AGENTS.md                        <-- yours, untouched
  claws.json                       <-- NEW: governance config
  .claws/                          <-- NEW: policies, audit, cache, keys
    audit/chain.jsonl              <-- append-only audit log
    cache/                         <-- build cache (populated later)
  skills/claws-governance/SKILL.md <-- NEW: L1 advisory skill
  plugins/claws-governance/        <-- NEW: L2+L3 enforcement plugin
  exec-approvals.json              <-- MODIFIED: L4 host-level backup
  openclaw.json                    <-- MODIFIED: governance plugin registered
  .gitignore                       <-- MODIFIED: .claws/ exclusions added
```

## What's in claws.json

The `minimal` template creates the simplest valid config:

```json
{
  "version": 2,
  "enabled": true,
  "trustTier": 2
}
```

Three fields. That's a governed workspace. See the [claws.json guide](claws-json.md)
for all the options.

## `--template soc2` vs `--template minimal`

`claws init` defaults to minimal. If your org uses SOC 2:

```
$ claws init --template soc2

  Created:
    claws.json                            governance config
    .claws/policies/soc2-baseline.yaml    SOC 2 policy rules
    .claws/audit/chain.jsonl              audit log
    .claws/secrets/vault.enc              encrypted secrets vault
    .claws/compliance/                    compliance artifacts directory
```

You don't need to understand SOC 2 to use it -- the policies are pre-configured.
Other templates: `hipaa`, `eu-ai-act`.

## Platform auto-detection

You don't tell claws which platform you use. It reads your workspace:

| If it finds                     | It detects     |
| ------------------------------- | -------------- |
| SOUL.md                         | OpenClaw       |
| .cursorrules                    | Cursor         |
| CLAUDE.md                       | Claude Code    |
| .github/copilot-instructions.md | GitHub Copilot |
| langgraph.json                  | LangGraph      |
| crewai.yaml                     | CrewAI         |

Override with `"platform": "cursor"` in claws.json if needed.

## What to do next

```bash
claws build           # compile your agent with governance applied
claws check           # check your workspace against policy rules
```

`claws check` is the command you'll run most. See the
[check guide](check.md) for what its output means and how to fix violations.
