## Summary

- compose the bounded reverse-carrier frame, admission, operation, and connection-owner contracts into one OpenClaw change
- prepare one immutable, content-addressed owner authority from exact config, traffic-policy, host-bundle, audience, and peer-key generations
- expose the effective host-bundle generation through the public Plugin SDK so an external plugin can prove it is registering against the exact bundle snapshot
- fence unsupported URL schemes, expired peer proof, stale sessions, and mixed clock sources before work is claimed
- validate credit, sequencing, half-close, cancellation, and terminal certainty
  inside the bounded operation registry so invalid terminal frames cannot
  release ownership

This draft consolidates the earlier fork-only O11-O14 evidence over the host-bundle snapshot base. It does not add a core listener, Gateway role, token issuer, reconnect loop, provider runtime, activation path, Status surface, or Doctor surface. The WebSocket upgrade route remains plugin-owned and off unless an adopter explicitly prepares and supplies the binding.

Fork-only adopter proof: https://microsoft.ghe.com/giodl/lobster/pull/59

## Owner confirmation required

This adds one public Plugin SDK subpath and relies on the O4
`hostIntegrationBundle` manifest boundary. Before merge, @steipete should
confirm that the permanent contract should remain:

- a narrow reverse-provider dispatch seam rather than a generic host bus;
- plugin-owned for authentication, accepted sockets, send scheduling, and
  reconnect lifecycle; and
- loader-owned for the effective host-bundle generation.

## Real behavior proof

Behavior or issue addressed:
An external host plugin can own one reverse-carrier WebSocket route while OpenClaw provides the reusable bounded session/operation contracts and an exact, generation-fenced owner authority.

Real environment tested:
Ubuntu 24.04 under WSL2, OpenClaw source checkout at `519e1c57819`, Node 24.15.0, pnpm workspace build, and the Lobster external-plugin source harness using a real loopback HTTP server, `ws` upgrade, HMAC credential, and Ed25519 peer proof. The Lobster harness supplies test deployment authority; no production Lobster service or live fleet was activated.

Exact steps or command run after this patch:

1. Build all OpenClaw Plugin SDK artifacts and canonical declarations with `node scripts/tsdown-build.mjs`, `node scripts/runtime-postbuild.mjs`, the canonical DTS writer, and `node scripts/check-plugin-sdk-exports.mjs`.
2. Run the 76 focused reverse-carrier and host-bundle tests with Vitest,
   including premature-terminal and out-of-order response regressions.
3. Link the exact OpenClaw checkout into the Lobster plugin harness and run its five Node test files, including the real selected Gateway route test.

Evidence after fix:
The SDK build reported `OK: All 147 public plugin-sdk subpaths verified.`
OpenClaw reported 65 carrier tests plus 11 host-bundle tests. The final focused
rerun covered 36 frame/operation tests. The Lobster terminal transcript
reported `tests 23`, `pass 23`, `fail 0`; its selected route accepted a
G2-prepared peer through an actual HTTP upgrade, while the disabled branch did
not read plugin authority.

Observed result after fix:
Exactly one plugin-owned route admitted the credential-bound peer, bound both
frame directions to one session incarnation, and rejected stale or mismatched
generation authority. Structurally valid but premature terminal and
out-of-order response frames now fail without releasing operation ownership.
Normal plugin startup remained inert.

What was not tested:
No production Lobster runtime peer, reconnect supervisor, fleet rollout, Status/Doctor projection, or live external service was started. Those remain later adopter and rollout work.

## Validation

- `pnpm plugin-sdk:api:check`
- `pnpm plugin-sdk:check-exports`
- full Plugin SDK build and canonical declaration generation
- 76 focused OpenClaw tests
- core type graph and type-aware Oxlint
- all 175 workspace test declaration projects
- Lobster adopter proof: 23 plugin tests and 26 Rust tests
- `codex review --base fork/user/giodl/o4-manifest-first-host-bundles-upstream`
  found the missing protocol-state enforcement; the accepted fix was followed
  by `codex review --uncommitted`, which reported no actionable finding
