---
pulse: 12
slug: acceptance-fixtures
plan: claws-openclaw-upstream
checkpoint: cp-5
depends_on: [04, 05, 06, 07, 08, 09, 10, 11]
governing_roles: [claws:claws-release-eng, claws:claws-repo-steward, claws:compliance]
addresses_findings: [all SC-01..SC-24 fixture-level — series-level summary in scenarios/FINDINGS.md]
addresses_headlines: [H1, H2, H3, H4, H5, H6]
---

# Pulse 12 · Acceptance Test Fixtures

## Objective

Materialize the 41 fixtures cataloged in `scenarios/FINDINGS.md` series-level summary into runner-ready acceptance tests across 6 series. Validates that every scenario in the catalog has at least one executable fixture proving it.

This pulse is INTERNAL to our monorepo; runs after all upstream PRs merge so fixtures reflect post-merge trunk reality.

## Deliverables

### Fixture series (paths under `packages/claws-sdk/tests/accept/scenarios/`)

#### Series: `bot-preempt` (13 fixtures, simulation runner)

- [ ] `bot-preempt/01+pluginid-spoof/` — F-01: register*() rejects payload pluginId mismatch
- [ ] `bot-preempt/02+postaudit-override/` — F-02: postAudit() overrides plugin-supplied sourcePluginId
- [ ] `bot-preempt/03+scope-validate/` — F-03: unknown OperatorScope rejected
- [ ] `bot-preempt/04+register-collision/` — F-04: (pluginId, registrationId) uniqueness
- [ ] `bot-preempt/05+input-malformed/` — F-05: malformed placement/ttlMs/idempotencyKey rejected
- [ ] `bot-preempt/06+proto-pollution/` — F-06: __proto__ pollution rejected
- [ ] `bot-preempt/07+jumbo-payload/` — F-07: payload >1MB rejected
- [ ] `bot-preempt/08+symbol-spread/` — F-08: Symbol-tagged variant survives spread
- [ ] `bot-preempt/09+pr-description-audit/` — F-09: regex-scan PR body opens with mandated justification
- [ ] `bot-preempt/10+keyword-trigger-list/` — F-10, F-11: keyword scan reports zero hits
- [ ] `bot-preempt/11+baseline-hash/` — F-12: hash matches public surface
- [ ] `bot-preempt/12+sdk-overview/` — F-13: every public symbol has table row
- [ ] `bot-preempt/13+swift-models/` — F-15, F-16: generated Swift matches TS schema

#### Series: `governance` (11 fixtures, simulation + forward runners)

- [ ] `governance/01+oc7-conjunctive/` — F-17: three-plugin merger collects all approvals
- [ ] `governance/02+companion-multi-approval/` — F-20: companion handles array shape
- [ ] `governance/03+conjunctive-AND/` — F-21: supervisor must approve every descriptor
- [ ] `governance/04+oc7-crash-safety/` — F-22: plugin-A approval survives plugin-B throw
- [ ] `governance/05+crash-logged/` — F-24: plugin_invocation_failed audit on crash
- [ ] `governance/06+r5-fail-open-rejected/` — F-26: generator exits non-zero
- [ ] `governance/07+r5-runtime-defense/` — F-27: hand-edited IR rejected at runtime
- [ ] `governance/08+capability-clamp/` — F-29: effective tier max(declared, capability)
- [ ] `governance/09+restricted-laundering-rejected/` — F-30: laundering chain rejected
- [ ] `governance/10+restricted-generation-time/` — F-31: diagnostic at generate
- [ ] `governance/11+hostile-write-runtime-gate/` — F-44: drift detection before agent execution

#### Series: `adapter` (4 fixtures, contract runner)

- [ ] `adapter/01+plugin-registration/` — F-33: emitted plugin loads + registers
- [ ] `adapter/02+cli-subcommand/` — F-35: openclaw policy <verb> dispatches
- [ ] `adapter/03+wire-mapping/` — F-38: round-trip CEF/NDJSON/syslog identical
- [ ] `adapter/04+verify-before-export/` — F-42: --verify rejects stale chain

#### Series: `oc4` (1 fixture, forward runner)

- [ ] `oc4/01+raw-preserve/` — F-50: returned object has sibling raw matching input

#### Series: `pkg-invariants` (10 fixtures, forward runner)

- [ ] `pkg-invariants/01+canonicalize-cross-os/` — F-52, F-53
- [ ] `pkg-invariants/02+ast-roundtrip/` — F-54, F-55, F-56
- [ ] `pkg-invariants/03+audit-scale/` — F-57
- [ ] `pkg-invariants/04+audit-tamper-detect/` — F-58
- [ ] `pkg-invariants/05+replay-resistance/` — F-59, F-60, F-61
- [ ] `pkg-invariants/06+generate-determinism/` — F-62
- [ ] `pkg-invariants/07+snapshot-id-cross-os/` — F-63
- [ ] `pkg-invariants/08+promote-audit/` — F-64, F-65
- [ ] `pkg-invariants/09+resolve-policy-historical/` — F-66, F-67, F-68
- [ ] `pkg-invariants/10+http-resolve/` — F-69, F-70

#### Series: `compliance` (2 fixtures, contract runner)

- [ ] `compliance/01+soc2-cc61/` — F-71, F-72, F-73
- [ ] `compliance/02+hipaa-312/` — F-74, F-75

### Manifest update

- [ ] `packages/claws-sdk/tests/accept/scenarios/manifest.yaml` updated to add 6 series:
  ```yaml
  series:
    bot-preempt:
      runners: [simulation]
      min: 13
      marker: "scenario.yaml"
    governance:
      runners: [simulation, forward]
      min: 11
      marker: "scenario.yaml"
    adapter:
      runners: [contract, simulation]
      min: 4
      marker: "scenario.yaml"
    oc4:
      runners: [forward]
      min: 1
      marker: "20+program.yaml"
    pkg-invariants:
      runners: [forward]
      min: 10
      marker: "20+program.yaml"
    compliance:
      runners: [contract]
      min: 2
      marker: "scenario.yaml"
  ```

### Accept test entry point

- [ ] If `packages/claws-sdk/tests/accept/scenarios.accept.test.ts` doesn't exist, create:
  ```typescript
  import { resolve } from 'path';
  import { runFromManifest } from '#e2e-lib/manifest-runner.js';
  runFromManifest(resolve(__dirname, 'scenarios/manifest.yaml'));
  ```

## Verification Gate

```bash
cd /c/src/claws

# Pre-flight: confirm all upstream PRs merged + scope-flip done
for pr in <PR-1> <PR-2> <PR-4> <PR-6> <PR-7>; do
  gh api repos/openclaw/openclaw/pulls/$pr --jq '.merged' | grep -q true \
    || (echo "BLOCKING: PR-$pr not merged"; exit 1)
done
# Confirm scope-flip applied (or contingency recorded)
grep -r "@bic/openclaw" packages/ --include="*.json" --include="*.ts" \
  && (echo "Scope-flip incomplete (or contingency-deferred — check CHANGELOG)"; exit 1) \
  || echo "Scope-flip clean"

# Fixture census (per pulse-review R1 W12) — verify minimum count per series
FIXTURES_DIR="packages/claws-sdk/tests/accept/scenarios"
test "$(find "$FIXTURES_DIR/bot-preempt" -mindepth 1 -maxdepth 1 -type d | wc -l)" -ge 13 \
  || (echo "BLOCKING: bot-preempt series fixture census <13"; exit 1)
test "$(find "$FIXTURES_DIR/governance" -mindepth 1 -maxdepth 1 -type d | wc -l)" -ge 11 \
  || (echo "BLOCKING: governance series fixture census <11"; exit 1)
test "$(find "$FIXTURES_DIR/adapter" -mindepth 1 -maxdepth 1 -type d | wc -l)" -ge 4 \
  || (echo "BLOCKING: adapter series fixture census <4"; exit 1)
test "$(find "$FIXTURES_DIR/oc4" -mindepth 1 -maxdepth 1 -type d | wc -l)" -ge 1 \
  || (echo "BLOCKING: oc4 series fixture census <1"; exit 1)
test "$(find "$FIXTURES_DIR/pkg-invariants" -mindepth 1 -maxdepth 1 -type d | wc -l)" -ge 10 \
  || (echo "BLOCKING: pkg-invariants series fixture census <10"; exit 1)
test "$(find "$FIXTURES_DIR/compliance" -mindepth 1 -maxdepth 1 -type d | wc -l)" -ge 2 \
  || (echo "BLOCKING: compliance series fixture census <2"; exit 1)
test "$(find "$FIXTURES_DIR/workspace-foothold" -mindepth 1 -maxdepth 1 -type d | wc -l)" -ge 12 \
  || (echo "BLOCKING: workspace-foothold series fixture census <12 (Phase 5 added 2026-04-27)"; exit 1)

# Run acceptance fixtures
cd packages/claws-sdk
npx vitest run tests/accept/scenarios.accept.test.ts
npx tsc --noEmit
```

## Key Constraints

- Acceptance fixtures EXERCISE post-merge trunk reality; pulse 10 (scope-flip) MUST land before this pulse runs.
- Series `min:` counts in the manifest are floors — adding fixtures over the floor is fine; below triggers census failure.
- Some scenarios produce multiple findings into one fixture (e.g., F-71/F-72/F-73 share `compliance/01+soc2-cc61/` because all three SOC 2 controls trace through the same audit-predicate scaffold).

## Scenario codes addressed

ALL — SC-01 through SC-24. This pulse is the wave's acceptance bridge between scenario design and executable validation.
