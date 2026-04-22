# r4-args-from-restricted-runtime fixture — TOOLS

## tool: chain-summarize

- declaredTier: R4
- capability: READ
- args_from: (runtime-only; prior tool-chain output)
- action: review (effective R5 via runtime-provenance escalation)

R4 tool whose input provenance is knowable only at runtime. The emitted
provider inspects the call's `args.provenance` (or re-classifies the raw
bytes via `ctx.contentClassifier`) and escalates to R5 + RESTRICTED when
the observed provenance is RESTRICTED (SC-06 F-01).

`policy-ir.json` MUST NOT pre-declare `effectiveTier: 'R5'` — the
runtime escalation is the point (SC-06 F-02 distinguishes this from
SC-05 compile-axis).

Key constraints:
- Classifier MUST be invoked on raw bytes (Uint8Array), not metadata.
- Self-reported `provenance: 'PUBLIC'` on actually-RESTRICTED content
  MUST NOT downgrade the decision (authenticated-provenance invariant).
