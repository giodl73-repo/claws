<!--
Optional linked context:
Add a visible `Closes #<issue-number>` or `Related: #<issue-number>` line
below this comment.

Required PR title:
type: user-facing description
Use a parenthesized scope only when it adds clarity:
fix(auth): login redirect loops when session cookie is expired

Types: feat, fix, improve, refactor, docs, chore.
-->

RFC: https://github.com/openclaw/rfcs/pull/42

Related: #28303, #90608, #105266, #88570

<details>
<summary>Additional instructions</summary>

**MUST:** Keep **Allow edits from maintainers** enabled for this PR so maintainers
can help update the branch when needed.

</details>

## What Problem This Solves

`openclaw update --dry-run` exposes operator-facing labels, planned actions,
and notes, but the preview previously had no surface-owned localization seam.
Localizing those strings directly must not translate paths, channels, package
specs, command tokens, or the structured JSON preview consumed by automation.

## Why This Change Was Made

This is a bounded updater-owned consumer slice from RFC 0024:

- add a process-scoped CLI adapter over `@openclaw/localization-core`;
- add reviewed English and `zh-CN` catalogs only for the updater dry-run
  message family;
- localize human-readable dry-run headings, labels, actions, and notes;
- keep root paths, install modes, channels, versions, package specs, flags,
  and schema diagnostics literal; and
- maintain canonical English `actions` and `notes` in `--json` output for
  locale-invariant automation.

This PR is stacked on the exact #111541 kernel head
`d610106d6c780f243d9fa0ad3ed5901bc018ae26`. Its intended review delta is six
files, 315 additions, and 28 deletions. Until #111541 lands, GitHub displays the
cumulative kernel plus updater stack as 24 files, 1,589 additions, and 72
deletions.

The earlier cumulative draft also localized updater progress, service
lifecycle, completion-cache, status, unrelated CLI commands, Gateway errors,
approval/safety presentation, and Control UI behavior. Those surfaces have
been removed and remain separate owner-reviewed slices.

## User Impact

Operators selecting `zh-CN` receive a localized human dry-run preview while
operational values remain copyable and exact. English output remains reviewed
fallback, and `openclaw update --dry-run --json` is byte-for-byte equivalent at
the object level across English and `zh-CN` locale selection.

No update mutation, service lifecycle, completion behavior, protocol field,
configuration key, or production translation outside this one preview changes.

## Evidence

Exact head: `799fe933ca4b86944c51c5b8cbf8b1216e02b07a`

- `oxfmt --check` passes for all six intended-delta files.
- 4 CLI localization adapter tests pass.
- 194 updater CLI tests pass, including localized human output and JSON
  invariance.
- `codex review --base d610106d6c7` reports no actionable defects.
- Root `tsgo -p tsconfig.json --noEmit` reached only two unrelated current
  environment/baseline failures in `extensions/diagnostics-otel` and the
  unavailable `libphonenumber-js/min` dependency; it reported no CLI,
  localization, or updater diagnostics.

## Real behavior proof

Behavior or issue addressed:
The updater dry-run renderer localizes human presentation through the shared
kernel while preserving canonical structured output and literal operational
values.

Real environment tested:
Ubuntu 24.04 under WSL, Node.js 24.15.0, exact OpenClaw source head
`799fe933ca4b86944c51c5b8cbf8b1216e02b07a`, invoking the real source
`printUpdateDryRun` entrypoint with `OPENCLAW_LOCALE=zh-CN`. No Vitest mocks,
Gateway, update mutation, or external service was involved.

Exact steps or command run after this patch:

1. Invoke the source updater dry-run renderer for a Git checkout on channel
   `dev`, with restart disabled and literal root/version values.
2. Invoke the JSON path once with English and once with `zh-CN`, then compare
   the two emitted preview objects.

Evidence after fix:

```text
更新试运行
未应用任何更改。

  根目录: /srv/openclaw
  安装类型: git
  模式: git
  更新通道: dev
  标签/规格: latest
  当前版本: 2026.7.1

计划操作：
  - 在配置中保存 update.channel=dev
  - 在 dev 通道运行 git 更新流程（fetch/rebase/build/doctor）
  - 核心更新后运行插件更新同步
  - 刷新 shell 补全缓存（如需要）
  - 跳过重启（因为设置了 --no-restart）

说明：
  - git 目标的数据库架构兼容性会在实际更新时验证；此预览不会检查。
JSON_INVARIANT=true
```

Observed result after fix:
The human preview used the reviewed `zh-CN` catalog while `/srv/openclaw`,
`git`, `dev`, `latest`, `2026.7.1`, `fetch/rebase/build/doctor`, and
`--no-restart` remained literal. English and Chinese locale selection emitted
identical JSON preview objects.

What was not tested:
Updater progress, mutation, service restart, shell completion, status, Gateway,
Control UI, approval/safety, channels, native apps, and external plugins are not
part of this slice. The full CLI entrypoint was attempted with isolated state
and config directories but hung before updater rendering, so that attempt is
not claimed as behavior proof. Full root typecheck remains blocked by the two
unrelated failures listed above.
