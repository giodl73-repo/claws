# p04-trust-set-reload fixture — TOOLS

## tool: tiered.act

- declaredTier: R2
- capability: data.internal.write
- action: subject to trust-set

Single tool whose admission depends on the currently-loaded `trust-set.json`:
v1 allows R2, v2 revokes R2 (deny). The scenario drives two calls, one
against each revision, to prove the reload landed inside the 30s budget.
