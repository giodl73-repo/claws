# LS — @bic/openclaw-lsp (primary spec)

**Status**: Alpha · **Upstream target**: none (internal)

## Package overview

LSP implementation for OpenClaw workspaces. Editors (VS Code,
JetBrains, Lobster, Aether) connect to the language server and get:

- **Diagnostics** — G-rule findings on save, displayed inline
- **Hover** — tool risk tier + `args_from` chain on hover
- **Code actions** — "add risk annotation", "fix args_from reference"
- **Governance badge** — per-skill ring level shown in status bar
- **Completions** — tool name + risk-tier completions in TOOLS.md

## Sub-spec index

| Code    | File                                                 | Authority over                                           |
| ------- | ---------------------------------------------------- | -------------------------------------------------------- |
| **LSP** | [LSP-protocol.md](./LSP-protocol.md)                 | LSP 3.17 compliance, capability set, initialize/shutdown |
| **LSB** | [LSB-governance-badge.md](./LSB-governance-badge.md) | Badge states, demotion conditions, editor UI wiring      |
| **LSE** | [LSE-error-contract.md](./LSE-error-contract.md)     | Error message shape (WHAT + HOW + WHERE), localization   |

## Stability

Alpha. The LSP surface is LSP 3.17-compliant and won't break
backward compat within Alpha. Badge state set is stable.
