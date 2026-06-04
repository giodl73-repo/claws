---
title: Scout Feeds for Curated Skills, Plugins, and Connectors
audience: design review
created: 2026-05-29
status: draft
---

# Scout Feeds for Curated Skills, Plugins, and Connectors

## Summary

Scout is a standalone feed and catalog tool for agent skills, plugins, and
connectors. It consumes metadata from ClawHub, MOS3, internal registries, static
files, or other sources, normalizes that metadata into a small feed contract,
and publishes curated global or tenant feeds that clients can search and
consume.

This is not an OpenClaw plugin and not a marketplace. OpenClaw can consume Scout
feeds later, but the tool should also work for Lobster, Aether, oc-harness,
tenant administrators, CI jobs, and local administrative workflows.

The immediate goal is to solve the catalog governance problem without requiring
ClawHub to build native feeds first and without forcing every agent runtime to
download and refilter a full public catalog.

## Where Scout runs

Scout runs outside the OpenClaw runtime. It is an administrative feed tool and
feed service boundary, not an agent plugin that runs inside each user's
OpenClaw.

There are three intended operating modes:

| Mode | Where it runs | Who uses it | What it does |
|---|---|---|---|
| Local admin CLI | Operator laptop, CI job, or admin workstation | Platform/admin users | Imports source metadata, searches it, builds curated feeds, verifies feeds, and publishes feed artifacts. |
| Lobster-hosted feed service | Lobster control plane | Lobster platform and tenant admins | Stores root indexes, tenant rules, and materialized tenant feeds; serves authenticated feed documents to clients. |
| Client consumption | OpenClaw, Aether, oc-harness, or another runtime | End users indirectly through their client | Reads an approved feed, verifies attestation, searches approved entries, and compares installed packages to approved updates. |

Ordinary OpenClaw users should not have to run Scout to get work done. In a
managed Lobster deployment, they use their normal OpenClaw or Aether client.
Those clients can be configured to read a tenant-approved feed from Lobster.
The feed decides what is visible or installable through that managed channel;
the client still owns the actual runtime install and execution behavior.

Tenant admins can use Scout directly when they are operating a feed file or CI
publication flow. In hosted Lobster mode, tenant admins should eventually use a
Lobster admin surface or workflow that writes tenant feed rules, then Lobster
materializes and serves the tenant feed. Scout remains the contract and tooling
behind that workflow rather than a per-user runtime dependency.

This keeps the responsibility split clean:

- Scout produces and validates catalog metadata.
- Lobster hosts and scopes approved feeds for tenants.
- OpenClaw and Aether consume approved feeds.
- Source systems such as ClawHub and MOS3 remain package/catalog suppliers.
- Runtime install, execution, identity, and permissions stay with the consuming
  client.

## Motivation

Organizations need a way to decide which skills, plugins, and connectors their
users can discover or install. Public catalogs can be large, and enterprise
catalog posture is usually narrower than "everything that exists." A company
may want to expose only packages from approved owners, approved sources,
approved geographies, approved package types, or reviewed versions.

A feed gives operators a portable catalog artifact:

- platform teams can build root indexes from public and internal sources;
- governance teams can curate smaller approved feeds;
- tenants can receive only the feed materialized for their boundary;
- clients can search approved metadata without knowing every source system;
- installed-package update checks can compare against the approved feed instead
  of the full universe.

The OpenClaw feeds RFC proved the shape, but it was too OpenClaw-extension
centered. The better boundary is Scout: a generic feed tool that OpenClaw can
use, not a runtime plugin that owns the ecosystem.

## Goals

- Define a feed document contract for skills, plugins, and connectors.
- Support file-backed import, search, build, verify, and publish workflows
  before hosted infrastructure exists.
- Support curated global feeds and tenant-specific materialized feeds.
- Keep tenant identifiers out of serialized feed documents.
- Allow ClawHub integration without requiring ClawHub server changes.
- Allow MOS3 integration without leaking MOS3 auth, OBO, or environment details
  into the generic feed contract.
- Let clients detect newer approved versions of installed packages.
- Record performance proof for large catalogs, including entry count, file
  size, import time, search latency, and curated-feed size.

## Non-goals

- Do not build a marketplace UI in the first stack.
- Do not require OpenClaw runtime/plugin dependencies.
- Do not require ClawHub native feed support for V1.
- Do not make every client download and filter the full public catalog.
- Do not automatically install or update skills, plugins, or connectors.
- Do not promise malware, secret, or tool-risk assessment in V1.
- Do not treat feed attestation as proof that package code is safe.

## Feed model

```text
ClawHub / MOS3 / npm / internal registry / static feed
        |
        v
Scout root index
        |
        +--> global curated feed
        +--> tenant curated feed A
        +--> tenant curated feed B
        +--> local/offline exported feed
```

Scout separates package supply from feed governance:

| Role | Examples | Responsibility |
|---|---|---|
| Package producer | Skill authors, plugin authors, Microsoft connector teams | Create package artifacts and source metadata. |
| Source supplier | ClawHub, MOS3, npm/package registries, internal registries, static feeds | Expose package metadata and artifact coordinates. |
| Feed curator | Lobster ops, tenant admin, enterprise governance team, local operator | Choose which source entries are allowed, denied, pinned, or deprecated. |
| Feed provider | Local `scout feed publish`, Lobster endpoint, static blob/CDN host | Serve curated feed documents with attestation and cache metadata. |
| Feed consumer | OpenClaw, Aether, Lobster runtime, oc-harness, local scripts | Read, verify, search, and use approved package metadata. |

## Feed contract

The V1 feed document should be small and deterministic:

```jsonc
{
  "schemaVersion": 1,
  "feedId": "lobster-approved",
  "scope": {
    "kind": "tenant",
    "tenantIdHash": "sha256:..."
  },
  "generatedAt": "2026-05-29T00:00:00.000Z",
  "sourceRevision": "clawhub-snapshot:2026-05-29",
  "entries": [
    {
      "id": "calendar-helper",
      "type": "plugin",
      "version": "1.2.0",
      "title": "Calendar Helper",
      "description": "Meeting and calendar assistance.",
      "publisher": "platform",
      "source": {
        "registry": "clawhub",
        "package": "openclaw-calendar-helper",
        "url": "https://example.invalid/catalog/calendar-helper"
      },
      "artifactHash": "sha256:...",
      "updatedAt": "2026-05-29T00:00:00.000Z",
      "metadata": {
        "governance.state": "approved"
      }
    }
  ],
  "attestation": {
    "algorithm": "sha256",
    "hash": "..."
  }
}
```

Canonical hashing sorts entries by package type, id, version, and source
package, excludes the attestation field itself, and recursively serializes
object keys in lexical order. That keeps Scout-compatible feeds verifiable by
OpenClaw, ClawHub, and other producers using the same stable JSON contract.

The attestation proves feed integrity only. A verified feed means "these are
the exact curated entries Scout emitted." It does not mean the packages have
been security-assessed unless a later assessment adapter adds and attests that
metadata explicitly.

## Rules

V1 curation rules stay deliberately simple:

- deny wins over allow;
- an empty allow set means all baseline entries are eligible unless denied;
- a non-empty allow set means only listed ids are eligible;
- a pin keeps only the exact approved version for that package id;
- tenant rules store `tenantIdHash`, never raw tenant ids.

Example tenant rule file:

```jsonc
{
  "tenantIdHash": "sha256:...",
  "baselineFeedId": "clawhub-root",
  "allow": ["calendar-helper", "docs-summarizer"],
  "deny": ["unapproved-shell-runner"],
  "pins": {
    "calendar-helper": "1.2.0"
  }
}
```

This supports approve-only feeds, bulk allow from a baseline, deny exceptions,
and exact version pinning without turning Scout into a full policy engine.

## CLI

The standalone command should be named `scout`. Catalog work should live under
`scout feed` so the top-level command remains available for other
administrative surfaces.

Initial commands:

```text
scout feed import <source> --out root.feed.json
scout feed search <query> --feed root.feed.json --json
scout feed build --source root.feed.json --rules rules.json --out approved.feed.json
scout feed verify approved.feed.json
scout feed publish approved.feed.json --target file://... --dry-run
```

Publishing workflow commands:

```text
scout catalog submit --catalog tenant.catalog.json --tenant <tenant> --source clawhub:<id> --type <kind>
scout catalog import --catalog tenant.catalog.json --tenant <tenant> --from-feed reviewed.feed.json
scout catalog list --catalog tenant.catalog.json [--status submitted|approved|rejected|update_available] [--json]
scout catalog validate --catalog tenant.catalog.json <package-id>
scout catalog approve --catalog tenant.catalog.json <package-id> [--version <version>]
scout catalog reject --catalog tenant.catalog.json <package-id> --reason <text>
scout catalog deny --catalog tenant.catalog.json <package-id> --reason <text>
scout catalog publish --catalog tenant.catalog.json --source root.feed.json --out approved.feed.json
scout catalog updates --catalog tenant.catalog.json --against root.feed.json --json
```

`scout feed ...` owns deterministic feed documents. `scout catalog ...` owns
tenant/admin review state and materializes approved feeds from that state. This
is the missing producer-side motion: authors publish packages through ClawHub,
MOS3, GitHub, npm, or internal registries; Scout imports or submits those source
records, validates normalized metadata, records approval state, and publishes an
attested feed for clients.

Later feed commands:

```text
scout feed outdated --feed approved.feed.json --against root.feed.json --json
scout feed deprecate <package> <message> --feed approved.feed.json
scout feed version patch --feed approved.feed.json
```

CLI principles:

- file-backed operation before hosted APIs;
- deterministic JSON output and stable sorting;
- explicit `--dry-run` for publish paths;
- explicit source/feed paths rather than hidden global state;
- readable text output plus `--json` for automation;
- no automatic install or update behavior in the feed command itself.

## Catalog lifecycle

Scout should manage catalog publishing without becoming the source package
publisher. Source systems keep their native package-publishing flows. Scout
manages the review and feed-publication lifecycle after a package exists.

```text
source package exists
        |
        v
submit or import into tenant catalog
        |
        v
validate normalized metadata
        |
        v
approve, reject, pin, deny, or deprecate
        |
        v
publish approved feed
        |
        v
clients search, install, or update from that feed
```

Catalog state should be file-backed first and durable in hosted Lobster mode.
Expected states:

| State | Meaning |
|---|---|
| `submitted` | Candidate was added by source import, admin submit, or automation. |
| `validated` | Required normalized metadata and source coordinates are present. |
| `approved` | Entry can appear in an approved feed. |
| `rejected` | Entry was reviewed and should not appear in an approved feed. |
| `denied` | Entry is explicitly blocked even if present in a baseline feed. |
| `pinned` | Entry is approved only at a specific version. |
| `deprecated` | Entry remains visible for transition but should not be newly adopted. |
| `update_available` | Upstream source changed and needs tenant review. |

## Source adapters

Adapters normalize source-specific metadata into the feed contract.

| Adapter | Role |
|---|---|
| Static Scout feed | V1 tests, offline proof, local bootstrap. |
| ClawHub | Public skill/plugin catalog source. |
| MOS3 | Microsoft marketplace/source adapter for `AgentSkills` and `AgentConnectors`. |
| npm/package registry | Later package metadata source for plugin artifacts. |
| Internal feed URL | Enterprise or Lobster-curated metadata source. |

Sources are additive. A source that cannot provide an optional field leaves it
empty rather than blocking import.

MOS3-specific fields should live in metadata or source coordinates, not in the
generic feed shape:

| Metadata key | Meaning |
|---|---|
| `mos3.titleId` | MOS3 title id. |
| `mos3.appId` | MOS app id when available. |
| `mos3.acquisitionContext` | `user`, `tenant`, or source-provided context. |
| `mos3.elementType` | `AgentSkills` or `AgentConnectors`. |
| `mos3.blobPath` | Public skill blob path when present. |
| `mos3.authReferenceId` | Connector auth reference id when present. |
| `mos3.environment` | MOS3 environment/source host label. |

## Hosted Lobster mode

When Lobster hosts Scout feeds:

- JWT validation supplies tenant and user identity.
- The per-tenant allowlist gate runs before feed access.
- The client does not supply tenant authority in the URL.
- Feed documents and rules store tenant hashes, not raw tenant ids.
- The endpoint returns a materialized feed for the authenticated tenant.

Initial endpoint:

```text
GET /v1/scout/feeds/approved.json
```

Hosted storage should keep:

- the latest root/source index;
- one or more global curated feeds;
- tenant feed rules;
- materialized tenant feed documents;
- attestation and source revision metadata.

Hosted telemetry should record feed id, source revision, generated timestamp,
entry count, tenant hash for tenant-scoped feeds, and cache path. It must not
log raw tenant ids from feed documents.

## Client consumption

A client should only need:

- feed URL;
- optional ETag/cache support;
- feed attestation verification;
- package id/type/version/source fields;
- update comparison against its installed package set.

OpenClaw, Aether, Lobster runtime jobs, oc-harness, and local scripts can all be
feed consumers. Scout should not assume one runtime owns the feed contract.

Aether is a likely first real consumer because it already has cloud/marketplace
skill plumbing, skill package references, and MOS3 catalog concepts. Scout
should provide the approved catalog before Aether hands selected packages to
its existing ingestion path.

## Performance expectations

OpenClaw feed experiments showed that a roughly 67K-entry catalog around tens
of megabytes is reasonable for central Lobster services and plausible for local
admin use. It is not the right shape for every agent runtime to refilter on
every startup.

Scout should optimize for:

- central/root imports that can handle full-catalog snapshots;
- materialized curated feeds that are much smaller than the root;
- ETag/source-revision checks for hosted feeds;
- deterministic local search over a feed file without network calls;
- future delta/watch support after the full-snapshot path is correct.

V1 proof should record:

- input catalog entry count and file size;
- import time;
- search latency for representative queries;
- curated feed size after allow/deny/pin materialization;
- hosted response behavior with unchanged ETag.

## PR plan

### PR 1: Feed contract and spec

Purpose: establish the stable document contract and design direction.

Includes:

- `FeedDocument`, package entries, source metadata, scopes, and attestations.
- Tenant-safe hashes and tenant feed materialization rules.
- Focused unit tests for canonical hashing, mutation detection, tenant id
  redaction, allow/deny/pin behavior, and baseline mismatch.
- This spec and the stack plan.

Does not include CLI binary, hosted API, ClawHub importer, OpenClaw bootstrap,
or package security/risk assessment.

### PR 2: Local Scout CLI

Purpose: make Scout useful without hosted infrastructure.

Includes:

- `scout feed import`, `search`, `build`, `verify`, and `publish --dry-run`.
- File-backed source/feed workflows.
- JSON output shape tests.
- Publish dry-run proof.
- Performance note for entry count, file size, import time, and search latency.

### PR 3: First real source adapter

Purpose: populate Scout from a real external catalog without requiring product
changes in that catalog.

Includes either ClawHub or MOS3 first, depending on which path is most stable.

Proof:

- fixture-backed import tests;
- large-catalog search smoke test;
- deterministic output for unchanged input;
- missing optional source metadata does not block import;
- source-specific dimensions land in metadata/source coordinates, not custom
  feed schema fields.

### PR 4: Hosted Lobster feeds

Purpose: serve global and tenant-approved Scout feeds from Lobster.

Includes:

- `GET /v1/scout/feeds/approved.json`;
- existing JWT and tenant allowlist gate;
- ETag/source revision support;
- storage for baseline feed, tenant rules, and materialized tenant feed.

Proof:

- authenticated tenant gets only its materialized feed;
- client-supplied tenant id is ignored or rejected;
- raw tenant id is not serialized;
- ETag returns not-modified for unchanged feeds;
- telemetry avoids raw tenant ids;
- materialized tenant feed size is measured against the root feed size.

### PR 5: Client consumption

Purpose: prove one real consumer against Scout feeds once external source
support exists.

Candidate consumers:

- Aether cloud-skill ingestion;
- OpenClaw;
- Lobster runtime job;
- oc-harness scenario.

Proof:

- client can search from a Scout feed;
- client can detect package updates from feed metadata;
- client rejects feeds with bad attestations;
- client distinguishes metadata-only entries from artifact-backed entries;
- client distinguishes tenant/admin-deployed entries from user-acquired entries
  when the source provides that dimension.

## Marketplace UI decision

This stack should not assume a marketplace UI. A feed provider is enough for
V1. A future marketplace effort can add browsing UI, publisher workflows,
reviews, certification, takedown, and tenant admin approval UI on top of the
same feed contract.

## ClawHub-native support

ClawHub does not need to support feeds for Scout V1 to work. Scout can import
from snapshots, API responses, static exports, or other metadata sources.

A later ClawHub-native PR could add:

- ClawHub-hosted public feeds;
- feed-aware search;
- server-side feed generation from catalog filters;
- update cursors or delta endpoints;
- a native subscription endpoint.

The local feed contract should land first so ClawHub integration has a stable
target instead of defining the entire feature.

## Open questions

1. Is `scout` the right name for the standalone administrative tool?
2. Is `scout feed` the right namespace for catalog work?
3. Is the V1 rule model enough: allow, deny, and exact version pins?
4. Should `outdated` land in V1 or after import/search/build/verify are proven?
5. Should hosted feeds be read-only first, with rule authoring via files/ops
   before UI?
6. Which source adapter should land first: ClawHub or MOS3?
7. What metadata is mandatory for enterprise review versus optional enrichment?
8. Should the feed contract eventually move into a standalone Scout crate?
9. Which first consumer gives the best proof: Aether, OpenClaw, Lobster runtime,
   or oc-harness?
10. Do we need a marketplace UI in this stack, or only a feed provider plus
    searchable metadata another UI can consume?

## Acceptance criteria

- A local operator can import or provide a source feed, search it, build a
  curated feed, and verify its attestation without network access.
- The same contract can be served by Lobster as a tenant-approved feed.
- Tenant materialization never serializes raw tenant ids.
- OpenClaw integration can be added later without changing the feed contract.
- The implementation remains useful even if ClawHub never adds native feed
  support.
