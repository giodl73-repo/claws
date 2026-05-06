---
name: compo-conflicting-risk-same-name
trust: composition
---

# compo-conflicting-risk-same-name

Composition workspace bringing together 2 plugin(s):
- `plugins/safe-shell/`
- `plugins/unsafe-shell/`

Each plugin contributes its own AGENTS.md, TOOLS.md, manifest.json under
its subdirectory. The substrate train walks the whole tree.

## Boundaries

- Each plugin's tools live in its own namespace (`<plugin-name>/<tool>`).
- Cross-plugin tool calls go through the gateway, not direct.
