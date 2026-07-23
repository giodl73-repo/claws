# Rendezvous Project

Use this area to track Gio-owned Lobster M5 Rendezvous commitments due
July 31, map each commitment to its durable owning project, and make scope or
staffing gaps explicit.

## Active Notes

| Area              | File         |
| ----------------- | ------------ |
| Live handoff      | `SESSION.md` |
| PR execution plan | `pr-plan.md` |

## Active Work

| Issue                                                                 | Owning project                                                        | Status                                                                                                                     | July 31 outlook                                                                                                                                                                                                  | Next deliverable                                                                                                                                       |
| --------------------------------------------------------------------- | --------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| [bic/lobster#551](https://microsoft.ghe.com/bic/lobster/issues/551)   | `projects/claws/`, with `projects/feeds/` and `projects/promoteclaw/` | #4982/#5045 merged; #5211 closed as out of scope                                                                           | Upstream landing now; Lobster pickup after quarantine                                                                                                                                                            | Land Claws, then promote and validate the first quarantine-cleared Claws-bearing release.                                                              |
| [bic/lobster#3897](https://microsoft.ghe.com/bic/lobster/issues/3897) | `projects/policy/` and `projects/clawpilot/`                          | #5336 is the convergence contract; #4297 merged; #4648 approved; #5491 ready; structured-workspace #5505 drafted | Active series                                                                                                                                                                                                    | Merge #5336, drive #5491 and #5505, while config activation waits for normalized exec-mode support. |
| [bic/lobster#867](https://microsoft.ghe.com/bic/lobster/issues/867)   | `projects/admin/`, with `projects/policy/`                            | MAC Scout availability control is explicit                                                                                 | [#5422](https://microsoft.ghe.com/bic/lobster/pull/5422) is non-draft/mergeable at `8feadccf92`; shared Build Validation repair [#5495](https://microsoft.ghe.com/bic/lobster/pull/5495) is open at `7d76d8ff68` | Land #5495, merge/rebase it into #5422, then drive fresh required CI/review and tenant authorization/readback proof.                                   |
| [bic/lobster#862](https://microsoft.ghe.com/bic/lobster/issues/862)   | `projects/clawpilot/`                                                 | #4297 merged; remediation [#5460](https://microsoft.ghe.com/bic/lobster/pull/5460) open                                    | PR opened                                                                                                                                                                                                        | Drive #5460 review and required checks.                                                                                                                |

## Related Work

| Repo              | PR                                                          | Status                                                                                               | Relevance                                                                                                                                   |
| ----------------- | ----------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| openclaw/openclaw | [#102383](https://github.com/openclaw/openclaw/pull/102383) | Draft                                                                                                | Install supported skill artifacts through `claws apply`.                                                                                    |
| openclaw/openclaw | [#102406](https://github.com/openclaw/openclaw/pull/102406) | Draft, stacked                                                                                       | Register inline MCP server artifacts through the validated config writer.                                                                   |
| openclaw/openclaw | [#89596](https://github.com/openclaw/openclaw/pull/89596)   | Merged                                                                                               | Recognize declared plugin and MCP tool allowlists.                                                                                          |
| openclaw/openclaw | [#90003](https://github.com/openclaw/openclaw/pull/90003)   | Merged                                                                                               | Add attributable exec-approval evidence and policy rules.                                                                                   |
| bic/lobster       | [#5211](https://microsoft.ghe.com/bic/lobster/pull/5211)    | Closed as out of scope for #551                                                                      | Preserved auditable-skills proof of concept.                                                                                                |
| bic/lobster       | [#4297](https://microsoft.ghe.com/bic/lobster/pull/4297)    | Merged                                                                                               | Project node inventory, including connection state, into Code Mode.                                                                         |
| bic/lobster       | [#4648](https://microsoft.ghe.com/bic/lobster/pull/4648)    | Current head `59a3973ff2`; Galin approved; checks/reviewer refresh remain                            | Add governed Code Mode node invocation with connected-node validation.                                                                      |
| bic/lobster       | [#5460](https://microsoft.ghe.com/bic/lobster/pull/5460)    | Bundle fix at `865df0ade7`; threads resolved and Galin approved; stale change requests await refresh | Explain offline-node recovery and direct the user to reconnect Scout Desktop.                                                               |
| bic/lobster       | [#5491](https://microsoft.ghe.com/bic/lobster/pull/5491)    | Ready at `b5e5a25869`; exact-head approved; ADO queued                                               | Inventory host-exec friction safely and suppress browser-local persistent auto-allow as #5336 V1 PR 1.                                      |
| bic/lobster       | [#5505](https://microsoft.ghe.com/bic/lobster/pull/5505)    | Draft at `7c0b20d633`; focused tests and final Codex review clean                                    | Add bounded profile-free `WorkspaceFiles` structured inspection as an independent #5336 implementation slice.                              |
| bic/lobster       | [#5495](https://microsoft.ghe.com/bic/lobster/pull/5495)    | Open/mergeable at `7d76d8ff68`; exact-merge ADO queued                                               | Repair the current-main Build Validation web-bundle handoff that blocks #5422 independently of Scout source.                                |
| bic/lobster       | [#5336](https://microsoft.ghe.com/bic/lobster/pull/5336)    | Open at `2f2644b0bb`; PR CI running                                                                  | Define profile-free V1 `scout-standard`, its typed-tool series, and a separately gated later migration to released OpenClaw `productivity`. |
| bic/lobster       | [#5349](https://microsoft.ghe.com/bic/lobster/pull/5349)    | Draft                                                                                                | Track native `M365.messages.saveAttachment(...)` release integration.                                                                       |
| bic/lobster       | [#3555](https://microsoft.ghe.com/bic/lobster/pull/3555)    | Merged                                                                                               | Documents MAC registration/deployment boundaries; does not implement the Scout enable/disable control.                                      |

## Related Areas

- `projects/claws/README.md`
- `projects/feeds/README.md`
- `projects/clawpilot/README.md`
- `projects/admin/README.md`
- `projects/policy/README.md`
- `projects/prs/README.md`
