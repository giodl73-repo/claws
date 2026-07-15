# D3a: OpenClaw Substrate Owner Adoption

## Outcome

Add Substrate request/response preparation and typed hosted selections to the
model-provider owner.

## Repository And Dependencies

- Repository: `openclaw/openclaw`
- Depends on: D2a

## Change

- Register `lobster/substrate-llmapi` and its bearer slot shape.
- Keep model mapping and taxonomy/routing metadata in the model owner.
- Reuse the proven policy and dispatcher contracts.

## Proof And Exit

- Local and hosted owner fixtures agree.
- Missing token or adapter fails before dispatch.
- No CAPI-specific behavior leaks into shared contracts.
