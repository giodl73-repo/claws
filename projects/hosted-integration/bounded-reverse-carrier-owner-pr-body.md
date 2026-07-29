## What Problem This Solves

An external plugin can own an authenticated WebSocket upgrade route, but
OpenClaw does not provide one reusable contract that binds the accepted
connection to immutable provider authority and bounded in-flight operations.

Without that seam, each plugin must reimplement frame bounds, credit and
sequence validation, session incarnations, generation fencing, operation
limits, terminal certainty, and stale-result handling. Moving those mechanics
into a generic Gateway host-provider endpoint would instead make Gateway core
own transport authentication, sockets, and reconnect lifecycle that belong to
the plugin and its deployment owner.

Closes #TBD.

## Why This Change Was Made

This change adds one narrow Plugin SDK subpath for a plugin-owned
reverse-provider connection:

- a closed `reverse-provider-dispatch/v1` frame contract and
  language-neutral fixtures;
- caller-verified admission bound to binding, interface, carrier, owner,
  effective host-bundle, audience, peer key, and proof expiry;
- unique process-local connection incarnations;
- a 64-operation process cap with constant-memory validation of credit,
  sequencing, half-close, cancellation, and terminal certainty;
- an opaque owner generation derived from effective config, traffic-policy
  generation, effective bundle generation, audience, and peer-key fingerprint;
  and
- one loader-owned effective host-bundle generation used only as an equality
  fence.

The plugin still owns authentication, the upgrade route, accepted socket, send
serialization, disconnect cleanup, and reconnect lifecycle. OpenClaw adds no
listener, Gateway role, token issuer, socket manager, provider implementation,
activation path, Status surface, or Doctor surface.

## Owner Confirmation Required

This is a new public Plugin SDK contract and relies on the O4
`hostIntegrationBundle` manifest boundary. Before merge, @steipete should
confirm that the durable boundary should remain:

- a reverse-provider-only seam rather than a generic host bus;
- plugin-owned for transport and deployment lifecycle; and
- loader-owned for effective bundle identity.

If the O4 manifest field is replaced, this branch should be replayed against
the approved equivalent rather than preserving the current name by
compatibility shim.

## User Impact

Ordinary installations and plugins are unchanged. No route is registered and
no authority is read unless a plugin explicitly prepares and activates this
integration.

External plugins that must physically execute a provider request can reuse one
bounded, generation-fenced ownership contract without receiving operator/node
authority or importing product-specific identity and rollout policy into core.

## Evidence

### Real behavior proof

Behavior or issue addressed:
An external plugin can own one reverse-provider WebSocket route while OpenClaw
enforces bounded session, operation, and protocol state against the exact
prepared authority.

Real environment tested:
Ubuntu 24.04 under WSL2, OpenClaw fork head `519e1c57819`, Node 24.15.0,
and the Lobster external-plugin harness using a real loopback HTTP upgrade,
`ws`, a short-lived HMAC credential, Ed25519 proof-of-possession, and the
exact loader-owned bundle generation. The harness supplies test deployment
authority; no production Lobster service or fleet was activated.

Exact steps or command run after this patch:

1. Build OpenClaw and all Plugin SDK artifacts and canonical declarations.
2. Verify all public Plugin SDK subpaths and both source/test TypeScript
   declaration graphs.
3. Run the 76 focused reverse-carrier and host-bundle tests.
4. Link the exact OpenClaw checkout into the external Lobster plugin harness
   and run its real selected-route suite.

Evidence after fix:

- all 147 public Plugin SDK subpaths verified;
- 65 carrier tests and 11 host-bundle tests passed;
- the final 36-test frame/operation regression rerun passed;
- all 175 workspace test declaration projects passed;
- type-aware Oxlint reported zero warnings/errors;
- the Lobster harness reported 23/23 plugin tests and 26 Rust adapter tests
  passing; and
- final `codex review --uncommitted` reported no actionable correctness
  finding after the combined review's protocol-state finding was fixed.

Observed result after fix:
Exactly one plugin-owned route admitted the credential-bound peer, bound both
frame directions to one session incarnation, and rejected stale or mismatched
authority. Premature terminal and out-of-order response frames failed without
releasing operation ownership. Disabled startup did not read authority or
register the route.

What was not tested:
No production runtime peer, live external provider, reconnect supervisor,
fleet rollout, Status/Doctor projection, or default activation was started.
Those remain downstream adopter and rollout work.

### Additional validation

- full `pnpm build`
- `pnpm plugin-sdk:api:check`
- `pnpm plugin-sdk:check-exports`
- `pnpm tsgo:core`
- `pnpm check:test-types`
- focused type-aware Oxlint, Oxfmt, and `git diff --check`

Blacksmith Testbox did not allocate because the CLI was authenticated to a
different organization; no lease or Actions run was created. The same trusted
source build/type/API gates passed in the WSL worktree. This is not presented
as production or live-fleet proof.
