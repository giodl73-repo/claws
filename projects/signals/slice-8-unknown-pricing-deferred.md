# Adoption PR 8 audit: unknown pricing semantics

## Candidate

- Evidence: [openclaw/openclaw#90674](https://github.com/openclaw/openclaw/issues/90674)
- Related merged fix:
  [openclaw/openclaw#85882](https://github.com/openclaw/openclaw/pull/85882)
  at `116c600f6011`
- Related closed attempt:
  [openclaw/openclaw#90825](https://github.com/openclaw/openclaw/pull/90825)
- Decision: defer to model-pricing and persisted-usage owners

## Current behavior

Provider transports call `calculateCost` with the resolved model's numeric
rates. An all-zero rate table therefore writes an all-zero `usage.cost` object
into the assistant message even when the turn consumed tokens.

The aggregate usage reader now treats token-burning all-zero or unavailable
pricing as missing cost rather than confident zero spend. It preserves a zero
only when the provider explicitly reports a billed total or the recorded
breakdown proves a non-default zero. Operators can also configure per-model
rates, and gateway health/status already reports pricing-cache refresh
degradation.

The remaining semantic loss is in the persisted per-turn `Usage.cost` contract.
Its only provenance value is `totalOrigin: "provider-billed"`. It cannot express
catalog estimate, unavailable pricing, or intentional free/local pricing.

## Why no fork PR

The smallest complete repair would extend a persisted and replayed contract
shared by `@openclaw/llm-core`, provider transports, session JSONL, embedded
history repair, worker protocol schemas, transcript commit, aggregate readers,
and downstream consumers. A warning-only attempt was already closed unmerged.

An all-zero model rate is not a safe unknown-pricing predicate: current source
uses zero rates for intentional free/local/proxy models and for models whose
price is unavailable. OpenClaw needs an owner-approved provenance/state
contract before code can distinguish them.

Issue #90674 is currently labeled `clawsweeper:no-new-fix-pr`,
`clawsweeper:needs-maintainer-review`, and
`clawsweeper:needs-product-decision`. Opening another Signals fork patch would
duplicate the rejected warning attempt or prematurely choose persisted
semantics.

## FACES evaluation

- Runtime owner: avoid per-call warnings or lookups in the provider hot path;
  cost provenance should be resolved once at the accounting owner.
- Operator: aggregate `missingCostEntries` prevents confident fleet-wide zero,
  but per-turn audit consumers still need explicit provenance.
- Simplicity reviewer: do not add a diagnostic-only status that disagrees with
  the persisted usage record or duplicate the aggregate reader's heuristic.
- Internal analogue: reuse the existing `totalOrigin` provenance seam if owners
  extend it; avoid parallel event fields.
- External comparison: OpenTelemetry GenAI conventions standardize authoritative
  token usage but no cost-status contract. OpenRouter exposes provider-reported
  cost, while LiteLLM relies on model-map/custom pricing. Neither supplies a
  safe universal inference for unknown versus intentionally free pricing.

## Owner decision required

Model-pricing and persisted-usage owners must choose:

1. provenance states for provider-billed, catalog-estimated, explicitly free,
   and unavailable cost;
2. whether unavailable cost omits numeric fields or retains compatibility
   zeros with an explicit state;
3. migration/replay behavior for existing JSONL and worker records; and
4. which status, diagnostic, and aggregate surfaces project that owner state.

No Adoption PR 8 branch or fork PR was created.
