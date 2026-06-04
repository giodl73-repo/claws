# Enterprise Feeds and Context Budget Implementation Plan

## Goal

Prepare two OpenClaw package proposals that can follow the policy and oc-path
stack without turning into governance sprawl:

- `@openclaw/enterprise-feeds`: governed capability intake.
- `@openclaw/context-budget`: governed context efficiency.

Both packages should be optional plugins/extensions. Context Budget should start
with evidence and dry-run behavior. Enterprise Feeds should integrate with the
existing skill/plugin install path early, but as a filter/decorator over that
path rather than a second installer.

## Proposed order

### PR 1: Enterprise Feeds source parser and check report

Ship:

- package skeleton;
- feed source JSONC parser;
- workspace feed requirements JSONC parser;
- normalized `FeedEntry` type;
- normalized `FeedRequirements` type;
- installed skill/plugin inventory adapter;
- `openclaw feeds check --json`;
- stable findings for unknown/unapproved/stale entries;
- stable findings for required metadata that is missing from installed or
  marketplace metadata;
- sample feed fixture and docs.

Do not ship:

- install/remove commands;
- signature verification beyond metadata presence;
- ClawHub network sync;
- private marketplace hosting.
- policy section changes.

Reason: this proves the "ClawHub is discovery; Enterprise Feeds is curation"
boundary without requiring new distribution infrastructure. It also proves the
metadata gap explicitly: ClawHub supplies provenance, review, scan, owner,
version, and artifact evidence; the Enterprise Feeds supplies organization
requirements such as approved owners, required metadata, minimum trust tier, and
advisory versus enforcing mode.

### PR 2: Enterprise Feeds install/search eligibility hook

Ship:

- generic eligibility request/result types;
- hook registration point for existing skill/plugin search and install flows;
- advisory/enforcing mode;
- normal install path calls the hook before mutating the workspace;
- search results can carry eligibility annotations;
- search modes for annotate, prefer-approved, and filter;
- fixture tests for allow, warn, and deny.

Do not ship:

- a separate feed installer;
- automatic removal;
- M365-specific policy;
- broad ClawHub API redesign.

Reason: this is the differentiated piece. Users still install from ClawHub the
way they do today, but managed workspaces get a filter that can warn or block.

### PR 3: Enterprise Feeds policy conformance section

Ship:

- policy schema section for enterprise-feeds settings;
- conformance checks that verify feed mode, known-entry requirements,
  approved source ids, signature requirements, scan/review requirements, and
  minimum metadata requirements;
- policy evidence backed by `feeds check --json` output;
- docs showing how policy can require enterprise-feeds settings without
  duplicating feed entry definitions.

Do not ship:

- runtime enforcement beyond the existing install/search hook;
- full feed entry allowlists inside policy;
- second copies of ClawHub package metadata in policy.

Reason: policy should confirm that the workspace has the required enterprise
feed controls enabled. The enterprise-feeds package owns marketplace inventory
and entry matching; policy owns config conformance.

### PR 4: Enterprise Feeds source adapters

Ship:

- local file source;
- URL source with cache and provenance metadata;
- ClawHub API source that builds a feed snapshot from existing search, list,
  detail, security, readiness, and version endpoints;
- synthetic `clawhub-filter` source that resolves a bounded feed from ClawHub
  metadata without storing every package in the feed definition;
- optional ClawHub hosted-feed source if the feed endpoint exists by then;
- source health findings.

Do not ship:

- background sync daemon;
- paid marketplace concepts;
- claim that ClawHub already has a dedicated assessment-feed product;
- M365-only source semantics.

### PR 5: ClawHub hosted feeds

Ship only if maintainers agree feeds belong in ClawHub:

- ClawHub feed schema and endpoint;
- public root feed definitions, such as reviewed, official, clean-scanned, and
  source-linked;
- synthetic filter feeds and materialized feed snapshots;
- lazy feed resolution from existing package/skill catalog metadata;
- feed classification hook points for publish, review, rescan, revoke, and
  update events;
- feed-scoped search endpoints or query parameters;
- feed id, version, issued-at, entry list, and provenance metadata;
- OpenClaw enterprise-feeds source adapter for `clawhub-feed`;
- docs showing how an enterprise layers its own feed over ClawHub public feeds.

Do not ship:

- a separate install path;
- policy enforcement inside ClawHub;
- mandatory assessment for every ClawHub entry.
- private enterprise feed UI/API in the first ClawHub feed PR.

Reason: feeds make Enterprise Feeds distributable. Enterprises can curate the
skills/plugins they care about without running a separate marketplace, and
OpenClaw can consume the same feed shape as public reviewed feeds, enterprise
feeds, and local overrides. Start with lazy public feeds because existing
ClawHub catalog metadata already supports most filters. Add materialized
snapshots, signatures, diffs, and private editable feeds after the feed contract
is proven.

### PR 5 fallback: Lobster feed service

Ship only if ClawHub-hosted feeds are not accepted or cannot land soon:

- Lobster service/job that polls ClawHub API metadata;
- materialized root feeds from synthetic filters;
- feed versioning, diffing, and HTTPS publication;
- enterprise fork/overlay support;
- same feed schema consumed by OpenClaw Enterprise Feeds.

Reason: this proves the feed model without blocking on ClawHub product changes.
The schema must remain portable so the service can later move into ClawHub.

### PR 6: Context Budget audit report

Ship:

- package skeleton;
- report schema and normalized contribution type;
- static collectors for workspace docs and installed skills;
- token estimation utility with clear `estimated` markers;
- provenance fields for source, collection time, target URI, exact/estimated,
  stale, and missing values;
- `openclaw budget audit --json`;
- `openclaw budget report --format markdown`;
- fixture tests for deterministic reports.

Do not ship:

- edit application;
- memory deletion;
- model-quality scoring;
- provider billing reconciliation.

### PR 7: Context Budget runtime evidence adapter

Ship:

- readers for existing `systemPromptReport` context breakdowns;
- session store/transcript usage input when available;
- compaction before/after metrics input;
- provider usage input when available;
- stale/missing/exact/estimated markers;
- `openclaw budget explain --source <family> --json`.

Do not ship:

- changes to context engine behavior;
- mandatory runtime hooks;
- provider billing reconciliation.

### PR 8: Context Budget recommendations

Ship:

- `openclaw budget recommend --dry-run --json`;
- stable recommendation/finding IDs;
- duplicate instruction detector;
- large-low-use skill detector when usage metadata exists;
- oc-path targets for resolvable files.
- conservative recommendation classes: review, split, dedupe, tune-limit,
  archive.

Do not ship:

- `--apply`;
- automatic skill removal;
- automatic prompt compression.

### PR 9: Context Budget oc-path preview

Ship only after recommendations stabilize:

- oc-path-backed patch previews for narrow, mechanical recommendations;
- explicit diff output;
- no apply-by-default behavior.

Do not ship:

- autonomous rewrites;
- broad prompt compression;
- memory deletion.

### PR 10: Optional integration pass

Ship only after both packages are useful independently:

- Enterprise Feeds declares expected context ranges.
- Context Budget reports entries whose observed context cost exceeds catalog
  expectations.
- Policy can consume feed and budget evidence if maintainers want checks.

Keep this separate so neither package depends on the other for its MVP.

## Review questions

1. Are `enterprise-feeds` and `context-budget` the right package names for
   upstream, or should either be private/Lobster-only first?
2. Should `feeds check` live under `openclaw feeds`, or under
   `openclaw plugins feeds` / `openclaw skills feeds`?
3. Should `budget` be a top-level command, or nested under `context`?
4. Which existing OpenClaw skill/plugin inventory APIs are stable enough to use
   without creating new public SDK surface?
5. Should feed evidence become policy-readable in the first package PR, or
   wait until the report schema has survived one review cycle?
6. Where should the eligibility hook live so it covers ClawHub skill installs,
   plugin installs, and update flows without duplicating installer logic?
7. Should advisory mode be the default for unmanaged users and enforcing mode
   require explicit config or policy?

## Validation floor

Each PR needs:

- docs for command syntax and report shape;
- fixture-based JSON output tests;
- no network dependency in unit tests;
- `git diff --check`;
- OpenClaw changed-test lane or a focused package test;
- codex-review before filing.
