# Configuration and Schema

Configure claws.json, set up progressive disclosure, and manage the CLI surface.

## Configure claws.json

claws.json uses a three-layer schema: workspace, user, and system. Create or edit the workspace-level config:

```json
{
  "version": 2,
  "enabled": true,
  "trustTier": 2,
  "platform": "openclaw",
  "governance": {
    "fail-mode": "closed",
    "bypass": false
  }
}
```

User-level config (`~/.claws/config.json`) overrides defaults. System-level config is read-only and ships with the claws package.

## Use Progressive Disclosure

claws organizes its 40 commands into three tiers of progressive disclosure (4 / 18 / 40):

| Tier          | Commands                                                 | Audience                  |
| ------------- | -------------------------------------------------------- | ------------------------- |
| Starter (4)   | `init`, `build`, `check`, `watch`                        | First-time users          |
| Standard (18) | + `snap`, `doctor`, `publish`, `scan`, `broadcast`, etc. | Regular users             |
| Full (40)     | + `assess`, `comply`, `forensic`, `key`, `token`, etc.   | Power users and operators |

Configure visible tier:

```json
{
  "disclosure": "standard"
}
```

Run `claws --help` to see commands at your configured tier. Run `claws --help --all` to see all 40 commands.

## Uninstall claws

Remove claws governance from a workspace:

```bash
claws uninstall
```

This removes `.claws/`, the governance plugin, and the governance skill. Original workspace files (SOUL.md, AGENTS.md, TOOLS.md) are never touched. Backup copies are available at `~/.claws-backups/`.

To uninstall globally:

```bash
npm uninstall -g @bic/claws-cli
```

## Next Steps

- [Security and Classification](security-classification.md) -- tool classification and OBO boundaries
- [Initialize a Workspace](initialize-workspace.md) -- first-time setup
