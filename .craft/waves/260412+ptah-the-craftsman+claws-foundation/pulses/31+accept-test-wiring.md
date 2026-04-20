---
pulse: 31
title: "Acceptance Test Wiring + Full Run"
plan: claws-acceptance-harness
checkpoint: 5
governing_roles: [claws:gateway-eng, claws:ciso, craft:testing, craft:navigator]
depends_on: [29, 30]
---

# Pulse 31: Acceptance Test Wiring + Full Run

## Objective

Wire acceptance tests to the manifest, run all Ptah-scoped scenarios, fix
any failures, tune expect blocks, and produce the final acceptance scorecard.
This pulse proves the claws compiler works against its own design scenarios.

## Deliverables

### D1: Acceptance Test Entry Points

One `.accept.test.ts` file per series group. Each file is minimal — just
calls `runFromManifest()`:

```
claws-sdk/tests/accept/
├── compile/
│   ├── pipeline.accept.test.ts        # compile-pipeline series
│   ├── conflicts.accept.test.ts       # cross-file-conflicts series
│   ├── roundtrip.accept.test.ts       # lossless-roundtrip series
│   └── input.accept.test.ts           # input-resolver series
├── check/
│   ├── rules.accept.test.ts           # governance-rules series
│   └── fail-mode.accept.test.ts       # fail-mode series
├── emit/
│   ├── artifacts.accept.test.ts       # emit-artifacts series
│   ├── loss.accept.test.ts            # loss-aware-emission series
│   └── platform.accept.test.ts        # platform-detection series
├── pitfalls/
│   └── coverage-1.accept.test.ts      # pitfall-coverage-1 series
└── scenarios/
    └── manifest.yaml                  # Points to design/claws/scenarios/
```

### D2: Manifest Configuration
- `claws-sdk/tests/accept/scenarios/manifest.yaml` — filtered copy of `design/claws/scenarios/manifest.yaml` with only Ptah-scoped series (Phase 1 + cross-cutting)
- Anubis/Thoth series excluded (fleet-sim stubs, advanced security-sim scenarios not materialized)
- Pin `min:` counts to match materialized fixture counts (74 total)
- fail-mode series dispatches to BOTH pinch-sim and security-sim — both runners execute per scenario

### D3: Full Acceptance Run
- Execute all ~95 Ptah scenarios
- Fix any compilation failures (pipeline bugs exposed by scenarios)
- Tune expect blocks where compiler output differs from spec predictions
- Document any scenarios that expose real bugs → file as findings

### D4: Acceptance Scorecard
Write `claws-sdk/tests/accept/SCORECARD.md`:

```markdown
# claws Acceptance Scorecard — Ptah Wave

| Series | Scenarios | Pass | Fail | Skip | Coverage |
|--------|-----------|------|------|------|----------|
| compile-pipeline | 8 | ? | ? | ? | CL-04 |
| governance-rules | 12 | ? | ? | ? | CL-02 |
| fail-mode | 6 | ? | ? | ? | CL-02 |
| ... | ... | ... | ... | ... | ... |
| **Total** | **~95** | **?** | **?** | **?** | |

## Findings
- (bugs discovered by acceptance tests)

## Skipped
- Fleet-sim series (Anubis wave)
- Security-sim series beyond fail-mode (Thoth wave)
```

### D5: CI Integration
- Add `npm run test:accept` to package.json scripts
- Add acceptance test project to `vitest.config.ts`
- Wire into CI as optional check (non-blocking for Ptah, blocking for Anubis)

## Verification Gate

```bash
cd claws-sdk && vitest run --project accept
# Target: 80%+ scenarios passing (some may need fixture tuning)
# Hard requirement: zero compile-pipeline failures
# Hard requirement: zero governance-rules failures
cd claws-sdk && tsc --noEmit
npm run build
```

## Success Criteria

- [ ] 74 Ptah scenarios discovered from manifest (331 total across all waves)
- [ ] compile-pipeline: 8/8 passing
- [ ] governance-rules: 12/12 passing
- [ ] platform-detection: 7/7 passing
- [ ] cross-file-conflicts: 7/7 passing
- [ ] Overall: 80%+ pass rate across all 74 Ptah scenarios
- [ ] SCORECARD.md written with findings
- [ ] `npm run test:accept` works from package root
- [ ] Zero regressions in existing 269 SDK tests + 82 skill-kit tests
