# Adversarial fixture triage

Generated: 2026-05-06T02:13:53.265Z
Adversarial fixtures: 54

Classification legend:

- `crashed` — exit≠0, no structured JSON output (BAD — substrate threw without a usable error)
- `clean-error` — exit≠0 + structured error code (GOOD — failure mode that operator can act on)
- `flagged` — exit=0, substrate produced findings or detected the issue
- `silent-accept` — exit=0, substrate produced no findings (BAD if input was supposed to be flagged)

| slug                                            | path      | lint            | policy-gen    | policy-check  | lkg           |
| ----------------------------------------------- | --------- | --------------- | ------------- | ------------- | ------------- |
| `adversarial-empty-canonical-files`             | `flagged` | `flagged`       | `flagged`     | `skipped`     | `flagged`     |
| `adversarial-frontmatter-malformed-yaml`        | `flagged` | `flagged`       | `flagged`     | `skipped`     | `flagged`     |
| `adversarial-gateway-data-uri`                  | `flagged` | `flagged`       | `flagged`     | `skipped`     | `flagged`     |
| `adversarial-gateway-file-uri`                  | `flagged` | `flagged`       | `flagged`     | `skipped`     | `flagged`     |
| `adversarial-gateway-localhost-url`             | `flagged` | `flagged`       | `flagged`     | `skipped`     | `flagged`     |
| `adversarial-jsonc-circular-deep`               | `flagged` | `flagged`       | `flagged`     | `skipped`     | `flagged`     |
| `adversarial-jsonc-secret-zero-hash`            | `flagged` | `clean-error`   | `flagged`     | `clean-error` | `flagged`     |
| `adversarial-jsonc-utf8-bom`                    | `flagged` | `flagged`       | `flagged`     | `skipped`     | `flagged`     |
| `adversarial-lkg-state-empty-entries`           | `flagged` | `flagged`       | `flagged`     | `skipped`     | `flagged`     |
| `adversarial-lkg-state-future-timestamp`        | `flagged` | `flagged`       | `flagged`     | `skipped`     | `flagged`     |
| `adversarial-lkg-state-future-version`          | `flagged` | `flagged`       | `flagged`     | `skipped`     | `clean-error` |
| `adversarial-lkg-state-malformed`               | `flagged` | `flagged`       | `flagged`     | `skipped`     | `clean-error` |
| `adversarial-lkg-state-missing-tracker`         | `flagged` | `flagged`       | `flagged`     | `skipped`     | `flagged`     |
| `adversarial-lkg-state-stale-fingerprint`       | `flagged` | `flagged`       | `flagged`     | `skipped`     | `flagged`     |
| `adversarial-lobster-mutually-exclusive-body`   | `flagged` | `clean-error`   | `flagged`     | `skipped`     | `flagged`     |
| `adversarial-lobster-undefined-stdin-ref`       | `flagged` | `flagged`       | `flagged`     | `skipped`     | `flagged`     |
| `adversarial-manifest-circular-skill-tool-ref`  | `flagged` | `flagged`       | `flagged`     | `skipped`     | `flagged`     |
| `adversarial-manifest-empty-contributes`        | `flagged` | `flagged`       | `flagged`     | `skipped`     | `flagged`     |
| `adversarial-manifest-leading-junk`             | `flagged` | `flagged`       | `flagged`     | `skipped`     | `flagged`     |
| `adversarial-manifest-malformed-json`           | `flagged` | `flagged`       | `flagged`     | `skipped`     | `flagged`     |
| `adversarial-manifest-references-missing-skill` | `flagged` | `flagged`       | `flagged`     | `skipped`     | `flagged`     |
| `adversarial-md-mixed-line-endings`             | `flagged` | `silent-accept` | `flagged`     | `skipped`     | `flagged`     |
| `adversarial-md-trailing-crs`                   | `flagged` | `flagged`       | `flagged`     | `skipped`     | `flagged`     |
| `adversarial-md-utf16-le-bom`                   | `flagged` | `flagged`       | `flagged`     | `skipped`     | `flagged`     |
| `adversarial-memory-bogus-scope`                | `flagged` | `flagged`       | `flagged`     | `skipped`     | `flagged`     |
| `adversarial-policy-unfilled-version`           | `flagged` | `flagged`       | `flagged`     | `clean-error` | `flagged`     |
| `adversarial-session-empty`                     | `flagged` | `flagged`       | `flagged`     | `skipped`     | `flagged`     |
| `adversarial-session-malformed-line`            | `flagged` | `clean-error`   | `flagged`     | `skipped`     | `flagged`     |
| `adversarial-session-only-newlines`             | `flagged` | `flagged`       | `flagged`     | `skipped`     | `flagged`     |
| `adversarial-session-trailing-data`             | `flagged` | `flagged`       | `flagged`     | `skipped`     | `flagged`     |
| `adversarial-session-very-large-line`           | `flagged` | `flagged`       | `flagged`     | `skipped`     | `flagged`     |
| `adversarial-skill-name-path-traversal`         | `flagged` | `flagged`       | `flagged`     | `skipped`     | `flagged`     |
| `adversarial-skill-tier-out-of-range`           | `flagged` | `flagged`       | `flagged`     | `skipped`     | `flagged`     |
| `adversarial-tools-bogus-sensitivity`           | `flagged` | `flagged`       | `flagged`     | `skipped`     | `flagged`     |
| `adversarial-tools-duplicate-id`                | `flagged` | `flagged`       | `flagged`     | `skipped`     | `flagged`     |
| `adversarial-tools-emoji-id`                    | `flagged` | `flagged`       | `flagged`     | `skipped`     | `flagged`     |
| `adversarial-tools-homoglyph-cyrillic`          | `flagged` | `flagged`       | `flagged`     | `skipped`     | `flagged`     |
| `adversarial-tools-nfc-vs-nfd-collision`        | `flagged` | `flagged`       | `flagged`     | `skipped`     | `flagged`     |
| `adversarial-tools-path-traversal-id`           | `flagged` | `flagged`       | `flagged`     | `skipped`     | `flagged`     |
| `adversarial-tools-r1-with-irreversible`        | `flagged` | `flagged`       | `flagged`     | `skipped`     | `flagged`     |
| `adversarial-tools-rtl-override`                | `flagged` | `flagged`       | `flagged`     | `skipped`     | `flagged`     |
| `adversarial-tools-sentinel-injection`          | `flagged` | `flagged`       | `flagged`     | `skipped`     | `clean-error` |
| `adversarial-tools-shell-metacharacter-id`      | `flagged` | `flagged`       | `flagged`     | `skipped`     | `flagged`     |
| `adversarial-tools-template-todo`               | `flagged` | `flagged`       | `flagged`     | `skipped`     | `flagged`     |
| `adversarial-tools-very-long-id`                | `flagged` | `flagged`       | `flagged`     | `skipped`     | `flagged`     |
| `adversarial-tools-xxx-marker`                  | `flagged` | `flagged`       | `flagged`     | `skipped`     | `flagged`     |
| `adversarial-tools-zero-width-space`            | `flagged` | `flagged`       | `flagged`     | `skipped`     | `flagged`     |
| `adversarial-workflow-absolute-path-ref`        | `flagged` | `flagged`       | `flagged`     | `skipped`     | `flagged`     |
| `adversarial-workspace-json-array-root`         | `flagged` | `clean-error`   | `clean-error` | `skipped`     | `clean-error` |
| `adversarial-workspace-json-deeply-nested-skip` | `flagged` | `clean-error`   | `flagged`     | `skipped`     | `flagged`     |
| `adversarial-workspace-json-empty-file`         | `flagged` | `flagged`       | `flagged`     | `skipped`     | `flagged`     |
| `adversarial-workspace-json-malformed`          | `flagged` | `clean-error`   | `clean-error` | `skipped`     | `clean-error` |
| `adversarial-workspace-json-skip-everything`    | `flagged` | `flagged`       | `flagged`     | `skipped`     | `flagged`     |
| `adversarial-workspace-json-string-root`        | `flagged` | `clean-error`   | `clean-error` | `skipped`     | `clean-error` |

## Counters (across all adversarial × tool cells)

- clean-error: 18
- silent-accept: 1
- flagged: 199
- skipped: 52

## Cells worth a closer look

- **adversarial-md-mixed-line-endings** / lint: silent-accept — lint=0 findings
