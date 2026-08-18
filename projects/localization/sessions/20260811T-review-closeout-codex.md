# Localization review closeout — 2026-08-11

- F01 exact head `a944063598194b093dba5eda2b1e154cb9ca3aa7` passed 88 focused
  tests and manual dependency/source review with no accepted actionable issue.
- Authoring review found a real model-selection mismatch between the trusted
  workflow and translation engine. Commit
  `3c6ebea2767b1e38fc0090fee0c91938008feddd` aligns provider/model selection
  and generated provenance; 179 focused tests, scripts lint, and diff checks
  pass.
- Restacked heads: adoption `6359b52e00c71d975f95a06ffc6fcae1d99916ee`,
  updater `0e2f9b52586f3bc40277c19d8a70a763feed64df`, TUI
  `955db24722e2f6c04322896469f58eeea27a80d5`, Gateway
  `20a86eb31066521d2415a9f56d2d9ecd79d6c635`, wizard
  `1ca5527ee3f9320964439267dd498678094bd22d`.
- Codex's Linux dynamic-locale finding was rejected as unrelated: none of
  `apps/linux/ui/i18n.js`, `main.js`, or `quickchat.js` appears in the PR diff,
  and no branch-only commit touches them.
- Nothing was pushed. Current upstream main is 48 commits beyond the merge
  base; rebase, rerun focused proof and exact-head review, then publish in stack
  order.
