---
name: compo-search-stack
trust: composition
---

# compo-search-stack

Composition workspace bringing together 3 plugin(s):

- `plugins/google-search/`
- `plugins/brave-search/`
- `plugins/semantic-search/`

Each plugin contributes its own AGENTS.md, TOOLS.md, manifest.json under
its subdirectory. The substrate train walks the whole tree.

## Boundaries

- Each plugin's tools live in its own namespace (`<plugin-name>/<tool>`).
- Cross-plugin tool calls go through the gateway, not direct.
