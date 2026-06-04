# PR 3 Draft: Dry-run context-budget recommendations

Status: planned, not implemented.

## Summary

Add the management layer users asked for: concrete, conservative dry-run
recommendations for optimizing context budget without editing files.

## Scope

- Add `openclaw budget recommend --dry-run --json`.
- Add stable recommendation/finding IDs.
- Support classes: `review`, `split`, `dedupe`, `tune-limit`, `archive`.
- Include estimated savings where defensible.
- Include precise targets such as `oc://workspace/...` or `oc://skill/...`.
- Render recommendation sections in markdown reports.

## Non-Goals

- No automatic apply.
- No content quality scoring.
- No memory deletion.
- No prompt compression agent.
