---
pulse: 58
slug: cli-e2e-fixture
plan: claws-pre-extraction-packaging
depends_on: [57, 56]
governing_roles: [craft:architect, claws:gateway-eng, craft:conformance]
scenario_codes: []
stage: implementation
test_tiers:
  L0_unit: 0
  L1_integration: 6
  L2_e2e: 23
  L3_accept: 1
test_scope:
  run:
    - "cd claws-sdk && npx vitest run --coverage"
    - "cd claws-cli && npx vitest run --coverage"
  typecheck:
    - "cd claws-sdk && npx tsc --noEmit"
    - "cd claws-cli && npx tsc --noEmit"
checkpoint: 12
---

# Pulse 58: CLI E2E — 20 Verbs + Decision-Path Coverage (architect W6, gateway-eng M2)

## Objective

Register policy + snap subcommand-group handlers against internal `claws` binary. All 9 policy verbs + 11 snap verbs exit-code-clean E2E against fixture workspace. PLUS decision-path coverage (gateway-eng M2 closure): explicit tests for review + signed approvalHandle, modify + redirectPath, and deny paths — not just plumbing. binaryName parameterization works for both `claws` and `openclaw`. `claws doctor` + `claws upgrade` grow policy-aware checks.

## Deliverables

- [x] All 9 policy verbs (check, generate, watch, comply, test, sim, report, verify, diff) green E2E against `claws-sdk/tests/fixtures/canonical-oc-workspace/` — exit-code test per verb
- [x] All 11 snap verbs (stage-on, stage-off, status, diff-staged, discard-stage, upload, list, diff, checkout, promote, rollback, discard, serve) green E2E — exit-code test per verb
- [x] **Decision-path E2E tests (gateway-eng M2 closure)**:
  - **review path**: tool-call against fixture triggers `review` + signed approvalHandle; mock supervisor signs; claws resumes; audit event recorded
  - **modify path**: file-ingest triggers `modify` + redirectPath (redirect honored by fixture gateway); modified content written to redirect target; canonical untouched
  - **deny path**: tool-call against fixture triggers `deny` + reason string; reason captured in blockReason (no agent bypass)
- [x] `claws doctor` extended with policy-aware checks (e.g., `policy-ir.json present`, `audit-chain verify passes`); `claws upgrade` handles policy-artifact migration
- [x] No duplicate `claws policy doctor` — all doctor checks flow through top-level `claws doctor`
- [x] binaryName parameterization: stubbed test runs the same handler library with `binaryName: 'openclaw'` and verifies help-text + error-message prefixes change accordingly
- [x] L1 tests itemized: 6 binaryName parameterization (help-text rendering + error-message prefix + command-name resolution for both claws + openclaw across 2 command groups + 1 doctor + 1 upgrade)
- [x] L2 tests itemized: 20 verb-exit-code tests + 3 decision-path tests (review/modify/deny) = 23 L2
- [x] L3: 1 acceptance — full `claws policy generate ... → claws snap upload → claws snap promote → claws policy comply --snapshot ... → verify audit chain` end-to-end

## Acceptance Criteria

- All 20 verbs exit-code-clean against fixture
- Decision-path E2E tests (review/modify/deny) pass (not just plumbing)
- binaryName parameterization works for both claws and openclaw
- L1: 6; L2: 23 (20 verbs + 3 decision paths); L3: 1 acceptance

## Governing Roles

- `craft:architect` — CLI wiring discipline (thin handlers)
- `claws:gateway-eng` — decision-path fixtures exercise real contracts (not plumbing)
- `craft:conformance` — exit-code test completeness

## Dependencies

P56 (CP-11 gate) + P57 (emitter-scope-prefix). Depends on P57 explicitly to avoid parallel-pulse race (architect W6 closure).

## Test Gates

L1: 6 binaryName. L2: 20 verb + 3 decision path. L3: 1 acceptance. Fixture workspace + mock supervisor + mock gateway.
