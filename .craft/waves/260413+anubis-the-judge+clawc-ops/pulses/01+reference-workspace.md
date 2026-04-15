---
pulse: 1
slug: reference-workspace
plan: claws-gateway-harness
depends_on: []
governing_roles: [craft:architect, claws:gateway-eng, claws:new-hire]
scenario_codes: []
stage: implementation
test_tiers:
  L0_unit: 5
  L1_integration: 0
  L2_e2e: 0
  L3_accept: 0
test_scope:
  run:
    - "cd claws-sdk && vitest run"
  typecheck:
    - "cd claws-sdk && tsc --noEmit"
checkpoint: 1
checkpoint_gate: false
---

# Pulse 01: Reference Workspace

## Objective

Create the canonical OC reference workspace fixture that all subsequent e2e tests will use as their input. This workspace contains all 9 OC file types with realistic content spanning the full risk tier spectrum (R1-R5), plus expected output files that serve as golden-master assertions for claws check and claws build.

The fixture must be self-consistent: deny constraints in SOUL.md must conflict with tools in TOOLS.md at specific risk tiers, subagents in AGENTS.md must delegate tool subsets, and skills must reference tools that exist. This consistency is what makes the fixture useful for integration and e2e testing downstream.

**This fixture is also the primary teaching tool.** The reference workspace will be the first thing new developers, skill authors, and community contributors see. It must work as both a test fixture AND a standalone learning resource.

## Deliverables

### README (community-facing — F-01, NH-01)

- [ ] `claws-sdk/tests/fixtures/oc-reference-workspace/README.md` — Written from the OC workspace owner's perspective. No references to claws-sdk internals, Craftworks, or compiler pipeline. Governance patterns explained in terms of OC-native concepts (SOUL constraints, tool risk tiers, skill decorators). Includes:
  - **Start Here** section (first 20 lines): What is governance? Why do these tools need it? What does claws do to this workspace? Uses concrete examples, not abstract concepts. Written for someone who has used OC for 2 months but has never heard of governance.
  - **Try It** section: 3 commands to run against this workspace with expected output summaries. `claws check .` → shows 7 violations. `claws build .` → generates gateway plugin. `claws test --sim` → shows before/after enforcement.
  - **File-by-File Walkthrough**: what each file demonstrates, what governance pattern it covers, what violations are intentionally embedded (and why)
  - **Adoption Tier Mapping**: which fixture skills correspond to Tier 1/2/3 adoption

### OC Source Files

- [ ] `claws-sdk/tests/fixtures/oc-reference-workspace/SOUL.md` — 3 deny constraints (never access production, never send without approval, never impersonate), model restrictions (gpt-4o, claude-3.5-sonnet only)
- [ ] `claws-sdk/tests/fixtures/oc-reference-workspace/TOOLS.md` — 12 tools across R1-R5 (web-search R1, file-read R2 with audit tap, file-write R3, db-query R4, send-email R5, shell-exec R5, etc.). **Note**: file-read (R2) must have an audit-only governance rule (log-only, no block) to enable audit-chain testing for non-blocking governance
- [ ] `claws-sdk/tests/fixtures/oc-reference-workspace/AGENTS.md` — 2 subagents (research-agent with R1-R3 delegation, action-agent with R3-R5 delegation)
- [ ] `claws-sdk/tests/fixtures/oc-reference-workspace/IDENTITY.md` — L2 HMAC identity, fleet membership
- [ ] `claws-sdk/tests/fixtures/oc-reference-workspace/USER.md` — OBO scope for email + calendar
- [ ] `claws-sdk/tests/fixtures/oc-reference-workspace/MEMORY.md` — INTERNAL data labels, 30-day retention
- [ ] `claws-sdk/tests/fixtures/oc-reference-workspace/HEARTBEAT.md` — hourly health check schedule

### Skills (with governance annotations — SA-02)

- [ ] `claws-sdk/tests/fixtures/oc-reference-workspace/skills/web-lookup/SKILL.md` — R1 read-only skill. Governance section: `governance: { audit: true }`. Comment: "When published to ClawHub with `claws publish`, this skill earns the governance-verified badge at tier R1."
- [ ] `claws-sdk/tests/fixtures/oc-reference-workspace/skills/summarize/SKILL.md` — R3 governed skill with decorators. Governance section: `governance: { audit: true, approval: manager }`. Comment: governance-verified at tier R3.
- [ ] `claws-sdk/tests/fixtures/oc-reference-workspace/skills/email-drafter/SKILL.md` — R5 skill requiring elicitation. Governance section: `governance: { audit: true, approval: exec, elicit: true }`. Comment: governance-verified at tier R5.

### Config + Workflow

- [ ] `claws-sdk/tests/fixtures/oc-reference-workspace/lobster.yaml` — 3-step workflow (research → draft → review)
- [ ] `claws-sdk/tests/fixtures/oc-reference-workspace/openclaw.json` — standard OC config
- [ ] `claws-sdk/tests/fixtures/oc-reference-workspace/claws.json` — T2 trust tier, no suppressions

### Expected Outputs (with metadata — CO-01, NH-02)

- [ ] `claws-sdk/tests/fixtures/oc-reference-workspace/expected/expected-violations.json` — File-level metadata: `{ generatedAt, clawsVersion, policySetHash, schemaVersion }`. Per-violation: `{ code, file, line, message, howToFix, policyVersion, ruleId, severity }`. The `howToFix` field is error-messages-as-tutorials (e.g., "Add 'approval: exec' to the tool's governance section or remove the deny constraint").
- [ ] `claws-sdk/tests/fixtures/oc-reference-workspace/expected/expected-artifacts.json` — the artifacts claws build should produce

### Before-Claws Variant (F-03)

- [ ] `claws-sdk/tests/fixtures/oc-reference-workspace/before-claws/README.md` — Standalone document that works without the parent workspace. Explains what "zero governance" means in practice: any tool runs without audit, any agent delegates without restriction, any skill executes without elicitation. Links to the "after" workspace as the comparison.
- [ ] `claws-sdk/tests/fixtures/oc-reference-workspace/before-claws/TOOLS.md` — Same 12 tools, no risk annotations, no governance constraints
- [ ] `claws-sdk/tests/fixtures/oc-reference-workspace/before-claws/SOUL.md` — Minimal SOUL with no deny constraints
- [ ] `claws-sdk/tests/fixtures/oc-reference-workspace/before-claws/expected-violations.json` — Empty array with metadata: `{ generatedAt, clawsVersion, policySetHash, schemaVersion, violations: [] }`

### Tests

- [ ] `claws-sdk/tests/fixtures/reference-workspace.unit.test.ts` — L0: fixture files parseable (3 tests)
- [ ] `claws-sdk/tests/fixtures/reference-workspace-before.unit.test.ts` — L0: before-claws fixture parseable, expected-violations is empty array with valid metadata (2 tests)

## Before/After Demo

The `before-claws/` variant enables a side-by-side demo story:

```
  BEFORE CLAWS                           AFTER CLAWS
  ────────────                           ───────────
  12 tools, 0 governance                 12 tools, 29 rules applied
  send-email: ALLOWED (no gate)          send-email: BLOCKED (R5, elicit required)
  db-query: ALLOWED (no audit)           db-query: GATED (R4, approval needed)
  web-search: ALLOWED                    web-search: ALLOWED (R1, audit logged)
  0 violations, 0 audit entries          7 violations, full audit chain
```

## Acceptance Criteria

- [ ] All 9 OC files + 3 skills + lobster.yaml + openclaw.json + claws.json are present and syntactically valid
- [ ] README.md is community-facing: no claws-sdk internals, no Craftworks references, includes Start Here + Try It sections
- [ ] Each skill SKILL.md includes minimum governance annotation for its risk tier
- [ ] At least one R2 tool (file-read) has an audit-only governance rule for non-blocking audit-chain testing
- [ ] expected-violations.json includes file-level metadata (clawsVersion, policySetHash, schemaVersion) and per-violation howToFix
- [ ] expected-artifacts.json lists artifact filenames and types that claws build should produce
- [ ] before-claws/ variant is standalone: README works without parent workspace context
- [ ] L0 tests confirm: fixture files parse without error, expected outputs are valid JSON with metadata, claws.json validates against schema
- [ ] `npm run build` exits 0
- [ ] `tsc --noEmit` exits 0

## Governing Roles

Load these role files before starting:
- `.craft/roles/craft/architect.md` — monorepo structure, fixture conventions
- `.craft/roles/claws/gateway-eng.md` — OC file formats, risk tier semantics, tool governance model
- `.craft/roles/claws/new-hire.md` — first-run experience, progressive disclosure

## Dependencies

None — this is the first pulse in the wave.

## Test Gates

- [ ] L0 unit: 5 tests — fixture files parseable, expected outputs valid JSON with metadata, claws.json schema-valid, before-claws parseable, before-claws violations empty
- [ ] `npm run build` exits 0
- [ ] `tsc --noEmit` exits 0
