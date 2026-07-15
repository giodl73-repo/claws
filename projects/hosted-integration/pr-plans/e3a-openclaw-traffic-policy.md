# E3a: OpenClaw Provider Traffic Policy

## Outcome

Add the owner contribution and compilation seam for host provider traffic
policy.

## Repository And Dependencies

- Repository: `openclaw/openclaw`
- Depends on: B1, B2, B5, B6a, and B6b

## Change

- Compile deny, narrowing, managed-private route, proxy, TLS, and route choice.
- Intersect host policy with OpenClaw semantic and network authority.
- Publish policy readiness and provenance once per effective generation.

## Proof And Exit

- Deny, narrowing, conflict, route, and no-weaker-fallback cases pass.
- Policy cannot widen the guard profile.
- No per-request remote policy callback is added.
