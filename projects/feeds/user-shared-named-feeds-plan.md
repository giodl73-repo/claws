# User-Shared Named Feeds Plan

## Position

Feeds should support viral user sharing without requiring tenant-admin approval
for every useful skill, plugin, policy package, connector, MCP server, or agent
collection.

The right abstraction is not "share my mutable personal feed." Personal feeds
are private working state. The product abstraction should be followable feeds:
user-created named feeds, source feeds such as ClawHub, and tenant-approved
feeds that can all participate in a user's personal effective feed with clear
provenance and trust labels.

```text
Personal feed -> named feed -> shared visibility -> recipient install/follow
Source feed   -> user follow ---------------------> personal effective feed
              -> optional tenant-admin promotion --> tenant-approved feed
```

This keeps growth and governance separate. Users can share useful collections
with colleagues or their whole tenant. Tenant admins can decide later whether a
feed becomes official.

## Core Decisions

- A personal feed is an effective feed, not only a stored JSON document.
- A user can follow feeds they are allowed to see, including named feeds,
  public/source feeds such as ClawHub, tenant-visible feeds, and
  tenant-approved feeds.
- Following does not destructively copy entries unless the user explicitly
  installs or saves a specific entry.
- Named feeds are versioned. Following can track latest published revision or a
  pinned revision.
- Source-feed follows preserve source trust. Following ClawHub or another
  public feed does not make its entries tenant-approved.
- Tenant-visible is a sharing scope, not an approval state.
- Tenant approval applies to a selected named-feed revision or selected entries,
  not to whatever the owner may publish later.
- Every entry in an effective feed must preserve provenance: direct personal,
  followed named feed, tenant-approved feed, marketplace, source feed, or MOS3
  acquisition.
- Named feeds should be portable: exportable as a feed document and removable
  from a user's search without vendor lock-in.
- The default user experience must be understandable without learning feed
  governance terminology first.

## Feed Classes

| Class | Owner | Visibility | Trust meaning |
| --- | --- | --- | --- |
| Personal feed | User | Owner only | Private working/install state. |
| Named feed | User, group, team, Microsoft, or tenant admin | Configured per feed | A reusable collection with stable identity and versions. |
| Shared feed | Named feed owner | Specific people or groups | Recipient can view and install; not tenant endorsed. |
| Tenant-visible feed | Named feed owner | Everyone in the tenant | Discoverable by the tenant; not tenant endorsed. |
| Tenant-approved feed | Tenant admin or MOS3 composition authority | Scoped tenant/group/client visibility | Official governed feed after review, approval, pinning, policy, and audit. |
| Source feed | Marketplace, ClawHub, MOS3, team catalog, partner catalog | Source-defined | Raw supply input, not automatically approved. |

Personal feeds remain the user's install and authoring workspace. A named feed
is the shareable unit. Tenant approval changes governance status, not merely
who can see the feed.

Source feeds are also followable when policy allows it. Following ClawHub,
MOS3 marketplace, a partner catalog, or another public source makes that source
participate in the user's personal effective feed and `/skills` search. It does
not imply endorsement. The UI must label those entries as `Following: ClawHub`,
`Source: ClawHub`, `Marketplace`, or equivalent, and tenant policy can still
block discovery, install, or runtime use.

## Follow Model

Users should be able to include a feed in their personal effective feed. This
is the "follow" relationship. The MVP should support the same follow primitive
for named feeds and source feeds, even if sharing/ACL UI lands later.

Following a feed is different from copying a single entry:

| Action | Result |
| --- | --- |
| Install entry | Copies one selected entry into the user's personal feed. |
| Follow named feed | Adds the named feed as a source for the user's personal effective feed. |
| Follow source feed | Adds a visible source feed such as ClawHub as a source for search and the personal effective feed. |
| Unfollow feed | Removes that source from the user's personal effective feed without deleting entries installed independently. |

The personal feed is therefore an effective view over:

- direct personal entries the user created or installed;
- followed named feeds shared with the user;
- followed source feeds such as ClawHub or partner catalogs;
- tenant-approved feeds available to the user;
- marketplace acquisitions or MOS3-backed personal projections where enabled.

```text
Personal effective feed =
  direct personal entries
  + followed named feed revisions
  + followed source feeds
  + tenant-approved entries
  + selected marketplace/acquisition projections
```

This should feel like a merge in the product. Under the hood it should remain a
projection over direct entries and included feed references. That gives users
the simple mental model they want without losing provenance, ACL checks, or
revocation.

The UI can call this `Follow feed`, `Following`, and `Unfollow`. The
implementation should store the followed feed reference separately from copied
personal entries so provenance, trust state, updates, and revocation remain
clear.

For the first pass, following should bind to the current published revision or
to the feed's latest published revision based on an explicit choice:

- `Follow latest`: receive future published revisions from that named feed.
- `Pin revision`: keep using the selected revision until the user changes it.

If that choice is too much UI for the MVP, default to `Follow latest` for
shared user feeds and keep a backend field that can support pinned revisions
later.

### Effective Feed Merge Rules

The personal effective feed should be computed with deterministic merge rules:

1. Tenant policy blocks and revoked entries win over all sources.
2. Direct personal entries are preserved and labeled as personal.
3. Tenant-approved entries keep the `Tenant approved` trust label.
4. Followed feed entries keep their source feed owner, revision or source
   version where available, and trust label.
5. Duplicate logical entries are grouped by stable package/capability identity,
   not silently collapsed.
6. If the same identity appears from multiple sources, the UI can show one row
   with source choices, while the API preserves all candidates.
7. A pinned direct or followed revision should not be silently upgraded by a
   newer source revision.

The MVP can render duplicates simply, but the API shape should not lose source
variants. This matters for policy baselines, plugin versions, and tenant review.

### Update And Revocation Semantics

For `Follow latest`, a new published revision of the named feed appears in the
follower's personal effective feed after refresh. For `Pin revision`, the user
continues to see the pinned revision until they change it.

If the owner removes the user's access to a named feed, that feed disappears
from the user's personal effective feed. Entries the user explicitly copied or
installed into their direct personal feed are not automatically deleted, but
they remain subject to tenant policy, block, and runtime enforcement.

If a named feed is deleted, blocked, or marked unsafe, followers should see a
clear status rather than a silent empty result.

### Feed Inclusion

For MVP, only personal effective feeds include named feeds. A user follows
named feeds into their personal effective feed.

Named feeds should contain entries first. Named-feed-to-named-feed inclusion can
come later if there is a concrete need for team bundles or curated stacks. When
we add it, it needs max-depth limits, cycle detection, provenance preservation,
and admin-visible expansion.

Tenant-approved feeds can include selected entries or selected named-feed
revisions after admin review. They should not automatically approve all future
revisions unless the admin explicitly chooses a tracked-latest policy.

### Trust Labels

Trust state should be visible at both feed and entry level:

| Label | Meaning |
| --- | --- |
| Personal | Direct user-owned or user-installed entry. |
| Shared | Comes from a named feed shared with the user. |
| Tenant visible | Discoverable across the tenant, not admin-endorsed. |
| Tenant approved | Admin-reviewed and included in the tenant-approved effective feed. |
| Microsoft reviewed | Microsoft curation or package-defense signal, not tenant approval. |
| Blocked | Tenant, Microsoft, or security policy blocks discovery/install. |

An entry can carry more than one signal. For example, an entry may be Microsoft
reviewed and shared, or tenant visible and not approved. The UI should avoid a
single generic "safe" badge.

## Visibility Model

User-created named feeds need three first-class visibility states:

| Visibility | Behavior |
| --- | --- |
| Private | Only the owner can view, edit, and install from the named feed. |
| Shared with people/groups | The owner grants view/install access to named users or M365 groups. |
| Visible to tenant | Any user in the tenant can discover, view, and install from the feed. |

Tenant-visible does not mean tenant-approved. The UI and API should preserve
that distinction everywhere.

Recommended badges:

- `Private`
- `Shared`
- `Tenant visible`
- `Tenant approved`
- `Blocked`
- `Needs review`

## What This Covers

The same feed model should cover every admin-like artifact in the ecosystem:

- skills;
- plugins;
- policy baselines;
- MCP servers;
- connectors;
- agent templates;
- workflow packs;
- prompt/tool bundles;
- future capability manifests.

The feed item type determines install and runtime behavior. The feed lifecycle
stays the same: publish, share, discover, install, approve, pin, revoke, and
audit.

## User Experience

Normal users should primarily live on `/skills`, not an admin-feeling `/feeds`
page.

The core experience should be search-first. Users should not need to understand
feed plumbing before they get value. Feeds become the way users tune what search
includes.

The first-run experience should expose one obvious path:

```text
Search -> install useful entry -> optionally follow the source feed
```

Everything else should be progressive disclosure. Users should not see ACLs,
feed revision pinning, tenant review state, and policy controls until they ask
for feed details or settings.

Recommended normal-user sections:

- `My feed`: direct personal entries plus followed named feeds, with source
  labels preserved.
- `Following`: named feeds currently included in the user's personal effective
  feed.
- `Shared with me`: named feeds shared directly with the user or their groups
  that are not yet followed.
- `From my organization`: tenant-visible and tenant-approved feeds, clearly
  separated by trust state.
- `Marketplace`: broad discovery where enabled.

### Search Scope

The default `/skills` search should search both entries and feeds the user can
access. A user searching for "finance" should see individual finance skills and
named feeds such as "Finance analyst pack" when those feeds are shared with the
user, shared with one of their groups, tenant-visible, or tenant-approved.

The entry search scope should search the user's personal effective feed:

```text
Default skill search =
  direct personal entries
  + followed named feeds
  + tenant-approved feeds
  + tenant-visible feeds if enabled
  + marketplace if enabled
```

Search results should carry source labels so users understand why an item is
present:

- `Personal`
- `Following: <feed name>`
- `Shared by <owner>`
- `Tenant visible`
- `Tenant approved`
- `Marketplace`

Search should support mixed result types:

| Result type | Example | Primary action |
| --- | --- | --- |
| Entry | `Excel review skill` | Install or save. |
| Named feed | `Finance analyst pack` | Follow or open feed. |
| Tenant-approved feed | `Approved incident response baseline` | Follow/open, or install selected entries. |
| Marketplace source | `MOS3 marketplace` | Browse/search source where enabled. |

Feed results should appear when:

- the feed name, description, owner, tags, or included entry metadata matches
  the query;
- the feed is shared directly with the user;
- the feed is shared with one of the user's groups;
- the feed is tenant-visible;
- the feed is tenant-approved.

Feed results should not imply every entry is tenant-approved. A tenant-visible
feed result must still carry `Tenant visible`, not `Tenant approved`, unless it
has been promoted.

Source labels must be actionable. Opening a source label should explain:

- why this result appeared;
- who owns the source feed;
- whether the source is shared, tenant-visible, tenant-approved, or blocked;
- what revision supplied the entry;
- what the user can do next: follow, unfollow, pin, install, save, report, or
  request approval.

The search UI should offer lightweight scope controls:

- `All`
- `My feed`
- `Following`
- `Organization`
- `Marketplace`

These should be filters, not separate mental models. A user can search first,
then decide whether to install an entry, follow the feed it came from, or open
the feed details.

### Adding Feeds From Search

Search results that come from a named feed should expose feed-level actions:

- follow the source feed;
- open feed details;
- see who owns the feed;
- see whether the feed is shared, tenant-visible, or tenant-approved;
- request tenant approval when appropriate.

This creates a natural viral loop:

```text
Search -> find useful skill -> see source feed -> follow feed -> more results
```

Users should also be able to discover feeds directly through a `Feeds` or
`Sources` panel inside `/skills`. That panel is user-facing configuration, not
tenant-admin composition.

Recommended `/skills` feed configuration:

- `Following`: feeds included in my search.
- `Shared with me`: feeds I can follow.
- `From my organization`: tenant-visible and tenant-approved feeds.
- `Marketplace sources`: marketplace/feed sources available to me where
  enabled.

Each feed row should have `Follow`, `Following`, `Unfollow`, and optionally
`Pin revision`. Search should update immediately after follow/unfollow.

### Settings

There should be a lightweight personal setting for search sources:

- include followed feeds in search;
- include tenant-visible feeds in search;
- include marketplace in search;
- default search scope: all, my feed, organization, marketplace;
- show unapproved community results.

This can live in a `/skills` drawer or settings panel. It should not force
normal users into the tenant-admin `/feeds` page.

### Diagnostics

Power users and support need a way to answer "why is this result here?" and
"why did this result disappear?"

Each result and feed details page should expose a compact provenance view:

- source feed and owner;
- feed revision;
- matched search scope;
- trust labels;
- blocked or revoked reason;
- install selector;
- last refresh time.

This can start as a details panel, not a full audit console.

Feed details should show owner, visibility, trust state, entries, versions,
provenance, install actions, and follow state. Recipients can install selected
entries into their own personal feed or follow the named feed so it participates
in their personal effective feed.

Authors need simple actions:

- create named feed from selected personal-feed entries;
- add or remove entries;
- publish a version;
- share with people/groups;
- make visible to tenant;
- request tenant approval;
- copy link.

Recipients need simple actions:

- follow feed;
- pin followed revision;
- unfollow feed;
- install selected entry;
- save a followed entry as a direct personal entry;
- report or request admin review.

Tenant admins need a separate review experience:

- review tenant-visible feeds;
- inspect provenance, package defense, policy impact, and usage;
- approve, deny, pin, scope, or block;
- publish approved feeds into the tenant-approved effective feed.

## API Shape

The first implementation should be small and explicit:

```text
GET  /v1/scout/feeds/named
POST /v1/scout/feeds/named
GET  /v1/scout/feeds/named/{feedId}
POST /v1/scout/feeds/named/{feedId}/entries
POST /v1/scout/feeds/named/{feedId}/publish
POST /v1/scout/feeds/named/{feedId}/share
POST /v1/scout/feeds/named/{feedId}/tenant-visible
POST /v1/scout/feeds/named/{feedId}/approval-requests
POST /v1/scout/feeds/named/{feedId}/install
POST /v1/scout/feeds/named/{feedId}/follow
DELETE /v1/scout/feeds/named/{feedId}/follow
GET  /v1/scout/feeds/personal/effective
```

The exact route names can change to match Lobster conventions, but the
capabilities should stay distinct:

- create/update named feed metadata;
- mutate draft entries;
- publish a signed/versioned feed revision;
- manage ACL/visibility;
- install selected entries into the caller's personal feed;
- include or remove a named feed from the caller's personal effective feed;
- project the caller's personal effective feed with source provenance;
- request or perform tenant approval.

## Data Model

A named feed record should carry:

- stable `feedId`;
- tenant scope;
- owner principal;
- optional group/team owner;
- display name and description;
- visibility state;
- ACL entries for users and groups;
- current draft revision;
- current published revision;
- trust state: personal, shared, tenant-visible, tenant-approved, blocked;
- source/provenance summary;
- created/updated timestamps;
- audit actor and reason fields.

A published feed revision should be immutable. Editing creates a draft and then
a new published revision. This gives recipients and admins something stable to
inspect, install, approve, or roll back.

A followed-feed record should carry:

- tenant scope;
- follower principal;
- named `feedId`;
- followed mode: latest or pinned revision;
- pinned revision id when applicable;
- source visibility at follow time;
- trust state at follow time;
- created from share link, discovery, tenant-visible browse, or admin
  recommendation;
- created/updated timestamps.

An effective-feed entry should carry:

- logical entry id;
- item type;
- source kind: direct personal, followed named feed, tenant-approved,
  marketplace, MOS3 acquisition, source feed;
- source feed id and revision where applicable;
- trust labels;
- install selector;
- version and pin state;
- blocked/revoked state and reason where applicable.

Audit events should be emitted for:

- named feed created, updated, published, deleted;
- visibility changed;
- people/group ACL changed;
- feed followed, unfollowed, or pinned;
- entry installed or saved from a followed feed;
- tenant-visible feed requested for approval;
- tenant admin approved, denied, pinned, scoped, blocked, or revoked a feed or
  entry.

The audit event should include actor, tenant, feed id, revision id, entry id
where applicable, before/after visibility or trust state, reason, and
correlation id.

## Guardrails

- Do not share the mutable personal feed object directly.
- Do not let tenant-visible imply tenant-approved.
- Do not let share links bypass tenant, ACL, or auth checks.
- Do not collapse followed-feed provenance into direct personal entries.
- Do not silently auto-follow a feed just because a user viewed it.
- Do not allow remote shared feeds to install local `file://` artifacts.
- Do not allow a feed entry to imply runtime permission; runtime consent and
  execution policy stay separate.
- Do not collapse Microsoft review, package defense, tenant approval, and user
  popularity into one "safe" flag.
- Do not require tenant admin involvement for invite-only or tenant-visible
  sharing unless the tenant has explicitly disabled that capability.
- Do not make named feeds Lobster-only if the feed document can remain portable
  across OpenClaw, Scout, ClawHub, MOS3, and future clients.
- Do not hide blocked/locked reasons behind generic errors; show the owner or
  policy source users can act on.

## Policy Controls

Tenants should eventually be able to configure:

- whether users can create named feeds;
- whether users can share with specific people/groups;
- whether users can make feeds tenant-visible;
- whether external or cross-tenant sharing is allowed;
- which artifact types are allowed in user-shared feeds;
- whether tenant-visible feeds require package defense or automated review;
- who can promote shared feeds to tenant-approved status.
- emergency block/kill controls for a named feed, owner, publisher, entry, or
  source;
- audit export for feed sharing and approval events.

The default for viral growth should be internal sharing enabled and tenant-wide
visibility enabled behind a product flight. External sharing should stay out of
scope for the first pass.

## Portability

Named feeds should be backed by a portable feed document wherever possible. A
user or admin should be able to export a published revision, inspect it, and use
it in another compatible client subject to that client's policy.

Portability requirements:

- stable feed id and revision id;
- entries with exact install selectors and provenance;
- no tenant/user secrets in exported feed documents;
- signatures or attestations where available;
- explicit scope metadata so clients can reject feeds outside their tenant or
  policy boundary;
- clear behavior when a client cannot honor a feed item type.

This keeps the model aligned with OpenClaw and ClawHub instead of making feed
sharing feel like a closed Lobster-only feature.

## MOS3 Storage And Search Strategy

The target system of record should be MOS3, not a long-lived Lobster-only named
feed store. MOS3 already has adjacent concepts we should reuse: titles,
packages, acquisitions, assignments, marketplace browse/query, shared titles,
owned titles, package publish, ACL, and owner operations. Those are the right
building blocks for named feeds, sharing, tenant visibility, and search.

Evidence from Aether's MOS3 plugin-sharing path suggests MOS3 title ACLs can
represent the personal/shared/tenant visibility shape we want:

| Feed visibility | Candidate MOS3 ACL shape |
| --- | --- |
| Private | `ForAllUsers=false` and no ACL entities. |
| Shared with people/groups | `ForAllUsers=false` and `Entities` contains user or group principals. |
| Visible to tenant | `ForAllUsers=true`. |

Aether reads title ACLs through
`GET /builder/v1/users/titles/{titleId}/allowed?idType=TitleId` and writes them
through `POST /builder/v1/users/titles/{titleId}/allowed` with a complete
`EntityCollection` replacement body. Aether derives `personal`, `shared`, and
`tenant` share scope from that response. When edit grants change, it also
updates MOS3 title owners through `PUT /builder/v1/users/titles/{titleId}/owners`.

That is good evidence that a personal-level MOS3 title can carry an ACL and be
shared with users, groups, or the tenant. It does not yet prove that MOS3 has a
first-class named-feed or collection object with immutable revisions, follow
state, and mixed entry/feed search. Treat the MOS3 title ACL as the candidate
visibility model, and validate the object model separately.

However, we should not assume MOS3 already has a first-class named-feed object
with exactly the follow/search/revision semantics in this plan. Before coding
the full stack, validate the MOS3 contract for:

- creating a user-owned or group-owned collection;
- publishing immutable revisions;
- granting access to users and M365 groups with the same title ACL semantics
  Aether uses for plugins;
- making a collection tenant-visible through `ForAllUsers=true` without tenant
  approval;
- querying collections by name, description, owner, tags, and contained entry
  metadata;
- returning both collection results and entry results from search;
- storing follow/include relationships per user;
- preserving audit events for publish, share, follow, install, and admin
  promotion;
- promoting a selected collection revision or selected entries into the
  tenant-approved effective feed.

Recommended implementation posture:

```text
If MOS3 supports the needed primitive:
  use MOS3 as the write/read authority.

If MOS3 does not support it yet:
  build the smallest Lobster bridge that preserves MOS3-compatible ids,
  revisions, ACL shape, audit fields, and feed documents.

Do not create a permanent Lobster-only semantic model.
```

For search efficiency, the product should not scan raw feed JSON on every
request. It should query or index normalized feed metadata and entries:

- MOS3 search should be used when it can return authorized collection and entry
  results for the caller.
- Lobster may maintain a materialized search projection/cache for the `/skills`
  UX, especially for mixed result types and effective-feed diagnostics.
- Search indexing must preserve source provenance and trust labels, not flatten
  everything into one anonymous result set.
- ACL filtering must happen before results are shown; result ranking should not
  leak names of private feeds the caller cannot access.

This makes MOS3 the preferred long-term authority while allowing Lobster to
prove the UX and bridge gaps without blocking on every MOS3 API landing first.

### MOS3-First Product Contract

For the product path, Lobster file-backed feeds are a development, proof, and
fallback mechanism. MOS3 should be the authority for feed identity, collection
identity, ACLs, artifact metadata, effective-feed composition, tenant review,
search, follow/include state where available, and audit.

Concrete storage target:

- Named feed metadata should be a MOS3 title/collection-like object with stable
  feed identity, owner, visibility, ACL state, draft pointer, and published
  revision pointer.
- Published feed revisions should be immutable MOS3 package/artifact/feed
  document revisions. Entries inside those revisions preserve exact selectors,
  source provenance, trust labels, and artifact references rather than copying
  opaque bytes into Lobster.
- Follow records should be a MOS3 per-user include/acquisition-like
  relationship when MOS3 supports it. If MOS3 does not have that primitive yet,
  Lobster may bridge follow records short term with MOS3-compatible ids,
  revision references, trust labels, and audit fields.
- Search should use MOS3 authorized search when it can return mixed feed and
  entry results. If MOS3 cannot serve the `/skills` mixed search shape yet,
  Lobster may keep a materialized projection/cache, but MOS3 remains the
  semantic authority.

Concrete ACL target:

| Visibility | MOS3 ACL shape |
| --- | --- |
| Private | `ForAllUsers=false` and no `Entities`. |
| Shared with people/groups | `ForAllUsers=false` and `Entities` contains user or group principals. |
| Tenant visible | `ForAllUsers=true`. |

Tenant-visible does not mean tenant-approved. Tenant approval is a separate
governance state that should point at a specific named-feed revision or selected
entries. The ACL answers who can discover/view/install from the feed; approval
answers what the tenant endorses.

Lobster should act as:

- the UX and API adapter for `/skills` and `/feeds`;
- the auth, token, tenant, and caller-context forwarder;
- a cache or projection layer when MOS3 needs help serving the UX efficiently;
- a short-term bridge for MOS3 gaps, not the permanent semantic store for named
  feeds.

The contract Lobster should ask MOS3 to provide is:

1. Tenant-approved effective feed: given a tenant, caller, and optional client
   scope, return a signed or attestable feed document with approved entries,
   source revisions, trust labels, block or deny reasons, and version pins. This
   should replace `LOBSTER_SCOUT_APPROVED_FEED_DIR` as the product source.
2. Personal effective feed: given a tenant and caller, return direct
   acquisitions, personal publishes, followed named feeds, tenant-approved
   entries, and policy blocks with provenance. This should replace
   `LOBSTER_SCOUT_PERSONAL_FEED_DIR` as the product source, except for local
   draft overlays.
3. Named feed or collection object: create and update drafts, publish immutable
   revisions, assign a user or group owner, apply ACLs using `ForAllUsers` plus
   `Entities`, and export a portable feed document for each revision. Entry
   types should include skills, plugins, policy baselines, MCP servers,
   connectors, and agent templates.
4. Share, discovery, and search: list feeds shared with the caller, shared with
   the caller's groups, tenant-visible, and tenant-approved; return mixed entry
   and feed results with ACL filtering before ranking; preserve source labels
   and provenance.
5. Follow/include: store a per-user include relationship to a named feed's
   latest published revision or a pinned revision. If MOS3 has an
   acquisition-like primitive for this, use it. Otherwise Lobster can bridge
   this relationship short term.
6. Tenant-admin review: review a shared or tenant-visible feed revision, approve
   selected entries or a selected revision into the tenant-approved feed, pin or
   scope approvals, block or revoke feed sources, and expose audit state.
7. Artifact bytes: use MOS3 title/package artifacts when possible. Lobster-hosted
   artifacts should remain a dev, local, or bridge path unless MOS3 cannot
   upload or serve the required artifact type.
8. Audit and diagnostics: emit audit for publish, share, follow, install,
   approve, deny, revoke, and block events. Lobster should display diagnostics
   with MOS3 correlation ids where possible.

Policy baselines already point in this direction. Lobster's policy route can
publish a policy JSONC package to MOS3 and record a `PolicyBaselineArtifactRef`
with `store=mos3`, MOS3 artifact id, revision, SHA-256, and attestation. That
means policy feed entries should reference the MOS3-governed policy artifact
instead of inventing a second policy blob store inside Lobster. The remaining
gap is policy/feed selection and effective policy state: today's Lobster path
still records accepted personal baselines, tenant feed-source selection, and
effective baseline state in durable Lobster JSON and reads tenant-approved feed
docs from configured feed directories. The MOS3-first target should move those
selection, approval, and effective-state semantics to the same MOS3 feed or
collection authority as skills and plugins.

### Migration From Current Lobster Shape

Current Lobster Scout feeds are hybrid:

- `/v1/scout/feeds/personal.json` can use live MOS3 acquisitions, then file
  fallback or overlays;
- `/v1/scout/feeds/marketplace.json` can use MOS3 marketplace query;
- `/v1/scout/feeds/approved.json`, tenant admin catalog state, personal overlays,
  and hosted personal artifact bytes can still be file-backed through configured
  durable directories.

The product target is:

- approved, personal, marketplace, named-feed, and admin-review routes call MOS3
  APIs when configured;
- file-backed environment variables remain for local development, tests, and
  fail-closed bridge proof;
- 301 can serve real feed state without relying on Lobster local durable dirs.

Migration phases:

1. MOS3 contract validation: prove title or collection object shape, ACLs,
   immutable revisions, search, follow/include, tenant-admin promotion, artifact
   serving, and audit.
2. Lobster route adapter: add MOS3-backed sources for approved feeds, personal
   effective feeds, admin catalog/review state, and named feeds behind
   environment or flight configuration.
3. Search projection: use MOS3 search directly when possible; add Lobster cache
   or index only for mixed results, diagnostics, or temporary MOS3 gaps.
4. Retire file-backed product dependency: keep file-backed paths for local dev
   and tests, but do not depend on them for production tenant feed behavior.

Deployment success criteria:

- 301 returns real signed or attestable feed JSON through MOS3 without local
  file-backed feed dirs.
- The admin catalog/review route reflects MOS3 review and promotion state.
- The personal effective feed includes MOS3 acquisitions, personal publishes,
  followed named feeds, tenant-approved entries, and policy blocks.
- `/skills` search shows source labels, trust labels, and provenance.
- MOS3 outages produce typed fail-closed errors rather than silent empty feeds.

### Execution Plan To Make 301 Real

The next work should be measured against one concrete outcome: a live 301 tenant
can render `/skills` and `/feeds` from MOS3-backed state without relying on
Lobster local durable feed directories for product data.

Do this in three slices before adding more sharing UX:

1. Inventory the current route-to-store map. For every live endpoint used by
   `/skills`, `/feeds`, and `/policy`, record the current source of truth, the
   required env vars, the fail-closed error, and the MOS3 target.
2. Add a MOS3 capability probe and route-source diagnostics endpoint or log
   block. Operators should be able to tell whether approved, personal,
   marketplace, admin catalog, policy artifact publish, and policy source
   selection are using MOS3, file fallback, or unavailable state.
3. Replace one real product dependency at a time, starting with tenant-approved
   feed/admin review state. Do not add named-feed UX until the approved-feed
   route can be backed by MOS3 or a documented MOS3-compatible bridge with a
   clear retirement path.

The first PR should therefore be small but concrete:

- document the route-to-store matrix in Lobster docs;
- add runtime diagnostics that expose source mode without leaking tenant/user
  secrets;
- preserve current typed fail-closed behavior;
- prove in tests that missing MOS3/file config reports the exact unavailable
  source and that configured MOS3 routes identify themselves as MOS3-backed.

That gives us a deployable way to validate 301. If the diagnostics show that a
route still needs `LOBSTER_*_DIR` in production, it is not "real" yet; it is a
bridge.

### Lobster Storage Fallback

Today's Lobster Scout feed stack is already hybrid:

- live personal feed projection can be MOS3-backed through the caller's MOS3
  acquisitions;
- marketplace discovery can be MOS3-backed through the MOS3 marketplace query;
- tenant-approved feed documents, personal feed overlays, hosted personal
  artifacts, and tenant admin catalog state are file-backed under configured
  durable directories;
- hosted personal writes require an explicit durable-storage acknowledgement
  before Lobster mutates feed or artifact state.

If MOS3 cannot own named-feed records immediately, the fallback should stay
compatible with the same shape:

1. Store each named feed as a signed feed document plus immutable revision files.
2. Store ACL metadata next to the feed using the MOS3-compatible shape:
   `ForAllUsers` plus user/group `Entities`.
3. Store follow/include relationships separately from direct personal entries.
4. Maintain a materialized search projection for `/skills` rather than scanning
   every feed document on each request.

Using the agent's OneDrive is plausible, but only as a deliberate feed-document
store, not by hiding feed state inside the OpenClaw workspace repo. Lobster
already persists OpenClaw workspace state as a git repo on the user's
Graph/SPO drive. That is good evidence the platform can use the user's M365
storage, but that workspace repo is optimized for container state and passport
ownership, not shared catalog discovery. A feed store over OneDrive would need
explicit Graph-backed operations for:

- creating the feed document in a predictable app folder;
- publishing immutable revision files;
- granting user/group/tenant access to the file or folder;
- reading shared-with-me and tenant-visible feed metadata efficiently;
- indexing feed contents for authorized `/skills` search;
- preserving audit and revocation state outside the mutable document body.

The OneDrive model is attractive for viral sharing because the sharing ACL is
natural to users and tenants. The risk is search and governance: Graph file ACLs
can answer who can open a document, but they do not by themselves provide the
feed-specific search index, trust labels, tenant approval state, or follow
projection. If we choose OneDrive as the bridge, Lobster still needs an indexed
metadata/provenance layer.

## PR Plan

### PR 1: Followable Feed Foundation And MOS3 Contract

Document and implement the foundation for feed identity and follow state behind
the existing feeds UX flag. Feed identity should distinguish `named`, `source`,
`tenantApproved`, and later marketplace/acquisition-backed feeds. Personal feeds
remain private and are not shared directly. A followed-feed record should store
the feed id, feed kind, source registry or owner, follow mode (`latest` first,
with pinned revision support in the shape), visibility/trust labels, and
provenance. Validate the MOS3 object model for title or collection identity,
ACLs, immutable revisions, search, follow/include, tenant-admin review, artifact
serving, and audit. Map each current Lobster file-backed environment variable
to its intended MOS3 replacement or temporary fallback.

### PR 2: Lobster MOS3 Feed Source Adapter

Route approved feeds, personal effective feeds, marketplace feeds, admin catalog
state, and named-feed reads through MOS3 when configured. Preserve file-backed
storage for local development, tests, and fail-closed bridge proof, but keep it
out of the product authority path.

### PR 3: Named Feed Draft And Publish

Let a user create a named feed from selected personal-feed entries and publish an
immutable revision through the MOS3 object model, or through the smallest
MOS3-compatible bridge if the native object is not ready. Preserve exact
selectors, package provenance, artifact URL sanitization, and entry type
restrictions.

### PR 4: Share With People And Groups Through MOS3 ACL

Add ACL management and "shared with me" discovery using the MOS3 `ForAllUsers`
and `Entities` shape. Recipients can view the feed, follow it, and install
selected entries into their own personal feed.

### PR 5: Follow Named And Source Feeds

Add follow/unfollow APIs and include followed named feeds and allowed source
feeds such as ClawHub in the caller's personal effective feed. Keep
followed-feed provenance visible in APIs and UI so users can distinguish direct
personal entries from entries inherited from a followed named feed or a followed
source feed. Add a personal effective-feed projection endpoint rather than
physically merging followed entries into the stored personal feed.

### PR 6: Search Scope And Feed Configuration

Make `/skills` search the personal effective feed by default, add source labels
to results, add scope filters, and add user-facing feed configuration for
Following, Shared with me, Organization, and Marketplace sources.

### PR 7: Tenant-Visible Discovery

Add tenant-visible feeds to normal-user discovery, separate from
tenant-approved results. The UX must make unapproved/community status obvious.

### PR 8: Tenant Approval Queue

Add tenant-admin review and promotion from MOS3 named-feed state to the
tenant-approved feed. Approval should preserve the named feed's provenance and
selected revision, not blindly trust the owner's latest mutable draft.

### PR 9: Audit, Block, And Diagnostics

Add feed lifecycle audit events, support diagnostics for why search results
appeared or disappeared, and tenant emergency block controls for feeds, entries,
owners, publishers, and sources.

### PR 10: Policy And Artifact-Type Expansion

Generalize the same named-feed lifecycle to policy baselines, plugins,
connectors, MCP servers, and other feed item types. Add tenant policy controls
for which types users may share.

## Open Questions

- Should tenant-visible feeds appear on `/skills`, `/feeds`, or both?
- Should follow default to latest published revision, pinned revision, or ask
  per feed?
- Should `/skills` default to all available sources or only personal effective
  feed plus tenant-approved sources?
- Should feed configuration live as a drawer on `/skills`, a user settings
  page, or both?
- Should saving a followed entry as direct personal preserve the source feed
  reference forever for audit?
- Should tenant approval promote whole named-feed revisions, selected entries,
  or both in the first admin UX?
- What is the minimum audit export shape needed before tenant-visible sharing
  is enabled broadly?
- Should users be able to export named-feed revisions in MVP, or is API-level
  portability enough for the first slice?
- Which M365 group identifier should be accepted first for ACLs?
- Does MOS3 already have a first-class collection/named-feed object, or do we
  model named feeds over titles plus ACL/owner operations?
- Does MOS3 allow the same title ACL shape on whatever object type we use for
  named feeds, including user-owned, group-owned, and tenant-visible objects?
- Does MOS3 support immutable published revisions for collection or feed
  documents?
- Does MOS3 search include collection metadata and contained entry metadata with
  ACL filtering before ranking?
- Does MOS3 expose follow or acquisition semantics for a shared collection?
- Does MOS3 expose tenant-admin promotion of a collection revision into an
  approved effective feed?
- Does MOS3 serve signed feed documents directly, or return normalized records
  for Lobster to attest?
- Can MOS3 search return mixed authorized results for entries and collections,
  or does Lobster need a materialized search projection for `/skills`?
- What tenant policy defaults are acceptable for internal Microsoft dogfood?
