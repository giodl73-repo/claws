# Lobster Reverse-Carrier Deployment Composition Review

Date: 2026-07-28

## Frame

Lobster fork PR 55 owns the accepted WebSocket and O14 connection lifecycle,
and PR 56 owns deployment-issued credentials and atomic peer authorization.
The remaining bounded question is whether those lazy factories can be composed
without making the reverse carrier part of default container startup.

The smallest falsifiable thesis is an explicit discriminated selector:
`{ selected: false }` performs no authority construction or route registration,
while `{ selected: true, credentialKey, authority }` composes exactly the PR 56
authority with the PR 55 route. The plugin receives only a domain-separated
credential key, never the broader deployment secret. The downstream deletion
target remains ProxyPipe provider egress after a later deployment owner selects,
operates, and proves this carrier.

The thesis is disproved if importing the normal plugin entry starts the route,
if the disabled branch reads key material, or if composition introduces a new
listener, service, registry, or activation owner.

## Audit

- The ordinary `lobster-host` plugin entry remains the inactive contribution
  manifest and does not import the reverse-carrier WebSocket, crypto, or
  deployment-composition implementation.
- PR 55 already exposes the lazy route factory and owns socket/session cleanup.
- PR 56 already exposes the lazy deployment-authority factory and owns exact
  credential and generation verification.
- Existing Rust lifecycle code already composes issuer and peer behavior; a
  second Rust activation wrapper would duplicate that ownership.
- No current startup configuration is an appropriate implicit activation
  signal. Selection therefore remains an explicit caller-owned operation.

## Compare

### Internal analogues

- **Reuse:** the existing lazy plugin subpath pattern, PR 55 route factory, and
  PR 56 atomic authority factory.
- **Adapt:** expose one discriminated selection object whose disabled branch
  cannot carry credential material.
- **Avoid:** environment-variable activation, a default port, a second lifecycle
  coordinator, or passing the deployment-wide secret into plugin code.

### External comparators

The security shape remains the one established by PR 56: RFC 7800-style
credential key binding and RFC 9449-style proof of possession, without adopting
an OAuth transport or a new workload-identity control plane. This composition
slice adds no new protocol semantics.

## Evaluate

- **Lobster container owner:** importing the default plugin entry remains inert;
  the slice adds no listener, sidecar, port, startup ordering, readiness, or
  health dependency.
- **Platform owner:** activation and rollback stay with a future deployment
  owner. The selected branch accepts a pre-derived credential-only key and an
  immutable authority snapshot; it does not resolve secrets or configuration.
- **Lorant reviewer:** the union makes disabled and selected states explicit;
  branch tests prove zero disabled-side effects, selected composition, and
  failure before route registration for an invalid key.
- **Security reviewer:** a deterministic test-only Rust fixture proves that the
  selected JavaScript authority admits the exact Rust-issued credential over an
  actual WebSocket. No real credential or production secret is stored.

## Slice

Branch: `user/giodl/lobster-reverse-carrier-deployment-composition`, stacked on
Lobster fork PR 56.

The slice adds:

1. a lazy `./deployment` package export;
2. an off-by-default composition core with explicit selected and disabled
   branches;
3. a production adapter joining the existing authority and route factories;
4. a paired Rust-issued credential fixture and live WebSocket admission proof;
   and
5. build, Docker artifact, generated-file, and startup-inertness checks.

It does not add runtime configuration, read environment variables, activate a
bundle, expose a new port, start a peer, change readiness, queue ADO, or delete
ProxyPipe. A later deployment-owned slice must choose how to project the
credential-only key and explicitly select this composition before any live
rollout.
