# Scenario rollup

Generated: 2026-05-06T12:54:06.364Z
Total: 22, ok: 22, failed: 0

| slug | description | steps | failed | result |
|------|-------------|------:|-------:|--------|
| `lkg-corrupted-companion` | active corrupt + .lkg corrupt → clean failure (no good bytes) | 4 | 0 | ok |
| `lkg-delete-label-then-rollback` | delete-label v1 → rollback v1 fails; re-promote v1 succeeds | 6 | 0 | ok |
| `lkg-deleted-file-recover` | status flags deleted file as orphan; rollback restores it | 5 | 0 | ok |
| `lkg-empty-promote-noop` | idempotent promote — second call with same bytes is valid not promoted | 5 | 0 | ok |
| `lkg-fresh-deployment` | fresh workspace, first cage status emits no error | 2 | 0 | ok |
| `lkg-label-immutability` | second promote --label v1 (same name) is rejected | 3 | 0 | ok |
| `lkg-label-rollback` | promote v1 → edit valid → promote v2 → rollback to v1 | 6 | 0 | ok |
| `lkg-promote-corrupt-recover` | promote → corrupt gateway.jsonc → status recovers from LKG | 4 | 0 | ok |
| `lkg-rollback-no-such-label` | rollback --label <unknown> emits LKG_LABEL_NOT_FOUND | 3 | 0 | ok |
| `lkg-skip-config-promote` | F-021: cage promote ignores lkg.skipPaths (status honors it) | 4 | 0 | ok |
| `lkg-stale-tmp-cleanup` | stale .lkg.tmp file from prior crash does not break promote | 3 | 0 | ok |
| `plugin-add-skill-cage-tracks` | add new skill mid-flight → cage status picks it up automatically | 4 | 0 | ok |
| `plugin-bare-then-mature` | bare AGENTS.md → diagnose → operator iterates → clean run | 8 | 0 | ok |
| `plugin-evolve-then-pin-each-step` | pin LKG at each plugin milestone; labels list grows; rollback restores any prior state | 9 | 0 | ok |
| `plugin-iterative-policy-build` | TOOLS.md grows; policy generate/check loop catches drift | 6 | 0 | ok |
| `plugin-pre-promote-rejects-invalid` | promote --label is atomic — all-or-nothing across the cohort | 5 | 0 | ok |
| `upgrade-lkg-state-future-version` | future-version state → LKG_STATE_FILE_VERSION_MISMATCH; recovery via delete+repromote | 4 | 0 | ok |
| `upgrade-lkg-state-no-version-field` | pre-versioning state file → LKG_STATE_FILE_VERSION_MISMATCH | 1 | 0 | ok |
| `upgrade-plugin-uninstalled-refs` | AGENTS.md mentions removed plugin's tools; pinch silent (rule opportunity) | 2 | 0 | ok |
| `upgrade-policy-jsonc-old-shape` | older policy.jsonc shape (missing newer fields) → check runs gracefully | 1 | 0 | ok |
| `upgrade-pre-upgrade-rollback` | pin pre-upgrade label → simulate upgrade → rollback restores known-good | 7 | 0 | ok |
| `upgrade-stale-rule-skip` | F-022: pinch silently ignores skip entries that match no registered rule | 2 | 0 | ok |
