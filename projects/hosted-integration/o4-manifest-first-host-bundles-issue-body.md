## Summary

Let one plugin declare a coherent, versioned inventory of its host-supplied
contributions in `openclaw.plugin.json`, without importing or activating plugin
runtime code.

## Problem to solve

An external host plugin can own several independent OpenClaw contributions,
but the current manifest has no way to say that those declarations belong to
one deployable host bundle. Consumers must reconstruct that relationship from
plugin-specific runtime state or introduce a second registry.

That loses the advantages of OpenClaw's manifest-first discovery path:
configuration and inventory should be inspectable before plugin runtime loads,
and duplicate ownership should be rejected deterministically instead of
resolved by whichever plugin registers first.

## Proposed solution

Add one optional `hostIntegrationBundle` field to `openclaw.plugin.json` with a
closed, versioned shape:

- exact bundle id and SemVer;
- non-empty contribution inventory;
- owner, kind, id, and versioned contract id for each contribution;
- strict validation and immutable normalized values;
- fail-closed duplicate bundle ownership in the existing manifest registry;
- loader-owned plugin provenance in the current registry snapshot.

The declaration is inventory only. It does not activate contributions,
evaluate readiness, resolve credentials, select runtime owners, or add a
runtime registration API.

Because this is a new plugin-manifest surface, the OpenClaw plugin owner should
confirm the field name, versioning boundary, and compatibility posture before
merge.

## Alternatives considered

- Extend the existing flat `contracts` object. That identifies individual
  capability owners but cannot represent one atomic bundle version or preserve
  contribution owner/kind/contract tuples.
- Register a bundle at runtime. That would require importing plugin code during
  discovery and would make inventory depend on activation order.
- Add a process-global host registry. That duplicates the existing plugin
  registry and creates winner-by-registration-order behavior.

## Impact

Affected: authors and operators of external plugins that package multiple
host-supplied OpenClaw contributions.

Severity: low for ordinary installations, which need no host bundle; important
for host plugins that currently need private composition state.

Frequency: every discovery or inventory pass for such a plugin.

Consequence: OpenClaw can inspect one deterministic bundle inventory without
loading runtime code, while each contribution's canonical owner retains all
activation and runtime authority.

## Evidence/examples

A prepared implementation passes 143 focused plugin tests, the core typecheck,
type-aware lint, formatting, the full build, documentation checks, and an
independent code review. A real external Lobster plugin manifest with five
contributions is discovered without importing runtime code and produces one
enabled registry entry bound to loader-owned plugin provenance.

## Do you plan to open a PR for this?

Yes. A current-`main`, issue-linked draft implementation is ready for plugin
owner review.
