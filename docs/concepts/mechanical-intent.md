# Mechanical Intent

The compiler's explicit representation of what a governance configuration intends to accomplish.

## Overview

Mechanical intent bridges the gap between human-authored governance goals ("no agent should access PII without approval") and the machine-enforceable rules that implement those goals. During compilation, the claws compiler extracts the intent behind each policy rule and records it alongside the compiled enforcement artifact. This makes governance auditable -- you can trace from an enforcement action back to the original human intent.

## Intent Structure

```yaml
# Compiled alongside a policy rule
intent:
  goal: "Prevent unauthorized PII access"
  mechanism: "Gate tool calls to PII-classified entities behind T2+ approval"
  source: ".claws/policies/data-protection.yaml:12"
  classification_trigger: confidential
```

## Why It Matters

Without mechanical intent, a governance violation says "tool call blocked" but not *why*. With mechanical intent, the violation says "tool call blocked because this entity is classified as Confidential and the agent's permission tier is T1, which is below the required T2 threshold for PII access (data-protection policy, line 12)."

This is critical for:
- **Audit** -- regulators need to see the reasoning chain, not just the outcome
- **Debugging** -- developers need to understand which policy caused a block
- **Evolution** -- when policies change, the intent record shows what was originally intended

## Related

- [GovernanceIR](governance-ir.md) -- the compiled governance representation
- [Error Messages](error-messages.md) -- WHAT + HOW + WHERE contract
- `design/claws/ATOMS.md` -- C04 `atom:mechanical-intent`
