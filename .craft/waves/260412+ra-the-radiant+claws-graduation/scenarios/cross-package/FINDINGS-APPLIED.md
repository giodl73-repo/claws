# Findings Applied: cross-package

**Date**: 2026-04-12
**Scenarios processed**: 3
**Total findings**: 31
**Major/warning applied**: 22
**Note severity skipped**: 9

---

## Summary of Changes

### CL-08 Package Architecture
- **Cycle prevention**: madge must scan .ts source (not .js output), CI must detect new inter-package edges (not just cycles), ban or declare dynamic cross-package imports
- **Diamond dedup**: platform manifest must be single source of truth for version pins across layers, all packages must use consistent dep type (peer vs regular) for shared packages, EmitRegistry must detect and fail on duplicate instances
- **Pipeline equivalence**: document every normalization pass forma applies that WorkspaceReader must replicate, hash equivalence test against compiler-sdk crypto module, define expected-change zones vs invariant zones in emit output
- **Build system**: document topological build order and enforce in build pipeline, run cycle check on packed tarballs (not workspace symlinks), CI must include per-package tsconfig paths
- **Layer boundaries**: emitters must depend only on codegen (additional deps require spec amendment), test utilities must be in separate exports condition or devDependencies only, @bic/claws-skill-kit zero-dependency invariant enforced in CI
- **Version coherence**: add version-coherence check alongside cycle detection, manifest CI must verify zero duplication as a publish gate, minimum npm version for deduplication guarantee
- **Equivalence testing**: normalization function must be schema-derived (not hand-maintained), reference workspace must include all 9 file types plus canvas/, dual-path equivalence CI job until monolith deprecation
- **Type safety**: cross-layer type compatibility tests required in CI, no type aliasing of shared package exports across layers, inter-phase type contracts documented (not just final output)
- **Testing**: dedup tests must cover npm, pnpm, and yarn; bundler dedup smoke test; document monorepo vs registry install dedup differences

---

## Findings NOT Applied (note severity, skipped per rules)

9 findings with severity "note" were skipped.
