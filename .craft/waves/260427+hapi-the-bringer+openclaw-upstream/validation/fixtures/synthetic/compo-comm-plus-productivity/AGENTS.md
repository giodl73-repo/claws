---
name: compo-comm-plus-productivity
trust: composition
---

# compo-comm-plus-productivity

Composition workspace bringing together 2 plugin(s):
- `plugins/slack/`
- `plugins/notion/`

Each plugin contributes its own AGENTS.md, TOOLS.md, manifest.json under
its subdirectory. The substrate train walks the whole tree.

## Boundaries

- Each plugin's tools live in its own namespace (`<plugin-name>/<tool>`).
- Cross-plugin tool calls go through the gateway, not direct.
