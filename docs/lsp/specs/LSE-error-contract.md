# LSE — Error contract

**Sub-spec of**: [LS-lsp.md](./LS-lsp.md)

## WHAT + HOW + WHERE

Every LSP diagnostic from the claws server follows a three-part
structure in its message:

```
WHAT failed
  HOW to fix
  WHERE to look for authoritative detail
```

### WHAT

A one-sentence statement of the problem in the user's terms. NOT
the G-rule code alone — explain what the rule means.

❌ "G-24 violated"
✓ "R5 tool 'send-email' has fail-mode 'open'; R5 tools must be fail-closed"

### HOW

Concrete fix the user can apply. Where possible, offer a code-action
the LSP can execute.

❌ "fix fail-mode"
✓ "Change the `<!-- fail-mode:open -->` annotation to `<!-- fail-mode:closed -->` on line 42"

### WHERE

A link to the authoritative spec so users can read more:

```
See: guardrails/specs/GRR-runtime.md § R5 non-overridability
```

## Example diagnostic

```json
{
  "severity": 1,
  "code": "G-24",
  "source": "claws-lsp",
  "message": "R5 tool 'send-email' has fail-mode 'open'; R5 tools must be fail-closed.\n\nFix: Change `<!-- fail-mode:open -->` to `<!-- fail-mode:closed -->` on line 42.\n\nSee: guardrails/specs/GRR-runtime.md § R5 non-overridability",
  "range": { "start": { "line": 41, "character": 0 }, "end": { "line": 42, "character": 30 } }
}
```

Editors display this as a multi-line annotation. The message is
TERSE — no marketing copy, no pleasantries.

## Localization

Error messages are keyed by code (G-NN). Translations live in
`packages/openclaw-lsp/src/messages/{locale}.json`. Default
locale is `en`. Other locales are added via PRs; fall back to `en`
when a locale's translation is missing.

## Code actions

Many diagnostics have an associated code action (quickfix). The
LSP publishes code actions alongside diagnostics so editors can
offer one-click fixes:

- G-03 "missing risk annotation" → quickfix: "Add `<!-- risk:R1 -->`"
- G-24 "R5 fail-mode open" → quickfix: "Change to `<!-- fail-mode:closed -->`"
- G-05 "unknown args_from reference" → no quickfix (user must
  decide which tool they meant)

Code actions follow `CodeActionKind.QuickFix`. Refactor actions
(reshape TOOLS.md) use `CodeActionKind.Refactor`.

## Never silent

The LSP NEVER silently drops a finding. Every G-rule that fires
produces a diagnostic; every diagnostic reaches the editor.

Rationale: silence is the worst failure mode — author thinks their
code is fine when it isn't.
