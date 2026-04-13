# Findings Applied: lossless-roundtrip

**Date**: 2026-04-11
**Scenarios processed**: 5
**Total findings**: 43
**Major/warning applied**: 32
**Note severity skipped**: 11

---

## Summary of Changes

### Specs Edited

#### CL-04 Compilation Pipeline (lossless constraints)
- **22 new constraints** added covering: write-allow-list enforcement mechanism in EMIT, reserved directory name for generated governance skill (collision check), read-only file handle requirement for source files, ownership comment header in generated exec-approvals.json, compiled workflow detection to prevent feedback loops, raw-byte SHA-256 for lossless verification (not parsed-content hash), lossless boundary documentation (workspace files vs .claws/ pipeline state), git-diff-based lossless integration test strategy, lossless enforcement derived from parse file list (not separate config), BOM stripping before keyword anchor extraction, GovernanceIR hash normalization must strip BOM before hashing, UTF-16 BOM detection and transcoding without write-back, explicit BOM stripping in Node.js string conversion, binary comparison for BOM preservation tests, line/column mapping with CRLF source files, two hash types (normalized IR hash vs raw lossless verification hash), mixed line ending normalization (CRLF/LF/CR), generated file line ending policy (match workspace or force LF), line ending detection from source files for generated output, GovernanceIR deterministic hash excluding timestamps and ambient state, sorted-key JSON for deterministic output (JSON.stringify with replacer), lexicographic sort of file paths for deterministic processing order

#### CL-04 Compilation Pipeline (EMIT constraints)
- **5 new constraints**: hash-skip depends on deterministic serialization, PRESS compression determinism requirement, stable code generation ordering for deterministic index.ts, compiler version in IR metadata for cache invalidation on upgrade, delimiter-based section management for .cursorrules injection

#### CL-04 Compilation Pipeline (error handling)
- **5 new constraints**: independent per-file error collection, last-known-good artifact preservation on compilation error, reliable line counting in malformed files, crash safety for atomic staging (unhandled exception path), graceful handling of zero successfully-parsed files

#### CL-05 Developer Experience
- **2 new constraints**: claws check --fix scope limited to non-source files, mandatory snapshot before doctor --fix modifies any file

#### CL-01 CLI Surface & Schema
- **1 new constraint**: accept JSON with BOM on Windows for claws.json

### PITFALLS.md
- **6 new pitfalls** (P-230 through P-235)
- P-230: **Generated skill directory name collision** -- High -- S01-F02 -- Emit path resolves to a user-authored skill directory name; generated governance skill overwrites user content. claws response: CL-04 reserved directory name + collision check. Detection ring: Compile-time
- P-231: **Compiled workflow fed back as source** -- High -- S01-F05 -- Developer renames lobster.compiled.yaml to lobster.yaml; next compilation reads compiled version as source, governance injection compounds. claws response: CL-04 compiled workflow detection in PARSE. Detection ring: Compile-time
- P-232: **BOM causes first constraint to be missed** -- High -- S02-F01 -- UTF-8 BOM precedes first keyword; parser looking for line-start anchor fails; first deny constraint silently dropped. claws response: CL-04 BOM stripping before keyword extraction. Detection ring: Compile-time
- P-233: **CRLF vs LF hash divergence breaks cache sharing** -- High -- S03-F02 -- Same content produces different GovernanceIR hashes on Windows (CRLF) vs macOS (LF); incremental compilation cache invalidated cross-platform. claws response: CL-04 LF normalization before IR hashing. Detection ring: Compile-time
- P-234: **Non-deterministic JSON serialization breaks idempotence** -- High -- S04-F02 -- Object property insertion order varies between compilations; JSON output differs; hash-skip optimization fails and file rewritten every build. claws response: CL-04 sorted-key JSON serialization. Detection ring: Compile-time
- P-235: **Compilation error deletes previous working artifacts** -- High -- S05-F02 -- Failed compilation deletes previously-emitted artifacts; developer loses last working governance enforcement while fixing errors. claws response: CL-04 last-known-good preservation on error. Detection ring: Compile-time

### Plans Edited
- **claws-parse**: BOM handling, CRLF normalization, compiled workflow detection, file path sorting
- **claws-emit**: write-allow-list, collision check, line ending policy, deterministic serialization
- **claws-governance-ir**: two hash types, sorted-key JSON, compiler version metadata

### Guides Edited
- **docs/claws/architecture/lossless-guarantee.md**: write-allow-list, raw vs normalized hashing, cross-platform determinism
- **docs/claws/getting-started/claws-build.md**: BOM preservation, CRLF handling, idempotence

---

## Findings NOT Applied (note severity, skipped per rules)

11 findings with severity "note" were skipped: S01-F07 (lossless boundary documentation), S01-F09 (future OC file additions), S02-F07 (doctor BOM detection), S02-F08 (YAML frontmatter BOM handling), S03-F06 (YAML/JSON line-ending agnosticism), S03-F08 (trailing newline preservation), S04-F07 (incremental compilation cache integrity), S04-F09 (staging directory cleanup), S05-F07 (deterministic error ordering), S05-F09 (missing-optional vs malformed-present distinction).
