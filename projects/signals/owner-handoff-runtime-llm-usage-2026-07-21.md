# Runtime LLM usage owner handoff

## Recommendation

Support the existing upstream fix path in
[openclaw/openclaw#107937](https://github.com/openclaw/openclaw/pull/107937)
rather than promote fork draft
[giodl73-repo/openclaw#150](https://github.com/giodl73-repo/openclaw/pull/150)
unchanged.

The smallest owner decision is whether the first fix restores accounting
completeness only, or also adds permanent plugin attribution to public
diagnostic and metric contracts.

## Owner-first frame

The plugin LLM runtime already owns model selection, successful completion,
normalized usage, estimated cost, agent identity, and optional session
identity. Diagnostics already owns `model.usage` transport and projection for
other completion paths.

The missing capability is one owner-local projection from a successful,
nonzero `runtime.llm.complete` result into that existing diagnostic event. The
plugin runtime keeps completion semantics; diagnostics keeps activation,
transport, redaction, metrics, traces, and storage.

The deletion target is plugin- or operator-side reconstruction of plugin LLM
spend from logs and session histories.

## Correct demand anchor

The exact implementation gap is
[openclaw/openclaw#98968](https://github.com/openclaw/openclaw/issues/98968),
not the broader
[openclaw/openclaw#13219](https://github.com/openclaw/openclaw/issues/13219).

- #98968 asks for missing `model.usage` emission from
  `api.runtime.llm.complete`.
- #13219 asks for a dedicated per-model usage log, aggregation, source
  attribution, and budget-oriented operator workflows. A diagnostic emission
  improves completeness but does not satisfy that product request.

Both issues are open and unassigned. #98968 is marked source-reproduced with a
clear fix shape. #13219 is explicitly marked as needing maintainer and product
decisions.

Issue provenance:

- #98968 by @4thCafe (account 2024-12-07; 2 OpenClaw threads, 0 commits in the
  last 12 months).
- #13219 by @duckshrug (account 2026-02-03; 10 OpenClaw threads, 0 commits in
  the last 12 months).

## Existing upstream path

PR #107937 by w33d (@Last-emo-boy, account 2017-05-11; 2 OpenClaw threads and
1 commit in the last 12 months) is open, unassigned, and behind current main at
`f52816089d1`. It changes 10 files, +287/-18.

It already uses the correct runtime boundary and covers successful, empty,
cache-only, failed, diagnostics-disabled, and trusted nested-plugin cases. It
also adds `pluginId` to the diagnostic payload and `plugin` dimensions to OTel
and Prometheus.

ClawSweeper identified two remaining owner concerns:

1. `openclaw.plugin` is added through shared usage attributes and therefore
   reaches `openclaw.run.duration_ms`, contrary to the PR's stated contract.
2. The new public metric dimensions need exact-head live provider/exporter
   proof and explicit compatibility acceptance.

The earlier PR
[openclaw/openclaw#98992](https://github.com/openclaw/openclaw/pull/98992)
contains real DeepSeek emission proof, but it is closed and does not prove the
current #107937 head.

## Fork evidence disposition

Fork #150 is a useful minimal evidence slice:

- 2 files, +111/-1;
- applies cleanly to current main `59640bad267d`;
- reuses the existing trusted `model.usage` contract;
- adds no plugin field or exporter label;
- derives canonical prompt tokens and preserves existing activation,
  success-only, nonzero-usage, and privacy behavior.

It is not promotion-ready unchanged. At
`src/plugins/runtime/runtime-llm.runtime.ts:486`, it emits plugin-completion
latency as `durationMs`. Current OTel code records any `model.usage.durationMs`
into `openclaw.run.duration_ms` at
`extensions/diagnostics-otel/src/service-recorders-usage.ts:99`. A plugin model
call is not an agent-run duration.

Keep #150 frozen as evidence until an owner chooses one of these shapes:

| Choice                   | Contract                                       | Required change                                                                                    |
| ------------------------ | ---------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| Minimal accounting       | Existing `model.usage`; no plugin dimension    | Reuse the two-file slice, omit `durationMs`, refresh proof                                         |
| Attributed accounting    | Add bounded plugin identity to usage telemetry | Fix #107937's duration attributes, accept metric compatibility, add exact-head live exporter proof |
| Separate product surface | Dedicated usage log or provider feed           | Treat as #13219 product work; do not hide it in this fix                                           |

## Owner questions

Likely decision owner: @steipete, with plugin-runtime and diagnostics input from
recent area contributors such as @vincentkoc.

1. Is complete provider/model/agent/session accounting sufficient for the first
   fix, or is per-plugin attribution required now?
2. If plugin attribution is required, may existing OTel and Prometheus metric
   identities gain a permanent plugin dimension?
3. Should plugin completion latency remain absent from `model.usage`, or should
   diagnostics introduce a separately named model-call duration metric?
4. Which exact live provider/exporter proof is sufficient for the selected
   contract?

## Promotion gate

Do not open another upstream PR. After owner selection:

- support and narrow #107937 if attributed accounting is accepted; or
- recreate the minimal two-file slice from current main without `durationMs`
  if compatibility-preserving accounting is preferred.

In either case, rerun the focused runtime and exporter proof and bind the
result to the exact promoted revision.
