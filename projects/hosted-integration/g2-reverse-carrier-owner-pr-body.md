## Summary

- compose the bounded reverse-carrier frame, admission, operation, and connection-owner contracts into one OpenClaw change
- prepare one immutable, content-addressed owner authority from exact config, traffic-policy, host-bundle, audience, and peer-key generations
- expose the effective host-bundle generation through the public Plugin SDK so an external plugin can prove it is registering against the exact bundle snapshot
- fence unsupported URL schemes, expired peer proof, stale sessions, and mixed clock sources before work is claimed

This draft consolidates the earlier fork-only O11-O14 evidence over the host-bundle snapshot base. It does not add a core listener, Gateway role, token issuer, reconnect loop, provider runtime, activation path, Status surface, or Doctor surface. The WebSocket upgrade route remains plugin-owned and off unless an adopter explicitly prepares and supplies the binding.

Fork-only adopter proof: https://microsoft.ghe.com/giodl/lobster/pull/59

## Real behavior proof

Behavior or issue addressed:
An external host plugin can own one reverse-carrier WebSocket route while OpenClaw provides the reusable bounded session/operation contracts and an exact, generation-fenced owner authority.

Real environment tested:
Ubuntu 24.04 under WSL2, OpenClaw source checkout at `f810aa8c390`, Node 24.15.0, pnpm workspace build, and the Lobster external-plugin source harness using a real loopback HTTP server, `ws` upgrade, HMAC credential, and Ed25519 peer proof. The Lobster harness supplies test deployment authority; no production Lobster service or live fleet was activated.

Exact steps or command run after this patch:

1. Build all OpenClaw Plugin SDK artifacts and canonical declarations with `node scripts/tsdown-build.mjs`, `node scripts/runtime-postbuild.mjs`, the canonical DTS writer, and `node scripts/check-plugin-sdk-exports.mjs`.
2. Run the 75 focused reverse-carrier and host-bundle tests with Vitest.
3. Link the exact OpenClaw checkout into the Lobster plugin harness and run its five Node test files, including the real selected Gateway route test.

Evidence after fix:
The SDK build reported `OK: All 147 public plugin-sdk subpaths verified.` OpenClaw reported `64 passed` carrier tests plus `11 passed` host-bundle tests. The Lobster terminal transcript reported `tests 23`, `pass 23`, `fail 0`; its selected route accepted a G2-prepared peer through an actual HTTP upgrade, while the disabled branch did not read plugin authority.

Observed result after fix:
Exactly one plugin-owned route admitted the credential-bound peer, bound both frame directions to one session incarnation, and rejected stale or mismatched generation authority. Normal plugin startup remained inert.

What was not tested:
No production Lobster runtime peer, reconnect supervisor, fleet rollout, Status/Doctor projection, or live external service was started. Those remain later adopter and rollout work.

## Validation

- `pnpm plugin-sdk:api:check`
- `pnpm plugin-sdk:check-exports`
- full Plugin SDK build and canonical declaration generation
- 75 focused OpenClaw tests
- core type graph and type-aware Oxlint
- Lobster adopter proof: 23 plugin tests and 26 Rust tests
- `codex review --base fork/user/giodl/hosted-integration-host-bundle-snapshot-generation` (clean after three accepted fixes)
