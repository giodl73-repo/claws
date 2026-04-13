# Findings Applied: input

**Date**: 2026-04-12
**Scenarios processed**: 4
**Total findings**: 33
**Major/warning applied**: 24
**Note severity skipped**: 9

---

## Summary of Changes

### CL-08 Package Architecture
- **File resolution**: cross-platform path normalization requirement, workspace boundary enforcement for file resolution, symlink resolution and provenance recording
- **Package resolution**: must handle monorepo hoisting, pkg: URI parsing for scoped packages, logical vs physical path distinction for pnpm
- **URL resolution**: locked mode for URL resolution determinism, TLS verification must be mandatory (not optional), cache key must include full URL with query string
- **Provenance**: hash computation timing relative to transformations, version pinning in package provenance, redirect following and final URL provenance
- **Mixed sources**: conflict resolution rules for same-trust-level sources, partial resolution failure handling policy, per-key source attribution in merged output
- **Error handling**: error reporting must show normalized path, actionable error messages for missing packages, parallel resolution with aggregate error reporting
- **Security**: integrity hash in package provenance, network timeout configuration, Content-Type recording in URL provenance
- **Build integration**: provenance chain as queryable output artifact, composite content hash for build caching, pre-merge version constraint validation
- **Testing**: large file handling policy, binary file handling in resolution, dry-run mode for mixed-source preview

---

## Findings NOT Applied (note severity, skipped per rules)

9 findings with severity "note" were skipped.
