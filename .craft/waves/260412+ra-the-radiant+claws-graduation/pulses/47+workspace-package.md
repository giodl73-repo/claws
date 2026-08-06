---
pulse: 47
slug: workspace-package
plan: claws-pre-extraction-packaging
depends_on: [46]
governing_roles: [craft:architect, claws:platform-eng]
scenario_codes: [S41]
stage: implementation
test_tiers:
  L0_unit: 40
  L1_integration: 4
  L2_e2e: 0
  L3_accept: 0
test_scope:
  run:
    - "cd claws-sdk/packages/workspace && npx vitest run --coverage"
  typecheck:
    - "cd claws-sdk/packages/workspace && npx tsc --noEmit"
checkpoint: 10
---

# Pulse 47: Create @bic/openclaw-workspace Package

## Objective

Create `claws-sdk/packages/workspace/` with three subpaths: /path (consolidated from claws-sdk/src/workspace/), /ast (FULL LIBRARY — PEG grammars + typed AST + parse/emit; 11 grammar files from design/astro/grammars/openclaw-*.peg; peggy 3.x runtime), /canonicalize (new ~150-LOC RFC 8785 JCS). Per user directive 2026-04-18: /ast ships full library, NOT grammar-strings-only (reverting an earlier proposal). Package name `@bic/openclaw-workspace`.

## Deliverables

- [ ] `claws-sdk/packages/workspace/package.json` — name `@bic/openclaw-workspace`; single `exports` field declaring types+import+require for default + `./path` + `./ast` + `./canonicalize` (Node single-root-pkg convention; NO per-subpath package.json files)
- [ ] `claws-sdk/packages/workspace/src/path/` — consolidate the self-contained `claws-sdk/src/workspace/` files (oc-path.ts, chunk-types.ts, oc-files.ts, types.ts). `chunk-assembler.ts` is NOT extractable in-package (it depends on `GovernanceIR`, `CapabilityManifest`, `ToolCapability`, `FleetOverride` — all type-only but spread across `../ir/`, `../emit/`, and requiring a larger type contract excision — see chunk-assembler.ts module-doc line 15). chunk-assembler.ts stays in `claws-sdk/src/workspace/` and imports its types from `@bic/openclaw-workspace/path`. `diagnose.ts` does not exist in the current tree — the spec reference in `workspace.md` §/path is amended in-pulse to remove the `diagnose` function from the package surface (see Spec Amendment Absorption below).
- [ ] Disposition for 25 other workspace-related files in claws-sdk/src/ (beyond the 4 named): each file either moved into packages/workspace/src/path/ OR explicitly categorized in `claws-sdk/DISPOSITION.md` (lift-as-claws-internal / drop / merge-elsewhere)
- [ ] `claws-sdk/packages/workspace/src/ast/` — full library: compiled PEG parsers from 11 `.peg` grammar files at `design/astro/grammars/openclaw-*.peg`, typed AST node types per-kind, `parse(kind, content): { ast, diagnostics }`, `emit(kind, ast): string`, `grammars: Record<WorkspaceFileKind, string>` raw-PEG exports, `WorkspaceFileKind` enum. peggy 3.x runtime declared as dependency
- [ ] `claws-sdk/packages/workspace/src/canonicalize/` — RFC 8785 JCS implementation (~150 LOC). Exports: `canonicalize(obj: unknown): string`, `canonicalHash(obj: unknown): string`, `CANONICALIZER_VERSION: string`
- [ ] L0 unit tests itemized: 25 canonicalize RFC-8785 conformance vectors (matches S41 scenario fixture set); 8 parseOcPath+formatOcPath round-trip (S40 case coverage); 4 chunk-types invariant tests (CHUNK_TABS shape, ItemLock sources, RiskClassification pairs, OC_WORKSPACE_FILES registry); 3 AST parse+emit lossless round-trip (SOUL, TOOLS, AGENTS) = 40 L0 tests total
- [ ] L1 integration tests itemized: 1 path→ast classify agreement test; 1 canonicalize→hash determinism test; 2 cross-platform byte-identical tests (Linux + Windows) = 4 L1 tests
- [ ] Byte-identical canonicalize CI test: Linux + Windows blocking on every PR; macOS nightly blocking on trunk
- [ ] Zero `@craftworks/*` runtime imports in the new package (CI guard pre-flight verified via pulse P55's script)

## Spec Amendment Absorption

If this pulse surfaces a gap in the proposal spec (main spec, one of the 4 package specs, or the plan) — **the amendment lands inside this pulse's commit**. No deferral, no follow-up pulse. Amendment SHA = pulse SHA.

Commit-message convention for in-pulse amendments:

```
<pulse-type>(<pulse-slug>): <summary>

Spec amendment absorbed in-pulse:
- target: <file>:<section>  (e.g. docs/claws/proposals/openclaw-upstream/snap.md §Semantics)
- trigger: <what surfaced the gap>
- fix: <one-line rationale>
```

Applies especially to cases where the consolidation reveals that `workspace.md` over- or under-specifies a subpath (e.g., a function signature in the spec doesn't match what the real source exports, OR an export the spec claims doesn't exist in source).

If the amendment crosses spec + plan (e.g., a subpath rename that affects both `snap.md` and `claws-pre-extraction-packaging.md`'s route table), both files are updated in the same commit.

Per the user "no deferrals" directive, this pulse cannot close by leaving an in-scope deliverable as a placeholder or stub, nor with a known spec gap marked `TBD`, `// FIXME`, or tracked in `DEFERRED.md`.

If an in-scope item (for example, `diagnose.ts` if referenced by the spec/plan) cannot be completed during this pulse, then this pulse must amend the governing spec/plan in the same commit to remove, rename, or otherwise re-scope that deliverable so the remaining acceptance scope is fully complete. Otherwise, the pulse is extended until the implementation and amendment land together.

## Acceptance Criteria

- `claws-sdk/packages/workspace/` exists with single root package.json declaring 3 subpath exports
- Unit + integration test counts meet itemized targets (40 + 4)
- Canonicalize byte-parity CI green across Linux + Windows
- Zero @craftworks/* imports
- Disposition table for non-consolidated workspace-adjacent files exists

## Governing Roles

- `craft:architect` — package shape + subpath layering
- `claws:platform-eng` — canonicalize correctness + CI plumbing

## Dependencies

CP-9 shape scenarios (P43-P46) must have passed with concrete resolutions. S41 (canonicalize cross-consumer scenario) is the direct precursor.

## Test Gates

L0: 40 tests (25 canonicalize vectors + 8 URI + 4 chunks + 3 AST). L1: 4 tests (path↔ast + canonicalize determinism + 2 cross-platform). Byte-parity CI gate on Linux + Windows.
