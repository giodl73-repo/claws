# oc-path Project

`oc-path` work belongs in OpenClaw PR branches and related RFC/spec notes.

## Active / Recent PRs

| Repo              | PR                                                          | Branch                                                | Status                                       | Purpose                                                   |
| ----------------- | ----------------------------------------------------------- | ----------------------------------------------------- | -------------------------------------------- | --------------------------------------------------------- |
| openclaw/openclaw | [#86060](https://github.com/openclaw/openclaw/pull/86060)   | `fix-85929-oc-path-config-depth`                      | Merged                                       | Fix deep config edits.                                    |
| openclaw/openclaw | [#105935](https://github.com/openclaw/openclaw/pull/105935) | contributor branch                                    | Open; architecture gate failing outside diff | Candidate fix for #105683 JSON5 comment-loss warning.     |
| openclaw/openclaw | [#106339](https://github.com/openclaw/openclaw/pull/106339) | contributor branch                                    | Open; lint/dependency gates failing          | Competing candidate fix for #105683.                      |
| bic/lobster       | [#1419](https://microsoft.ghe.com/bic/lobster/pull/1419)    | `user/giodl/openclaw-vault-refresh`                   | Open                                         | OpenClaw repo snapshot refresh and 1.0 destination specs. |
| bic/lobster       | [#1051](https://microsoft.ghe.com/bic/lobster/pull/1051)    | `user/giodl/openclaw-policy-workspace-v1`             | Merged                                       | Policy 1.0, Workspace 1.0, and ClawPilot 1.0 specs.       |
| bic/lobster       | [#510](https://microsoft.ghe.com/bic/lobster/pull/510)      | `proposals/upstream-restructure-workspace-and-policy` | Merged                                       | Upstream workspace and policy proposal refresh.           |
| bic/lobster       | [#295](https://microsoft.ghe.com/bic/lobster/pull/295)      | `proposals/upstream-workspace-modernization`          | Merged                                       | Workspace modernization proposal package pattern.         |

## Local Worktrees

| Path                                      | Purpose                 |
| ----------------------------------------- | ----------------------- |
| `C:\src\openclaw-pr-oc-path`              | oc-path PR worktree.    |
| `C:\src\openclaw-pr-oc-path-dry-run-diff` | Dry-run diff follow-up. |
| `C:\src\openclaw-pr-oc-path-yaml`         | YAML follow-up.         |

2026-06-26 refresh: none of the three listed paths existed locally on this
machine. Treat them as historical pointers until a concrete follow-up issue or
branch is found.

## Next

- Track issue #105683 without opening a third fix; select between #105935 and
  #106339 after owned CI failures are repaired and behavior is compared.
- Recreate an oc-path worktree only after confirming a live issue or PR target.
- Keep active specs in project notes or upstream repo branches, not wave folders.
