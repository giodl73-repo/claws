# D4a: OpenClaw WebIQ Owner Adoption

## Outcome

Add WebIQ request preparation and the typed `x-apikey` credential slot.

## Repository And Dependencies

- Repository: `openclaw/openclaw`
- Depends on: D2a

## Change

- Keep WebIQ URL, request, and response semantics with its owner.
- Declare the exact header and allowed origins.
- Reuse policy and dispatcher interfaces.

## Proof And Exit

- Local and hosted fixtures agree.
- Wrong-header and wrong-origin cases fail closed.
- Status identifies the WebIQ owner rather than a generic adapter.
