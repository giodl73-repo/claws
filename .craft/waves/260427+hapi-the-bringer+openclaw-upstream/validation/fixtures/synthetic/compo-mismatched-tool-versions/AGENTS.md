---
name: compo-mismatched-tool-versions
trust: composition
---

# compo-mismatched-tool-versions

Composition workspace bringing together 2 plugin(s):
- `plugins/svc-v1/`
- `plugins/svc-v2/`

Each plugin contributes its own AGENTS.md, TOOLS.md, manifest.json under
its subdirectory. The substrate train walks the whole tree.

## Boundaries

- Each plugin's tools live in its own namespace (`<plugin-name>/<tool>`).
- Cross-plugin tool calls go through the gateway, not direct.
