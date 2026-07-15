# D2a: OpenClaw CAPI Hosted Binding

## Outcome

Wire the CAPI model owner to the registered adapter, credential slot, traffic
policy, and dispatcher selections without activating Lobster.

## Repository And Dependencies

- Repository: `openclaw/openclaw`
- Depends on: B4, B6a, B6b, C2, D1a, and E3a

## Change

- Resolve the four typed CAPI references from one bundle snapshot.
- Prepare one immutable binding per effective config generation.
- Add local and hosted CAPI conformance fixtures.
- Keep ordinary single-file configuration as the baseline path.
- Add optional Managed Configuration integration proof without making it a
  portable-interface dependency.

## Proof And Exit

- Missing or incompatible references are non-ready with no direct fallback.
- Request/stream semantics match local CAPI behavior.
- Config, bundle, and owner generations are independently fenced.
