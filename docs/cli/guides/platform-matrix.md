---
covers: [atom:CXP, atom:CXP/7-platforms]
---

# Platform matrix

Which platform runs which claws CLI version, and which behaviours
are platform-specific.

## Supported platforms (7)

Per [../specs/CXP-platform-detection.md](../specs/CXP-platform-detection.md)
the CLI detects and adapts to seven platforms:

1. **Claude Code (desktop)** — fullest support, clipboard available
2. **Claude Code (web)** — no ANSI, no clipboard, URI-form paths
3. **Claude Code (VS Code)** — 100-column clamp, terminal wrap
4. **Claude Code (JetBrains)** — 100-column clamp, terminal wrap
5. **Lobster editor** — no ANSI, editor-channel output
6. **Aether gateway** — CI-style output (minimal colour, structured logs)
7. **Standalone terminal** — follows `$COLUMNS`, `$TERM`, `isTTY()`

## What varies across platforms

| Feature         | Web | VSCode | Lobster | Standalone |
| --------------- | --- | ------ | ------- | ---------- |
| ANSI colour     | off | auto   | off     | auto       |
| Progress bars   | off | on     | off     | on         |
| Boxes / unicode | off | on     | off     | on         |
| Clipboard       | off | off    | off     | off        |
| Absolute paths  | off | on     | off     | on         |

Claude Code desktop is the one platform with clipboard support
(Electron APIs make it straightforward).

## Testing platform-specific output

Use `--platform=<name>` to force a specific detection result:

```bash
claws --platform=web doctor       # see how web-users see the output
claws --platform=standalone doctor  # baseline
```

This is how CI validates platform-specific rendering without
running 7 different containers.

## Adding an 8th platform

If you're wiring a new platform:

1. Add detection to `packages/claws/src/platform.ts`
2. Add a row to the matrix in this guide
3. Test with `--platform=<name>` that the output renders correctly
4. Land the detection + matrix row + a test in the same PR
