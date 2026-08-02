# Models, Providers, and Compute

## Architectural Goal

Select and invoke intelligence under explicit capability, credential, cost,
compatibility, and fallback contracts.

## Responsibilities

- Describe available models and provider capabilities.
- Select routes without conflating catalog, policy, and runtime availability.
- Bind candidate attempts to credentials and prepared runtime generations.
- Correlate actual provider calls, timing, usage, errors, and upstream identity.
- Support fallback while preserving per-candidate accounting and reason.

## Explicit Non-Ownership

- Providers do not own agent runs, session history, context sources, or cost
  policy.
- Model selection does not imply provider readiness or authorization.

## Conceptual Pieces

| Piece | Purpose | Owner expectation |
| ----- | ------- | ----------------- |
| Model definition | Inert capabilities and compatibility | Catalog owner |
| Route | Ordered candidate selection | Routing owner |
| Candidate attempt | One fallback candidate under fixed bindings | Distinct identity and usage |
| Model call | One actual provider request | Provider-native timing and result |
| Usage record | Tokens, cost basis, and limits | Reconciles call to run and candidate |
| Provider health | Bounded availability observation | Freshness and scope are explicit |

## Core Contracts

- The identity chain preserves run, candidate attempt, model call, and hashed
  upstream request.
- Failed and retried calls remain in usage accounting.
- Credential or runtime-generation changes fence stale attempts.
- Fallback reason and policy remain explainable.

## Quality Attributes

- Provider portability without lowest-common-denominator semantics.
- Cost observability and budget integration.
- Streaming, cancellation, and timeout correctness.
- Safe degradation when usage or upstream settlement is unavailable.

## Candidate Fit

| Need | Existing or adjacent candidate | Initial disposition | What must be proven |
| ---- | ------------------------------ | ------------------- | ------------------- |
| Provider routing | Current model/provider routing | Reuse/adapt | Candidate-attempt identity |
| Call telemetry | Diagnostic model-call events | Reuse/adapt | Durable, redacted evidence |
| Catalog | Current provider/model definitions | Adapt | Compatibility and owner attribution |
| Compute brokerage | External gateways | Assess | Preserve request identity and policy |
| Cost controls | Resource governance | Adapt | Reconciliation without a global budget owner |

## Cross-Lane Dependencies

- Depends on credentials, policy, context, protocols, and resources.
- Serves agent execution.
- Must not absorb agent retry policy or context ownership.
