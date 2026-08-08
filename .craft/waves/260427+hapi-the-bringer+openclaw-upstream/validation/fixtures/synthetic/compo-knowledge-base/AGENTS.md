---
name: compo-knowledge-base
trust: composition
---

# compo-knowledge-base

Composition workspace bringing together 3 plugin(s):

- `plugins/notion/`
- `plugins/confluence/`
- `plugins/obsidian/`

Each plugin contributes its own AGENTS.md, TOOLS.md, manifest.json under
its subdirectory. The substrate train walks the whole tree.

## Boundaries

- Each plugin's tools live in its own namespace (`<plugin-name>/<tool>`).
- Cross-plugin tool calls go through the gateway, not direct.
