# Scenario rollup

Generated: 2026-05-06T04:45:18.771Z
Total: 11, ok: 11, failed: 0

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
