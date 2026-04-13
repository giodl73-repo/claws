# @claws/sift

Typed expression engine for governance rule conditions -- a sibling to RELAX tuned for policy evaluation.

## Overview

`@claws/sift` is a typed expression language for writing governance rule conditions. It is a subset of RELAX (the platform's general-purpose expression language) specialized for governance evaluation. Sift expressions are compiled to efficient evaluators that run at governance gate time.

## Expression Examples

```
# Simple field check
entity.classification >= "confidential"

# Tool access gate
tool.type == "mcp" and tool.operations contains "write"

# Multi-condition
agent.permission_tier >= 2 and entity.has_pii == true

# Aggregation
count(skills where timeout == 0) == 0
```

## Relationship to RELAX

Sift is not a fork of RELAX -- it is a restricted subset. Sift supports:
- Comparison operators (`==`, `!=`, `>`, `>=`, `<`, `<=`)
- Logical operators (`and`, `or`, `not`)
- Set operators (`contains`, `in`)
- Aggregation (`count`, `any`, `all`)
- Field access (dotted paths)

Sift does not support: let bindings, function definitions, data source joins, or DataFrame operations. These are RELAX features that governance rules do not need.

## Type Safety

Sift expressions are type-checked at compile time against the GovernanceIR schema. An expression that references `entity.nonexistent_field` produces a `CLAWS-SIFT-001` diagnostic during `claws build`.

## Related

- [RELAX Language](../../compiler/relax/concepts/relax-language.md) -- the parent expression language
- [GovernanceIR](governance-ir.md) -- the schema sift evaluates against
- `design/claws/ATOMS.md` -- C53 `atom:claws-sift`
