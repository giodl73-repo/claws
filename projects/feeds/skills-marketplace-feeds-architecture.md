# Skills Marketplace Feeds Architecture

## Audience

This note is for Microsoft teams evaluating an internal skills or plugin
marketplace. It summarizes the feeds model we have been designing around
OpenClaw, Scout, ClawHub-style sources, and enterprise curation. It does not
assume access to the Lobster repo.

## Objective

Offer a simple, distributable way for organizations to publish, curate, search,
approve, and install skills/plugins from multiple sources without requiring
every client to trust every public marketplace entry directly.

The model is intentionally feed-based:

- Source marketplaces publish raw catalogs of skills/plugins.
- Feed producers transform one or more sources into signed or versioned feed
  artifacts.
- Enterprises curate feeds into approved subsets.
- Clients search and install through configured feeds instead of scraping or
  directly querying every source.

## Core Model

## Current Scout/Lobster Proof

The model below is no longer only conceptual. The current Lobster/Scout stack
has implemented the first feed-contract slices:

- local Scout feed CLI and approved-feed skill install into an OpenClaw target
  directory;
- MOS3 catalog export import into Scout feed documents;
- live MOS3 acquisition import into Scout feed documents;
- hosted tenant-approved feed serving at `/v1/scout/feeds/approved.json`;
- drafted personal feed projection at `/v1/scout/feeds/personal.json`.

The remaining marketplace work is composition and administration: deciding
which source catalogs are eligible, reviewing or defending packages, applying
tenant allow/deny/pin/scope rules, and materializing the effective feeds that
clients consume.

### 1. Source Catalog

A source catalog is where skills/plugins originate. Examples:

- A public ClawHub-style marketplace.
- A Microsoft internal marketplace.
- A team-owned repository of skills.
- A tenant-owned catalog maintained by admins.

Source catalogs may contain many entries and may expose metadata such as owner,
publisher, category, version, tags, source URL, package URL, compatibility, and
review status.

### 2. Feed

A feed is a consumable index over catalog entries. It is smaller and more
purposeful than the full source catalog.

A feed entry should answer:

- What is this skill/plugin?
- Where did it come from?
- Which version is approved or current?
- How can a client install it?
- What metadata supports search and filtering?
- Is it approved, reviewed, pinned, deprecated, or blocked?

Feeds can be public, internal, tenant-specific, or team-specific.

### 3. Curated Enterprise Feed

An enterprise feed is a curated view over one or more upstream feeds.

Typical curation modes:

- Include only Microsoft-owned entries.
- Include only reviewed entries.
- Include only entries approved by a tenant admin.
- Pin specific versions for controlled rollout.
- Block known-bad entries.
- Add local metadata such as business owner, support contact, or compliance
  notes.

This gives an enterprise a controlled marketplace without requiring a fork of
the entire upstream marketplace.

### 4. Client Consumption

Clients should not need to know every source marketplace API. They should be
configured with one or more feeds and use those feeds for:

- Search.
- Details lookup.
- Install.
- Update checks.
- Policy/compliance checks.

The client can cache a feed locally for fast search. For large catalogs, a local
SQLite index is preferred over repeatedly scanning raw JSON.

## Why Feeds Instead Of Direct Marketplace Search?

Direct marketplace search is useful for public discovery, but it is not enough
for enterprise control.

Feeds add:

- Curation: admins decide what is visible or installable.
- Portability: a feed can be hosted by the marketplace, by Microsoft, by a
  tenant, or by a team.
- Offline/cache friendliness: clients can search a local index.
- Auditability: entries can carry provenance and approval state.
- Extensibility: new marketplaces can be bridged into the same feed contract.
- Update visibility: clients can detect when installed entries have newer feed
  versions available.

## Recommended Feed Types

For a first marketplace rollout, start with a small number of well-understood
feeds:

| Feed              | Purpose                                                                        |
| ----------------- | ------------------------------------------------------------------------------ |
| All               | Everything the source catalog exposes. Useful for broad discovery and testing. |
| Official          | Entries published by the core product/team.                                    |
| Community         | Entries from non-core publishers.                                              |
| Reviewed          | Entries that passed a defined review or validation process.                    |
| Enterprise/Tenant | Entries approved for a specific organization or tenant.                        |

The most important enterprise feed is the final tenant-approved feed. Public
feeds help populate and refresh it.

## Feed Entry Shape

A practical feed entry should include:

```json
{
  "id": "skill.example",
  "kind": "skill",
  "name": "Example Skill",
  "description": "Short searchable description.",
  "publisher": "Example Team",
  "source": {
    "type": "clawhub",
    "url": "https://example/catalog/skill.example"
  },
  "version": "1.2.3",
  "install": {
    "type": "archive",
    "url": "https://example/downloads/skill.example-1.2.3.zip"
  },
  "metadata": {
    "tags": ["m365", "productivity"],
    "owner": "example-team",
    "reviewed": true,
    "approved": true,
    "pinned": false
  }
}
```

Exact schema can evolve, but the key contract is stable: identity, type,
version, source, install target, and curation metadata.

## Publishing Motions

There are two distinct publishing motions.

### Source Publishing

Skill/plugin authors publish to a source catalog.

Examples:

- Publish to a public marketplace.
- Publish to an internal Microsoft catalog.
- Publish to a team repository.

The source catalog is optimized for ingestion and broad discovery.

### Feed Publishing

Feed owners publish curated indexes.

Examples:

- A public marketplace publishes `all`, `official`, `community`, and
  `reviewed` feeds.
- A Microsoft internal service publishes a reviewed Microsoft feed.
- A tenant admin publishes an enterprise-approved feed.

The feed is optimized for client consumption, policy, and install controls.

## Update Model

Feeds should support update checks:

- Client records installed skill/plugin ID and version.
- Client refreshes configured feeds.
- Client compares installed versions with feed versions.
- Client reports available updates, blocked versions, or required upgrades.

Pinned entries mean the feed intentionally keeps clients on a specific version.
Pinning does not mean upstream stopped updating; it means the curated feed has
not admitted the newer version yet.

## Policy And Governance

Enterprise policy can require that clients only install from configured feeds.

Useful policy checks:

- Required feed URLs are configured.
- Search/install uses only allowed feeds.
- Installed skills/plugins exist in an approved feed.
- Installed versions match an approved or pinned version.
- Blocked entries are not installed.

Policy should check conformance. Runtime enforcement can be layered separately.

## Search And Performance

For small feeds, direct JSON search is acceptable.

For large catalogs, clients or feed tools should build a local index:

- Fetch feed artifacts.
- Normalize entries.
- Store searchable fields in SQLite.
- Search locally.
- Refresh incrementally where the source supports deltas.

This keeps client search fast even when upstream catalogs are large.

## Integration With MOS / Microsoft 365 Marketplace Work

For a MOS-owned skills marketplace, this feed model can be used as the
distribution and curation layer:

- MOS marketplace or catalog acts as a source catalog.
- MOS or a marketplace service publishes first-party feeds.
- Enterprises publish tenant-approved feeds derived from MOS/public feeds.
- Scout/OpenClaw-style clients consume the configured feeds.
- Admin surfaces can manage which feeds are allowed for a tenant.

This avoids forcing every client to directly integrate with every marketplace
API. Clients integrate with the feed contract, while marketplace services focus
on source-of-truth ownership, review, metadata, and publishing.

## Minimal First Implementation

The original minimal implementation is partly complete in the Scout feed stack.
For a new marketplace rollout, start with:

1. A feed schema for skills/plugins.
2. A feed generator that imports from one source catalog.
3. A local CLI to search a feed.
4. An approval/pinning file that produces an enterprise feed.
5. A client config setting listing allowed feed URLs.
6. Update detection for installed entries.

Defer:

- Complex trust scoring.
- Runtime enforcement.
- Rich UI marketplace management.
- Multi-cloud production rollout.
- Deep package scanning beyond metadata/provenance.

For the Microsoft Scout path, the next implementation layer should not create a
second feed schema. It should reuse the existing Scout `FeedDocument`,
tenant-approved hosted route, and personal projection route, then add the admin
composition layer on top.

## Open Questions

- What is the first source catalog for MOS skills?
- Who owns reviewed/official feed criteria?
- Does MOS need tenant-level feeds, global feeds, or both?
- What metadata is mandatory before a skill can appear in a reviewed feed?
- Should enterprise feeds be hosted centrally, tenant-locally, or both?
- What install formats must be supported first?
- Should clients support multiple configured feeds or one resolved effective
  feed?
