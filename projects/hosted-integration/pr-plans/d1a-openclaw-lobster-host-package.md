# D1a: OpenClaw `lobster-host` Package

## Outcome

Package the OpenClaw-side contribution registrations required by the first
Lobster CAPI bundle snapshot.

## Repository And Dependencies

- Repository: `openclaw/openclaw`
- Depends on: B4, B5, B6a, B6b, and C2

## Change

- Register CAPI adapter, CAPI credential resolver contract, traffic policy,
  dispatcher, reverse carrier, and readiness criteria IDs.
- Declare compatible interface versions and ownership metadata.
- Add disabled-by-default package and configuration examples.
- Expose inventory and Doctor metadata before Lobster selects the package.

## Non-Goals

- No Lobster token, route, or deployment implementation.
- No automatic activation when the package is installed.

## Proof And Exit

- Package registration is atomic and inactive by default.
- Every declared contribution resolves through its semantic owner.
- Missing Lobster runtime support remains explicit and non-ready.
