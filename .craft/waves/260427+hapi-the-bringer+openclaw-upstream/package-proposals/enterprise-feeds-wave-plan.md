# Enterprise Feeds Wave Plan

## Top-level pitch

OpenClaw already has ClawHub for broad skill/plugin discovery, but enterprises
need a way to decide which of those capabilities are eligible for their
workspaces without forking the marketplace or building a second installer.

The proposal is Enterprise Feeds: a hybrid feed model where ClawHub publishes
public baseline feeds like reviewed, official, clean-scanned, and source-linked,
while enterprises layer their own private or distributed feeds on top. OpenClaw
then uses the configured feed stack to annotate search results, prefer approved
entries, block risky installs, and produce audit-friendly findings.

This keeps the normal user experience intact:

```bash
openclaw skills search calendar
openclaw skills install calendar-booker
openclaw plugins install clawhub:@openclaw/diagnostics-otel
```

But in managed workspaces those commands become feed-aware:

```text
calendar-booker       approved   contoso-approved
calendar-summary      warning    only in clawhub-reviewed
calendar-auto-send    blocked    contoso-blocklist
```

The key design point is that ClawHub remains distribution and public trust
metadata, while Enterprise Feeds handles organization-specific eligibility.
Companies do not need to assess all of ClawHub. They subscribe to public feeds,
add private approvals/blocklists, and choose whether unknown entries warn or
deny.

This is portable: feeds can be hosted by ClawHub, Lobster, an enterprise HTTPS
endpoint, an internal Git repo, or a local workspace file. If ClawHub adds
first-class hosted feeds, it becomes the natural public/default source; if not,
OpenClaw can still consume distributed feeds with the same schema.

## Role review

Founder and upstream maintainer: the hybrid model avoids enterprise capture.
Public ClawHub feeds are useful to everyone, and enterprise overlays remain
optional. Normal search and install commands stay unchanged.

CISO, compliance, and enterprise IT admin: the design gives them central
approved feeds, deny/default behavior, auditable feed versions, and a path to
signed/materialized snapshots. Private editable feeds are useful but should not
be in the first ClawHub PR.

ClawHub curator: ClawHub should not become every enterprise's policy engine.
Its job is to project existing review, scan, readiness, provenance, ownership,
and version facts into public feeds. Enterprises can tighten downstream.

Skill author and skill consumer: authors should not need a new publishing
ceremony. Consumers should see trust/feed signals before install. Feed-aware
search is part of the product, not a later nice-to-have.

Gateway and platform: enforcement should sit on search, install, update, and
audit flows. It should be cacheable, deterministic, and easy to bypass by
removing the optional package.

Policy steward: policy should check that Enterprise Feeds is configured
correctly. Policy should not duplicate feed entries or become another package
allowlist format.

## PR order

### PR 1: ClawHub public feed schema and lazy endpoints

Add shared feed schema types, static public feed definitions, `GET
/api/v1/feeds/:id`, `GET /api/v1/feeds/:id/entries`, and feed-scoped search.
Resolve entries lazily from existing ClawHub package/skill catalog metadata.
Do not add private editable feeds yet.

### PR 2: OpenClaw `@openclaw/enterprise-feeds` parser/check

Add feed source parsing, `FeedEntry`, `FeedRequirements`, installed inventory
matching, and `openclaw feeds check --json`.

### PR 3: OpenClaw search/install eligibility hook

Keep normal `skills search/install` and `plugins search/install`, but annotate,
rank, or filter results based on the configured feed stack. Installs can warn or
deny.

### PR 4: Enterprise/distributed feed adapters

Add URL/file feeds, ClawHub feed source, synthetic ClawHub filter source,
source health findings, cache, and provenance metadata.

### PR 5: Policy conformance follow-up

Policy only checks that enterprise-feeds config conforms: required sources,
mode, unknown behavior, signature/scan/review requirements, and evidence hash.
It does not duplicate feed entries.

### PR 6: ClawHub materialized/private feeds

After the feed contract is proven, add signed snapshots, diffs, feed membership
lifecycle hooks, then private org feeds with ownership, permissions, UI, and
API management.

## Fallback

If ClawHub hosted feeds do not land quickly, Lobster can publish the same feed
schema as a URL service. That keeps OpenClaw's Enterprise Feeds consumer stable
whether the feed producer is ClawHub, Lobster, or an enterprise system.
