# LSP — Protocol

**Sub-spec of**: [LS-lsp.md](./LS-lsp.md)

## LSP 3.17 compliance

The server speaks LSP 3.17. Supported request types:

| Request | Purpose |
|---------|---------|
| `initialize` / `shutdown` | Lifecycle |
| `textDocument/didOpen`, `didChange`, `didSave`, `didClose` | Document sync |
| `textDocument/publishDiagnostics` | G-rule findings |
| `textDocument/hover` | Tool + atom info on hover |
| `textDocument/codeAction` | Quick fixes |
| `textDocument/completion` | Risk tier + tool name completions |
| `workspace/didChangeConfiguration` | Pick up claws.json changes |
| `workspace/executeCommand` | `claws.runDoctor`, `claws.validatePolicy` |

## Capability set

```json
{
  "textDocumentSync": { "openClose": true, "change": 2 },
  "hoverProvider": true,
  "codeActionProvider": { "codeActionKinds": ["quickfix", "refactor"] },
  "completionProvider": { "triggerCharacters": [":"] },
  "executeCommandProvider": { "commands": ["claws.runDoctor", "claws.validatePolicy"] }
}
```

## Initialize handshake

On `initialize`, the server:

1. Reads `claws.json` from the workspace root
2. Resolves fleet inheritance
3. Compiles the current workspace to `GovernanceIR` (or loads from cache)
4. Returns capabilities + `serverInfo: { name: 'openclaw-lsp', version: '0.1.0' }`

## Diagnostics batching

Diagnostics publish on save (not on every keystroke). Rationale:
G-rule compilation is fast but not free; saving is a natural beat.
Editors that want live diagnostics can send an explicit
`workspace/executeCommand` with `claws.runDoctor`.

## Graceful degradation

If the server fails to compile (parse error, missing required
file), it publishes diagnostics for the parse error and continues.
It does NOT go silent. Partial diagnostics > no diagnostics.

## Shutdown

On `shutdown`, the server:

1. Flushes any pending diagnostics
2. Writes cache to disk
3. Sends the LSP shutdown response
4. Exits on `exit` notification
