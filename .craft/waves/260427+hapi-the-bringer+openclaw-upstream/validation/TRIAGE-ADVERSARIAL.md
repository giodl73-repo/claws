# Adversarial fixture triage

Generated: 2026-05-05T23:28:17.812Z
Adversarial fixtures: 24

Classification legend:
- `crashed` — exit≠0, no structured JSON output (BAD — substrate threw without a usable error)
- `clean-error` — exit≠0 + structured error code (GOOD — failure mode that operator can act on)
- `flagged` — exit=0, substrate produced findings or detected the issue
- `silent-accept` — exit=0, substrate produced no findings (BAD if input was supposed to be flagged)

| slug | path | lint | policy-gen | policy-check | lkg |
|------|------|------|-----------|--------------|-----|
| `adversarial-empty-canonical-files` | `flagged` | `flagged` | `flagged` | `skipped` | `flagged` |
| `adversarial-frontmatter-malformed-yaml` | `flagged` | `flagged` | `flagged` | `skipped` | `flagged` |
| `adversarial-jsonc-circular-deep` | `flagged` | `flagged` | `flagged` | `skipped` | `flagged` |
| `adversarial-jsonc-secret-zero-hash` | `flagged` | `clean-error` | `flagged` | `clean-error` | `flagged` |
| `adversarial-jsonc-utf8-bom` | `flagged` | `flagged` | `flagged` | `skipped` | `flagged` |
| `adversarial-lkg-state-future-version` | `flagged` | `flagged` | `flagged` | `skipped` | `clean-error` |
| `adversarial-lkg-state-malformed` | `flagged` | `flagged` | `flagged` | `skipped` | `clean-error` |
| `adversarial-lobster-mutually-exclusive-body` | `flagged` | `clean-error` | `flagged` | `skipped` | `flagged` |
| `adversarial-lobster-undefined-stdin-ref` | `flagged` | `flagged` | `flagged` | `skipped` | `flagged` |
| `adversarial-manifest-malformed-json` | `flagged` | `flagged` | `flagged` | `skipped` | `flagged` |
| `adversarial-manifest-references-missing-skill` | `flagged` | `flagged` | `flagged` | `skipped` | `flagged` |
| `adversarial-memory-bogus-scope` | `flagged` | `flagged` | `flagged` | `skipped` | `flagged` |
| `adversarial-session-empty` | `flagged` | `flagged` | `flagged` | `skipped` | `flagged` |
| `adversarial-session-malformed-line` | `flagged` | `clean-error` | `flagged` | `skipped` | `flagged` |
| `adversarial-skill-tier-out-of-range` | `flagged` | `flagged` | `flagged` | `skipped` | `flagged` |
| `adversarial-tools-bogus-sensitivity` | `flagged` | `flagged` | `flagged` | `skipped` | `flagged` |
| `adversarial-tools-duplicate-id` | `flagged` | `flagged` | `flagged` | `skipped` | `flagged` |
| `adversarial-tools-emoji-id` | `flagged` | `flagged` | `flagged` | `skipped` | `flagged` |
| `adversarial-tools-r1-with-irreversible` | `flagged` | `flagged` | `flagged` | `skipped` | `flagged` |
| `adversarial-tools-sentinel-injection` | `flagged` | `flagged` | `flagged` | `skipped` | `clean-error` |
| `adversarial-tools-shell-metacharacter-id` | `flagged` | `flagged` | `flagged` | `skipped` | `flagged` |
| `adversarial-tools-very-long-id` | `flagged` | `flagged` | `flagged` | `skipped` | `flagged` |
| `adversarial-workspace-json-malformed` | `flagged` | `clean-error` | `clean-error` | `skipped` | `clean-error` |
| `adversarial-workspace-json-skip-everything` | `flagged` | `silent-accept` | `flagged` | `skipped` | `flagged` |

## Counters (across all adversarial × tool cells)

- clean-error: 10
- silent-accept: 1
- flagged: 86
- skipped: 23

## Cells worth a closer look

  - **adversarial-lkg-state-future-version** / lkg: clean-error but generic — ERR_INTERNAL: state file version 9.9.9 unsupported by this build (expected 0.1.0)
  - **adversarial-lkg-state-malformed** / lkg: clean-error but generic — ERR_INTERNAL: state file parse failed at C:\src\claws-hapi\.craft\waves\260427+hapi-the-bringer+openclaw-upstream\valida
  - **adversarial-workspace-json-malformed** / policy-generate: clean-error but generic — ERR_INTERNAL: workspace.json parse failed at C:\src\claws-hapi\.craft\waves\260427+hapi-the-bringer+openclaw-upstream\va
  - **adversarial-workspace-json-malformed** / lkg: clean-error but generic — ERR_INTERNAL: workspace.json parse failed at C:\src\claws-hapi\.craft\waves\260427+hapi-the-bringer+openclaw-upstream\va
  - **adversarial-workspace-json-skip-everything** / lint: silent-accept — lint=0 findings
