---
name: compo-camera-trio
trust: composition
---

# compo-camera-trio

Composition workspace bringing together 3 plugin(s):
- `plugins/screenshot/`
- `plugins/camsnap/`
- `plugins/video-frames/`

Each plugin contributes its own AGENTS.md, TOOLS.md, manifest.json under
its subdirectory. The substrate train walks the whole tree.

## Boundaries

- Each plugin's tools live in its own namespace (`<plugin-name>/<tool>`).
- Cross-plugin tool calls go through the gateway, not direct.
