---
pulse: 7
slug: e2e-compile-loop
plan: claws-e2e-infrastructure
depends_on: [1, 2, 3, 4, 5, 6]
governing_roles: [claws:gateway-eng, craft:architect]
scenario_codes: []
stage: implementation
test_tiers:
  L0_unit: 0
  L1_integration: 0
  L2_e2e: 1
  L3_accept: 0
test_scope:
  run:
    - "cd claws-sdk && npx vitest run"
  typecheck:
    - "cd claws-sdk && npx tsc --noEmit"
checkpoint: 1
checkpoint_gate: false
---

# Pulse 07: E2E Compile Loop

## Objective

Create the first end-to-end test that verifies the full compile-to-enforcement pipeline: starting from OC source files, running them through the claws compiler, loading the generated plugin into GatewaySim, and verifying that tool calls are correctly allowed, blocked, or elicited based on governance rules.

This is the critical integration proof that the entire claws pipeline works end-to-end. It exercises the compile pipeline (Pulse 01 fixtures as input), the gateway simulator (Pulse 02), and validates against the expected artifacts defined in the reference workspace.

## Deliverables

- [ ] `claws-sdk/tests/e2e/compile-to-gateway.e2e.test.ts` — L2 e2e test with the following sequences:

  **Happy-path enforcement:**
  1. Point claws compile at the reference workspace (claws-sdk/tests/fixtures/oc-reference-workspace/)
  2. Run claws build openclaw → generates 4 artifacts (index.ts plugin, manifest.json, audit-schema.json, README.md)
  3. Load the generated index.ts into GatewaySim
  4. Fire tool calls: web-search (R1) → ALLOWED, send-email (R5) → BLOCKED or ELICITED, shell-exec (R5) → BLOCKED
  5. Verify audit chain has 3 entries with correct event types (allow, block/elicit, block)
  6. Verify enforcement matches expected-enforcement.json from fixtures

  **Fail-mode enforcement (R1 review GE-03):**
  7. Configure MockGovernanceHost to throw on the next `evaluatePolicy` call
  8. Fire file-read (R2) tool call → ALLOWED (fail-open: R1-R2 tools fail-open when GovernanceHost throws)
  9. Configure MockGovernanceHost to throw on the next `evaluatePolicy` call
  10. Fire db-query (R4) tool call → BLOCKED (fail-closed: R4 tools fail-closed when GovernanceHost throws)
  11. Verify audit chain records both fail-mode events with correct reason codes

## Acceptance Criteria

- [ ] Compile pipeline produces all expected artifacts from reference workspace
- [ ] Generated index.ts loads into GatewaySim without error
- [ ] R1 tool call (web-search) is ALLOWED
- [ ] R5 tool call (send-email) is BLOCKED or triggers ELICITATION
- [ ] R5 tool call (shell-exec) is BLOCKED
- [ ] Audit chain contains correct event types for happy-path calls
- [ ] Enforcement results match expected-enforcement.json fixture
- [ ] R2 tool call with GovernanceHost throwing → ALLOWED (fail-open) (R1 review GE-03)
- [ ] R4 tool call with GovernanceHost throwing → BLOCKED (fail-closed) (R1 review GE-03)
- [ ] Fail-mode audit entries record correct reason codes
- [ ] `npm run build` exits 0
- [ ] `npx tsc --noEmit` exits 0

## Governing Roles

Load these role files before starting:
- `.craft/roles/claws/gateway-eng.md` — gateway enforcement semantics, audit chain format, tool call lifecycle
- `.craft/roles/craft/architect.md` — e2e test patterns, fixture usage conventions

## Dependencies

- Pulse 01 (reference-workspace) — provides the OC fixture files and expected outputs
- Pulse 02 (gateway-simulator) — GatewaySim and ToolCallBuilder for enforcement testing
- Pulse 03 (base-cli-formatters) — formatter types for output validation
- Pulse 04 (base-cli-error-contract) — error types for failure cases
- Pulse 05 (base-cli-progress) — UI components (not directly tested but must build)
- Pulse 06 (base-cli-config) — config loading for compile pipeline setup

## Test Gates

- [ ] L2 e2e: 1 test — full compile-to-gateway enforcement loop (happy-path + fail-mode assertions)
- [ ] `npm run build` exits 0
- [ ] `npx tsc --noEmit` exits 0
