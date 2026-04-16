---
pulse: 43
slug: onboard-api
plan: claws-cap-integration
depends_on: [29, 30]
governing_roles: [craft:architect, claws:platform-eng]
scenario_codes: [S15, S34]
stage: implementation
test_tiers:
  L0_unit: 6
  L1_integration: 3
  L2_e2e: 1
  L3_accept: 2
test_scope:
  run:
    - "cd claws-serve && npx vitest run --project unit --coverage"
    - "cd claws-serve && npx vitest run --project integration --coverage"
    - "cd claws-sdk && npx vitest run --project unit --coverage"
    - "cd claws-sdk && npx vitest run --project integration --coverage"
  typecheck:
    - "cd claws-serve && npx tsc --noEmit"
    - "cd claws-sdk && npx tsc --noEmit"
checkpoint: 8
checkpoint_gate: false
---

# Pulse 43: Onboard API

## Objective

Implement POST /api/onboard that accepts a conversational transcript and produces structured SOUL.md and MEMORY.md seed files for a new workspace. The onboarding flow takes free-form text from the Companion App onboarding wizard, extracts structured data (name, role, preferences, team context, working patterns), and generates well-formed OC files that pass compilation.

Content validation is critical for this endpoint as it accepts arbitrary user input. Three defense layers: (1) secret scanner detects API keys, tokens, passwords, and connection strings using pattern matching and entropy analysis; (2) size limit enforcement prevents oversized payloads; (3) injection defense strips OC-structural markers that could corrupt the generated files (frontmatter injection, heading injection, malicious YAML). The onboard-validator in claws-sdk owns all validation logic.

## Deliverables

- [ ] `claws-serve/src/routes/onboard.ts` — POST /api/onboard: accepts { transcript: string, options?: OnboardOptions }. Validates via onboard-validator, extracts structured data, generates SOUL.md + MEMORY.md seeds, writes to workspace, triggers initial compile. Returns { soul: string, memory: string, warnings: string[] }. Returns 400 on validation failure with detailed error codes (SECRET_DETECTED, SIZE_EXCEEDED, INJECTION_BLOCKED).
- [ ] `claws-sdk/src/workspace/onboard-validator.ts` — Three-layer validation: (1) secretScanner: regex + entropy for API keys, tokens, passwords, connection strings (2) sizeLimit: configurable max transcript size (default 50KB) (3) injectionDefense: strip/reject OC-structural markers (---, #-heading injection, YAML frontmatter injection). Returns ValidationResult with pass/fail, error codes, and sanitized content.
- [ ] `claws-sdk/tests/workspace/onboard-validator.unit.test.ts` — L0: secret scanner detects API key pattern (1), secret scanner detects high-entropy token (1), size limit rejects oversized transcript (1), injection defense strips frontmatter injection (1), injection defense strips heading injection (1), clean transcript passes all checks (1)
- [ ] `claws-serve/tests/routes/onboard.integration.test.ts` — L1: POST generates SOUL.md + MEMORY.md from transcript (1), POST rejects transcript with secrets (1), POST rejects oversized transcript (1)
- [ ] `claws-serve/tests/routes/onboard.e2e.test.ts` — L2: full onboard flow: POST -> validate -> generate -> write -> compile (1)
- [ ] Content validation runs on BOTH the input transcript AND the generated SOUL.md/MEMORY.md output before writing.
- [ ] L3 acceptance: S15 (onboarding transcript produces valid SOUL.md + MEMORY.md) (1), S34 (content validation blocks secrets and injection) (1)

## Acceptance Criteria

- [ ] POST /api/onboard accepts transcript and returns generated SOUL.md + MEMORY.md
- [ ] Secret scanner detects API keys, tokens, passwords, and connection strings
- [ ] Size limit enforcement rejects transcripts exceeding 50KB default
- [ ] Injection defense strips OC-structural markers that could corrupt files
- [ ] Generated files pass claws compilation without errors
- [ ] Validation failures return 400 with typed error codes
- [ ] Warnings array surfaces non-blocking issues (e.g., possible but uncertain secret patterns)
- [ ] S15 acceptance: onboarding transcript produces valid SOUL.md + MEMORY.md
- [ ] S34 acceptance: content validation blocks secrets and injection
- [ ] All 6 L0 unit tests pass
- [ ] All 3 L1 integration tests pass
- [ ] All 1 L2 e2e test passes

## Governing Roles

Load these role files before starting:
- `.craft/roles/craft/architect.md` — monorepo structure, SDK-owns-logic rule, security patterns
- `.craft/roles/claws/platform-eng.md` — workspace file generation, validation patterns

## Dependencies

- Pulse 29 (workspace-edit) — validation pipeline foundations
- Pulse 30 (write-time validation layer) — validation pipeline for file writes

## Test Gates

- [ ] L0 unit (6 tests): secret scanner API key, secret scanner high-entropy, size limit rejects, injection strips frontmatter, injection strips heading, clean transcript passes
- [ ] L1 integration (3 tests): POST generates files, POST rejects secrets, POST rejects oversized
- [ ] L2 e2e (1 test): full onboard flow POST -> validate -> generate -> write -> compile
- [ ] L3 acceptance (2 tests): S15 onboarding produces valid files, S34 content validation blocks threats
- [ ] `npm run build` exits 0
- [ ] `npx tsc --noEmit` exits 0
