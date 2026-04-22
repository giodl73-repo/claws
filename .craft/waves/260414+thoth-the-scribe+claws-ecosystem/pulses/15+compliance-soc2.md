---
pulse: 15
slug: compliance-soc2
plan: claws-comply-audit
depends_on: [11, 12]
governing_roles: [claws:founder, claws:ciso]
scenario_codes: [compliance-evidence/S05]
stage: implementation
test_tiers:
  L0_unit: 9
  L1_integration: 1
  L2_e2e: 1
  L3_accept: 2
test_scope:
  run:
    - "cd claws-sdk && npx vitest run"
  typecheck:
    - "cd claws-sdk && npx tsc --noEmit"
checkpoint: 2
checkpoint_gate: false
---

# Pulse 15: Compliance SOC2

## Objective

SOC2 Type II evidence builder. Map 9 controls (CC6.1-CC8.1) against governance rule results from GovAnalysis. Produce signed SOC2Evidence JSON with per-control status, evidence counts, and remediation findings. Include observation period validation (minimum 6 months), event-to-control filtering, broken chain elevated to critical finding.

The SOC2 evidence builder is the first of three compliance frameworks in the comply command group. It maps the Trust Services Criteria controls to claws governance rule results: CC6.1 (Logical Access), CC6.2 (System Credentials), CC6.3 (Role-Based Access), CC6.6 (External Threats), CC6.7 (Data Transmission), CC6.8 (Software Changes), CC7.1 (Monitoring), CC7.2 (Anomaly Detection), CC8.1 (Change Management). Each control is evaluated against the audit chain and governance analysis to produce a status (pass/fail/partial), evidence count, and any remediation findings. The observation period must span at least 6 months for Type II compliance. A broken audit chain is automatically elevated to a critical finding across all controls.

## Deliverables

- [ ] `claws-sdk/src/compliance/types.ts` — SOC2Evidence, HIPAAEvidence, EUAIActAssessment, ComplianceFinding, AsymmetricSignature types
- [ ] `claws-sdk/src/compliance/soc2.ts` — SOC2 evidence builder: 9 control mappings, observation period validation, event-to-control filtering, control status thresholds
- [ ] `claws-sdk/src/compliance/index.ts` — barrel exports
- [ ] `claws-sdk/tests/compliance/soc2.unit.test.ts` — L0: per-control mapping (9 tests, one per CC6.1-CC8.1)
- [ ] `claws-sdk/tests/compliance/comply-soc2.integration.test.ts` — L1: full SOC2 pipeline on fixture workspace with 30-day audit history
- [ ] `claws-sdk/tests/compliance/comply-soc2.e2e.test.ts` — L2: complete comply soc2 on reference workspace
- [ ] `claws-sdk/tests/fixtures/soc2/` — 30-day audit chain fixture
- [ ] `claws-sdk/tests/compliance/comply-soc2.accept.test.ts` — L3: SDK acceptance — SOC2 evidence builder API produces valid evidence from consumer perspective across all 9 controls
- [ ] `claws-cli/tests/compliance/comply-soc2.accept.test.ts` — L3: CLI acceptance — `claws comply soc2` command produces correct evidence output and exit codes

## Acceptance Criteria

- [ ] All 9 controls (CC6.1-CC8.1) mapped to governance rule categories
- [ ] Each control produces status (pass/fail/partial), evidence count, and findings
- [ ] Observation period validated: minimum 6 months for Type II
- [ ] Short observation period produces a warning finding, not a hard failure
- [ ] Event-to-control filtering correctly routes audit events to relevant controls
- [ ] Broken audit chain elevated to critical finding across all controls
- [ ] SOC2Evidence JSON is well-formed and includes metadata (version, timestamp, scope)
- [ ] Barrel exports resolve: `import { SOC2Evidence, ComplianceFinding } from '../compliance'` works
- [ ] `npm run build` exits 0
- [ ] `npx tsc --noEmit` exits 0

## Governing Roles

Load these role files before starting:
- `.craft/roles/claws/founder.md` — product vision for compliance framework, SOC2 scope decisions
- `.craft/roles/claws/ciso.md` — SOC2 Type II control requirements, evidence standards, observation period rules

## Dependencies

- Pulse 11 (audit-chain-foundation) — provides audit chain types and read primitives
- Pulse 12 (audit-verify-integrity) — provides chain verification for broken chain detection

## Test Gates

- [ ] L0 unit (9 tests): CC6.1 logical access mapping (1), CC6.2 system credentials mapping (1), CC6.3 role-based access mapping (1), CC6.6 external threats mapping (1), CC6.7 data transmission mapping (1), CC6.8 software changes mapping (1), CC7.1 monitoring mapping (1), CC7.2 anomaly detection mapping (1), CC8.1 change management mapping (1)
- [ ] L1 integration (1 test): full SOC2 pipeline on fixture workspace with 30-day audit history (1)
- [ ] L2 e2e (1 test): complete comply soc2 on reference workspace (1)
- [ ] L3 accept (2 tests): SDK acceptance — SOC2 evidence API from consumer perspective (1), CLI acceptance — `claws comply soc2` command end-to-end (1)
- [ ] `npm run build` exits 0
- [ ] `npx tsc --noEmit` exits 0
