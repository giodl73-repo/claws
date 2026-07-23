# Error Contract

The WHAT + HOW + WHERE error message format for all claws diagnostics.

## Overview

Every error, warning, and diagnostic emitted by claws follows the WHAT + HOW + WHERE contract. This three-part structure ensures that every message tells the user what went wrong, how to fix it, and where the problem is.

## Format

```
WHAT: Policy rule 'pii-access-gate' references undefined entity 'Patient'
HOW:  Declare entity 'Patient' in your workspace or remove the reference
WHERE: .claws/policies/data-protection.yaml:12
```

## Components

| Part  | Content                                   | Required                 |
| ----- | ----------------------------------------- | ------------------------ |
| WHAT  | Plain-language description of the problem | Always                   |
| HOW   | Actionable fix suggestion                 | Always (even if generic) |
| WHERE | File path and line number                 | When available           |

## Severity Levels

| Severity | Meaning                            | Pipeline Effect       |
| -------- | ---------------------------------- | --------------------- |
| error    | Must be fixed before proceeding    | Halts compilation     |
| warning  | Should be fixed but does not block | Logged to CGR         |
| info     | Informational, no action needed    | Logged only           |
| hint     | Suggestion for improvement         | Displayed, not logged |

## Diagnostic Codes

Every diagnostic has a unique code: `CLAWS-{category}-{number}`. For example:

- `CLAWS-POLICY-001` -- undefined entity reference in policy rule
- `CLAWS-CONFIG-002` -- deprecated configuration key
- `CLAWS-CHAIN-003` -- CGR hash chain integrity violation

## Related

- [claws-lsp](claws-lsp.md) -- real-time diagnostics in the editor
- [Error Messages](error-messages.md) -- detailed error message guide
- `design/claws/ATOMS.md` -- C44 `atom:error-contract`
