# pinch

Governance budget optimization -- a generalization of PRESS for governance-specific context compression.

## Overview

`pinch` is a budget optimizer for governance context. When governance rules, policies, and capability manifests are assembled into an agent's context, they compete for tokens with the task's own context. pinch compresses governance context to minimize token consumption while preserving enforcement fidelity.

pinch is a generalization of the PRESS context-pressure system used in the craft compiler. Where PRESS optimizes general workspace context, pinch is tuned specifically for governance artifacts -- it understands policy rule structure and can compress more aggressively because it knows which rule fields are enforcement-critical and which are documentary.

## Compression Strategy

| Field Type          | Compression        | Reason                  |
| ------------------- | ------------------ | ----------------------- |
| Rule conditions     | Preserved verbatim | Enforcement-critical    |
| Severity levels     | Preserved verbatim | Enforcement-critical    |
| Mechanical intent   | Summarized         | Documentary             |
| Policy descriptions | Dropped            | Not needed at runtime   |
| Audit metadata      | Dropped            | Available via CGR chain |

## Token Savings

Typical governance context for a workspace with 20 policy rules:

- **Uncompressed**: ~4000 tokens
- **After pinch**: ~1200 tokens (70% reduction)

The savings come primarily from dropping documentary fields and summarizing mechanical intent.

## Related

- [Budget Enforcement](../../craft/concepts/budget-enforcement.md) -- token budget management
- [GovernanceIR](governance-ir.md) -- the governance IR that pinch compresses
- `design/claws/ATOMS.md` -- C52 `atom:pinch`
