---
covers: [atom:GRG/composition-rule, atom:GRG/clock-injection]
---

# Pitfalls: provider composition

The composition rule (`deny > review > modify > allow`) exists because
naïve ordering produces silent security failures. This page enumerates
the failure modes and how the rule prevents them.

## P-01 · Silent `allow` override

**Scenario**: Provider A returns `review`. Provider B (later in the
chain) returns `allow`. Without the rule, the merger picks the latest
result → call proceeds without review.

**Consequence**: the entire governance boundary is bypassed. Every
security invariant depends on "our provider is in the chain, and no
other provider returns allow after us" — fragile.

**Fix**: `review > allow`. Once `review` enters the merger, no later
`allow` can downgrade it.

## P-02 · `modify` erasing `review`

**Scenario**: Provider A returns `review`. Provider B returns `modify`
to rewrite args. Without the rule, the merger might apply the `modify`
and proceed with the modified args, skipping the review.

**Consequence**: a review that would catch the rewritten args never
fires.

**Fix**: `review > modify`. A decision with both gets routed for
review, and the review descriptor carries the original args (not the
modification). The reviewer sees what would actually execute.

## P-03 · OC-7 envelope downgrade

**Scenario**: Provider A returns `review` with descriptor D1.
Provider B returns `review` with descriptor D2. Without OC-7, the
merger might emit just D2 and drop D1 → only D2 gets approved.

**Consequence**: D1's constraint silently bypassed.

**Fix**: OC-7 makes the merger conjunctive — companion receives
[D1, D2], both must be approved. No silent drop.

## P-04 · Clock-dependent composition

**Scenario**: Provider A returns `allow` at T=0. Provider B is slow
and returns `review` at T=1000ms. A process-level timeout reaps the
chain and only A's result is visible.

**Consequence**: timing-dependent governance — load spikes break
review.

**Fix**: the merger MUST wait for every provider in the registered
set. Timeout handling is per-provider, not per-chain. A slow provider
should be optimised or removed, not silently ignored.

## P-05 · R5 downgrade via composition

**Scenario**: Provider A says R5 + deny. Provider B says R3 + allow.
Without the severity ordering, a composition might "average" tiers.

**Consequence**: R5 tool running without approval.

**Fix**: tiers do NOT compose — they take the max. R5 is terminal.
See [../specs/GRR-runtime.md § R5 non-overridability](../specs/GRR-runtime.md).

## Testing composition

The harness at `test/e2e/scenarios/approval-flows/` runs multi-provider
compositions under every permutation of return values. Adding a new
provider? Write a composition scenario. Don't ship without it.
