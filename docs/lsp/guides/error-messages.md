---
covers: [atom:LSE, atom:LSE/what-how-where]
---

# Writing good error messages

Every diagnostic the LSP emits follows the WHAT + HOW + WHERE
structure. This guide shows the template and common failure modes.

## Template

```
{WHAT failed in user terms}

Fix: {concrete action, with line numbers when possible}

See: {authoritative spec reference}
```

## Example: G-24 (R5 fail-open)

```
R5 tool 'send-email' has fail-mode 'open'; R5 tools must be fail-closed.

Fix: Change `<!-- fail-mode:open -->` to `<!-- fail-mode:closed -->` on line 42.

See: guardrails/specs/GRR-runtime.md § R5 non-overridability
```

## Example: G-03 (missing risk annotation)

```
Tool 'summarize' has no risk annotation. Every tool must declare a risk tier.

Fix: Add `<!-- risk:R1 -->` (or the correct tier) below the tool heading on line 12.

See: security/specs/SM-security.md § Risk tiers
```

## Example: G-07 (circular args_from)

```
Tool 'A' has circular 'args_from' chain: A → B → C → A. Chains cannot reference themselves.

Fix: Break the cycle by removing one reference. The 'A → B' edge is the most likely culprit.

See: sdk/specs/SKC-compiler-internals.md § 29 G-rule registry (G-07)
```

## What makes a bad message

### Too terse

❌ "G-24 violated"

Fails because it's just a code, not an explanation. Users have to
look up what G-24 means. Fix by including the meaning in the
WHAT.

### Jargon-heavy

❌ "IR emission failed due to sensitivity propagation conflict in pass 3"

Fails because the user doesn't care about passes. Translate to
user terms.

### Missing action

❌ "Tool has unknown risk annotation 'R6'. Valid tiers are R1-R5."

Missing HOW. Fix: "Change 'R6' to one of R1-R5 based on the tool's
action class. Use R5 for irreversible external writes."

### No reference

❌ "Fail mode is incorrect for R5 tools."

Missing WHERE. Users can't read more. Always link a spec.

## Writing code actions

If the fix is mechanical (find+replace, insert+line), write a code
action. Code actions appear as one-click fixes in the editor.

```ts
// packages/openclaw-lsp/src/actions/g-24-fix.ts
export function fixG24(doc: TextDocument, finding: Finding): CodeAction {
  return {
    title: "Change fail-mode to closed",
    kind: CodeActionKind.QuickFix,
    edit: { changes: { [doc.uri]: [{ range, newText: "<!-- fail-mode:closed -->" }] } },
  };
}
```

Users click the quickfix; the edit applies. No need to remember
the exact syntax.

## Cross-references

- [../specs/LSE-error-contract.md](../specs/LSE-error-contract.md) —
  formal contract
- [../specs/LSP-protocol.md](../specs/LSP-protocol.md) — where
  diagnostics flow in the protocol
