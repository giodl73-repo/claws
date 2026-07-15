# PR 2: Bounded-Authority Registry and First Field Set

## Objective

Deliver the bounded-authority portion of RFC 0019 as real schema-owned behavior,
including an initial set of demonstrated production fields.

## Dependency

- PR 1 provides the recursive claim fold, provenance, and finding model.

## Field-selection audit

Before editing, inventory actual managed deployment constraints in OpenClaw and
Lobster. For each candidate field record:

- canonical schema path and owning module;
- current schema type and normalization;
- operational reason a weaker layer may tighten but not weaken it;
- comparator class and ordering direction;
- existing runtime overrides or write paths that could bypass it;
- a real deployment fixture that requires the bound.

The initial audit targets are the canonical tool-policy allow and deny set
paths: allow as an allow-set ceiling and deny as a deny-set floor. The audit
must enumerate root, agent, group, and sender-scoped variants and either assign
each canonical path or explicitly exclude it with a schema-owner rationale.
If the audit rejects these targets, the PR must name equally concrete
replacement fields and their operational use before implementation. Do not
land a registry with zero assignments.

## Comparator classes

- **Allow-set ceiling:** later sets must be subsets of the inherited ceiling.
- **Deny-set floor:** later sets must be supersets of the inherited floor.
- **Numeric minimum:** later values may increase but not decrease the boundary.
- **Numeric maximum:** later values may decrease but not increase the boundary.

Only implement classes used by the initial selected fields. Additional classes
require a later RFC change or explicit RFC 0019 follow-up.

## Production scope

- Closed registry keyed by canonical schema path.
- Comparator metadata owned beside the field's schema definition or generated
  from one schema-owned source of truth.
- Recursive fold integration that preserves exact authority as the default.
- Structured `WouldWeakenEarlierLayer` findings containing redacted controlling
  and proposed bounds.
- Provenance that records comparator class and all declaring layers.
- Unsupported comparator/version behavior suitable for mixed-version hosts.
- A comparator-contract version or capability marker that older runtimes reject
  explicitly rather than silently treating as exact or unmanaged config.

## Implementation steps

1. Publish the field audit in the PR description, select the minimal set, and
   obtain approval from the schema/module owner for each safety ordering.
2. Define comparator metadata and exhaustive types.
3. Implement only the selected algebraic operations.
4. Integrate comparison at the existing PR 1 claim boundary.
5. Preserve deterministic traversal and source order.
6. Add schema-evolution behavior for unknown paths or comparator classes.
7. Document how a field owner adds a future registry entry and proof.

## Required proof per selected field

- Omission preserves the inherited bound.
- Equal declaration is accepted and records the declarer.
- Strictly tighter declaration is accepted.
- Weaker declaration is rejected with the earlier controlling layer.
- Three-layer composition is associative.
- Repeating a declaration is idempotent.
- Removing or reordering a layer recomputes from source documents.
- Normalization cannot reverse the comparator ordering.
- Arrays/sets use deterministic canonical ordering for identity and diagnostics.

## Cross-cutting proof

- Unregistered fields still use exact authority.
- A layer cannot select or override a comparator.
- Plugin or host code cannot register arbitrary comparator functions.
- Findings redact secret-bearing values.
- Comparator metadata participates in authority-chain identity.
- Mixed-version fixtures prove unsupported comparator metadata fails closed.

## Non-goals

- No general policy language.
- No arbitrary callbacks from config sources.
- No attempt to assign bounds to every numeric or set-valued field.
- No loading, activation, mutation, or Lobster migration changes in this PR.

## Exit criteria

- At least one demonstrated production field ships with its comparator.
- Every shipped comparator and field passes the algebraic proof matrix.
- Exact-only PR 1 behavior remains unchanged for all other fields.
- Codex review has no accepted actionable findings.
- RFC 0019's bounded-authority contract is represented by production code, not
  left as an indefinite future extension.
