---
name: compo-three-plugin-workspace
trust: composition
---

# compo-three-plugin-workspace

Composition workspace bringing together 3 plugin(s):
- `plugins/github/`
- `plugins/linear/`
- `plugins/slack/`

Each plugin contributes its own AGENTS.md, TOOLS.md, manifest.json under
its subdirectory. The substrate train walks the whole tree.

## Boundaries

- Each plugin's tools live in its own namespace (`<plugin-name>/<tool>`).
- Cross-plugin tool calls go through the gateway, not direct.
