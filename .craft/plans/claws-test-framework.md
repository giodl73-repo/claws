---
slug: claws-test-framework
preset: "claws"
plan: "2 headlines: claws test runs governance scenarios with pass/fail in <5s, SecurityScanner detects prompt injection patterns"
area: claws
status: Implemented
phase: ptah
atoms: [atom:claws-test, atom:cicd-pipeline]
specs: [CL-05, CL-06]
---

# claws-test-framework — @bic/test Package

## Headlines

1. **H1: `claws test` runs governance scenarios with pass/fail in <5s, producing 12 governance checks and 16 security scans** — The @bic/test package provides a 4-layer testing harness: (1) **ScenarioRunner** replays SKILL.md scenarios against the built skill handler, verifying that declared behavior matches actual behavior. (2) **GovernanceValidator** runs 12 checks: declared-vs-actual risk level, OBO boundary consistency, data label coverage, fail-mode correctness per risk level, capability/permission alignment, elicitation gate presence for R5 tools, A2A trust boundary declarations, input validation presence, output guard presence, bounded reasoning limits, audit trail completeness, and supply chain signature. (3) **SecurityScanner** runs 16 rules across 4 categories: injection defense (eval, Function constructor, template literal injection, dynamic import), secret detection (API keys, tokens, credentials in source), input sanitization (unvalidated user input, missing trust labels, URL injection), and output validation (unredacted PII, unvalidated URLs, format injection, chain validation bypass). (4) **Custom vitest matchers** for governance assertions (`toPassGovernance()`, `toHaveRiskLevel()`, `toRequireElicitation()`, `toPassSecurityScan()`).
   - Validation: `GovernanceValidator.validate()` on a Tier 2 skill returns 12 check results with pass/fail and finding details
   - Validation: `SecurityScanner.scan()` on a handler containing `eval(userInput)` produces a finding with rule `no-eval`, file, and line
   - Validation: `ScenarioRunner.run()` replays a SKILL.md scenario and reports declared-vs-actual behavior delta

2. **H2: SecurityScanner detects prompt injection patterns in skill code with zero false positives on clean skills** — The 16 security rules are AST-based (not regex): they parse the handler TypeScript to detect patterns that indicate prompt injection risk, secret exposure, or unsafe input/output handling. Each rule produces a finding with severity (critical/high/medium/low), the file path, line number, the matched code pattern, and a remediation suggestion. The scanner works standalone -- `npm install @bic/test` and `SecurityScanner.scan('./src/')` runs all 16 rules without the claws compiler. Rules are calibrated against the OC ecosystem: 322 browser skills with 100% injection risk surface, 111 R5 TRANSACT skills, and known malicious skill patterns from the 824+ malicious skill database.
   - Validation: SecurityScanner on a clean skill (no eval, no secrets, proper sanitization) produces zero findings
   - Validation: SecurityScanner on a handler with `new Function(input)` produces a critical finding with remediation
   - Validation: SecurityScanner on a handler with a hardcoded API key (`sk-...`) produces a high finding

## Summary

The @bic/test package is the governance testing framework for skill authors and CI pipelines. It provides 4 testing layers (scenario, governance, security, assertions) that work standalone without the claws compiler. The package reuses agent-sdk's eval framework (`eval/rubric.ts`, `eval/assertions.ts`, `eval/judge.ts`) for structured evaluation and scoring. SecurityScanner AST analysis reuses compiler-sdk's TypeScript parsing infrastructure. The custom vitest matchers integrate governance testing into the standard JavaScript test workflow. This is the quality gate that makes Tier 3 VERIFIED adoption meaningful -- a skill that passes all 12 governance checks and 16 security rules has earned the VERIFIED badge.

## Coverage Contract

### Specs
- [ ] CL-05 -- @bic/test: ScenarioRunner, GovernanceValidator (12 checks), SecurityScanner (16 rules), vitest matchers
- [ ] CL-06 -- Single-tier @bic/* standalone library (bic-internal), size budget ~45KB, zero compiler dependency

### Concept Guides
- [ ] docs/claws/test/getting-started.md -- NEW: install, validate, scan, assert in one test file
- [ ] docs/claws/test/governance-checks.md -- NEW: all 12 governance checks with examples
- [ ] docs/claws/test/security-rules.md -- NEW: all 16 security rules with examples and remediation

### Scenario Coverage
- [ ] test/scenario-runner-basic -- replay SKILL.md scenario against handler
- [ ] test/scenario-runner-declared-vs-actual -- detect mismatch between SKILL.md claims and handler behavior
- [ ] test/governance-validator-tier2 -- all 12 checks on Tier 2 skill
- [ ] test/governance-validator-fail-mode -- fail-mode check (R5 must be closed)
- [ ] test/governance-validator-obo -- OBO boundary check (declared vs detected)
- [ ] test/security-scanner-clean -- zero findings on properly governed skill
- [ ] test/security-scanner-eval -- detect eval/Function injection patterns
- [ ] test/security-scanner-secrets -- detect hardcoded API keys
- [ ] test/security-scanner-input -- detect unvalidated user input
- [ ] test/security-scanner-output -- detect unredacted PII in output
- [ ] test/vitest-matchers-pass -- toPassGovernance() on passing skill
- [ ] test/vitest-matchers-fail -- toHaveRiskLevel('R3') on R5 skill fails with clear message
- [ ] test/standalone-no-compiler -- all tests run without claws CLI installed

### Test Tier Targets
| Tier | Target | Rationale |
|------|--------|-----------|
| L0 unit | 28 | ScenarioRunner (4), GovernanceValidator 12 checks (12), SecurityScanner 16 rules (8 grouped), vitest matchers (4) |
| L1 integration | 6 | Full validation pipeline on fixture skills (3), full scanner on fixture handlers (3) |
| L2 e2e | 3 | Complete `claws test` equivalent on Tier 2 skill, Tier 3 skill, and malicious skill fixture |
| L3 acceptance | 0 | Deferred to claws-cli plan |

## Scope

- `claws-test/` (NEW package) -- New monorepo workspace
- `claws-test/src/scenario/runner.ts` (NEW) -- ScenarioRunner: parse SKILL.md scenarios, replay against handler, compare declared vs actual
- `claws-test/src/scenario/parser.ts` (NEW) -- SKILL.md scenario section parser: extract test cases from markdown
- `claws-test/src/governance/validator.ts` (NEW) -- GovernanceValidator: 12 governance checks, aggregated results
- `claws-test/src/governance/checks/` (NEW) -- Individual check implementations (12 files, one per check)
- `claws-test/src/security/scanner.ts` (NEW) -- SecurityScanner: orchestrate 16 rules, aggregate findings
- `claws-test/src/security/rules/` (NEW) -- Individual rule implementations (16 rules across 4 categories)
- `claws-test/src/security/rules/injection.ts` (NEW) -- 4 injection rules: eval, Function, template literal, dynamic import
- `claws-test/src/security/rules/secrets.ts` (NEW) -- 4 secret rules: API keys, tokens, credentials, env leaks
- `claws-test/src/security/rules/input.ts` (NEW) -- 4 input rules: unvalidated input, missing trust labels, URL injection, size limits
- `claws-test/src/security/rules/output.ts` (NEW) -- 4 output rules: unredacted PII, unvalidated URLs, format injection, chain bypass
- `claws-test/src/matchers/governance.ts` (NEW) -- Custom vitest matchers: toPassGovernance, toHaveRiskLevel, toRequireElicitation, toPassSecurityScan
- `claws-test/src/matchers/index.ts` (NEW) -- Matcher registration for vitest expect.extend()
- `claws-test/src/mock/mock-gateway.ts` (NEW) -- Re-exports MockGateway from @bic/skill-kit (convenience)
- `claws-test/src/types.ts` (NEW) -- ScenarioResult, ValidationResult, SecurityFinding, CheckResult types
- `claws-test/src/index.ts` (NEW) -- Package barrel exports
- `claws-test/package.json` (NEW) -- @bic/test, peer deps: @bic/skill-kit, vitest
- `claws-test/tsconfig.json` (NEW) -- Extends monorepo base
- `claws-test/vitest.config.ts` (NEW) -- Unit/integration/e2e projects

## Deliverables

### Specs & Design
- [ ] CL-05 amendment -- @bic/test API surface finalized: 4 layers, 12 checks, 16 rules, 4 matchers
- [ ] CL-06 amendment -- @bic/test package.json, size budget, dependency surface

### Package Scaffolding
- [ ] claws-test/package.json -- name, version, peer deps (@bic/skill-kit, vitest), exports
- [ ] claws-test/tsconfig.json -- extends monorepo base, forbidden import paths
- [ ] claws-test/vitest.config.ts -- unit/integration/e2e projects
- [ ] Root package.json workspaces UPDATE -- add "claws-test"

### SDK Logic (claws-test)
- [ ] claws-test/src/scenario/runner.ts -- ScenarioRunner with replay engine
- [ ] claws-test/src/scenario/parser.ts -- SKILL.md scenario extraction
- [ ] claws-test/src/governance/validator.ts -- GovernanceValidator orchestrator
- [ ] claws-test/src/governance/checks/risk-level.ts -- declared-vs-actual risk check
- [ ] claws-test/src/governance/checks/obo-boundary.ts -- OBO consistency check
- [ ] claws-test/src/governance/checks/data-labels.ts -- data label coverage check
- [ ] claws-test/src/governance/checks/fail-mode.ts -- fail-mode correctness per risk level
- [ ] claws-test/src/governance/checks/capabilities.ts -- capability/permission alignment
- [ ] claws-test/src/governance/checks/elicitation.ts -- elicitation gate presence for R5
- [ ] claws-test/src/governance/checks/a2a-trust.ts -- A2A trust boundary declarations
- [ ] claws-test/src/governance/checks/input-validation.ts -- input validation presence
- [ ] claws-test/src/governance/checks/output-guards.ts -- output guard presence
- [ ] claws-test/src/governance/checks/bounded-reasoning.ts -- step/tool/budget/recursion limits
- [ ] claws-test/src/governance/checks/audit-completeness.ts -- audit trail completeness
- [ ] claws-test/src/governance/checks/supply-chain.ts -- supply chain signature check
- [ ] claws-test/src/security/scanner.ts -- SecurityScanner with rule orchestration
- [ ] claws-test/src/security/rules/injection.ts -- 4 injection detection rules (AST-based)
- [ ] claws-test/src/security/rules/secrets.ts -- 4 secret detection rules (pattern-based)
- [ ] claws-test/src/security/rules/input.ts -- 4 input validation rules
- [ ] claws-test/src/security/rules/output.ts -- 4 output validation rules
- [ ] claws-test/src/matchers/governance.ts -- 4 custom vitest matchers
- [ ] claws-test/src/matchers/index.ts -- expect.extend() registration
- [ ] claws-test/src/types.ts -- all type definitions
- [ ] claws-test/src/index.ts -- package barrel
- [ ] claws-test/tests/scenario/runner.unit.test.ts -- scenario replay, declared-vs-actual comparison
- [ ] claws-test/tests/scenario/parser.unit.test.ts -- SKILL.md scenario extraction
- [ ] claws-test/tests/governance/validator.unit.test.ts -- all 12 checks individually
- [ ] claws-test/tests/security/scanner.unit.test.ts -- all 16 rules: positive and negative cases
- [ ] claws-test/tests/matchers/governance.unit.test.ts -- matcher pass/fail with assertion messages
- [ ] claws-test/tests/integration/full-validation.integration.test.ts -- validator + scanner on fixture skill
- [ ] claws-test/tests/integration/standalone.integration.test.ts -- runs without claws CLI (no compiler dependency)
- [ ] claws-test/tests/fixtures/clean-skill/ (NEW) -- properly governed skill (zero findings expected)
- [ ] claws-test/tests/fixtures/vulnerable-skill/ (NEW) -- skill with eval, secrets, missing validation
- [ ] claws-test/tests/fixtures/tier3-skill/ (NEW) -- VERIFIED skill with full governance coverage

### CLI Wiring
- None (this is a library package -- `claws test` CLI command comes in claws-cli plan, calls @bic/test programmatically)

### Scenario Findings (added during wave)
*(empty -- populated during implementation)*

## Out of Scope

- @bic/skill-kit package (that's claws-skill-kit plan -- skill-kit is a peer dependency, not part of this package)
- claws-cli `claws test` command (that's claws-cli plan -- CLI wraps @bic/test)
- SKILL.md compilation pipeline (that's claws-emit plan -- @bic/test validates, not compiles)
- CI/CD GitHub Action (`@bic/claws-action`) -- Phase 3
- Runtime security scanning (dynamic analysis) -- this package does static analysis only
- Custom rule API for enterprise rule extensions -- Phase 3+
- Performance benchmarking of skills -- separate concern

## Notes

- GovernanceValidator REUSES agent-sdk eval/ framework: `eval/rubric.ts` for structured check definitions, `eval/assertions.ts` for typed assertion helpers, `eval/judge.ts` for scoring aggregation
- SecurityScanner AST analysis uses TypeScript compiler API (ts.createSourceFile) -- same approach as compiler-sdk's TypeScript parsing
- The 16 security rules are calibrated against the OC ecosystem threat landscape: 322 browser skills (injection), 824+ malicious skills (supply chain), 111 R5 TRANSACT skills (OBO)
- Custom vitest matchers use `expect.extend()` -- standard vitest/jest extension API, no custom test runner
- MockGateway is re-exported from @bic/skill-kit for convenience -- no duplication, peer dep resolution
- Size budget: ~45KB (per CL-06). TypeScript compiler API is the heaviest dependency; tree-shakeable via scanner-only import.
- Package follows ARCHITECTURE.md dependency rules: claws-test -> claws-sdk (types + test utilities). DOES NOT IMPORT: craftworks-sdk, shared-cli, any CLI package
- Depends on claws-skill-kit (MockGateway re-export, decorator metadata reading) and claws-governance-ir (types only: GovernanceIR, RiskLevel, FailMode for check type parameters)
- **Phase 1 — ships with Ptah wave.** Bundled with @bic/skill-kit as the "Skill Author SDK" milestone. Writing decorated skills without the ability to test them is half a developer experience. The combined dependency is: claws-sdk types (from governance-ir) + @bic/skill-kit + @bic/test. No compilation pipeline required.
