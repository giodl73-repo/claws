# Validation suite — cross-fixture rollup

Generated: 2026-05-05T02:57:25.865Z
Fixtures: 5 (0 real, 5 synthetic)

| slug | kind | path | lint | doctor | policy-gen | policy-check | lkg |
|------|------|------|------|--------|-----------|--------------|-----|
| `kitchen-sink` | synthetic | valid | 5 files / 3 findings | skipped(no-cli-bin) | 5 files → 0 tools / 0 deny | skipped(no-policy-jsonc) | 5 tracked / 5 promoted / 0 recovered / 0 failed |
| `empty-workspace` | synthetic | valid | 0 files / 0 findings | skipped(no-cli-bin) | skipped(no-md-sources) | skipped(no-policy-jsonc) | 0 tracked / 0 promoted / 0 recovered / 0 failed |
| `only-claude-md` | synthetic | valid | 0 files / 0 findings | skipped(no-cli-bin) | skipped(no-md-sources) | skipped(no-policy-jsonc) | 0 tracked / 0 promoted / 0 recovered / 0 failed |
| `lobster-shell-collision` | synthetic | valid | 1 files / 2 findings | skipped(no-cli-bin) | skipped(no-md-sources) | skipped(no-policy-jsonc) | 1 tracked / 1 promoted / 0 recovered / 0 failed |
| `policy-jsonc-rich-syntax` | synthetic | valid | 1 files / 2 findings | skipped(no-cli-bin) | skipped(no-md-sources) | exit=2, no-json | 1 tracked / 1 promoted / 0 recovered / 0 failed |

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
| F-003 | `only-claude-md` | `openclaw-lint run` ignores `CLAUDE.md` — not in canonical roles. AGENTS.md-equivalent format is the broadly-adopted public norm; coverage gap. | open |
| F-004 | `kitchen-sink` | `openclaw-policy generate` extracts 0 tools from a `## Tools` table (markdown). Extractor expects `### name # R<n>, CAPS` headings — the table is treated as narrative. Either fixture should match the convention or the extractor should also recognize tables. | open |
| F-005 | `policy-jsonc-rich-syntax` | `jsonc-starter-v0/config/secret-as-literal` false-positives on zero-filled placeholder hashes (`"0000...0000"` matches `/^[a-fA-F0-9]{40,}$/`). Should exclude all-zero / single-digit-repeat sequences from the hex-secret detection. | open |
