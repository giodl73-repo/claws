# Init and Build Examples

Workspace initialization, compilation, and configuration.

## claws init Output

```bash
claws init
```

```
Detected platform: OpenClaw (SOUL.md found)

Created:
  claws.json                         Governance configuration
  .claws/                            Governance data directory
  .claws/audit/chain.jsonl           Append-only audit log
  .claws/policies/                   Custom policy rules
  skills/claws-governance/SKILL.md   L1 advisory skill
  plugins/claws-governance/          L2+L3 enforcement plugin

Modified:
  openclaw.json                      Plugin registered
  exec-approvals.json                Allowlists synced
  .gitignore                         .claws/ exclusions added

Backed up originals to ~/.claws-backups/20260412-143200/
```

## claws.json (Three-Layer Schema)

```json
{
  "version": 2,
  "enabled": true,
  "trustTier": 2,
  "platform": "openclaw",
  "governance": {
    "fail-mode": "closed"
  },
  "disclosure": "standard",
  "classifications": {
    "read-file": "R1",
    "write-file": "R2",
    "send-email": "R3",
    "execute-query": "R2",
    "delete-record": "R4"
  },
  "bypass": {
    "alert-on-use": true,
    "require-reason": true
  }
}
```

## claws build Output

```bash
claws build
```

```
Compiler: claws v1.0.0
  Input:   9 workspace files
  Parsed:  SOUL.md, AGENTS.md, TOOLS.md, WORKFLOWS.md, POLICIES.md
  Classified: 15 tools (3×R1, 5×R2, 4×R3, 2×R4, 1×R5)

  Emitted:
    skills/claws-governance/SKILL.md     L1 advisory (2,400 tokens)
    plugins/claws-governance/index.ts    L2+L3 enforcement (48 rules)
    exec-approvals.json                  L4 host backup (15 entries)

  Check (auto):
    15 policy checks passed in 0.3s

Build complete in 1.1s
```

## Progressive Disclosure Tiers

```bash
# Starter tier (4 commands)
claws --help
#   init    Initialize governance
#   build   Compile governance
#   check   Run checks
#   watch   Real-time monitoring

# Standard tier (18 commands)
claws --help --tier standard
#   + snap, doctor, publish, scan, broadcast, comply, assess, ...

# Full tier (40 commands)
claws --help --all
#   + forensic, key, token, fleet-*, audit-*, ...
```

## Uninstall

```bash
claws uninstall
```

```
Removed:
  .claws/                          Governance data
  skills/claws-governance/         L1 advisory
  plugins/claws-governance/        L2+L3 enforcement

Restored:
  openclaw.json                    Plugin entry removed
  exec-approvals.json              Allowlists restored

Original workspace files untouched.
```
