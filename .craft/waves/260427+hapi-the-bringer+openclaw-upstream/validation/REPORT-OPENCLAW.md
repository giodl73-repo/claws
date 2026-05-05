# Validation suite — cross-fixture rollup (via openclaw fork CLI)

Generated: 2026-05-05T22:13:57.962Z
Fixtures: 32 (13 real, 19 synthetic)

| slug | kind | path | lint | doctor | policy-gen | policy-check | lkg |
|------|------|------|------|--------|-----------|--------------|-----|
| `kitchen-sink` | synthetic | valid | 5 files / 3 findings | skipped(extends-existing-openclaw-doctor) | 5 files → 0 tools / 0 deny | skipped(no-policy-jsonc) | 5 tracked / 5 promoted / 0 recovered / 0 failed |
| `empty-workspace` | synthetic | valid | 0 files / 0 findings | skipped(extends-existing-openclaw-doctor) | skipped(no-md-sources) | skipped(no-policy-jsonc) | 0 tracked / 0 promoted / 0 recovered / 0 failed |
| `only-claude-md` | synthetic | valid | 0 files / 0 findings | skipped(extends-existing-openclaw-doctor) | skipped(no-md-sources) | skipped(no-policy-jsonc) | 0 tracked / 0 promoted / 0 recovered / 0 failed |
| `lobster-shell-collision` | synthetic | valid | 1 files / 2 findings | skipped(extends-existing-openclaw-doctor) | skipped(no-md-sources) | skipped(no-policy-jsonc) | 1 tracked / 1 promoted / 0 recovered / 0 failed |
| `policy-jsonc-rich-syntax` | synthetic | valid | 1 files / 2 findings | skipped(extends-existing-openclaw-doctor) | skipped(no-md-sources) | exit=2, no-json | 1 tracked / 1 promoted / 0 recovered / 0 failed |
| `dyad` | real | valid | 1 files / 1 findings | skipped(extends-existing-openclaw-doctor) | 1 files → 0 tools / 0 deny | skipped(no-policy-jsonc) | 1 tracked / 1 promoted / 0 recovered / 0 failed |
| `kitcn` | real | valid | 1 files / 1 findings | skipped(extends-existing-openclaw-doctor) | 1 files → 0 tools / 0 deny | skipped(no-policy-jsonc) | 1 tracked / 1 promoted / 0 recovered / 0 failed |
| `hexis` | real | valid | 12 files / 0 findings | skipped(extends-existing-openclaw-doctor) | skipped(no-md-sources) | skipped(no-policy-jsonc) | 12 tracked / 12 promoted / 0 recovered / 0 failed |
| `spec-to-agents` | real | valid | 1 files / 1 findings | skipped(extends-existing-openclaw-doctor) | 1 files → 0 tools / 0 deny | skipped(no-policy-jsonc) | 1 tracked / 1 promoted / 0 recovered / 0 failed |
| `zod` | real | valid | 1 files / 1 findings | skipped(extends-existing-openclaw-doctor) | 1 files → 0 tools / 0 deny | skipped(no-policy-jsonc) | 1 tracked / 1 promoted / 0 recovered / 0 failed |
| `stackflow` | real | valid | 1 files / 1 findings | skipped(extends-existing-openclaw-doctor) | 1 files → 0 tools / 0 deny | skipped(no-policy-jsonc) | 1 tracked / 1 promoted / 0 recovered / 0 failed |
| `alkem-io-server` | real | valid | 0 files / 0 findings | skipped(extends-existing-openclaw-doctor) | 0 files → 0 tools / 0 deny | skipped(no-policy-jsonc) | 0 tracked / 0 promoted / 0 recovered / 0 failed |
| `chordsheetjs` | real | valid | 0 files / 0 findings | skipped(extends-existing-openclaw-doctor) | 0 files → 0 tools / 0 deny | skipped(no-policy-jsonc) | 0 tracked / 0 promoted / 0 recovered / 0 failed |
| `codebattle` | real | valid | 1 files / 1 findings | skipped(extends-existing-openclaw-doctor) | 1 files → 0 tools / 0 deny | skipped(no-policy-jsonc) | 1 tracked / 1 promoted / 0 recovered / 0 failed |
| `immich-discord-bot` | real | valid | 0 files / 0 findings | skipped(extends-existing-openclaw-doctor) | skipped(no-md-sources) | skipped(no-policy-jsonc) | 0 tracked / 0 promoted / 0 recovered / 0 failed |
| `aztec-editor-android` | real | valid | 1 files / 1 findings | skipped(extends-existing-openclaw-doctor) | 1 files → 0 tools / 0 deny | skipped(no-policy-jsonc) | 1 tracked / 1 promoted / 0 recovered / 0 failed |
| `dialtone` | real | valid | 0 files / 0 findings | skipped(extends-existing-openclaw-doctor) | skipped(no-md-sources) | skipped(no-policy-jsonc) | 0 tracked / 0 promoted / 0 recovered / 0 failed |
| `banjo` | real | valid | 1 files / 1 findings | skipped(extends-existing-openclaw-doctor) | 1 files → 0 tools / 0 deny | skipped(no-policy-jsonc) | 1 tracked / 1 promoted / 0 recovered / 0 failed |
| `tools-canonical-headings` | synthetic | valid | 2 files / 0 findings | skipped(extends-existing-openclaw-doctor) | 2 files → 5 tools / 0 deny | skipped(no-policy-jsonc) | 2 tracked / 2 promoted / 0 recovered / 0 failed |
| `session-no-terminal-event` | synthetic | valid | 0 files / 0 findings | skipped(extends-existing-openclaw-doctor) | skipped(no-md-sources) | skipped(no-policy-jsonc) | 0 tracked / 0 promoted / 0 recovered / 0 failed |
| `agents-secret-literal` | synthetic | valid | 1 files / 2 findings | skipped(extends-existing-openclaw-doctor) | skipped(no-md-sources) | skipped(no-policy-jsonc) | 1 tracked / 1 promoted / 0 recovered / 0 failed |
| `lobster-duplicate-step-id` | synthetic | valid | 1 files / 1 findings | skipped(extends-existing-openclaw-doctor) | skipped(no-md-sources) | skipped(no-policy-jsonc) | 1 tracked / 1 promoted / 0 recovered / 0 failed |
| `policy-drifted` | synthetic | valid | 3 files / 4 findings | skipped(extends-existing-openclaw-doctor) | 3 files → 0 tools / 0 deny | DRIFT 0ae0a0f6…→5dcda9b3… | 3 tracked / 3 promoted / 0 recovered / 0 failed |
| `memory-invalid-scope` | synthetic | valid | 1 files / 1 findings | skipped(extends-existing-openclaw-doctor) | skipped(no-md-sources) | skipped(no-policy-jsonc) | 1 tracked / 1 promoted / 0 recovered / 0 failed |
| `lkg-pre-populated-labels` | synthetic | valid | 2 files / 0 findings | skipped(extends-existing-openclaw-doctor) | 2 files → 0 tools / 0 deny | skipped(no-policy-jsonc) | 2 tracked / 2 promoted / 0 recovered / 0 failed |
| `workspace-minimal` | synthetic | valid | 1 files / 0 findings | skipped(extends-existing-openclaw-doctor) | 1 files → 0 tools / 0 deny | skipped(no-policy-jsonc) | 1 tracked / 1 promoted / 0 recovered / 0 failed |
| `workspace-typical` | synthetic | valid | 9 files / 0 findings | skipped(extends-existing-openclaw-doctor) | 9 files → 5 tools / 0 deny | skipped(no-policy-jsonc) | 9 tracked / 9 promoted / 0 recovered / 0 failed |
| `workspace-with-sessions` | synthetic | valid | 11 files / 2 findings | skipped(extends-existing-openclaw-doctor) | 11 files → 5 tools / 0 deny | skipped(no-policy-jsonc) | 11 tracked / 11 promoted / 0 recovered / 0 failed |
| `workspace-with-workflows` | synthetic | valid | 11 files / 3 findings | skipped(extends-existing-openclaw-doctor) | 11 files → 5 tools / 0 deny | skipped(no-policy-jsonc) | 11 tracked / 11 promoted / 0 recovered / 0 failed |
| `workspace-policy-managed` | synthetic | valid | 10 files / 1 findings | skipped(extends-existing-openclaw-doctor) | 10 files → 5 tools / 0 deny | exit=2, no-json | 10 tracked / 10 promoted / 0 recovered / 0 failed |
| `workspace-upgrade-recovery` | synthetic | valid | 9 files / 1 findings | skipped(extends-existing-openclaw-doctor) | 9 files → 5 tools / 0 deny | skipped(no-policy-jsonc) | 9 tracked / 9 promoted / 0 recovered / 0 failed |
| `workspace-enterprise` | synthetic | valid | 9 files / 1 findings | skipped(extends-existing-openclaw-doctor) | 9 files → 5 tools / 0 deny | skipped(no-policy-jsonc) | 9 tracked / 9 promoted / 0 recovered / 0 failed |

## Findings of interest

Per-fixture detail in `results/<slug>/`. The interesting cases are usually:
- lint > 0 findings (real or false-positive — both worth investigating)
- policy-gen `0 tools` despite MD source files present (extractor coverage gap)
- lkg `failed > 0` (parse/validate threw on real-world content)
- path `invalid` (workspace shape outside the substrate's recognized roles)
- exit codes ≠ 0 with no-json output (CLI threw — see stderr in the result)

### Findings log

Curated rolling list of bugs / coverage gaps surfaced by the suite.
Move items to fixed/ once the underlying issue is resolved.

| ID | Fixture | Finding | Status |
|----|---------|---------|--------|
| F-001 | `policy-jsonc-rich-syntax` | `openclaw-policy check` parses `.jsonc` with `JSON.parse` instead of `parseJsonc`; chokes on comments + trailing commas. | open |
| F-002 | `lobster-shell-collision` | Three of four lint starter packs (jsonc, jsonl, lobster-yaml) were unreachable: jsonl + lobster-yaml lacked self-registration loops, and the CLI bootstrap only imported the md pack. | **fixed** (added imports + self-register loops; 23/23 rules now register) |
| F-003 | `only-claude-md` | `openclaw-pinch run` ignores `CLAUDE.md` — not in canonical roles. AGENTS.md-equivalent format is the broadly-adopted public norm; coverage gap. | open |
| F-004 | `kitchen-sink` | `openclaw-policy generate` extracts 0 tools from a `## Tools` table (markdown). Extractor expects `### name # R<n>, CAPS` headings — the table is treated as narrative. Either fixture should match the convention or the extractor should also recognize tables. | open |
| F-005 | `policy-jsonc-rich-syntax` | `jsonc-starter-v0/config/secret-as-literal` false-positives on zero-filled placeholder hashes (`"0000...0000"` matches `/^[a-fA-F0-9]{40,}$/`). Should exclude all-zero / single-digit-repeat sequences from the hex-secret detection. | open |
| F-006 | `session-no-terminal-event` | `sessions/X.jsonl` files only get tracked when the basename matches `^(?:session|audit|events)`. claude-code-style session logs are uuid-named without prefix and won't be linted. The canonical-role regex `SESSION_PREFIX_RE` is too restrictive for in-the-wild session log shapes. | open |
| F-007 | (multiple real fixtures) | Stub-CLAUDE.md (9 bytes, mostly empty) is common in the wild (zod, kitcn, banjo, aztec-editor-android). The current canonical-role registry doesn't recognize CLAUDE.md (F-003), so this is partially upstream of F-003: even if we add CLAUDE.md as a role, stub-content shouldn't produce noisy findings. Decision needed: lint stub-CLAUDE.md as a separate "stub-CLAUDE-instead-of-AGENTS" rule, or treat as noise. | open |
