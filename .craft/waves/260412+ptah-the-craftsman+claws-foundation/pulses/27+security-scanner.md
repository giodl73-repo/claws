---
pulse: 27
slug: security-scanner
plan: claws-test-framework
depends_on: [26]
governing_roles: [claws:ciso, craft:dragon]
scenario_codes:
  [
    test/security-scanner-clean,
    test/security-scanner-eval,
    test/security-scanner-secrets,
    test/security-scanner-input,
    test/security-scanner-output,
  ]
stage: implementation
test_tiers:
  L0_unit: 16
  L1_integration: 2
  L2_e2e: 0
  L3_accept: 0
test_scope:
  run:
    - "cd claws-test && npx vitest run tests/security/scanner.unit.test.ts"
  typecheck:
    - "cd claws-test && npx tsc --noEmit"
checkpoint: 4
checkpoint_gate: false
---

# Pulse 27: SecurityScanner (16 AST Rules)

## Objective

Implement SecurityScanner with 16 AST-based rules across 4 categories. The scanner parses TypeScript handler source files using `ts.createSourceFile` and walks the AST to detect patterns that indicate prompt injection risk, secret exposure, or unsafe input/output handling. Each rule produces a finding with severity (critical/high/medium/low), file path, line number, matched code pattern, and remediation suggestion. The scanner must achieve zero false positives on clean skills.

## Deliverables

- [ ] `claws-test/src/security/scanner.ts` -- NEW: SecurityScanner orchestrator (load rules, parse files, aggregate findings)
- [ ] `claws-test/src/security/rules/injection.ts` -- NEW: 4 injection defense rules
  - Rule 1: `no-eval` -- detect `eval()` calls (critical)
  - Rule 2: `no-function-constructor` -- detect `new Function()` (critical)
  - Rule 3: `no-template-literal-injection` -- detect template literals with unsanitized user input in dangerous contexts (high)
  - Rule 4: `no-dynamic-import` -- detect `import()` with variable arguments (high)
- [ ] `claws-test/src/security/rules/secrets.ts` -- NEW: 4 secret detection rules
  - Rule 5: `no-api-keys` -- detect hardcoded API key patterns (sk-_, AKIA_, etc.) (high)
  - Rule 6: `no-tokens` -- detect hardcoded bearer/auth tokens (high)
  - Rule 7: `no-credentials` -- detect password/secret string literals assigned to variables (medium)
  - Rule 8: `no-env-leaks` -- detect process.env values logged or returned without redaction (medium)
- [ ] `claws-test/src/security/rules/input.ts` -- NEW: 4 input sanitization rules
  - Rule 9: `no-unvalidated-input` -- detect user input passed directly to tool calls without validation (high)
  - Rule 10: `no-missing-trust-labels` -- detect agent-to-agent messages without trust level annotation (medium)
  - Rule 11: `no-url-injection` -- detect URLs constructed from user input without sanitization (high)
  - Rule 12: `no-unbounded-input` -- detect missing size/length limits on user input (medium)
- [ ] `claws-test/src/security/rules/output.ts` -- NEW: 4 output validation rules
  - Rule 13: `no-unredacted-pii` -- detect PII patterns (email, phone, SSN) in output without redaction (high)
  - Rule 14: `no-unvalidated-urls` -- detect URLs returned to user without validation (medium)
  - Rule 15: `no-format-injection` -- detect user input interpolated into structured output formats (medium)
  - Rule 16: `no-chain-bypass` -- detect tool chain validation skipped or short-circuited (high)
- [ ] `claws-test/tests/security/scanner.unit.test.ts` -- NEW: all 16 rules with positive and negative cases
- [ ] `claws-test/tests/security/scanner.integration.test.ts` -- NEW: full scanner on fixture handlers
- [ ] `claws-test/tests/fixtures/clean-skill/handler.ts` -- EDIT: ensure zero scanner findings on clean handler
- [ ] `claws-test/tests/fixtures/vulnerable-skill/handler.ts` -- EDIT: add injection, secrets, input, output patterns

## TDD Tests

### L0 Unit (16)

**Injection Defense (4):**

- `no-eval`: handler with `eval(userInput)` produces critical finding with file:line and remediation -> `claws-test/tests/security/scanner.unit.test.ts`
- `no-function-constructor`: handler with `new Function(input)` produces critical finding -> `claws-test/tests/security/scanner.unit.test.ts`
- `no-template-literal-injection`: handler with `` `SELECT * FROM ${userInput}` `` in exec context produces high finding -> `claws-test/tests/security/scanner.unit.test.ts`
- `no-dynamic-import`: handler with `import(userPath)` produces high finding -> `claws-test/tests/security/scanner.unit.test.ts`

**Secret Detection (4):**

- `no-api-keys`: handler with `const key = "sk-proj-abc123..."` produces high finding -> `claws-test/tests/security/scanner.unit.test.ts`
- `no-tokens`: handler with `headers: { Authorization: "Bearer abc123" }` produces high finding -> `claws-test/tests/security/scanner.unit.test.ts`
- `no-credentials`: handler with `const password = "hunter2"` produces medium finding -> `claws-test/tests/security/scanner.unit.test.ts`
- `no-env-leaks`: handler with `console.log(process.env.SECRET_KEY)` produces medium finding -> `claws-test/tests/security/scanner.unit.test.ts`

**Input Sanitization (4):**

- `no-unvalidated-input`: handler passes raw user input to tool call without validation -> `claws-test/tests/security/scanner.unit.test.ts`
- `no-missing-trust-labels`: handler sends message to agent without trust annotation -> `claws-test/tests/security/scanner.unit.test.ts`
- `no-url-injection`: handler constructs URL with `http://${userDomain}/api` -> `claws-test/tests/security/scanner.unit.test.ts`
- `no-unbounded-input`: handler accepts string input without length check or schema -> `claws-test/tests/security/scanner.unit.test.ts`

**Output Validation (4):**

- `no-unredacted-pii`: handler returns email/phone in output without redaction -> `claws-test/tests/security/scanner.unit.test.ts`
- `no-unvalidated-urls`: handler returns URL to user without protocol/domain validation -> `claws-test/tests/security/scanner.unit.test.ts`
- `no-format-injection`: handler interpolates user input into JSON/XML output -> `claws-test/tests/security/scanner.unit.test.ts`
- `no-chain-bypass`: handler skips tool chain validation step -> `claws-test/tests/security/scanner.unit.test.ts`

### L1 Integration (2)

- SecurityScanner.scan() on clean skill fixture produces ZERO findings -> `claws-test/tests/security/scanner.integration.test.ts`
- SecurityScanner.scan() on vulnerable skill fixture produces findings across all 4 categories with correct severities -> `claws-test/tests/security/scanner.integration.test.ts`

## Key Constraints

- All rules are AST-based (not regex) using TypeScript compiler API `ts.createSourceFile`
- Each rule produces: { rule: string, severity: 'critical'|'high'|'medium'|'low', file: string, line: number, code: string, remediation: string }
- Zero false positives on clean skills is a hard requirement -- calibrated against OC ecosystem (322 browser skills, 111 R5 TRANSACT skills)
- Scanner works standalone: `SecurityScanner.scan('./src/')` runs without the claws compiler
- TypeScript compiler API is the heaviest dependency; import must be tree-shakeable for package size budget
- Rules are grouped in 4 files (injection.ts, secrets.ts, input.ts, output.ts) not 16 individual files
- Scanner reuses compiler-sdk's TypeScript parsing approach but does NOT import from compiler-sdk

## Governing Roles

Load these role files before starting:

- `.craft/roles/claws/ciso.md` -- security rule calibration, false positive tolerance, threat model alignment
- `.craft/roles/craft/dragon.md` -- AST parsing approach, TypeScript compiler API usage, code quality

## Dependencies

- Pulse 26 (scenario-governance-validator) -- @bic/claws-test package scaffolding + types

## Verification Gate

```bash
cd claws-test && npx vitest run tests/security/scanner.unit.test.ts
cd claws-test && npx vitest run tests/security/scanner.integration.test.ts
cd claws-test && npx tsc --noEmit
npm run build
```
