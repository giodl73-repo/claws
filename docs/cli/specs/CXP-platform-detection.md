# CXP — Platform detection

**Sub-spec of**: [CX-cli.md](./CX-cli.md)

## The 7-platform matrix

`claws` supports 7 platforms explicitly. Platform detection runs at
CLI boot; commands that are platform-sensitive branch on the detected
platform.

| #   | Platform                        | Detection signal                                               |
| --- | ------------------------------- | -------------------------------------------------------------- |
| 1   | Claude Code (desktop)           | `process.env.CLAUDE_CODE === '1'`                              |
| 2   | Claude Code (web)               | `process.env.CLAUDE_CODE_WEB === '1'`                          |
| 3   | Claude Code (VS Code extension) | `process.env.TERM_PROGRAM === 'vscode'` + IDE extension marker |
| 4   | Claude Code (JetBrains)         | `process.env.TERM_PROGRAM === 'jetbrains-terminal'`            |
| 5   | Lobster editor                  | `process.env.LOBSTER_SESSION === '1'`                          |
| 6   | Aether gateway                  | `process.env.AETHER_BUILD_ID` is set                           |
| 7   | Standalone terminal (fallback)  | none of the above; default                                     |

Detection runs once at boot, result cached for the process lifetime.

## Platform-sensitive behaviour

| Behaviour             | Platform-dependent? | Why                                                                             |
| --------------------- | ------------------- | ------------------------------------------------------------------------------- |
| `--help` output width | Yes                 | Standalone terminal probes `$COLUMNS`; web clamps to 120; VS Code clamps to 100 |
| Colour / ANSI         | Yes                 | Web and Lobster disable ANSI; others follow TTY detection                       |
| File path display     | Yes                 | Web shows `oc://` only; others show absolute paths                              |
| Clipboard integration | Yes                 | Only Claude Code desktop supports clipboard writes                              |

## Platform override

Operators can override detection with `--platform=<name>`:

```bash
claws --platform=standalone doctor
```

Used for testing platform-specific output in CI.

## Unknown platforms

If detection hits a signal the CLI doesn't recognise (a future
platform, or a mis-set env var), `claws` treats it as standalone and
emits a single WARN at verbose mode. Never errors — unknown
platforms still get the baseline CLI.
