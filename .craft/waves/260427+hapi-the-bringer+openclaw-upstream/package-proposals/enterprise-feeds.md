# `@openclaw/enterprise-feeds` Proposal

## One-line

Enterprise Feeds is an organization-curated feed layer over normal OpenClaw
skill/plugin discovery and install flows. It answers: "When a user searches or
installs from ClawHub or a private source, how does this workspace classify the
entry?"

## Why this is not ClawHub

ClawHub is discovery and distribution. Enterprise Feeds is curation and
eligibility over that distribution.

Enterprise Feeds should not replace public marketplace search, package install,
or plugin publishing. The best user experience is that the existing install
commands keep working, but the enterprise-feeds plugin registers an eligibility
filter that runs during search, install, update, and audit:

```bash
openclaw skills search outlook
openclaw skills install outlook-triage
openclaw plugins install @openclaw/teams-meetings
```

With Enterprise Feeds enabled, those commands can annotate search results,
block or warn on ineligible installs, and explain the reason without teaching
users a second marketplace command. The package should add the layer
organizations and hosted products need before marketplace entries can enter a
governed workspace:

- approved source feeds;
- owner and reviewer metadata;
- version and signature expectations;
- required scopes and host capabilities;
- risk, sensitivity, and data-class metadata;
- install/use eligibility findings;
- private/internal feed support beside public ClawHub feeds;
- a normal-install-flow filter that can deny, warn, or annotate entries.

## Precedent in OpenClaw

OpenClaw already has:

- a broad plugin ecosystem under `extensions/*`;
- skill discovery/install flows;
- ClawHub marketplace expectations;
- policy conformance for tools, plugins, auth, models, channels, and config;
- oc-path references for precise config/workspace edits.

Enterprise Feeds should use those surfaces instead of creating a new package
manager. Its core contribution is a reusable install/search eligibility hook
that ClawHub, private feeds, and policy-aware hosts can all share.

## Current ClawHub metadata

OpenClaw already has enough marketplace metadata for a first enterprise-feeds
pass, but not enough to answer every organization eligibility question without
an overlay feed.

OpenClaw's current ClawHub client talks to API endpoints for search, detail,
versions, artifact resolution, security, readiness, and skill listing. It does
not appear to expose a first-class "assessment feed" contract today. Enterprise
Feeds should define `feed` as its own abstraction over those APIs and over
organization-published JSON sources.

Current skill-facing surfaces appear to include:

- owner and slug, with public pages shaped like `https://clawhub.ai/<owner>/<slug>`;
- selected version during publish and install;
- publish owner validation;
- review and verification state before normal install/download;
- security scan state on ClawHub skill pages;
- installed origin/lock metadata such as `.clawhub/origin.json`,
  `.clawhub/lock.json`, and `openclaw skills info --json`;
- workspace versus global install location.

Current plugin-facing surfaces appear to include:

- `source: "clawhub"`;
- package name;
- ClawHub family and channel, such as `code-plugin`, `bundle-plugin`, and
  `official`;
- resolved URL and timestamp;
- capability tags, runtime id, host targets, environment flags, and package
  capabilities when ClawHub exposes them;
- verification tier, provenance fields, scan status, readiness, and security
  state where available;
- artifact kind and format;
- integrity, shasum, tarball name, and clawpack hashes;
- install records that preserve ClawHub package, family, channel, URL, and
  integrity metadata.

Those fields are useful for provenance, pinning, and scan/review checks. They
do not by themselves provide an organization-specific answer to questions such
as "is this owner approved for this workspace", "is this skill allowed to use
mail write scopes", or "does this entry meet our minimum trust tier".

The first Enterprise Feeds implementation should therefore treat ClawHub metadata
as input evidence and use feed configuration to express the organization
requirements that ClawHub does not own.

## Feed strategy

Enterprise Feeds should model feeds even if ClawHub does not yet publish a
dedicated feed endpoint. Longer term, feeds are a strong candidate for a
ClawHub-level distribution primitive:

- ClawHub can host official or community assessment feeds.
- Publishers can attach entries to one or more feeds during review/release.
- Organizations can create private feeds without standing up a separate
  marketplace.
- OpenClaw clients can consume public, private, and local feeds through one
  enterprise-feeds contract.

That keeps ClawHub as the natural place for distribution while letting
enterprises maintain their own alignment layer over the skills and plugins they
care about.

The target model is hybrid+:

```text
ClawHub public feeds
  + enterprise/private feeds
  + workspace overrides
  = effective enterprise-feeds decision
```

ClawHub should own public baseline feeds because it already sees package
publication, review, security scan, readiness, ownership, and version metadata.
Other parties should still be able to publish compatible feeds anywhere.
Enterprise Feeds should consume the same feed schema from ClawHub, Lobster, enterprise
HTTPS endpoints, internal Git raw URLs, and local files.

Public ClawHub feeds could include:

- `clawhub-all`: all public installable entries, mainly for discovery and
  debugging.
- `clawhub-reviewed`: entries that passed ClawHub review criteria.
- `clawhub-official`: official entries only.
- `clawhub-clean-scanned`: entries with clean current scan state.
- `clawhub-source-linked`: entries with source-linked provenance.

Enterprise feeds then layer on top:

- `contoso-approved`: entries approved for Contoso workspaces.
- `contoso-blocklist`: entries denied by Contoso even if public feeds allow
  them.
- `contoso-m365-candidates`: entries under evaluation for a specific platform
  integration.
- workspace override files for narrow exceptions.

Feed resolution should be deterministic and ordered. Later feeds can narrow,
deny, or reclassify earlier feed decisions. Unknown entries use the workspace
default such as `warn` or `deny`.

At ClawHub scale, feeds should not start as "include every package" lists. If
the marketplace has tens of thousands of skills, a feed must be either:

- synthetic: a named filter definition over ClawHub APIs;
- materialized: a cached snapshot of the resolved entries at a point in time;
- overlay: a small list of explicit allow, warn, deny, or reclassify decisions.

This lets root feeds stay small and distributable while still being reproducible
for audit.

## ClawHub feed lifecycle hook

Part of the value of ClawHub-hosted feeds is that ClawHub can classify new and
updated entries at the point where it already has the right signals.

When a skill or plugin is published, reviewed, rescanned, revoked, or updated,
ClawHub should run a feed classification hook:

1. Read package/skill metadata from the canonical package and search digest
   records.
2. Read release scan, moderation, readiness, verification, ownership, and
   capability metadata.
3. Evaluate each public feed definition.
4. Update feed membership or mark the materialized feed snapshot stale.
5. Emit feed membership changes for audit and downstream cache invalidation.

This hook should not replace review or security scanning. It only projects
existing ClawHub facts into public feed membership. If a scan result changes
from clean to suspicious, or a package is revoked, the hook should remove or
reclassify that entry in affected feeds.

For the first implementation, this can be lazy rather than fully event-driven:
`/api/v1/feeds/:id/entries` can resolve a synthetic feed from current catalog
metadata on request. A later materialization job can cache feed versions, diffs,
and signatures for large feeds or audit-sensitive users.

## Feed-aware search

Feeds need to participate in search, not only install-time checks.

ClawHub should support feed-scoped discovery:

```http
GET /api/v1/feeds/clawhub-reviewed/search?q=calendar
GET /api/v1/packages/search?q=calendar&feed=clawhub-reviewed
```

For synthetic public feeds, feed search can reuse the existing package/skill
search and apply the feed definition as additional filters. For materialized
feeds, search can read the materialized membership index first, then hydrate
matching package metadata.

Enterprise Feeds should expose the same behavior in normal OpenClaw commands:

```bash
openclaw skills search calendar
openclaw plugins search calendar
```

With Enterprise Feeds enabled, search results should be annotated or filtered
according to the configured feed stack:

```text
calendar-booker       approved   contoso-approved
calendar-summary      warning    only in clawhub-reviewed
calendar-auto-send    blocked    contoso-blocklist
```

Search mode should be configurable:

- `annotate`: show all results and attach feed eligibility.
- `prefer-approved`: rank approved entries first while still showing unknowns.
- `filter`: hide entries that are not allowed by the effective feed decision.

The default should be `annotate` for advisory workspaces and `prefer-approved`
or `filter` only when a managed workspace explicitly opts in. This keeps public
discovery useful while making governed installs easier to choose correctly.

Initial source types:

- `clawhub-api`: builds a feed snapshot from existing ClawHub search/list/detail
  endpoints.
- `clawhub-filter`: defines a synthetic feed as filters over ClawHub API
  metadata, such as owner, channel, verification tier, scan state, capability
  tags, family, and updated-at bounds.
- `clawhub-feed`: reads a first-class ClawHub-hosted feed once that surface
  exists.
- `url`: reads an organization-published JSON catalog feed.
- `file`: reads a workspace or checked-in JSONC overlay.

This keeps the product distributable:

- OpenClaw or ClawHub can later publish an official reviewed feed without
  changing the enterprise-feeds contract.
- Organizations can publish internal feeds for entries they approve.
- Teams can keep small local overrides for exceptions.
- Unknown entries can warn or deny based on workspace mode instead of requiring
  every skill or plugin in the ecosystem to be assessed up front.

A ClawHub-hosted feed should be an addressable, versioned document rather than a
new installer. Example:

```jsonc
{
  "schemaVersion": 1,
  "id": "clawhub-reviewed",
  "displayName": "ClawHub reviewed entries",
  "issuedAt": "2026-05-27T00:00:00Z",
  "definition": {
    "kind": "filter",
    "include": {
      "channels": ["official", "community"],
      "verificationTiers": ["source-linked", "reviewed"],
      "scanStates": ["clean"],
      "families": ["skill", "code-plugin", "bundle-plugin"]
    }
  },
  "entries": [
    {
      "id": "plugin:@openclaw/diagnostics-otel",
      "kind": "plugin",
      "source": "clawhub",
      "package": "@openclaw/diagnostics-otel",
      "versionRange": "^2026.5.0",
      "assessment": {
        "decision": "allow",
        "tier": "reviewed",
        "risk": "low",
        "data": "internal",
        "requiresScanClean": true
      }
    }
  ]
}
```

Enterprise feeds can use the same shape and add stricter local assessments or
override decisions for specific entries. Feed ordering decides precedence:
workspace overrides can be last, enterprise feeds can be authoritative, and
ClawHub feeds can provide defaults.

If ClawHub does not take hosted feeds immediately, Lobster can stand up the same
shape as an external feed service:

- poll ClawHub API metadata;
- materialize root feeds such as `lobster-reviewed` or `lobster-m365-candidates`;
- store feed versions and diffs in the Lobster system;
- expose the feed over HTTPS for Enterprise Feeds;
- let organizations fork or overlay those feeds into their own approval feed.

That fallback should use the same feed schema so OpenClaw does not care whether
the feed was produced by ClawHub, Lobster, or an enterprise system.

## ClawHub implementation notes

The current ClawHub app is a Convex service with public v1 HTTP handlers. The
existing package endpoints already support most raw inputs needed for synthetic
feeds:

- `/api/v1/packages` lists a unified catalog of skills and plugins.
- `/api/v1/plugins`, `/api/v1/code-plugins`, and `/api/v1/bundle-plugins` list
  plugin subsets.
- List filters already include family, channel, official, highlighted, executes
  code, category, and capability tag.
- Package and skill search digest tables already contain owner, channel,
  family, capability tags, verification tier, scan status, updated time, and
  version summaries.

This means the lowest-risk ClawHub feed feature is not a new marketplace
storage model. It is an additive API layer:

1. Add shared feed schema types in `packages/schema`.
2. Add static root feed definitions such as `clawhub-reviewed`.
3. Add a `GET /api/v1/feeds/:id` endpoint that returns the feed definition.
4. Add a `GET /api/v1/feeds/:id/entries` endpoint that resolves the definition
   through the existing package catalog list queries.
5. Add tests around filters, pagination, and response shape.

Private enterprise feeds are a larger follow-up because they need persisted feed
documents, ownership, publisher/org permissions, write APIs, and UI/CLI
management. That is still additive, but it is more product surface than the
public root-feed API.

## First package scope

MVP capabilities:

1. Load one or more feed sources.
2. Normalize entries into a stable `FeedEntry` shape.
3. Load workspace feed requirements and apply them to entries.
4. Register an eligibility filter into existing skill/plugin search and install
   flows.
5. Match installed skills/plugins against feed entries.
6. Emit findings for unapproved, unknown, stale, unsigned, or incompatible
   entries.
7. Export a machine-readable feed report for CI and policy evidence.

Out of scope for MVP:

- public marketplace hosting;
- payment/licensing;
- a new install manager that bypasses existing skill/plugin install commands;
- automatic removal;
- full trust-chain signing service;
- M365-only feed source semantics.

## Integrated install behavior

Enterprise Feeds should have two modes:

| Mode | Install behavior | Use case |
|---|---|---|
| `advisory` | Existing install succeeds but emits feed findings/warnings. | Local exploration, early rollout, hobbyist compatibility. |
| `enforcing` | Existing install fails when the selected entry is ineligible. | Managed workspaces, CI, hosted products. |

The filter result should be structured:

```jsonc
{
  "ok": false,
  "decision": "deny",
  "entryId": "skill:outlook-triage",
  "source": "clawhub",
  "matchedCatalog": "m365-approved",
  "findings": [
    {
      "checkId": "feeds/scope-not-approved",
      "severity": "error",
      "message": "Skill requires graph.mail.send, but this workspace baseline only allows graph.mail.read.",
      "target": "clawhub://skills/outlook-triage",
      "requirement": "oc://enterprise-feeds/m365-approved/entries/skill%3Aoutlook-triage/requiredScopes"
    }
  ]
}
```

Search results should also be able to surface eligibility:

```text
outlook-triage       approved     M365 approved catalog
calendar-booker      warning      requires graph.calendar.write
mail-auto-send       blocked      not in approved catalog
```

## Candidate CLI

```bash
openclaw feeds sources list --json
openclaw feeds sync --json
openclaw feeds check --json
openclaw feeds explain <entry-id>
```

The `catalog` CLI is for source management, explanation, and CI reports. Normal
installation should remain:

```bash
openclaw skills install <id>
openclaw plugins install <id-or-package>
```

Those install commands should call the enterprise-feeds eligibility hook when the
plugin is enabled. If a later `openclaw feeds install` command exists, it
should be only a convenience wrapper around the same underlying skill/plugin
install path.

## Hook shape

The package likely needs an upstream hook that is not M365-specific:

```ts
type FeedEligibilityRequest = {
  kind: "skill" | "plugin";
  action: "search" | "install" | "update" | "audit";
  entryId: string;
  source: "clawhub" | "local" | "url" | "private";
  packageName?: string;
  version?: string;
  declaredScopes?: readonly string[];
  declaredCapabilities?: readonly string[];
  workspacePolicyHash?: string;
};

type FeedEligibilityResult = {
  decision: "allow" | "warn" | "deny";
  findings: readonly CatalogFinding[];
  matchedCatalogEntries: readonly string[];
};
```

OpenClaw core should not know enterprise policy. It should only give plugins a
safe place to evaluate candidate entries before install and a standard result
shape for search/install UX.

## feed source shape

Enterprise Feeds needs two related config shapes:

- feed entries, which describe approved capabilities;
- feed requirements, which describe what a workspace requires from entries.

Entries are the curated list:

```jsonc
{
  "schemaVersion": 1,
  "id": "m365-approved",
  "displayName": "M365 approved openclaw feeds",
  "entries": [
    {
      "id": "skill:outlook-triage",
      "kind": "skill",
      "source": "clawhub",
      "package": "@openclaw/skill-outlook-triage",
      "versionRange": "^1.2.0",
      "owner": "productivity-platform",
      "risk": "medium",
      "sensitivity": "confidential",
      "requiredScopes": ["graph.mail.read"],
      "requiredCapabilities": ["host.identity", "host.graph"],
      "policyTags": ["mail", "external-write-review"],
      "install": {
        "mode": "allowed"
      },
      "signature": {
        "required": true
      }
    }
  ]
}
```

The field names above are draft vocabulary. The important contract is that
entries describe capability eligibility; they do not configure runtime behavior
directly.

Requirements are the workspace rules for interpreting entry metadata:

```jsonc
{
  "schemaVersion": 1,
  "mode": "advisory",
  "sources": [
    {
      "id": "m365-approved",
      "type": "file",
      "path": "enterprise-feeds.jsonc"
    }
  ],
  "rules": {
    "defaultDecision": "warn",
    "requireKnownEntry": true,
    "requireReviewed": true,
    "requireScanClean": true,
    "requireSignature": false,
    "allowSources": ["clawhub", "private"],
    "allowOwners": ["openclaw", "productivity-platform"],
    "requireFields": ["owner", "version", "source"],
    "minTierByRisk": {
      "low": "declared",
      "medium": "typed",
      "high": "verified"
    }
  }
}
```

This lets an organization start with a strict allowlist even if ClawHub only
provides provenance, scan, review, owner, version, and artifact metadata. Missing
metadata becomes an explicit finding when the configured rules require it.

## Findings

Initial finding IDs should be stable and policy-friendly:

- `feeds/source-unavailable`
- `feeds/entry-unknown`
- `feeds/entry-unapproved`
- `feeds/version-out-of-range`
- `feeds/signature-missing`
- `feeds/capability-missing`
- `feeds/scope-not-approved`
- `feeds/metadata-invalid`
- `feeds/install-denied`
- `feeds/install-advisory`

Each finding should include:

- installed entry id;
- installed version;
- feed source id;
- action: search, install, update, or audit;
- decision: allow, warn, or deny;
- requirement target;
- fix hint;
- `oc://` reference when the installed entry or config path is known.

## Policy integration

Enterprise Feeds should expose evidence that policy can consume. Policy remains
the conformance authority. Enterprise Feeds supplies facts such as:

```jsonc
{
  "catalog": {
    "sources": ["m365-approved"],
    "installed": [
      {
        "id": "skill:outlook-triage",
        "approved": true,
        "version": "1.2.3",
        "risk": "medium",
        "sensitivity": "confidential"
      }
    ]
  }
}
```

Possible future policy rules:

- require all installed skills/plugins to be feed-approved;
- require signatures for feed-managed entries;
- allow only specific feed source ids;
- deny entries above a risk class unless scoped to approved agents.

Policy should be able to choose enforcement mode, but the install filter should
work without policy. That keeps Enterprise Feeds useful for simple allowlist
rollouts while still letting managed workspaces require feed approval in
their baseline policy.

The first implementation should not block on policy schema changes. Once the
feed report and finding IDs are stable, a follow-up policy section can assert
that the workspace's enterprise-feeds settings meet a required baseline.

## M365/Lobster fit

Downstream M365 can publish an approved catalog that includes:

- Outlook mail/calendar skills;
- Teams meeting skills;
- OneDrive/SharePoint file skills;
- Office document extraction/editing skills;
- approved model/provider and data-boundary helper plugins.

The upstream package should not know M365 tenants, Purview, Entra, or internal
release trains. Those belong in feed source adapters and downstream policy.

## PR plan

1. Package skeleton and feed source parser.
2. Eligibility hook contract for existing skill/plugin search and install
   flows.
3. Installed skill/plugin inventory adapter.
4. `feeds check --json` with findings.
5. Docs and sample catalog.
6. Optional policy evidence adapter once the report shape stabilizes.

## Acceptance criteria

- A workspace with only approved entries reports clean.
- An approved ClawHub skill/plugin installs through the normal install command.
- An ineligible ClawHub skill/plugin is denied or warned according to mode.
- Search results can show feed eligibility without hiding public discovery
  unless enforcing mode asks for it.
- A workspace with an unknown installed skill/plugin reports a stable finding.
- A stale version reports the expected version range.
- A missing required capability reports a fixable finding.
- Report output is deterministic enough for CI snapshots.
- The package does not implement a second installer; it filters/decorates the
  existing install path.
