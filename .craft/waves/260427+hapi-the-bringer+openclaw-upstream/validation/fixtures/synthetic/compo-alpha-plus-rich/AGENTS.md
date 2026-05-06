---
name: compo-alpha-plus-rich
trust: composition
---

# compo-alpha-plus-rich

Composition workspace bringing together 2 plugin(s):
- `plugins/old-stable/`
- `plugins/new-alpha/`

Each plugin contributes its own AGENTS.md, TOOLS.md, manifest.json under
its subdirectory. The substrate train walks the whole tree.

## Boundaries

- Each plugin's tools live in its own namespace (`<plugin-name>/<tool>`).
- Cross-plugin tool calls go through the gateway, not direct.
