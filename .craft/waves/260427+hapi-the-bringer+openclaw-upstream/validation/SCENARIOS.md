# Scenario rollup

Generated: 2026-05-06T03:29:47.407Z
Total: 5, ok: 5, failed: 0

| slug | description | steps | failed | result |
|------|-------------|------:|-------:|--------|
| `lkg-deleted-file-recover` | status ignores deleted files; rollback restores them | 5 | 0 | ok |
| `lkg-fresh-deployment` | fresh workspace, first cage status emits no error | 2 | 0 | ok |
| `lkg-label-immutability` | second promote --label v1 (same name) is rejected | 3 | 0 | ok |
| `lkg-label-rollback` | promote v1 → edit valid → promote v2 → rollback to v1 | 6 | 0 | ok |
| `lkg-promote-corrupt-recover` | promote → corrupt gateway.jsonc → status recovers from LKG | 4 | 0 | ok |
