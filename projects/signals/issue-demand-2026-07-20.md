# Signals Issue Demand

Live OpenClaw issue evidence reviewed on 2026-07-20.

The local Gitcrawl archive was healthy but contained only 48 threads and no
useful Signals matches, so discovery used live GitHub search and representative
issues were verified with `gh issue view`.

## Finding

Users are not primarily asking for "more logs." They repeatedly ask OpenClaw to
preserve owner-known meaning across five failure points:

1. error class is collapsed or flattened;
2. correlation context is missing;
3. failures are visible only at verbose level or in buried state;
4. usage exists but is not attributable or observable at the needed boundary;
5. exporter output cannot be trusted without conformance evidence.

## Cluster 1: Error Meaning Is Lost

| Issue | Evidence |
| --- | --- |
| [#44294](https://github.com/openclaw/openclaw/issues/44294) | ACP backend timeout, rate-limit, crash, and refusal outcomes collapse into normal `end_turn`. |
| [#82735](https://github.com/openclaw/openclaw/issues/82735) | Windows runtime failures have no stable identifiers; the reporter read bundled source to discover the relevant environment variables. |
| [#55806](https://github.com/openclaw/openclaw/issues/55806) | Tool logging exposes raw arguments, lacks structured error categories, and cannot describe context writeback. |
| [#102961](https://github.com/openclaw/openclaw/issues/102961) | `after_tool_call` receives flattened text even though a structured tool result exists elsewhere, so plugins cannot distinguish failing exec calls from successful ones. |

**Interpretation:** this is a preservation problem. The semantic owner knew more
than the final consumer received.

## Cluster 2: Correlation And Lifecycle Are Incomplete

| Issue | Evidence |
| --- | --- |
| [#50291](https://github.com/openclaw/openclaw/issues/50291) | Plugin hooks lack consistent `messageId`, `runId`, and parent span context, making concurrent group-chat traces ambiguous. |
| [#80551](https://github.com/openclaw/openclaw/issues/80551) | Tracing plugins need an owner-emitted agent-start boundary and exact parent/run identity before the first model input. |
| [#101867](https://github.com/openclaw/openclaw/issues/101867) | Subagent process death leaves no stable telemetry artifact; observed failed spawn spans carried empty error strings. |
| [#102014](https://github.com/openclaw/openclaw/issues/102014) | Session-end timing is projected from model completion instead of the actual lifecycle boundary. |
| [#102016](https://github.com/openclaw/openclaw/issues/102016) | Point events are exported as zero-duration spans, weakening duration semantics. |
| [#102018](https://github.com/openclaw/openclaw/issues/102018) | Session error status is not reflected in OTel error counts, so monitoring misses failures. |
| [#102019](https://github.com/openclaw/openclaw/issues/102019) | Session end reason exists in the exported shape but is empty, preventing outcome analysis. |
| [#93071](https://github.com/openclaw/openclaw/issues/93071) | OTel exports lack explicit OpenClaw version, instance, deployment, and runtime identity. |

**Interpretation:** W3C trace context solves distributed ancestry, but OpenClaw
owners must still emit product lifecycle boundaries and bounded resource
identity.

## Cluster 3: Failures Are Operationally Silent

| Issue | Evidence |
| --- | --- |
| [#78301](https://github.com/openclaw/openclaw/issues/78301) | Plugin loader failures surface as opaque errors or restart loops; the reporter describes hours of debugging and buried causes. |
| [#79421](https://github.com/openclaw/openclaw/issues/79421) | A conversation hook is default-denied and only visible through a buried plugin diagnostic, so production code silently never executes. |
| [#104950](https://github.com/openclaw/openclaw/issues/104950) | Production sessions record `abortedLastRun` without an error trace or delivered output. |
| [#111064](https://github.com/openclaw/openclaw/issues/111064) | Telegram streaming delivery can go quiet while all relevant failure messages remain verbose-only. |
| [#93408](https://github.com/openclaw/openclaw/issues/93408) | WhatsApp access-control drops are invisible at default logging, making policy behavior look like a broken bot. |
| [#54622](https://github.com/openclaw/openclaw/issues/54622) | CLI relay exits with code 1 after a blocked session lane but writes nothing to stdout or stderr. |

**Interpretation:** warning severity and user rendering are owner decisions.
Signals should preserve a typed reason that can be projected into the correct
default surface, not make every event noisy.

## Cluster 4: Resource Usage Exists But Is Not Complete Or Attributable

| Issue | Evidence |
| --- | --- |
| [#13219](https://github.com/openclaw/openclaw/issues/13219) | Per-message usage exists in session JSONL, but users must manually parse all sessions for cost and model-mix analysis. |
| [#57404](https://github.com/openclaw/openclaw/issues/57404) | Run usage is persisted but omitted from the lifecycle event stream, forcing observers to poll state. |
| [#90911](https://github.com/openclaw/openclaw/issues/90911) | Cron has token attribution, while task and subagent runs require fragile timestamp correlation. |
| [#42475](https://github.com/openclaw/openclaw/issues/42475) | Operators want per-agent budgets because current cost data is observational and runaway loops can spend before detection. |
| [#90674](https://github.com/openclaw/openclaw/issues/90674) | Unknown model pricing is silently recorded as zero cost, creating false financial certainty. |
| [#98968](https://github.com/openclaw/openclaw/issues/98968) | Plugin `runtime.llm.complete` computes usage and cost but drops it before diagnostics export. |

**Interpretation:** Signals should normalize attribution and unknownness.
Budget enforcement remains a separate resource-governance consumer.

## Cluster 5: Exporter Health And Conformance Are Missing

| Issue | Evidence |
| --- | --- |
| [#93070](https://github.com/openclaw/openclaw/issues/93070) | OTel exporter lifecycle failures are not surfaced through Doctor or Status. |
| [#98886](https://github.com/openclaw/openclaw/issues/98886) | A shared signal-qualified endpoint sends metrics and logs to a traces endpoint, producing invalid backend data. |

The related [#102014](https://github.com/openclaw/openclaw/issues/102014) through
[#102019](https://github.com/openclaw/openclaw/issues/102019) reports provide
real trace fixtures showing that export success is not equivalent to semantic
correctness.

## Demand Conclusion

The recurring demand is:

- stable owner-defined outcomes;
- correlation and lifecycle identity;
- bounded reason/error codes separate from prose;
- explicit unknown or unavailable accounting rather than false zeroes;
- projection into default operator and user surfaces; and
- conformance fixtures that validate semantics independently of exporter
  availability.

This supports Signals as a small cross-owner consistency project. It does not
support a new universal telemetry platform.
