# Scenario backlog

Running menu of multi-step lifecycle scenarios for the substrate train. Format is `scripts/run-scenario.mjs --all` driven; each lives at `scenarios/<slug>.scenario.mjs`.

Status legend:
- `green` — written, passing
- `green-locks-finding` — written, passing, but assertion captures a known-buggy behavior pinned for future fix
- `pending` — proposed, not yet written
- `deferred` — won't write soon (skipped because hard to test reliably, or low-leverage)

Running in approximate priority order within each category.

## LKG rhythm + state-machine

| Slug | Status | Notes |
|------|--------|-------|
| `lkg-fresh-deployment` | green | first status on empty workspace |
| `lkg-promote-corrupt-recover` | green | canonical recover-from-LKG flow |
| `lkg-label-rollback` | green | promote-v1 → edit → promote-v2 → rollback |
| `lkg-label-immutability` | green | duplicate `--label v1` → LKG_LABEL_DUPLICATE |
| `lkg-deleted-file-recover` | green | F-019 fixed; status flags orphan, rollback restores |
| `lkg-rollback-no-such-label` | green | typo / unknown → LKG_LABEL_NOT_FOUND |
| `lkg-delete-label-then-rollback` | green | escape hatch + zombie-state check |
| `lkg-stale-tmp-cleanup` | green | `.lkg.tmp-*` from prior crash doesn't break things |
| `lkg-corrupted-companion` | green | both .lkg + active corrupt → no crash |
| `lkg-empty-promote-noop` | green | second promote with same bytes is `valid` |
| `lkg-skip-config-promote` | green-locks-finding | F-021: promote ignores `lkg.skipPaths` |
| `lkg-readlast-no-lkg` | pending | `readLastKnownGood` when no LKG exists → `LKG_STORE_UNAVAILABLE` shape |
| `lkg-promote-then-list-labels` | pending | `cage labels` reflects state correctly |
| `lkg-promote-with-sentinel` | pending | bytes containing `__OPENCLAW_REDACTED__` → store refuses |
| `lkg-tracker-path-collision` | pending | manual register of duplicate tracker → LKG_TRACKER_PATH_COLLISION |

## Upgrade / migration

| Slug | Status | Notes |
|------|--------|-------|
| `upgrade-lkg-state-future-version` | green | future-version state → mismatch error; recovery via wipe + repromote |
| `upgrade-lkg-state-no-version-field` | green | pre-versioning state → same mismatch path |
| `upgrade-pre-upgrade-rollback` | green-locks-finding | F-023: workspace.json NOT restored by rollback (not canonical) |
| `upgrade-stale-rule-skip` | green-locks-finding | F-022: pinch silently ignores stale skip refs |
| `upgrade-policy-jsonc-old-shape` | green | older policy.jsonc → check graceful |
| `upgrade-plugin-uninstalled-refs` | green | AGENTS.md mentions removed plugin's tools; pinch silent (rule opportunity) |
| `upgrade-config-health-old-name` | pending | upstream's old `config-health.json` vs new `lkg-health.json` — coexistence |

## Concurrency / multi-process

| Slug | Status | Notes |
|------|--------|-------|
| `concur-two-status-readers` | deferred | hard to test reliably in single-thread harness; needs spawned processes |
| `concur-status-during-promote` | deferred | timing-sensitive |
| `concur-half-written-state` | pending | manually stage `.tmp` mid-rename → next read tolerates? |
| `concur-stale-pid-tmp` | green (≈ stale-tmp-cleanup) | already covered |

## Real-world mess

| Slug | Status | Notes |
|------|--------|-------|
| `mess-merge-conflict-markers` | pending | `<<<<<<< HEAD` in AGENTS.md |
| `mess-mid-rebase-headless` | pending | git rebase in progress, files missing |
| `mess-symlink-self-ref` | pending | symlink loop in workspace |
| `mess-symlink-out-of-tree` | pending | symlink pointing outside workspace root |
| `mess-readonly-fs` | deferred | tricky on Windows; can simulate with chmod on POSIX |
| `mess-submodule-nested-workspace` | pending | nested openclaw workspace via submodule |
| `mess-windows-paths-with-spaces` | pending | "My Workspace" dir with spaces |
| `mess-gitignored-agents-md` | pending | `.gitignore` entries that hide canonical files |

## Cross-substrate pipelines

| Slug | Status | Notes |
|------|--------|-------|
| `cross-pinch-finds-drift-policy-regen-cage-promote` | pending | full feedback loop |
| `cross-doctor-fix-then-cage-detects-drift` | pending | doctor mutates → cage observes recovery |
| `cross-policy-check-after-pinch-fix` | pending | pinch fixes → policy.jsonc still valid |

## Plugin lifecycle ("scrappy plugin matures")

| Slug | Status | Notes |
|------|--------|-------|
| `plugin-bare-then-mature` | green | bare AGENTS.md → operator iterates → clean run; covers F-008 delegation |
| `plugin-iterative-policy-build` | green | TOOLS.md grows; policy generate/check loop catches drift |
| `plugin-add-skill-cage-tracks` | green | new skill mid-flight; cage picks it up |
| `plugin-pre-promote-rejects-invalid` | green | promote --label is atomic; no label pinned if any tracker invalid |
| `plugin-evolve-then-pin-each-step` | green | pin LKG at each milestone; rollback restores any prior state |
| `plugin-add-own-lint-rule-pack` | pending | plugin ships its own rule pack via manifest |
| `plugin-add-doctor-contract` | pending | plugin contributes doctor rule via doctor-contract-api.ts |

## Performance

| Slug | Status | Notes |
|------|--------|-------|
| `perf-1000-tools` | pending | TOOLS.md with 1000 entries; substrate scales |
| `perf-1000-sessions` | pending | sessions/*.jsonl × 1000; manifest walk doesn't OOM |
| `perf-deep-skill-tree` | pending | nested skills/ dirs 5 levels deep |

---

Total: 19 green / 3 green-locking / 22 pending / 3 deferred = **47 scenarios** in flight.

**Findings surfaced via scenarios**:
- F-019 (cage status ignores deleted files) → fixed
- F-021 (cage promote ignores lkg.skipPaths) → tracked
- F-022 (pinch silently ignores stale skip refs) → tracked
- F-023 (workspace.json not in LKG canonical roles) → tracked, design question
