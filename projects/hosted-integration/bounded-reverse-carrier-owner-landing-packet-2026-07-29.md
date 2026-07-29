# Bounded Reverse-Carrier Owner Landing Packet

## Decision

The eventual OpenClaw contribution should be one cohesive connection-owner PR,
not four sequential upstream PRs and not a retarget of fork PR 184.

Suggested issue title:

> Plugin SDK: add bounded reverse-provider connection ownership contracts

Suggested PR title:

> feat(host): add bounded reverse-provider connection owner

The local issue body is
`bounded-reverse-carrier-owner-issue-body.md`. The reviewed implementation
source is fork [PR 184](https://github.com/giodl73-repo/openclaw/pull/184),
with host-bundle generation source in fork
[PR 183](https://github.com/giodl73-repo/openclaw/pull/183).

## FACES frame

Working owner system:

- OpenClaw's plugin loader already owns effective manifest inventory.
- A plugin-authenticated Gateway route already owns its accepted WebSocket.
- Provider and traffic-policy owners already own request semantics and network
  enforcement.

Missing shared capability:

- reusable bounded frame, session, operation, and generation-fencing contracts
  between the plugin-owned socket and the provider owner.

Retained ownership:

- Gateway core: plugin route registration and loader-owned bundle snapshot;
- plugin: route, credential verification, socket, send serialization, cleanup;
- provider owner: request semantics, traffic policy, credential slots;
- deployment owner: selection, peer key, credential issuance, rollout;
- Lobster: runtime peer, reconnect, observation, rollback, fleet operations.

Deletion target:

- eliminate plugin-specific copies of session and operation fencing;
- after a successful Lobster migration, delete only ProxyPipe brokered-HTTP
  frames 1-5 whose traffic has reached parity. This PR does not delete
  ProxyPipe or its unrelated frame families.

Disproof condition:

- if a second real plugin-owned connection cannot use the contracts without
  importing Lobster identity, policy, or deployment concepts, the proposed
  public seam is too product-specific.

## Upstream replay plan

1. Wait for upstream host-bundle PR 114783 to land or receive a maintainer-
   approved replacement shape.
2. Create a fresh branch from then-current upstream `main`; never retarget fork
   PR 184.
3. Replay the minimal G1 effective-bundle generation seam.
4. Replay the O11-O14/G2 implementation as one reviewed change, squashing only
   after preserving the three review fixes: HTTP(S)-only URLs, live proof-expiry
   fencing, and one injected session clock.
5. Regenerate the Plugin SDK API baseline and exact canonical declarations.
6. Repeat the focused OpenClaw suite and the external Lobster proof against the
   exact replay head.
7. File the local issue body and issue-linked draft PR only after Gio explicitly
   authorizes this package.

## Required PR proof

- full Plugin SDK build and all public-subpath checks;
- focused frame/session/operation/owner/bundle tests;
- core type graph, type-aware lint, formatting, and diff hygiene;
- real loopback plugin upgrade and proof-of-possession admission from an
  external consumer;
- clean branch review against the actual current-main base;
- explicit proof statement that normal startup remains inert.

## Review lenses

- Gateway runtime: no listener, reconnect task, provider implementation, or
  unbounded state enters core; all registries remain process-local and capped.
- Lobster container: one in-process plugin route and one future supervised peer,
  not a new sidecar or independently exposed service.
- Fleet operator: generation identity is observable and rollback does not
  require rewriting the OpenClaw contract.
- Security: credentials remain short-lived and proof-bound; a carrier peer
  receives neither operator scopes nor node/device identity.

## Current state

As checked on 2026-07-29:

- upstream host-bundle PR 114783 is open and draft at `14bd05f5691`;
- fork G1 PR 183 is open, draft, and mergeable at `c6ce310f1ab`;
- fork owner PR 184 is open, draft, and mergeable at `f810aa8c390`;
- Lobster adopter PR 59 is open, draft, and mergeable at `ee697055129`;
- no upstream issue or PR exists for this connection-owner packet.

