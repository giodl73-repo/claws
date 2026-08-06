# Localization Project

Use this area for OpenClaw localization architecture, source audits, issue
mapping, and bounded implementation slices across CLI, Gateway, channel, UI,
native-app, and documentation surfaces.

## Current Thesis

RFC 0024 is accepted. Delivery uses one shared locale/context contract, one
catalog and surface-disposition gate per repository, and bounded owner slices
that preserve machine semantics while localizing final presentation. Each
slice must bring its runtime/artifact, tests, progressive owner guidance, and
trusted refresh obligation; no slice adds its own translation service.

## Active Notes

| Area                                                | File                                                                                 |
| --------------------------------------------------- | ------------------------------------------------------------------------------------ |
| Current source audit and initial frame              | `source-audit.md`                                                                    |
| RFC 0024 pitch and owner asks                       | `rfc-0024-pitch.md`                                                                  |
| Projected owner slice plan (47 current entries)     | RFC sidecar `rfcs/0024/projected-owner-slice-registry.md` in the active RFC worktree |
| Superseded five-PR completion proposal              | `completion-wave-plan.md`                                                            |
| Translation automation and shared workflow evidence | `translation-automation-audit-2026-07-21.md`                                         |
| Lobster target-scale comparator                     | `lobster-localization-comparator.md`                                                 |
| O08 wizard migration evidence slice                 | `o08-wizard-migration-slice.md`                                                      |
| Live handoff                                        | `SESSION.md`                                                                         |

## Active Work

| Repo                | PR / Issue                                                    | Branch                                           | Status           | Purpose                                                                                       |
| ------------------- | ------------------------------------------------------------- | ------------------------------------------------ | ---------------- | --------------------------------------------------------------------------------------------- |
| `openclaw/openclaw` | [#81253](https://github.com/openclaw/openclaw/issues/81253)   | detached audit worktree                          | Existing issue   | Localized/template-aware exec approval prompts                                                |
| `openclaw/openclaw` | [#79458](https://github.com/openclaw/openclaw/issues/79458)   | none                                             | Existing issue   | Localized slash-command descriptions                                                          |
| `openclaw/rfcs`     | [RFC PR #42](https://github.com/openclaw/rfcs/pull/42)        | `user/giodl/rfc-0024-localization-runtime`       | Accepted/Merged  | Localization runtime, metadata, and coverage contract                                         |
| `openclaw/openclaw` | [#113105](https://github.com/openclaw/openclaw/issues/113105) | none                                             | Open tracker     | RFC 0024 implementation packages and supervised translation-refresh rollout                   |
| `openclaw/openclaw` | [#111541](https://github.com/openclaw/openclaw/pull/111541)   | `user/giodl/localization-bundle-foundation`      | Ready for review | F01 shared locale/context and standards-based ICU runtime foundation                          |
| `openclaw/rfcs`     | [RFC PR #49](https://github.com/openclaw/rfcs/pull/49)        | `user/giodl/rfc-0024-progressive-slice-guidance` | Ready for review | Hybrid ready-PR gate/refresh contract and progressive slice delivery guidance                 |
| `openclaw/openclaw` | [#112784](https://github.com/openclaw/openclaw/pull/112784)   | `user/giodl/localization-authoring-exemplar`     | Ready for review | Core `G45`/`G46`: blocking ready-PR gate, trusted in-place refresh, and generated-PR fallback |
| `openclaw/openclaw` | [#112801](https://github.com/openclaw/openclaw/pull/112801)   | `user/giodl/localization-surface-adoption-gate`  | Ready for review | `G47` owner-adapter gate for newly introduced product-string surfaces                         |
| `openclaw/openclaw` | [#113427](https://github.com/openclaw/openclaw/pull/113427)   | `user/giodl/localization-wizard-migration-offer` | Draft/stacked    | O08 wizard post-install migration prompt, hint, and recovery family                           |
| `openclaw/openclaw` | [#111542](https://github.com/openclaw/openclaw/pull/111542)   | `user/giodl/localization-bundle-runtime`         | Ready for review | F02 updater dry-run localization owner slice                                                  |
| `openclaw/openclaw` | [#111543](https://github.com/openclaw/openclaw/pull/111543)   | `user/giodl/localization-bundle-governance`      | Ready for review | F03 contributor ownership and workflow guidance                                               |
| `openclaw/openclaw` | [#111544](https://github.com/openclaw/openclaw/pull/111544)   | `user/giodl/localization-bundle-surfaces`        | Ready for review | F04 TUI status localization owner slice                                                       |
| `openclaw/openclaw` | [#111545](https://github.com/openclaw/openclaw/pull/111545)   | `user/giodl/localization-bundle-readiness`       | Ready for review | F05 bounded Gateway approval descriptor and Control UI rendering slice                        |
| `openclaw/openclaw` | none                                                          | `user/giodl/localization-cli-runtime`            | Local prototype  | PR 3 CLI runtime localization, stacked from PR 2                                              |

## Related Areas

- `projects/openclaw/README.md`
- `projects/catalog/README.md`
- `projects/ux-state/README.md`
