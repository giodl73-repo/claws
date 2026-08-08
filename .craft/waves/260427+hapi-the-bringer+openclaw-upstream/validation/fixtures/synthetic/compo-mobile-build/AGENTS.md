---
name: compo-mobile-build
trust: composition
---

# compo-mobile-build

Composition workspace bringing together 3 plugin(s):

- `plugins/xcode-build/`
- `plugins/gradle-android/`
- `plugins/fastlane/`

Each plugin contributes its own AGENTS.md, TOOLS.md, manifest.json under
its subdirectory. The substrate train walks the whole tree.

## Boundaries

- Each plugin's tools live in its own namespace (`<plugin-name>/<tool>`).
- Cross-plugin tool calls go through the gateway, not direct.
