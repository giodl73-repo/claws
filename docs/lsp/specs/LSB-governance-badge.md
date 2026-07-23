# LSB — Governance badge

**Sub-spec of**: [LS-lsp.md](./LS-lsp.md)

## Badge states

| State      | Color  | Meaning                                           |
| ---------- | ------ | ------------------------------------------------- |
| **GRAY**   | grey   | Ring 1 (DECLARED) — minimal adoption              |
| **BLUE**   | blue   | Ring 2 (TYPED) — arg schemas present              |
| **GREEN**  | green  | Ring 3 (VERIFIED) — scenarios + coverage          |
| **YELLOW** | yellow | Incomplete — some tools at lower ring than others |
| **RED**    | red    | Broken — compile fails or validation blocks       |

The badge is per-SKILL (one badge per skill in the workspace), not
per-workspace.

## Detection

The badge state is computed by the LSP server on every workspace
compile:

1. Load each skill's manifest.json
2. For each tool the skill declares, compute the ring (DECLARED /
   TYPED / VERIFIED) based on presence of argsSchema + scenarios
3. Aggregate:
   - All tools at ring 3 → GREEN
   - All tools at ring 2+ but at least one at ring 2 → BLUE
   - Mix of rings → YELLOW
   - All at ring 1 → GRAY
   - Compile error or validation BLOCK → RED

## Demotion conditions

A skill can demote from a higher ring to a lower ring when:

- Ring 3 → Ring 2 (green → blue): a scenario file is deleted
  without removing the tool
- Ring 3 → Ring 2 (green → blue): coverage drops below 95/90/95/95
- Ring 2 → Ring 1 (blue → gray): argsSchema is removed from a
  defineTool call
- Ring 3/2 → Red: a previously-compiling skill now fails to compile

Demotion is VISIBLE — the badge changes color in the editor status
bar immediately. Users see when their skill regresses.

See [../pitfalls/badge.md](../pitfalls/badge.md) for the demotion
traps that surprise authors.

## UI wiring

Editors subscribe to the badge state via a custom LSP
notification: `openclaw/badgeStateChanged` with payload:

```json
{ "skillId": "my-skill", "state": "GREEN", "reason": "all tools at ring 3" }
```

Editors render this in their status bar. VS Code shows an icon +
tooltip; Lobster shows an inline annotation; JetBrains uses its
status-widget API.

## Fleet policy integration

Fleet admins can gate skills by ring:

```json
{
  "skillPolicy": {
    "minRing": "VERIFIED"
  }
}
```

Workspaces bound to this fleet refuse to load skills below Ring 3.
Badge state RED + "fleet policy rejects" message.
