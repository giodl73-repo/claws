---
name: compo-test-stack
trust: composition
---

# compo-test-stack

Composition workspace bringing together 3 plugin(s):
- `plugins/playwright/`
- `plugins/vitest/`
- `plugins/storybook/`

Each plugin contributes its own AGENTS.md, TOOLS.md, manifest.json under
its subdirectory. The substrate train walks the whole tree.

## Boundaries

- Each plugin's tools live in its own namespace (`<plugin-name>/<tool>`).
- Cross-plugin tool calls go through the gateway, not direct.
