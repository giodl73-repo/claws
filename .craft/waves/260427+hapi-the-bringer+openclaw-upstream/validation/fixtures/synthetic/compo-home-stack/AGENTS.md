---
name: compo-home-stack
trust: composition
---

# compo-home-stack

Composition workspace bringing together 2 plugin(s):
- `plugins/openhue/`
- `plugins/homekit/`

Each plugin contributes its own AGENTS.md, TOOLS.md, manifest.json under
its subdirectory. The substrate train walks the whole tree.

## Boundaries

- Each plugin's tools live in its own namespace (`<plugin-name>/<tool>`).
- Cross-plugin tool calls go through the gateway, not direct.
