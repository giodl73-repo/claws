---
pulse: 10
slug: protect-test-coverage
plan: claws-protect
depends_on: [1, 2, 3, 4, 5, 6, 7, 8, 9]
governing_roles: [claws:ciso, claws:founder, craft:architect]
scenario_codes: [obo-elicitation/S01, obo-elicitation/S02, obo-elicitation/S05, obo-elicitation/S06, obo-elicitation/S07, obo-elicitation/S08, a2a-governance/S04, a2a-governance/S05, a2a-governance/S06, pitfall-thoth-1/P-197, pitfall-thoth-1/P-198, pitfall-thoth-1/P-199, pitfall-thoth-1/P-203, pitfall-thoth-1/P-204, pitfall-thoth-1/P-205, pitfall-thoth-1/P-206, pitfall-thoth-1/P-207, pitfall-thoth-1/P-208, pitfall-thoth-1/P-209, pitfall-thoth-1/P-210, pitfall-thoth-1/P-211, pitfall-thoth-1/P-212, pitfall-thoth-1/P-213]
stage: implementation
test_tiers:
  L0_unit: 7
  L1_integration: 9
  L2_e2e: 2
  L3_accept: 3
test_scope:
  run:
    - "cd claws-sdk && npx vitest run"
  typecheck:
    - "cd claws-sdk && npx tsc --noEmit"
checkpoint: 1
checkpoint_gate: true
---

# Pulse 10: Protect Test Coverage — CP-1 Gate

## Objective

CP-1 gate pulse. This pulse closes all remaining test gaps from THOTH-FINDINGS, addresses outstanding warnings, and validates the full Checkpoint 1 test suite. No new features — only test coverage, warning fixes, and final validation.

**Integration Coverage Hardening:** This gate pulse includes 6 integration tests addressing coverage gaps identified in the THOTH-INTEGRATION-COVERAGE analysis. Target: 90%+ stmts from integration tests alone across snapshot (74%), doctor (68%), amend (67%), detect (62%), config (38%), and adapter (41%) areas.

**Test gaps to close:**
- T-01 (path traversal in key operations): `../`, `/`, `\` in keyId must throw — no path traversal through key management APIs.
- T-04 (raise-only boundary edges): LLM at R1 vs regex at R5, both undefined, gap-fill with no baseline — all boundary conditions must be covered.

**Warnings to address:**
- D-W1 (rate limit backoff): sequential LLM extraction calls need exponential backoff to avoid provider rate limits.
- D-W2 (fuzzy match bypass): fuzzy matching for high-risk (R4-R5) tools is dangerous — a near-miss match could silently approve a different tool. Disable fuzzy match for R4-R5.
- F2 (relocated tier): line-number mismatches between OC source and extraction results need a "relocated" confidence tier (0.6x) instead of silent acceptance.
- S-W1 (cache file permissions): cache files should be written with 0o644 permissions.
- S-W3 (LLM error swallowing): LLM errors in non-verbose mode are silently swallowed — must log at warning level.
- S-W4 (JSON parse ambiguity): JSON parse failure and "no intents found" are conflated — need typed result to distinguish.
- A-W1 (concrete provider export): `AnthropicLLMProvider` should not be exported from the barrel — only the interface.
- A-W2 (cache internals): cache internals should be frozen after construction to prevent mutation.
- C-W1 (policyVersion): broadcast uses hardcoded 'unknown' for policyVersion — should resolve from claws.json.

**Pitfall scenarios:**
- P-197, P-198, P-199: Thoth wave pitfall scenarios covering protect module edge cases.

## Deliverables

- [ ] `claws-sdk/tests/protect/path-traversal.unit.test.ts` — L0: T-01 regression tests: `../` in keyId throws (1 test), `/` in keyId throws (1 test), `\` in keyId throws (1 test)
- [ ] `claws-sdk/tests/compile/raise-only-boundary.unit.test.ts` — L0: T-04 boundary edges: LLM at R1 vs regex at R5 — regex wins (1 test), both sources undefined — defaults to R2 floor (1 test), gap-fill with no baseline — R2 floor applied (1 test)
- [ ] `claws-sdk/src/compile/extractor.ts` (EDIT) — D-W1: add exponential backoff for sequential LLM extraction calls. Base delay 200ms, multiplier 2x, max 5 retries, jitter +/- 50ms.
- [ ] `claws-sdk/src/compile/verifier.ts` (EDIT) — D-W2: disable fuzzy match for high-risk (R4-R5) tools — exact match only. F2: add "relocated" confidence tier with 0.6x multiplier for line-number mismatches between OC source and extraction result.
- [ ] `claws-sdk/src/compile/cache.ts` (EDIT) — S-W1: write cache files with 0o644 permissions via `fs.writeFile` mode option. A-W2: call `Object.freeze()` on cache internals after construction.
- [ ] `claws-sdk/src/compile/watch.ts` (EDIT) — S-W3: log LLM errors at warning level in non-verbose mode instead of swallowing silently.
- [ ] `claws-sdk/src/compile/prompts.ts` (EDIT) — S-W4: return typed result `{ type: 'parse-error', error } | { type: 'no-intents' } | { type: 'success', intents }` to distinguish JSON parse failure from "no intents found".
- [ ] `claws-sdk/src/compile/index.ts` (EDIT) — A-W1: remove `AnthropicLLMProvider` from barrel exports, keep only `LLMProvider` interface.
- [ ] `claws-sdk/src/compile/anthropic-provider.ts` (EDIT) — S-W2: add TLS enforcement documentation and optional TLS-only mode for enterprise LLM calls. Log warning when LLM endpoint uses HTTP instead of HTTPS.
- [ ] `claws-sdk/src/fleet/broadcast.ts` (EDIT) — C-W1: resolve `policyVersion` from claws.json config instead of hardcoded `'unknown'`.
- [ ] `claws-sdk/tests/protect/warnings-coverage.integration.test.ts` — L1: rate limit backoff fires after rapid sequential calls (1 test), fuzzy match disabled for R5 tool — near-miss rejected (1 test), cache files written with 0o644 permissions (1 test)
- [ ] `claws-sdk/tests/compile/anthropic-tls.unit.test.ts` — L0: LLM endpoint HTTP warning logged (1 test)
- [ ] `claws-sdk/tests/protect/snapshot-lifecycle.integration.test.ts` — L1: snapshot save → diff → restore → promote lifecycle (snapshot 74% → 90%, THOTH-INTEGRATION-COVERAGE)
- [ ] `claws-sdk/tests/protect/doctor-health.integration.test.ts` — L1: doctor: run 12 health checks against healthy, degraded, and broken fixture workspaces (doctor 68% → 90%, THOTH-INTEGRATION-COVERAGE)
- [ ] `claws-sdk/tests/compile/amend-pipeline.integration.test.ts` — L1: amend pipeline: re-parse → re-evaluate → merge → re-emit on modified workspace (amend 67% → 90%, THOTH-INTEGRATION-COVERAGE)
- [ ] `claws-sdk/tests/compile/platform-detect.integration.test.ts` — L1: platform detection across openclaw, cursor, claude-code fixture workspaces (detect 62% → 90%, THOTH-INTEGRATION-COVERAGE)
- [ ] `claws-sdk/tests/protect/config-lifecycle.integration.test.ts` — L1: config create → validate → merge → override lifecycle (config 38% → 90%, THOTH-INTEGRATION-COVERAGE)
- [ ] `claws-sdk/tests/compile/adapter-transforms.integration.test.ts` — L1: adapter layer transforms across 3 platform targets (adapter 41% → 90%, THOTH-INTEGRATION-COVERAGE)
- [ ] `claws-sdk/tests/fixtures/doctor-degraded/` — fixture workspace for doctor degraded health checks
- [ ] `claws-sdk/tests/fixtures/doctor-broken/` — fixture workspace for doctor broken health checks
- [ ] `claws-sdk/tests/fixtures/platform-cursor/` — fixture workspace for cursor platform detection
- [ ] `claws-sdk/tests/fixtures/platform-claude-code/` — fixture workspace for claude-code platform detection
- [ ] `claws-sdk/tests/fixtures/config-override/` — fixture workspace for config override lifecycle
- [ ] `claws-sdk/tests/protect/full-protect.e2e.test.ts` — L2: full protect lifecycle on reference workspace — budget, vault, identity all functional (1 test), security hardening regression suite — all THOTH-FINDINGS fixes verified end-to-end (1 test)
- [ ] `claws-sdk/tests/protect/protect-gate.accept.test.ts` — L3: SDK acceptance — consumer exercises full protect surface (budget, vault, identity, hardening fixes) through public APIs on reference workspace and validates all CP-1 acceptance criteria
- [ ] `claws-cli/tests/protect/protect-gate.accept.test.ts` — L3: CLI acceptance — `claws protect budget`, `claws protect secrets`, `claws protect identity` commands produce correct output and exit codes on reference workspace
- [ ] `claws-sdk/tests/protect/protect-regression.accept.test.ts` — L3: SDK acceptance — regression suite exercising all THOTH-FINDINGS must-fix items (S-01..S-06, D-01..D-05, C-01..C-03) through public APIs to confirm no regressions

## Acceptance Criteria

- [ ] All THOTH-FINDINGS must-fix items (S-01..S-06, D-01..D-05, C-01..C-03, A-01..A-02, T-01..T-04, F2..F3) verified by tests
- [ ] All warnings (D-W1, D-W2, S-W1..S-W4, A-W1..A-W2, C-W1) addressed in code
- [ ] Path traversal in keyId throws for `../`, `/`, `\`
- [ ] Raise-only boundary conditions covered: LLM R1 vs regex R5, both undefined, no baseline
- [ ] Rate limit backoff activates for sequential LLM calls
- [ ] Fuzzy match disabled for R4-R5 tools
- [ ] Cache files have 0o644 permissions and frozen internals
- [ ] LLM errors logged in non-verbose mode
- [ ] JSON parse vs no-intents distinguished with typed result
- [ ] Concrete AnthropicLLMProvider not exported from barrel
- [ ] policyVersion resolved from claws.json
- [ ] LLM endpoint HTTP warning logged when endpoint uses HTTP instead of HTTPS
- [ ] Pitfall scenarios P-197, P-198, P-199 pass
- [ ] Full CP-1 test suite green: `cd claws-sdk && npx vitest run` exits 0
- [ ] `npm run build` exits 0
- [ ] `npx tsc --noEmit` exits 0

## Governing Roles

Load these role files before starting:
- `.craft/roles/claws/ciso.md` — security hardening verification, threat model coverage
- `.craft/roles/claws/founder.md` — product security posture, acceptable risk thresholds
- `.craft/roles/craft/architect.md` — test coverage standards, barrel export conventions, CP gate criteria

## Dependencies

- Pulse 01 (protect-types): shared type foundations must pass
- Pulse 02 (budget-workspace): budget module must pass
- Pulse 03 (budget-fleet): fleet budget module must pass
- Pulse 04 (secrets-vault): vault module must pass
- Pulse 05 (identity-sso): identity module must pass
- Pulse 06 (security-hardening-llm): adversarial guard and cache integrity must pass
- Pulse 07 (security-hardening-keys): key material protection must pass
- Pulse 08 (security-hardening-trust): trust model integrity must pass
- Pulse 09 (security-hardening-race): race condition fixes and bypass consolidation must pass

## Test Gates

- [ ] L0 unit (7 tests): path traversal `../` throws (1), path traversal `/` throws (1), path traversal `\` throws (1), raise-only LLM R1 vs regex R5 (1), raise-only both undefined (1), raise-only gap-fill no baseline (1), LLM endpoint HTTP warning logged (1)
- [ ] L1 integration (9 tests): rate limit backoff fires (1), fuzzy match disabled for R5 (1), cache permissions 0o644 (1), snapshot save → diff → restore → promote lifecycle (1), doctor health checks against healthy/degraded/broken workspaces (1), amend pipeline re-parse → re-evaluate → merge → re-emit (1), platform detection across openclaw/cursor/claude-code (1), config create → validate → merge → override lifecycle (1), adapter layer transforms across 3 platform targets (1)
- [ ] L2 e2e (2 tests): full protect lifecycle on reference workspace (1), security hardening regression suite (1)
- [ ] L3 accept (3 tests): SDK acceptance — full protect surface validation (1), CLI acceptance — protect commands output and exit codes (1), SDK regression — all THOTH-FINDINGS must-fix items (1)
- [ ] `npm run build` exits 0
- [ ] `npx tsc --noEmit` exits 0
