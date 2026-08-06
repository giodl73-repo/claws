# Extensibility and Feeds: Collaboration and Ownership Opportunities

> **Omar's vision for Extensibility:** Build the platform for plugins, skills,
> UX extensions, governance, ratings, versioning, tenant controls, and
> first-party/community contribution.

## High-level vision

Scout should have one coherent extensibility system spanning discovery,
publishing, following, installation, updates, trust, and tenant governance for
plugins, skills, MCP servers, connectors, and future extension types.

The durable product boundary is:

- OpenClaw provides generic, community-usable runtime and client primitives.
- ClawHub provides community catalog and publisher-feed services.
- MOS3 provides Microsoft's authoritative registry, acquisition, package
  metadata, and effective feed composition.
- Lobster and Scout integrate those systems into a reliable Microsoft-hosted
  product and user experience.

This is a menu of areas where the Extensibility team could help or take
ownership. It is not a fixed assignment. The goal is to align work with the
team's charter, capacity, and existing partner relationships.

The first useful conversation is simply: which layer best matches the team's
charter—Scout rollout, MOS3 platform contracts, publisher feeds, governance,
or reliability? The detailed history below is context, not an expectation that
one team absorb every layer.

### Guardrails and non-goals

- Do not create a second Microsoft catalog or feed authority inside Lobster.
- Do not make following a publisher equivalent to trust, approval, or install.
- Do not make Microsoft governance a requirement for ordinary community
  OpenClaw or ClawHub use.
- Generic upstream work should remain useful and operable outside Microsoft,
  with no dependency on MOS3, Lobster, or private services.
- Prefer one source of truth for identity, signing, approval, and revocation;
  projections should carry authority and revision rather than silently fork it.
- Keep catalog refresh and governance lookups bounded and cacheable; a slow
  control plane must not block unrelated OpenClaw interactions or crash the
  Gateway.

## Areas and major pieces

### Extension lifecycle

- Discover plugins, skills, MCP servers, connectors, and other extension types.
- Publish and version extensions with stable publisher identity and provenance.
- Follow publishers or named feeds without treating a follow as an install or
  a trust grant.
- Install an exact approved version and explain its source, integrity, trust,
  package-defense status, and update state.
- Support ratings, trust facts, revocation, deprecation, and first-party versus
  community contribution.

### Feed model

- Personal feeds: a user's private effective view.
- Publisher feeds: signed projections for a person or organization.
- Shared or group feeds: curated views for a bounded audience.
- Tenant feeds: admin-approved and policy-composed views.
- Microsoft-curated and surface-specific feeds.
- Named feeds and follow state built on the same signed projection machinery.

### Governance and reliability

- Tenant include, deny, pin, scope, revoke, deprecate, quarantine, exception,
  preview, explain, and audit controls.
- Previous-good caching and no access widening when refresh fails.
- Exact-version acquisition, freshness, drift detection, blocked reasons, and
  support diagnostics.
- E2E harnesses, distributed tracing, telemetry, dashboards, runbooks, and
  rollout ownership.

## Partners and dependencies

| Partner                              | Contribution and decisions needed                                                                                                                            |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| MOS3/MAC                             | Registry authority, title/acquisition contracts, Personal/TenantPersonal publish authorization, feed composition, RBAC, package-defense and tenant controls. |
| Lobster/Scout                        | Microsoft-hosted integration, effective-feed projection, product UX, feature rollout, E2E, diagnostics, and operational readiness.                           |
| OpenClaw                             | Generic signed-feed consumption, exact-version install behavior, refresh/follow lifecycle, policy and conformance primitives.                                |
| ClawHub                              | Publisher identity, signed publisher feeds, catalog snapshots/query/change transport, community discovery.                                                   |
| Admin & Governance                   | Tenant/global approval, exceptions, audit, effective-state explanation, Partner Center and M365 auth decisions.                                              |
| Frontend Product Engineering         | Coherent discovery, library, follow, install, blocked-state, freshness, and admin experiences.                                                               |
| Infrastructure & Engineering Systems | E2E environments, reliability gates, tracing, dashboards, and developer velocity.                                                                            |
| Security                             | Signing, provenance, RBAC, package-defense, revocation, local execution, and auth-boundary review.                                                           |
| Data Science & Insights              | Adoption funnels, search quality, publisher activity, feed freshness, failures, and community signals.                                                       |
| Technical Community Manager          | Publisher onboarding, contribution patterns, issue routing, and extension opportunities from the community.                                                  |
| Operations & TPM                     | Cross-team decisions, external dependencies, rollout readiness, and last-mile follow-through.                                                                |

### Terms used in this brief

- **MOS3/MAC:** Microsoft's catalog, acquisition, and admin-control systems.
- **Lobster/Scout:** the Microsoft-hosted product and user experience around
  OpenClaw.
- **ClawHub:** the community extension catalog and publisher service.
- **Publisher feed:** a signed feed for a person or organization; historically
  some work called this an account feed.
- **FirstRelease/301:** the bounded validation ring and test environment used
  for live Scout proof before broader enablement.

## Work completed to date

### Lobster and Scout foundations already in main

- Personal and tenant-approved feed projections.
- Live MOS3 acquisitions and MOS3 auth/environment mapping.
- Local and MOS3 personal publishing plus hosted personal artifacts.
- Install flows, marketplace search, tenant catalog review, and approved-feed
  publication.
- Shared-publish capability diagnostics in Lobster PR #5045.
- Plugin-acquisition capability contract in Lobster PR #5057.
- `scout-standard` capability/configuration contract in Lobster PR #5336.

### OpenClaw signed-feed prerequisites already merged

- OpenClaw PR #101981.
- OpenClaw PR #110037.
- OpenClaw PR #108342.

These foundations should be audited and reused rather than rebuilt.

## Work currently in flight

### Finish the current Scout feeds rollout slice

Lobster PR [#5424](https://microsoft.ghe.com/bic/lobster/pull/5424), branch
`user/giodl/scout-feeds-marketplace-default-on`, was open and non-draft at
`6529e0a9e5` on 2026-07-27. It makes MOS3 marketplace discovery and local
workspace install available outside `scout_feeds_ux_enabled`, while retaining
the flag for personal-library and tenant-approved actions.

At that snapshot it had requested changes and failures in
`GitOps/GitHubPop` and `Lobster-Runtime-PullRequest`, including a Playwright
shard failure. A possible contribution is to share ownership of this PR,
refresh it on current `main`, address current-head review/test failures, and
land the bounded behavior. It should not be used to imply that personal
publishing or tenant composition is already production-ready.

This status is a dated handoff snapshot, not a substitute for checking the
current head, review decision, and required checks before adopting the PR.

### MOS3 Personal publishing blocker

A 301 FirstRelease E2E proved marketplace discovery and installation, but
personal publishing failed downstream:

- Time: `2026-07-21T22:40:45.792Z`
- Lobster request ID: `20d8304f-0293-441a-8cdf-263b1e1a79ef`
- MOS3 response: `403 Forbidden`
- Message: `Uploading TenantPersonal package is not enabled for the user.`
- MOS3-facing Lobster Prod/FPA AppID:
  `f1217e17-d0fc-4a9e-a8a1-e1fc64868032`

The likely dependency is MOS3 preauthorization for `Personal` or
`TenantPersonal` publishing for this AppID and the validation tenant/user. The
browser capture did not preserve the MOS3 `traceresponse` header. The next run
should retain `traceresponse`, `client-request-id`, bounded error code, and
request correlation without recording tokens or private response bodies.

Permanent enablement should wait until an actual user journey proves MOS3
publish, exact ID/version projection into `personal.json`, reload persistence,
cleanup, and the absence of a file-backed Lobster bridge as production
authority.

### Publisher feeds to restore

The current term is **publisher feed**, not account feed. A publisher may be a
person or organization.

ClawHub producer work was still open but conflicting with current `main` on
2026-07-27:

- #2948: publisher feed model/API; non-draft with requested changes.
- #3116: durable publisher query/delta state; draft.
- #3117: signed publisher projections and reset routes; draft.
- #2950: publisher follow graph; optional social/discovery slice.
- #2949: publisher state and discovery labels; optional UI/state slice.
- #2953: registry/scan export bridge; park until a concrete consumer exists.

OpenClaw consumer work was also open but conflicting:

- #109305: search and follow signed publisher feeds; the first useful CLI
  stopping point.
- #109461: refresh/manage followed publishers through Gateway lifecycle/RPC.
- #109584: publisher-following Control UI.

The first landing should be useful without requiring the whole stack: signed
publisher feeds can be searched, followed, and refreshed from the CLI before
Gateway automation and UI are mandatory.

### Scalable catalog distribution dependencies

- ClawHub #3005: dormant signing foundation.
- ClawHub #3149: durable catalog distribution.
- ClawHub #3160: signed query/change transport.
- ClawHub #3163: sharded snapshots; draft.
- OpenClaw #110250: signed sharded catalog consumer.

These are related infrastructure, not a reason to block the publisher-feed
protocol. Merging dormant foundations must not install production keys,
signing secrets, or activation flags without an explicit operator plan and
live signed proof.

## Work still to be done

### MOS3 registry and feed composition

The intended architecture is MOS3 registry plus feed composition, not a
parallel Lobster database. The missing platform decisions and slices include:

1. Stable feed identity, revision, prior revision, sequence, ETag/change/reset,
   and signed snapshot/query contracts.
2. Personal, group, tenant, Microsoft-curated, and surface-specific scopes.
3. Source import with provenance, version, integrity, publisher,
   package-defense, and revocation facts preserved.
4. RBAC for client reader, personal publisher, source/package owner,
   Microsoft curator, tenant admin, and auditor/operator.
5. Tenant composition for include, deny, pin, scope, revoke, deprecate,
   exception, preview, explain, and audit.
6. Named feeds and following after publisher feeds prove the common signed
   projection and follow machinery.
7. Client conformance: previous-good caching, exact approved-version installs,
   no widening on failure, freshness, drift, blocked reasons, and diagnostics.
8. Distributed tracing and preservation of downstream diagnostic headers.
9. Measured latency, bounded timeouts, cancellation, retry/backoff, and failure
   isolation for refresh and acquisition paths.

### Remaining Lobster and Scout slices

1. Personal-publish diagnostics and successful FirstRelease E2E proof.
2. A bounded permanent-enable change for a proven ring.
3. MOS3-backed shared/tenant publish and readback with confirmed ACL/version
   semantics.
4. Tenant-admin feed composition with preview, explain, audit, and
   previous-good failure behavior.
5. Named/followable feed identity and follow state on MOS3 primitives.
6. Freshness, drift, blocked-reason UX, telemetry, dashboards, and runbooks.
7. Fleet/ring rollout controls that expose partial success, preserve unaffected
   users, support targeted retry or rollback, and never turn dependency failure
   into broader access.

## Areas the Extensibility team could take on

The team could take one, several, or none of these depending on fit:

- Co-own or fully take over Lobster PR #5424 and the immediate Scout rollout.
- Own the MOS3 Personal/TenantPersonal authorization escalation and 301 E2E.
- Rebuild the publisher-feed producer stack in ClawHub.
- Rebuild the first OpenClaw publisher-feed CLI consumer, with upstream
  maintainers retaining generic runtime ownership.
- Define and drive the MOS3 feed identity, signing, delta, and RBAC contracts.
- Own tenant feed composition and its admin API/UX in partnership with Admin &
  Governance.
- Own extension trust, ratings, provenance, package-defense, and revocation.
- Own feed reliability: conformance tests, diagnostics, E2E, telemetry,
  dashboards, rollout, and support readiness.
- Act as the long-term DRI across the entire Microsoft-specific extensibility
  platform while partnering with Gio on context transfer and upstream work.

## Suggested success outcomes

- Scout feeds are safely enabled with real FirstRelease proof.
- Publisher feeds have a current producer and a useful OpenClaw CLI consumer.
- MOS3 owners accept explicit feed and RBAC contracts.
- MOS3 is authoritative for production feed state; Lobster files remain only
  development, test, or migration bridges.
- Users and admins can explain source, revision, approval, pin, scope, trust,
  package-defense, freshness, drift, and blocked reasons.
- Community OpenClaw and ClawHub remain independently usable, and generic
  upstream contributions do not require Microsoft services.
- E2E, dashboards, runbooks, escalation paths, and long-term ownership are
  explicit rather than depending on one contributor.
