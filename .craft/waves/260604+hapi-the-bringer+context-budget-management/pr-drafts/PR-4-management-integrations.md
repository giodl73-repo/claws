# PR 4 Draft: Management integrations

Status: planned, not implemented.

## Summary

Connect stable recommendations to safe management surfaces: patch previews,
policy-readable evidence, and optional feed owner/range context.

## Scope

- Add oc-path-backed patch previews for narrow mechanical recommendations.
- Keep apply separate, explicit, and human-approved.
- Emit policy-readable evidence for recent reports, thresholds, and hashes.
- Let Enterprise Feeds metadata provide expected context ranges and owners when
  installed feed entries are present.

## Non-Goals

- No automatic mutation by default.
- No policy enforcement inside context-budget.
- No dependency on feeds for core audit/recommend functionality.
