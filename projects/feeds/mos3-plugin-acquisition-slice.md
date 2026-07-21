# MOS3 Plugin Acquisition Slice

## Frame

Plugin discovery, local installation, personal save, and shared publication are
separate operations. Plugins must not reuse skill content packaging or imply
that marketplace discovery grants mutation authority.

The acquisition contract uses source-resolved coordinates:

- Scout entry ID;
- registry and package;
- resolved version;
- immutable artifact URL;
- SHA-256 integrity metadata.

Mutable tags are resolved by the source adapter before a request is built. The
contract does not invent cross-registry version syntax.

## Current Slice

Lobster PR [#5057](https://microsoft.ghe.com/bic/lobster/pull/5057) at
`51d7f40331`, stacked on #5045, adds:

- strict plugin package/request/outcome wire types with validated non-empty
  coordinates, canonical HTTPS artifact URLs, and exact SHA-256 digests;
- distinct install, personal-save, and shared-publish operations;
- structured unsupported rejection codes for each mutation;
- ECS-gated source diagnostics.

Diagnostics report all capabilities `disabled` outside
`scout_feeds_ux_enabled`. Inside the cohort, discovery is `available`, while
install, personal save, and shared publish are `blocked`.

This slice adds no install, save, or publish dispatch and does not use
`skillMarkdown`.

## Activation Proof

Before any mutation becomes available:

1. OpenClaw must define the plugin installation request and verified completion
   contract.
2. MOS3 must define plugin personal-save transport and readback.
3. MOS3 must define plugin shared-publish ACL, readback, and version
   verification.
4. Each operation must prove the requested immutable artifact and resolved
   version after completion.

Until those proofs exist, diagnostics remain fail-closed.
