# MOS3 Shared Registry Delivery Plan

## Goal

By the end of July 2026, Lobster should have PRs pushed that move the feeds
story from skill-only feed proof toward a MOS3 shared registry model covering
skills, MCP/connectors, and agents.

The target product story is:

```text
Publish capability -> MOS3 shared registry -> governed search -> local install or activation
```

This plan stays under the Feeds project because the shared registry is the
MOS3-backed product authority behind the same feed ecosystem. It should not be
a separate MCP or agents project unless those tracks later grow runtime-specific
work outside shared discovery, publish, and governance.

## Scope

### In Scope For July

- Skills shared-registry search and local install.
- Skills publish to MOS3 shared registry.
- MCP/connectors shared-registry search and result modeling.
- MCP/connectors publish foundation.
- Agents shared-registry contract, schema, and API/RFC alignment.
- Consistent source labels, provenance, and governed outcome semantics across
  item types.
- PRs that are small enough to review and merge while still forming a complete
  stack.

### Out Of Scope For July

- Full agent runtime install or orchestration.
- Full connector auth/consent runtime.
- Runtime unloading or termination of active capabilities.
- Tenant-admin approval UX overhaul beyond the shared-registry contract hooks.
- Replacing every Lobster file-backed fallback path in one PR.

## Delivery Dates

| Date | Slice | Output |
| --- | --- | --- |
| 2026-07-10 | Contract lock | MOS3 shared-registry contract for skills, MCP/connectors, agents, auth scopes, item taxonomy, and publish/search/install semantics. |
| 2026-07-15 | Skills search/install | PR for skills shared-registry search and local install path, with marketplace/feed semantics kept separate from personal library publishing. |
| 2026-07-20 | Skills publish | PR for publishing skills into MOS3 shared registry, preserving source provenance, package/artifact selectors, and personal vs shared authority boundaries. |
| 2026-07-24 | MCP/connectors search | PR for MCP/connectors shared-registry search, normalized result shape, source labels, and non-installable/activation-required states. |
| 2026-07-29 | MCP/connectors publish foundation | PR for connector/MCP publish metadata and MOS3 write path foundation, stopping before full runtime auth/activation. |
| 2026-07-31 | Agents contract | PR/RFC for agents shared-registry contract, feed entry shape, governance states, and follow-up implementation plan. |

## PR Stack

### PR 1: Shared Registry Contract And Route Matrix

Target date: 2026-07-10.

Purpose:

- Freeze the item taxonomy: `skill`, `plugin`, `mcpServer`, `connector`,
  `agent`, and later policy/workflow pack types.
- Define the shared fields all item types need: stable id, display metadata,
  source provenance, version or revision, publish owner, visibility, governance
  outcome, compatibility, and install or activation selector.
- Document which Lobster routes currently read MOS3, file-backed stores, or
  bridge state.
- Document MOS3 delegated/app scopes and app ids needed for search, read,
  publish, share, and tenant-admin approval.
- Keep search, install, publish, follow, and tenant approval as separate
  operations.

Exit criteria:

- We can tell partners exactly which MOS3 APIs and scopes are required.
- We can tell reviewers which PRs are implementation versus contract.
- 301/302 validation has a clear source-mode matrix.

### PR 2: Skills Shared-Registry Search And Local Install

Target date: 2026-07-15.

Purpose:

- Search MOS3 shared-registry skill records from `/skills`.
- Preserve the current local install behavior: installing from marketplace or
  shared registry installs into the local OpenClaw/Scout workspace path, not
  automatically into the user's personal library.
- Keep `Save to library` as an explicit separate action.
- Hide unavailable tenant-approved or registry sources without showing noisy
  404/503 cards when another source is usable.
- Keep all UI under the existing feeds ECS flag until the product gate changes.

Exit criteria:

- A normal user can search shared-registry skills and install a selected skill
  locally.
- Marketplace/shared-registry install does not mutate the personal feed unless
  the user explicitly saves to library.
- Source labels explain whether a result is marketplace, tenant-approved,
  shared, tenant-visible, or personal.

### PR 3: Skills Publish To Shared Registry

Target date: 2026-07-20.

Purpose:

- Publish a local or authored skill to MOS3 shared registry as a user-owned
  capability.
- Preserve late-bound references where possible: package id, title id, artifact
  id, source registry, and revision rather than copying opaque bytes without
  provenance.
- Distinguish private personal publish, shared publish, tenant-visible publish,
  and tenant-approved promotion.
- Use MOS3 ACL shape where available: `ForAllUsers` plus user/group entities.

Exit criteria:

- A created or local skill can become a MOS3-backed user-owned shared-registry
  item.
- The personal library and shared registry remain distinct concepts.
- The publish path records enough provenance for later tenant approval.

### PR 4: MCP/Connectors Shared-Registry Search

Target date: 2026-07-24.

Purpose:

- Extend shared-registry search to MCP servers and connectors.
- Model results that are discoverable but not directly installable because they
  need consent, connector auth, environment binding, or runtime activation.
- Preserve connector fields already observed in MOS3/Aether-style contracts:
  auth reference, remote MCP server URL, valid domains, title/asset ids, and
  acquisition context.
- Keep UI actions honest: view, request, configure, or add source; not a fake
  skill-style install when runtime work is missing.

Exit criteria:

- `/skills` or the shared discovery surface can show skill and connector/MCP
  results together with type filters.
- MCP/connectors have clear activation-required states and provenance labels.
- No connector auth or remote MCP runtime behavior is implied by search alone.

### PR 5: MCP/Connectors Publish Foundation

Target date: 2026-07-29.

Purpose:

- Add the first MOS3 publish/update foundation for connector and MCP metadata.
- Validate ownership, visibility, package/artifact selectors, and source
  provenance.
- Store enough metadata for later runtime activation: transport type, endpoint,
  auth requirement, valid domains, compatibility, and governance outcome.
- Stop short of full connector auth and runtime activation.

Exit criteria:

- A connector or MCP entry can be represented and published as shared-registry
  metadata.
- The publish API cannot imply an installed or consented runtime connection.
- The follow-up runtime work is explicit.

### PR 6: Agents Shared-Registry Contract

Target date: 2026-07-31.

Purpose:

- Define the agent entry shape before implementation: identity, owner,
  version/revision, source, allowed surfaces, required tools/connectors,
  delegated permissions, memory/state expectations, and governance outcome.
- Decide whether agents are feed entries, packs, templates, or composed
  capability records in the MOS3 contract.
- Specify search and publish semantics without promising runtime orchestration.

Exit criteria:

- Agents have a reviewed contract that can be implemented in August.
- The July PR stack can honestly say skills are end-to-end, connectors are in
  search/publish foundation, and agents are contract-ready.

## Shared Semantics

The same verbs should apply across all item types, even when the runtime action
differs:

| Verb | Meaning |
| --- | --- |
| Search | Find authorized entries and feeds the caller can see. |
| Install | Materialize an entry into a local workspace or runtime where that type supports install. |
| Save to library | Copy or reference a selected entry into the user's personal library. |
| Publish | Create or update a user-owned or source-owned registry record. |
| Share | Change visibility or ACL on a named/shared registry record. |
| Follow | Include a feed or source in the caller's effective discovery scope. |
| Approve | Tenant-admin promotion of a selected entry, feed, or revision. |
| Revoke/block | Prevent new discovery/install/activation according to policy. |

Search should not imply install. Publish should not imply tenant approval.
Tenant-visible should not imply tenant-approved. Connector or agent visibility
should not imply consent or runtime authorization.

## Dependencies

- MOS3 app id and scopes for Lobster/Scout registry reads and writes.
- Confirmation whether the shared registry object is a MOS3 title,
  collection-like object, package, acquisition, or new API shape.
- Confirmation that MOS3 ACLs can represent private, shared with users/groups,
  and tenant-visible states.
- Confirmation of search support for mixed item and feed results with ACL
  filtering before ranking.
- Agreement on whether MOS3 returns signed feed documents directly or Lobster
  attests MOS3-derived projections.
- ECS gating decision: keep the July stack under `scout_feeds_ux_enabled`
  until the product owner explicitly ungates.

## Validation Plan

For every implementation PR:

- add route-source diagnostics that say MOS3, file fallback, bridge, or
  unavailable without leaking tenant/user secrets;
- include unit coverage for unavailable MOS3 sources returning typed fail-closed
  errors;
- include focused web tests for result labels and actions;
- validate against 301 or 302 once deployed;
- capture whether the signed-in user is tenant admin, normal user, or neither
  for admin-only paths;
- avoid manually queuing ADO unless explicitly requested.

## Risks

- MOS3 may not yet expose a first-class collection/named-feed object with
  immutable revisions and follow state.
- MOS3 may support title ACLs but not efficient mixed feed and entry search.
- Connector and MCP runtime activation may need a separate app/client owner
  and should not be hidden inside the feed PRs.
- Agent registry semantics may collide with packs/templates unless the contract
  is resolved before coding.
- 301/302 deployment cadence may lag merged PRs, so live validation may trail
  PR completion by days.

## Partner Ask

The partner-facing ask is:

1. Confirm the MOS3 object/API for shared-registry entries and collections.
2. Confirm app id and scopes for Lobster/Scout registry search and publish.
3. Confirm ACL and search support for user-owned, shared, tenant-visible, and
   tenant-approved records.
4. Confirm the first supported item types by date: skills first, then
   MCP/connectors, then agents contract.
5. Confirm whether MOS3 or Lobster signs/attests the effective feed projection
   for 301/302 validation.
