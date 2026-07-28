# Signals Project

Use this area for shared facilities and conformance that ensure each OpenClaw
subsystem manages and reports its own structured operational facts before they
are rendered, measured, audited, or tested.

The working metaphor is **structured exhaust**: existing owners emit stable
meaning, and existing consumers decide how to present or transport it. Signals
is not a new event bus, telemetry backend, storage system, or universal runtime
framework.

## Initial Scope

- stable machine identity and bounded structured fields for owner results,
  outcomes, findings, decisions, and usage observations;
- owner-native attempt, subject/revision, evaluation, finding, and accounting
  lifetimes, without one universal identity schema;
- correlation through existing trace context and product identifiers, including
  run, call, tool-call, session, message, agent, generation, and owner identity
  where applicable;
- diagnostic trust metadata, redaction, and private-data separation;
- normalized resource and provider-usage dimensions;
- adapters into existing localization, telemetry, Doctor, Policy, readiness,
  audit, and conformance surfaces; and
- compatibility rules for adopted owner contracts and their projections.
- revision-bound conformance evidence, stale-claim handling, mixed-version
  compatibility, and disclosed projection constraints.

## Boundaries

- Semantic owners keep ownership of when and why an operational fact is
  produced or emitted, its identity, and its authoritative lifetime.
- Localization owns human rendering and locale fallback.
- Telemetry and audit systems own transport, sampling, aggregation, retention,
  replay, integrity, and storage guarantees.
- Resource-governance consumers own budgets, quotas, and enforcement.
- Consumers that alert, admit, retry, repair, block, or enforce own the
  freshness, trust, unknown-state, and action-authority contract.
- Signals must extend existing structured concepts before introducing a new
  abstraction.

## Active Notes

| Area                                                   | File                                              |
| ------------------------------------------------------ | ------------------------------------------------- |
| Current session and resume state                       | `SESSION.md`                                      |
| Falsifiable thesis and boundaries                      | `frame.md`                                        |
| Live OpenClaw issue demand                             | `issue-demand-2026-07-20.md`                      |
| Current source and comparator audit                    | `source-and-comparison-audit-2026-07-20.md`       |
| Source-aligned terminology and structured upgrades     | `terminology-audit-2026-07-20.md`                 |
| Runtime, operator, UX, security, and simplicity review | `role-review-2026-07-20.md`                       |
| RFC package FACES and `.craft/roles` review            | `package-review-2026-07-20.md`                    |
| First candidate evidence slice                         | `slice-1-telegram-draft-delivery.md`              |
| Second candidate evidence slice                        | `slice-2-structured-tool-results.md`              |
| Foundation slice comparison                            | `foundation-comparison-2026-07-21.md`             |
| Fork stack consolidation and promotion map             | `stack-consolidation-2026-07-21.md`               |
| Outbound run-correlation slice                         | `slice-4-outbound-run-correlation.md`             |
| Subagent terminal telemetry slice                      | `slice-5-subagent-terminal-telemetry.md`          |
| Runtime LLM usage attribution slice                    | `slice-7-runtime-llm-usage.md`                    |
| Runtime LLM usage owner handoff                        | `owner-handoff-runtime-llm-usage-2026-07-21.md`   |
| Unknown pricing owner-decision audit                   | `slice-8-unknown-pricing-deferred.md`             |
| Exporter health owner-decision audit                   | `slice-9-exporter-health-deferred.md`             |
| Session export conformance owner-decision audit        | `slice-10-session-export-conformance-deferred.md` |

RFC 0025 treats RFC 0018 readiness as an adopted current-state owner contract.
Its telemetry projections preserve subject replacement versus revision,
incomplete-evaluation semantics, and bounded cardinality; they do not create a
second readiness history or evaluator.

## Active Work

| Repo                    | PR / Issue                                                                                                                  | Branch                                           | Status                                                                | Purpose                                                                                                           |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ | --------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `openclaw/rfcs`         | Local RFC 0025 draft                                                                                                        | `user/giodl/rfc-0025-signals`                    | Local only                                                            | Structured operational ownership standard and ten-PR implementation forecast.                                     |
| `openclaw/openclaw`     | [#111065](https://github.com/openclaw/openclaw/pull/111065) / [#111064](https://github.com/openclaw/openclaw/issues/111064) | `aspalagin:fix/telegram-draft-visible-failures`  | Contributor PR; logging-only                                          | Preserve default operator visibility for Telegram draft delivery failures.                                        |
| `giodl73-repo/openclaw` | [#145](https://github.com/giodl73-repo/openclaw/pull/145)                                                                   | `user/giodl/signals-telegram-draft-diagnostics`  | Fork-only draft; owner decision pending                               | Evaluate the bounded trusted diagnostic as the first Signals conformance slice without publishing it upstream.    |
| `giodl73-repo/openclaw` | [#146](https://github.com/giodl73-repo/openclaw/pull/146)                                                                   | `user/giodl/signals-structured-tool-results`     | Fork-only draft; owner decision pending                               | Preserve structured Codex-native shell and file-change results through exactly-once `after_tool_call` projection. |
| `giodl73-repo/openclaw` | [#147](https://github.com/giodl73-repo/openclaw/pull/147)                                                                   | `user/giodl/signals-conformance-testing-guide`   | Fork-only draft; owner decision pending                               | Document owner-local conformance evidence without adding shared runtime or test machinery.                        |
| `giodl73-repo/openclaw` | [#148](https://github.com/giodl73-repo/openclaw/pull/148)                                                                   | `user/giodl/signals-outbound-run-correlation`    | Fork-only draft; owner decision pending                               | Preserve the existing agent `runId` through routed `message_sending` and `message_sent` hooks.                    |
| `giodl73-repo/openclaw` | [#149](https://github.com/giodl73-repo/openclaw/pull/149)                                                                   | `user/giodl/signals-subagent-terminal-telemetry` | Fork-only draft; owner decision pending                               | Project the existing exactly-once `subagent_ended` hook into bounded diagnostics-otel spans and metrics.          |
| `giodl73-repo/openclaw` | [#150](https://github.com/giodl73-repo/openclaw/pull/150)                                                                   | `user/giodl/signals-runtime-llm-usage`           | Fork-only evidence; superseded upstream and needs duration correction | Compare a minimal existing-contract projection with upstream PR #107937's attributed metric expansion.            |

## Related Areas

- `projects/localization/README.md`
- `projects/doctor/README.md`
- `projects/policy/README.md`
- `projects/catalog/README.md`
- `projects/context-budget/README.md`
- `projects/hosting-profiles/README.md`
- `projects/layering-contracts/README.md`
