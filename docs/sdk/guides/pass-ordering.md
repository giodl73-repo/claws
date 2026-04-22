---
covers: [atom:SKC]
---

# Compiler pass ordering

The compiler runs in three ordered passes. Understanding the order
matters when debugging G-rule findings or when writing a new G-rule.

## Pass 1 · Parse

**Input**: `WorkspaceAST` from `@bic/openclaw-workspace/parse`.

**Output**: Unclassified `ToolEntry` map per TOOLS.md declarations.

**G-rules run**: G-01 through G-05 (declaration-shape rules).

Errors at this pass BLOCK the compile (you can't proceed past a
missing required file, a parse error, etc.).

## Pass 2 · Classify

**Input**: Unclassified `ToolEntry` map.

**Output**: `ToolEntry` map with `effectiveTier` computed per tool.

**G-rules run**: G-06 through G-20 (classification + G-CHAIN family).

This pass walks `args_from` chains, propagates tier via G-CHAIN,
and computes effective tier = `max(declared, ...propagated)`. Cycle
detection happens here (G-07). Unknown `args_from` references
(G-05) block this pass.

## Pass 3 · Emit

**Input**: Classified `ToolEntry` map.

**Output**: `GovernanceIR` with canonical bytes + findings.

**G-rules run**: G-21 through G-29 (sensitivity propagation +
clamping + governance shape).

This pass computes sensitivity labels, applies RESTRICTED clamping,
runs the final policy-shape checks (R5 fail-closed, etc.), and
emits the canonical byte representation.

## When you add a new G-rule

1. Decide which pass it belongs to (parse / classify / emit)
2. Add to the registry at the correct slot — rules are ordered by
   code (G-01 first, G-29 last)
3. Implement the rule as `(context) => Finding | null`
4. Add a test that exercises the rule's BLOCK path + WARN path
5. Update the [../pitfalls/cache.md](../pitfalls/cache.md) list if
   your rule interacts with caching

## Why 3 passes (not 1)

- **Separability**: each pass has a well-defined input contract.
  Reordering within a pass is safe; cross-pass dependencies are
  explicit.
- **Testability**: per-pass tests exercise just that pass's rules
  in isolation.
- **Debuggability**: when a rule fires, you know which pass it came
  from without reading the rule's code.

## Not a DAG

The 3-pass pipeline is strictly linear. Future extensions might add
a 4th pass (for example, a post-emit "verify" pass that compares
against a baseline IR). Adding a pass is a semver-minor change —
existing rules stay where they are.
