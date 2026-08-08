---
checkpoint: 5
name: "Acceptance Harness + Scenario Coverage"
pulse_range: [29, 31]
depends_on_cp: 4
review_panel:
  [claws:gateway-eng, claws:ciso, claws:platform-eng, craft:dragon, craft:testing, craft:navigator]
---

# CP-5: Acceptance Harness + Scenario Coverage

## Scope

Build the acceptance test harness reusing the astro scenario runner pattern,
materialize 00+workspace/ fixtures for all Ptah-scoped series (74 scenarios),
wire acceptance tests to the manifest, and run the full suite to produce a
scorecard. This checkpoint proves the claws compiler works against its own
331 design scenarios.

## Dispatch Plan

### Batch 1

- Pulse 29: Acceptance harness infrastructure — scenario loader, 5 runners, workspace builder, IR assertions

### Batch 2 (depends on batch 1)

- Pulse 30: Fixture materialization — 00+workspace/ for 10 Ptah series (~95 scenarios)

### Batch 3 (depends on batch 2)

- Pulse 31: Test wiring + full run — entry points, manifest config, scorecard, CI integration

## Exit Criteria

- [ ] Scenario loader discovers 331 scenarios across 30 series
- [ ] 5 runner types implemented (compile-sim, pinch-sim, emit-sim, security-sim, fleet-sim stub)
- [ ] 74 Ptah scenarios have materialized 00+workspace/ fixtures
- [ ] compile-pipeline: 8/8 passing
- [ ] governance-rules: 12/12 passing
- [ ] platform-detection: 7/7 passing
- [ ] cross-file-conflicts: 7/7 passing
- [ ] Overall Ptah acceptance: 80%+ pass rate
- [ ] SCORECARD.md produced with findings
- [ ] `npm run test:accept` works
- [ ] `cd claws-sdk && vitest run` — all tiers green (unit + integration + e2e + accept)
- [ ] `npm run build` — monorepo build succeeds
- [ ] Review panel approval (6 roles)

## Review Panel

| Role                   | Focus                                                                    |
| ---------------------- | ------------------------------------------------------------------------ |
| **claws:gateway-eng**  | Runner correctness, pipeline threading, fixture → IR fidelity            |
| **claws:ciso**         | Security-sim runner coverage, fail-mode scenarios, OBO test completeness |
| **claws:platform-eng** | Platform detection scenarios, 7-platform fixture accuracy                |
| **craft:dragon**       | Harness architecture, reuse of astro patterns, import boundaries         |
| **craft:testing**      | Test tier hygiene, acceptance vs unit distinction, CI integration        |
| **craft:navigator**    | Scenario coverage completeness, scorecard clarity, UX of test output     |

## Pulse Summary

| Pulse | Title                   | Deliverables                                                                |
| ----- | ----------------------- | --------------------------------------------------------------------------- |
| 29    | Harness Infrastructure  | Scenario loader, 5 runners, workspace builder, IR assertions, vitest config |
| 30    | Fixture Materialization | ~95 workspaces across 10 series, expect block population                    |
| 31    | Test Wiring + Full Run  | Entry points, manifest, scorecard, CI, findings                             |
