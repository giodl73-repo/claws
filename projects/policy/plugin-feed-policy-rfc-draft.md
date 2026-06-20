# RFC Draft: Plugin Feed Policy Conformance

Status: unpublished draft

Depends on: openclaw/rfcs#19, "Hosted feeds for plugins and skills"

## Summary

Add policy settings and conformance checks for plugin catalog governance once
hosted feeds become the plugin registry primitive. The policy should let managed
environments require a tenant or effective feed, prevent direct public feed
bypass, and verify that installed or recommended plugins are authorized by the
configured feed governance layer.

This is not a proposal to define the feed format itself. The feed format,
fallback catalog, package source metadata, and hosted-feed lifecycle belong to
RFC #19. This RFC adds the policy layer that decides which feeds may be used and
how feed governance affects plugin install, update, and doctor findings.

## Motivation

The hosted feeds RFC separates catalog governance from package sources:

- feeds describe plugin entries, versions, integrity, and governance status
- npm, ClawHub, private registries, and Git remain package sources
- enterprises can publish effective tenant feeds that subset, pin, block, or
  augment public catalog entries

Policy needs to recognize that distinction. In a managed tenant, "installable
from npm" is not the same as "approved for this tenant". A local plugin allowlist
should be able to narrow an effective feed, but it should not widen a tenant
feed or override tenant-level blocked entries.

## Goals

- Allow policy to require use of a tenant or enterprise effective feed.
- Prevent direct ClawHub/public feed usage when a tenant feed is required.
- Treat feed governance as the source of plugin catalog approval.
- Ensure local policy can further restrict, but not broaden, tenant governance.
- Define fallback behavior so bundled catalogs cannot bypass managed policy.
- Add doctor findings for stale, invalid, missing, or bypassed feed evidence.
- Keep package source trust, feed governance, and runtime plugin behavior as
  separate policy concepts.

## Non-Goals

- Defining the hosted feed JSON schema.
- Defining private registry authentication or RBAC.
- Proving plugin code safety from feed membership alone.
- Runtime MCP method, tool-call, or network enforcement inside a plugin.
- Replacing existing `plugins.allow` and `plugins.deny` checks.
- Requiring every enterprise to use MOS3 or any single feed host.
- Fully specifying skills policy. Skills can reuse this model later, but this
  RFC is plugin-first.

## Policy Model

The policy layer should answer three questions:

1. Which feeds are allowed for catalog governance?
2. Is a tenant or effective feed required for this policy scope?
3. Can a plugin install or update proceed under the effective feed state?

Feed membership should be necessary but not sufficient. An entry present in an
approved feed still needs normal package integrity, install source, and runtime
policy checks. A plugin absent from the effective feed should not become allowed
only because it is available from npm, ClawHub, a private registry, or Git.

## Proposed Policy Surface

Names are provisional until RFC #19 settles the concrete feed config surface.

```yaml
plugins:
  allow:
    - openclaw/plugin-example
  deny:
    - openclaw/plugin-dangerous
  requireFeedMembership: true
  feeds:
    requireTenantFeed: true
    tenantFeedIds:
      - contoso/openclaw-plugins
    allowedFeedIds:
      - contoso/openclaw-plugins
      - contoso/openclaw-plugins-eu
    denyDirectPublicFeeds: true
    allowBundledFallback: catalog-only
    maxStaleness: P7D
    requireIntegrity: true
    requireSignedFeed: true
    allowPrivateFeeds: false
    allowMirrors: true
```

Suggested semantics:

- `plugins.requireFeedMembership`: installed or updated plugins must appear in
  an approved effective feed.
- `plugins.feeds.requireTenantFeed`: a tenant or enterprise effective feed must
  be configured and valid.
- `plugins.feeds.tenantFeedIds`: feed identities that satisfy the tenant-feed
  requirement.
- `plugins.feeds.allowedFeedIds`: feed identities the client may use for plugin
  catalog governance.
- `plugins.feeds.denyDirectPublicFeeds`: direct use of the public ClawHub feed is
  denied unless it is composed into the tenant feed or explicitly allowed.
- `plugins.feeds.allowBundledFallback`: controls bundled catalog fallback:
  `catalog-only`, `install`, or `deny`.
- `plugins.feeds.maxStaleness`: maximum age for cached feed evidence.
- `plugins.feeds.requireIntegrity`: feed entries used for install or update must
  include usable package integrity metadata.
- `plugins.feeds.requireSignedFeed`: feed evidence must have an accepted
  signature or attestation if the feed system supports it.
- `plugins.feeds.allowPrivateFeeds`: private/team feeds may be used directly only
  when allowed. Otherwise they must be composed into the effective tenant feed.
- `plugins.feeds.allowMirrors`: regional or mirror feeds may be used only if they
  preserve accepted feed identity/provenance, or if the mirror itself is
  explicitly allowed.

## Tenant Feed Rules

When `requireTenantFeed` is true:

- A valid tenant or effective feed is required before install or update.
- Direct public ClawHub feed use is a policy violation unless explicitly allowed.
- Bundled fallback can support catalog display and diagnostics, but it must not
  authorize installing entries missing from or blocked by the tenant feed unless
  policy explicitly allows `allowBundledFallback: install`.
- A private/team feed is not a bypass path. It must be composed into the tenant
  feed or named in `allowedFeedIds`.
- A regional mirror must preserve the governed feed identity and integrity
  evidence, or be explicitly allowed as its own feed identity.

Tenant governance should have precedence over local broadening:

- Tenant blocked entries win over local allow rules.
- Tenant disabled entries prevent install/update unless policy defines a
  narrower exception state.
- Local `plugins.allow` can further restrict the effective feed.
- Local `plugins.allow` cannot authorize a plugin absent from the effective feed
  when `requireFeedMembership` is true.
- Local `plugins.deny` can block an otherwise approved feed entry.

## Precedence

For a plugin install or update, the effective decision should be:

1. Deny if the plugin is locally denied.
2. Deny if any required tenant or effective feed marks the entry blocked.
3. Deny if feed membership is required and the plugin is absent from every
   approved effective feed.
4. Deny if the selected feed is not allowed by policy.
5. Deny if required feed integrity, signature, or freshness evidence is missing.
6. Allow only if feed governance allows the entry and local policy does not
   restrict it further.

This preserves a simple rule: tenant policy can narrow the public catalog, and
local policy can narrow the tenant catalog, but neither package availability nor
local allow rules can widen tenant governance.

## Evidence

Doctor checks need concrete local evidence instead of inferring policy state
from runtime defaults. The exact artifact names should follow the feed
implementation, but useful evidence includes:

- configured feed URLs and feed identities
- effective feed identity after tenant composition
- cached feed ETag, Last-Modified, body hash, and fetch time
- feed validation result, schema version, and signature/attestation state
- entry-level plugin ID, version, package source, integrity, and governance state
- reason a bundled fallback was used
- installed plugin inventory mapped back to feed entries

The doctor should report missing or invalid evidence explicitly. It should not
silently treat unknown feed state as compliant.

## Doctor Findings

Initial findings should cover:

- tenant feed required but not configured
- tenant feed configured but invalid, stale, unsigned, or untrusted
- direct public feed used while tenant feed is required
- private/team feed used directly without policy approval
- mirror feed used without accepted provenance or explicit policy approval
- bundled fallback used for install when only catalog fallback is allowed
- installed plugin is missing from the effective feed
- installed plugin is present but blocked or disabled in the effective feed
- plugin update available only through an unapproved feed
- feed entry lacks required integrity metadata
- package integrity in installed state does not match the governed feed entry

## Examples

### Managed tenant

```yaml
plugins:
  requireFeedMembership: true
  feeds:
    requireTenantFeed: true
    tenantFeedIds:
      - contoso/openclaw-plugins
    denyDirectPublicFeeds: true
    allowBundledFallback: catalog-only
    maxStaleness: P7D
    requireIntegrity: true
```

This allows the client to display cached or bundled catalog information when
offline, but not to use bundled public entries as install authorization.

### Developer machine with public catalog

```yaml
plugins:
  requireFeedMembership: true
  feeds:
    requireTenantFeed: false
    allowedFeedIds:
      - openclaw/clawhub-public
    denyDirectPublicFeeds: false
    allowBundledFallback: install
```

This keeps feed membership as an install requirement while allowing the default
public feed and bundled fallback for non-managed development.

### Tenant feed plus local narrowing

```yaml
plugins:
  allow:
    - openclaw/github
    - contoso/internal-review
  deny:
    - openclaw/experimental-shell
  requireFeedMembership: true
  feeds:
    requireTenantFeed: true
    tenantFeedIds:
      - contoso/openclaw-plugins
```

The local allowlist restricts the tenant-approved set to two plugins. The local
deny still blocks `openclaw/experimental-shell` even if it is present in the
tenant feed.

## Rollout

1. Land the hosted feeds RFC and first implementation shape.
2. Add feed evidence collection for configured feeds, effective feed identity,
   cached feed metadata, and installed plugin entry mapping.
3. Add policy parser support for the feed governance settings.
4. Add doctor checks and findings using explicit feed evidence.
5. Add tests for tenant-required, stale feed, blocked entry, bundled fallback,
   direct public feed, private feed, mirror feed, and local narrowing cases.
6. Extend policy docs with examples once the setting names are final.

## Open Questions

- What exact config keys will RFC #19 introduce for feed URLs, feed IDs, and
  effective tenant feed selection?
- Should feed signatures be required in v1, or should v1 start with body hash
  and package integrity evidence?
- What artifact should represent installed plugin inventory mapped to feed
  entries?
- Where should tenant identity come from in unmanaged local environments?
- Should stale feed thresholds be global, tenant-provided, or policy-defined?
- Do agent-scoped policy overlays need independent feed restrictions, or should
  feed governance remain tenant/workspace scoped in v1?
- How should skills share this model once skills move onto hosted feeds?
