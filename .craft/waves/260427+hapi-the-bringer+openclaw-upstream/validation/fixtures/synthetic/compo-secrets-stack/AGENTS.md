---
name: compo-secrets-stack
trust: composition
---

# compo-secrets-stack

Composition workspace bringing together 2 plugin(s):

- `plugins/hashicorp-vault/`
- `plugins/1password/`

Each plugin contributes its own AGENTS.md, TOOLS.md, manifest.json under
its subdirectory. The substrate train walks the whole tree.

## Boundaries

- Each plugin's tools live in its own namespace (`<plugin-name>/<tool>`).
- Cross-plugin tool calls go through the gateway, not direct.
