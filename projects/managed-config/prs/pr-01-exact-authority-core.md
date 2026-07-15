# PR 1: Exact-Authority Core

## Objective

Land the smallest reusable core: deterministic recursive composition and one
effective validation boundary, with no production call site.

## Repository and starting point

- Repository: `openclaw/openclaw`
- Prototype: `giodl73-repo/openclaw#33`
- Start from current `main`; port only the reviewed core behavior.

## Production scope

- Pure `ConfigLayer[]` composition ordered strongest to weakest.
- Exact authored-value claims for scalar, array, null, and union-shaped fields.
- Recursive object traversal without claiming omitted siblings.
- Ancestor/descendant overlap rejection.
- Blocked-key and non-cloneable document rejection.
- Transactional admission so rejected layers establish no authority.
- Sparse composed source, provenance, and structured findings.
- One effective schema/plugin/cross-field validation and materialization pass.

## Implementation steps

1. Rebase the prototype concepts onto current config types and validation APIs.
2. Keep composition independent from config I/O and runtime globals.
3. Define the narrow exported result and finding types.
4. Preserve deterministic traversal and output ordering.
5. Add the effective-validation adapter without adding a source-selection API.
6. Remove any prototype-only API that is not required by the core contract.
7. Reuse existing config types, blocked-key helpers, schema/plugin validation,
   materialization, and finding conventions; do not duplicate them.

## API and size budget

- One pure composition entry point and one effective-preparation entry point.
- Prefer three production modules or fewer.
- Target no more than 500 production LOC unless review identifies a concrete
  correctness reason to exceed it.
- Tests may be larger than production code, but fixtures must stay focused.
- PR 3 must delete or fold any temporary activation adapter made obsolete by
  the real config I/O integration.

## Focused proof

- Same exact claim from multiple layers records all declarers.
- Different exact claim reports the earlier controlling layer.
- Sibling object leaves compose recursively.
- Atomic ancestor and descendant declarations conflict in both directions.
- Empty objects claim nothing; a whole empty layer remains valid.
- Arrays and null are atomic declarations.
- Blocked keys and non-object/non-cloneable documents return findings.
- A rejected middle layer cannot control a later layer.
- Cross-field constraints split across layers validate after composition.
- Alternate authored representations remain distinct exact claims.
- One layer produces the same runtime config as the existing validation path.

## Non-goals

- No `createConfigIO`, startup, reload, persistence, status, or CLI changes.
- No source resolver implementations.
- No mutation enforcement.
- No bounded comparators.

## Exit criteria

- Focused format, lint, type, and unit tests pass.
- Codex review has no accepted actionable findings.
- Existing runtime behavior is unchanged because the core has no call site.
- The PR body identifies PR 2 as bounded authority and PR 3 as the first
  opt-in integration.
- No alternate schema, materializer, config type hierarchy, or finding system
  lands beside the existing config subsystem.
