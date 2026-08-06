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
The filing-ready PR body is
`bounded-reverse-carrier-owner-pr-body.md`.

## Readiness verdict

The packet is technically ready to present as one problem-led issue plus one
issue-linked draft PR after explicit filing authorization. It does not depend
on RFC 0020. It does depend on the O4 manifest boundary being accepted or
replaced with a maintainer-approved equivalent.

This is a new public Plugin SDK and plugin/Gateway ownership seam. The issue
and PR must explicitly request @steipete's confirmation before merge; tests
cannot decide that product boundary.

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
   fencing, one injected session clock, and constant-memory protocol-state
   enforcement before operation release.
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
- fork owner PR 184 is open, draft, and mergeable at `519e1c57819`;
- Lobster adopter PR 59 is open, draft, and mergeable at `ee697055129`;
- Lobster lifecycle PRs 60-62 are open, draft, and mergeable through stack tip
  `728678ac3c`; they remain inactive downstream proof;
- current OpenClaw `main` was `42e23c11e0f`; a merge-tree check found only
  the expected generated Plugin SDK baseline conflict, which the fresh replay
  regenerates;
- Gitcrawl plus live GitHub searches for reverse provider, reverse carrier,
  connection owner, plugin WebSocket, and host provider found no competing
  issue or PR; #97046 is an agent-run ownership envelope and #114145 is a
  scale-to-zero recovery contract, not duplicates;
- no upstream issue or PR exists for this connection-owner packet.

Exact-head readiness proof at `519e1c57819` passed 65 reverse-carrier tests,
11 host-bundle tests, and the external Lobster consumer's 23 plugin tests. The
full OpenClaw build, Plugin SDK API/export checks, core type graph, all 175 test
declaration projects, focused lint/format/diff checks, and final Codex review
also passed. Blacksmith Testbox did not allocate because the CLI organization
did not match; no lease or Actions run was created.

Fork automation accepted the refreshed real-behavior proof and workflow-sanity
checks. The remaining `auto-response` and `label` failures are fork permission
noise; the full upstream CI matrix is intentionally skipped on this fork-only
draft and must run on the fresh issue-linked upstream replay.
