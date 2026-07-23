# claws-lsp

Language Server Protocol implementation for real-time governance feedback in IDEs.

## Overview

`claws-lsp` is a Language Server that provides governance diagnostics, completions, and hover information directly in the editor. It reads the workspace's governance configuration and compiled GovernanceIR to provide real-time feedback as users edit policy files, claws.json, and OC configuration.

## Capabilities

| Feature          | What It Does                                                          |
| ---------------- | --------------------------------------------------------------------- |
| Diagnostics      | Real-time policy validation errors and warnings                       |
| Completions      | Autocomplete for policy rule fields, atom references, severity levels |
| Hover            | Show mechanical intent and documentation for policy rules             |
| Go to definition | Jump from a rule reference to the authoritative spec                  |
| Code actions     | Quick fixes for common policy misconfigurations                       |

## Latency Budget

The LSP operates under a 200ms response budget for interactive operations (completions, hover). Diagnostics may take longer but are computed in the background and delivered asynchronously. The 200ms budget ensures the editor feels responsive even for large governance configurations.

## Architecture

```
  Editor (VS Code, JetBrains, etc.)
       │
       │ LSP protocol (JSON-RPC)
       ▼
  claws-lsp server
       │
       ├── GovernanceIR cache (recomputed on file change)
       ├── Diagnostic engine
       └── Completion provider
```

The LSP server maintains a cached GovernanceIR that is incrementally updated when governance files change. Full recompilation is avoided by only re-running affected passes.

## Related

- [Error Messages](error-messages.md) -- WHAT + HOW + WHERE error contract
- [claws doctor](claws-doctor.md) -- CLI-based diagnostics
- `design/claws/ATOMS.md` -- C43 `atom:claws-lsp`
