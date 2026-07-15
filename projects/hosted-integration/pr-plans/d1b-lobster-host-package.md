# D1b: Lobster `lobster-host` Implementation Package

## Outcome

Ship the Lobster implementation and deployment metadata matching D1a's
OpenClaw registration snapshot.

## Repository And Dependencies

- Repository: `bic/lobster`
- Depends on: C3 and merged D1a support

## Change

- Implement the declared CAPI token resolver, enterprise traffic policy, and
  egress dispatcher bindings.
- Publish bundle identity, version, generation, and carrier metadata.
- Add deployment configuration without making it authoritative by default.
- Define startup ordering, health, reconnect backoff, resource limits, and
  graceful shutdown.
- Add redacted startup and readiness evidence.

## Non-Goals

- No ProxyPipe compatibility removal.
- No authority cutover before the D2 proof.

## Proof And Exit

- OpenClaw resolves every declared ID from the matching snapshot.
- Version skew and partial deployment fail explicitly.
- Startup and resource budgets are recorded against the existing container.
- The package can connect and report non-authoritative readiness safely.
