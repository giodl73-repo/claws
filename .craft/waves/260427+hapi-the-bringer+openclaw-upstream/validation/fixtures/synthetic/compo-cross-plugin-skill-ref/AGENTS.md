---
name: compo-cross-plugin-skill-ref
trust: composition
---

# compo-cross-plugin-skill-ref

Composition workspace bringing together 2 plugin(s):
- `plugins/provider/`
- `plugins/consumer/`

Each plugin contributes its own AGENTS.md, TOOLS.md, manifest.json under
its subdirectory. The substrate train walks the whole tree.

## Boundaries

- Each plugin's tools live in its own namespace (`<plugin-name>/<tool>`).
- Cross-plugin tool calls go through the gateway, not direct.
