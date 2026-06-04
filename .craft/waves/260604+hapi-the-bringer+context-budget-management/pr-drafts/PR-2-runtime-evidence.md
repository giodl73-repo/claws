# PR 2 Draft: Runtime context evidence inputs

Status: planned, not implemented.

## Summary

Extend context-budget reports with existing runtime evidence so static estimates
can be compared with what OpenClaw actually assembled, compacted, and sent.

## Scope

- Read existing `systemPromptReport` sections where available.
- Import `/context`-style breakdowns without changing `/context` behavior.
- Include session usage and transcript pressure when present.
- Include compaction before/after metrics and context-engine estimates.
- Include provider usage only as optional evidence.
- Mark every value as exact, estimated, stale, or missing.

## Non-Goals

- No context-engine behavior changes.
- No hot-path required work.
- No provider billing reconciliation.
- No recommendations beyond existing PR 1 report summaries.
