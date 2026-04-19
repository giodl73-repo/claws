---
slug: claws-eval-api
preset: "claws"
plan: "3 headlines: eval API runs G0-G3 tiers on demand, sift query evaluates RELAX expressions at zero token cost, configurable eval triggers in claws.json"
area: claws
status: Draft
phase: ra
atoms: [atom:claws-serve, atom:governance-ir, atom:relax]
specs: [CL-10, CL-04, CL-05]
---

# claws-eval-api — Eval Pipeline + Sift Query via Serve API

## Headlines

1. **H1: `POST /api/eval` runs G0-G3 governance eval tiers on demand with cached results** — G0 (schema) and G1 (cross-file + sift expressions) already run in the ~40ms compile pipeline. G2 (LLM-as-judge semantic eval) and G3 (mock Gateway runtime enforcement) are available on demand via the eval API. Results are versioned and cached — `GET /api/eval/results?at=v44` shows eval state at any historical version via time-travel. The TUI Companion screen has a "Run Eval" button. CI/CD pipelines call `POST /api/eval?tier=G2,G3` as gates.
   - Validation: `POST /api/eval?tier=G2` returns semantic findings with scores within 10s
   - Validation: `GET /api/eval/results` returns cached results from last eval run
   - Validation: `GET /api/eval/results?at=v38` returns eval results from historical version

2. **H2: `POST /api/eval/sift` evaluates RELAX expressions at zero token cost in <1ms** — Ad-hoc governance queries using the same sift/RELAX expression engine that powers compile-time policy evaluation. "Show me all R3+ tools with OBO." "Which knowledge sources are CONFIDENTIAL?" "What tools does the cron session have access to?" All answered in sub-millisecond with zero LLM calls. Partners use this for governance dashboards, admin search, and compliance reports.
   - Validation: `POST /api/eval/sift { expression: "risk >= R3 AND obo = true" }` returns matching tools in <1ms
   - Validation: Sift expressions support the same syntax as `.claws/policies/*.yaml` rules

3. **H3: Configurable eval triggers in claws.json — run evals automatically on prompt changes** — `claws.json` `eval` section configures which tiers run on which events. Default: G0+G1 on every compile (free). Optional: G2 on SOUL.md changes (prompt change = re-evaluate boundary quality). Optional: G3 on tool additions (new tool = verify enforcement). Fleet policy can mandate eval tiers. Results flow to the governance dashboard and audit trail.

```json
// claws.json — full eval config with sift checks and profiles
{
  "eval": {
    "profile": "soc2",
    "onCompile": ["G0", "G1"],
    "onPromptChange": ["G0", "G1", "G2"],
    "onToolChange": ["G0", "G1", "G3"],
    "ci": ["G0", "G1", "G2", "G3"],
    "timeout": { "G2": 15000, "G3": 30000 },

    "customChecks": [
      { "name": "no-r5-ungated",      "sift": "risk = R5 AND elicitation = false",          "severity": "breaking" },
      { "name": "confidential-audit",  "sift": "data_label = CONFIDENTIAL AND audit = false", "severity": "degraded" },
      { "name": "obo-coverage",        "sift": "obo = true AND elicitation = false",          "severity": "breaking" },
      { "name": "budget-headroom",     "sift": "budget_percent > 0.9",                        "severity": "warning" }
    ],

    "profiles": {
      "soc2":    { "inherit": "strict", "require": ["G2"], "customChecks": ["no-r5-ungated", "confidential-audit"] },
      "hipaa":   { "inherit": "strict", "require": ["G2", "G3"], "rubrics": "rubrics/hipaa.yaml" },
      "minimal": { "inherit": "default", "require": ["G0", "G1"] },
      "dev":     { "inherit": "minimal", "customChecks": [] }
    }
  }
}
```

Custom sift checks run as part of G1 (zero cost, sub-ms). Competitive compilation
profiles (`soc2`, `hipaa`, `minimal`, `dev`) configure which tiers, checks, and
rubrics are active. Switch profiles per deployment context. Fleet policy can mandate
a profile: `fleet.eval.requiredProfile: "soc2"`.

## Scope

### Phase: Eval API (5 pulses)

| Pulse | Deliverable | Package | Complexity |
|-------|------------|---------|-----------|
| 74 | Eval orchestrator — runs G0-G3 tiers, caches results per version, respects claws.json triggers | claws-sdk | Heavy |
| 75 | Eval API routes — POST /api/eval, GET /api/eval/results, time-travel support | claws-serve | Medium |
| 76 | Sift query endpoint — POST /api/eval/sift, RELAX expression evaluation, scope filtering | claws-serve + sdk | Medium |
| 77 | Eval triggers — claws.json `eval` config, trigger on SOUL.md/TOOLS.md changes, fleet policy | claws-sdk | Medium |
| 78 | TUI eval screen + CI integration — "Run Eval" button, eval results display, CI gate example | claws-cli (tui) | Light |

**CP-11 gate**: Eval API operational. Sift queries at zero cost. Configurable triggers.

## Dependencies

- **claws-sdk eval framework** (existing) — G0-G3 tier types, rubrics, assertions, judge execution
- **RELAX evaluator** (existing) — sift expression parser + evaluator
- **claws serve** (pulses 21-34) — HTTP scaffold, CompilationHost, time-travel
- **Compilation forest** (pulse 32) — version-indexed results for eval caching

## Test Tier Targets

| Tier | Count | Rationale |
|------|-------|-----------|
| L0 unit | 12 | Eval orchestrator (4), sift query (4), trigger config (4) |
| L1 integration | 8 | Cross-tier eval (2), sift + GovernanceIR (2), trigger on file change (2), cached results (2) |
| L2 e2e | 3 | Full eval run (1), sift query round-trip (1), trigger fires on SOUL.md edit (1) |
| L3 acceptance | 2 | CI gate eval (1), prompt change triggers G2 (1) |

## Notes

- G0+G1 are FREE (no LLM, no mock). They run in the compile pipeline already. The eval API just exposes their results.
- G2 costs an LLM call per eval (boundary specificity, tool coverage, boundary-tool alignment). Configurable timeout.
- G3 costs mock Gateway setup + tool call simulation. More expensive but definitive.
- Sift expressions are the RELAX language — same syntax developers use in policy YAML. Zero cost.
- Eval results are advisory — they surface as governance warnings, not violation state changes. A G2 "boundary too vague" finding is a yellow warning, not a DEGRADED state.
- Fleet policy can MANDATE eval tiers: `fleet.eval.required: ["G0", "G1", "G2"]`. Workspace can't downgrade.
