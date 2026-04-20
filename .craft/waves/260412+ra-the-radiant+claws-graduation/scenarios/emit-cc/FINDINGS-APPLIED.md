# Findings Applied: emit-cc

**Date**: 2026-04-12
**Scenarios processed**: 3
**Total findings**: 20
**Major/warning applied**: 13
**Note severity skipped**: 7

---

## Summary of Changes

### CL-08 Package Architecture
- **Output format**: CLAUDE.md format must use flat imperative instructions, section-delimited merge for existing CLAUDE.md, deep merge for existing .claude/settings.json
- **Platform compliance**: minimum Claude Code version target for settings.json, relative path requirement in emitted CLAUDE.md, settings must reflect governance restrictions
- **Content transformation**: expand rule IDs to natural language in CLAUDE.md, map governance to standard CC settings keys, use product name (not package name) in headers
- **Zero-import enforcement**: user-facing command names in emitted instructions, build-environment path leak detection, comment scanning for JSON config files
- **Workspace markers**: marker placement must not interfere with CC parsing, dual-marker strategy for CC (markdown + JSON), collision-safe metadata key in settings.json
- **Marker management**: marker must stay within managed section, semver format for marker version string, efficient marker detection for large files
- **Output safety**: auto-generation notice in emitted CLAUDE.md, scan pattern must cover all naming conventions

---

## Findings NOT Applied (note severity, skipped per rules)

7 findings with severity "note" were skipped.
