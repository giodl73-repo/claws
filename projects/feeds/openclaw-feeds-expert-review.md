# OpenClaw Feeds: Expert Review and Collaboration Brief

**Prepared:** 2026-07-27  
**Audience:** Feeds expert advising Gio and optionally contributing to OpenClaw or ClawHub  
**Status note:** PR state below is a dated snapshot and should be refreshed before acting.

## Why this exists

We are building a feed system that lets people discover, follow, verify, install, and update extensions without collapsing discovery, trust, approval, and installation into one unsafe action. This brief explains the cross-repository work completed so far, the architecture we are aiming for, the PRs still in flight, and the decisions where expert review would help most.

This is not a work assignment or an ownership-transfer request. The goal is expert advice: challenge the architecture, review the protocol and PR boundaries, identify missing failure modes, and recommend how Gio should simplify or sequence the work. The PRs below are context for that discussion; Gio remains responsible for their ownership and follow-through.

## Product vision

An extension feed is a versioned, signed projection of available artifacts and their provenance. OpenClaw should have generic community-usable feed primitives; ClawHub should publish community catalog and publisher-feed projections; Microsoft services should compose enterprise-effective views without making the open-source system depend on Microsoft infrastructure.

The intended ownership boundary is:

| Area                              | Intended role                                                                                                                            |
| --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| OpenClaw                          | Generic client/runtime primitives: subscriptions, verification, refresh, cache, search, install, Gateway lifecycle, and UI.              |
| ClawHub                           | Public/community catalog and publisher-feed production, history, queries, deltas, snapshots, and signing.                                |
| MOS3 / Microsoft 365 Admin Center | Microsoft's registry, acquisitions, package metadata and defense, policy-aware composition, scope, RBAC, and effective enterprise feeds. |
| Lobster / Scout                   | Microsoft-hosted adapter and product experience: MOS3 projection, UX, E2E, rollout, observability, and support.                          |

Core invariants:

- Following a source means subscribing to discovery metadata; it does not grant trust, approval, or installation.
- Source authenticity, artifact integrity, tenant approval, and runtime trust are separate decisions.
- Installs resolve to exact approved versions and preserve provenance.
- Clients reject rollback, verify signatures before acceptance, retain a previous-good view, and do not widen access when refresh fails.
- Snapshot, query, delta/change, and reset behavior must be explicit and testable.
- Enterprise composition belongs in MOS3; Lobster should remain an adapter/projection rather than a second authoritative catalog.

## What has been completed

### OpenClaw foundations

The signed-feed prerequisites have landed:

- [OpenClaw #101981](https://github.com/openclaw/openclaw/pull/101981)
- [OpenClaw #110037](https://github.com/openclaw/openclaw/pull/110037)
- [OpenClaw #108342](https://github.com/openclaw/openclaw/pull/108342)

Together these established the lower-level signing and feed-consumption foundations needed by the current stacks. The older native-feed experiment (#87824-#87827 and #88732) was closed rather than extended; the current work is organized around publisher feeds and scalable signed catalogs.

### Scout, Lobster, and MOS3 integration

The Microsoft-hosted path now includes substantial feed functionality:

- Local feed search, install, and publish workflows.
- MOS3 catalog export/import and live MOS3 personal acquisitions.
- Hosted tenant-approved and personal feed routes.
- Marketplace search, install, admin approval, publishing, and state projection.
- Personal MOS3 and policy-artifact publishing foundations.
- A 301-user FirstRelease E2E proving marketplace discovery and installation.
- Capability/configuration contracts and improved acquisition and publish diagnostics.

One active Lobster draft is aligning Scout's Builder API upload with the current contract: a multipart `package` ZIP plus JSON `info` metadata carrying `builderName: ScoutCloud`. It should remain draft until MOS3 deploys the `ScoutCloud` builder enum and confirms Personal/TenantPersonal publishing authorization for Scout's AppID.

## Work in flight

### 1. Protocol alignment

[RFC #39](https://github.com/openclaw/rfcs/pull/39), **RFC 0009: align Hosted Feed v1 specifications**, is open, non-draft, and clean as of this snapshot. It is the best place to review the overall protocol vocabulary and consistency across hosted-feed specifications.

### 2. Publisher feeds: ClawHub producer

A publisher may be a person or an organization. “Publisher feed” is deliberate terminology; it avoids hard-coding feeds to user accounts.

| PR                                                             | Purpose                                               | Snapshot                                        |
| -------------------------------------------------------------- | ----------------------------------------------------- | ----------------------------------------------- |
| [ClawHub #2948](https://github.com/openclaw/clawhub/pull/2948) | Publisher identity, snapshot model, and base API      | Open, non-draft, conflicting, changes requested |
| [ClawHub #3116](https://github.com/openclaw/clawhub/pull/3116) | Durable revisions, query, and delta state             | Draft, conflicting                              |
| [ClawHub #3117](https://github.com/openclaw/clawhub/pull/3117) | Signed snapshot, query, change, and reset projections | Draft, conflicting                              |

The desired landing order is #2948, #3116, then #3117. These branches need to be reconciled with current ClawHub main and reviewer feedback; preserving the conceptual slices is more important than preserving the existing commits.

### 3. Publisher feeds: OpenClaw consumer

| PR                                                                   | Purpose                                                      | Suggested disposition                                                            |
| -------------------------------------------------------------------- | ------------------------------------------------------------ | -------------------------------------------------------------------------------- |
| [OpenClaw #109305](https://github.com/openclaw/openclaw/pull/109305) | Search and follow signed publisher feeds from the CLI        | Primary review question: is this the right first useful OpenClaw stopping point? |
| [OpenClaw #109461](https://github.com/openclaw/openclaw/pull/109461) | Gateway refresh, scheduling, persistence, and management RPC | Follow after CLI semantics are accepted                                          |
| [OpenClaw #109584](https://github.com/openclaw/openclaw/pull/109584) | Control UI for publisher following                           | Follow after Gateway contract stabilizes                                         |

The CLI slice is intentionally first: it can prove subscription, verification, refresh, search, cache, and exact-version behavior without making Gateway lifecycle or UI part of the initial review surface.

### 4. Scalable full-catalog distribution

Publisher feeds solve following a chosen source. They do not by themselves solve efficient distribution of a large public catalog.

| PR                                                                   | Purpose                                    | Snapshot                                                             |
| -------------------------------------------------------------------- | ------------------------------------------ | -------------------------------------------------------------------- |
| [ClawHub #3005](https://github.com/openclaw/clawhub/pull/3005)       | Dormant catalog signing foundation         | Open, mergeable but unstable, changes requested                      |
| [ClawHub #3149](https://github.com/openclaw/clawhub/pull/3149)       | Durable catalog revision/history state     | Open, mergeable but unstable                                         |
| [ClawHub #3160](https://github.com/openclaw/clawhub/pull/3160)       | Signed catalog query and change transport  | Open, mergeable but unstable                                         |
| [ClawHub #3163](https://github.com/openclaw/clawhub/pull/3163)       | Sharded signed catalog snapshots           | Draft, mergeable but unstable                                        |
| [OpenClaw #110250](https://github.com/openclaw/openclaw/pull/110250) | Consume and search signed sharded catalogs | Open; needs current-main reconciliation and producer contract review |

Signing should remain dormant until key custody, rotation, activation, and operational ownership are explicitly agreed. Merging a signing foundation must not silently activate production trust.

### 5. Local marketplace watches

[OpenClaw #110438](https://github.com/openclaw/openclaw/pull/110438) is a draft for local marketplace watches. This is useful but independent enough to follow the main publisher-feed CLI landing rather than block it.

## Recommended sequence

1. Review and align RFC #39 and the terminology/invariants above.
2. Repair the ClawHub publisher producer stack through a signed, revisioned projection.
3. Rebuild and land OpenClaw #109305 as the smallest end-to-end client slice.
4. Add Gateway lifecycle (#109461), then Control UI (#109584).
5. Stabilize the scalable catalog producer stack and consumer (#110250).
6. Land local watches (#110438) where they fit naturally.
7. Introduce named/shared feeds only after the publisher path is deployed and understood.

## Future: named, shared, and enterprise-composed feeds

Publisher feeds should be the first durable primitive. Later, feeds can become named effective views:

- Personal feeds: a user's private effective view.
- Shared/group feeds: explicitly ACL-controlled views for collaboration.
- Tenant feeds: centrally composed views with policy, pins, denies, revocations, exceptions, and audit.
- Named feeds: stable identities that can include or follow other feeds while preserving provenance.

For Microsoft's deployment, MOS3 should own registry and composition. A useful contract needs stable feed identity; immutable or monotonic revisions; signed snapshot/query/delta/reset projections; scope and RBAC; inclusion provenance; exact versions; and explicit deny, pin, revoke, deprecate, exception, preview, explain, and audit behavior. File-backed feeds remain appropriate for development, tests, and migration bridges, not production authority.

## Questions where expert advice would be especially valuable

1. Is a publisher feed the right first primitive, or is another identity/composition model simpler?
2. Is the CLI-first stopping point in #109305 the correct boundary for the first OpenClaw landing?
3. Is the snapshot/query/delta/change/reset protocol minimal and operationally sound?
4. What should the signing trust-root, key-rotation, rollback-prevention, and DSSE story be?
5. Can the producer and consumer PR stacks be made smaller without losing independently reviewable proofs?
6. How should OpenClaw persist subscriptions, previous-good state, freshness, and refresh errors?
7. When should named/shared feeds be introduced, and which composition operations must exist first?
8. How should ClawHub's public/community feeds align with MOS3 enterprise composition while remaining independent?
9. Which functionality clearly belongs upstream in OpenClaw/ClawHub, and which is Microsoft-specific?

## Requested form of collaboration

The requested contribution is advisory:

- Review the architecture and identify unnecessary complexity or missing failure modes.
- Review RFC #39 or a specific producer/consumer contract.
- Advise whether the OpenClaw PR boundaries (#109305, #109461, #109584, #110250, and #110438) are correctly divided and sequenced.
- Suggest smaller or safer implementation slices and the proof each should require.
- Identify lessons from other feed systems that should change the protocol, persistence, refresh, signing, or composition design.

If focusing the review on one item, **OpenClaw #109305** is the most useful concrete example: should Gio rebuild it on current main and land the CLI experience before expanding into Gateway and UI? For a protocol-first discussion, RFC #39 and the ClawHub publisher producer are the best reference points.

## Definition of success

- A publisher can expose a signed, monotonic, revisioned feed.
- An OpenClaw user can follow it, refresh it, inspect provenance, search it, and install an exact approved artifact.
- Bad signatures, rollback, malformed deltas, stale data, and network failure retain previous-good state and never widen access.
- Large public catalogs distribute efficiently without requiring clients to redownload a monolith.
- Enterprise policy and feed composition remain explainable and authoritative in MOS3.
- OpenClaw and ClawHub remain independently useful to the community without Microsoft services.
