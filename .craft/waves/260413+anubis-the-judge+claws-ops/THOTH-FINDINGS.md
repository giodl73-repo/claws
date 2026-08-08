# Anubis Security Findings → Thoth Plans

Findings from the Anubis wave security review panel (5 roles, 61 findings)
and the superpowers deep code review. Phase 1 blockers (S-03, S-05) were
fixed in Anubis. Everything below is deferred to Thoth.

Source panels: `panels/anubis-security-final/R1-*.md`

---

## claws-protect

### Must-fix (M)

| ID          | Finding                                                                                   | File(s)                                | Fix                                                                             |
| ----------- | ----------------------------------------------------------------------------------------- | -------------------------------------- | ------------------------------------------------------------------------------- |
| S-01        | LLM adversarial guard is instructional only — workspace content can manipulate extraction | adversarial-guard.ts, prompts.ts:32-50 | Add post-parse validation: reject JSON-shaped sourceText, reject confidence=1.0 |
| S-02        | EnvStorage writes plaintext keys to .env — no encryption, no file permissions             | storage.ts:88-186                      | Apply chmod(0o600) to .env file, warn on plaintext                              |
| S-04        | Signing key material persists in JS heap — returned as string, cannot be zeroed           | key-resolution.ts:22-31                | Use Buffer with explicit zeroing after use                                      |
| S-06        | HMAC key co-located with audit chain — same trust boundary                                | audit-chain.ts:84-98                   | Document limitation; add doctor check; separate key storage                     |
| D-01        | Amendment can lower trust tier — no monotonic check                                       | validate.ts:98-132                     | Add `newTier >= existingTier` assertion at amendment boundary                   |
| D-03        | File lock TOCTOU race — read-delete-recreate allows concurrent acquisition                | rotate.ts:51-89, registry.ts:30-67     | Single-attempt retry loop with O_EXCL                                           |
| D-04 / A-02 | Two bypass evaluation modules can diverge                                                 | config/bypass.ts, init/bypass.ts       | Consolidate into single module                                                  |
| D-05        | Key rotation rollback leaves orphaned archive                                             | rotate.ts:178-258                      | Clean up archived key material on failure                                       |
| C-01        | Raise-only loophole for LLM gap-fills — LLM-only intents bypass invariant                 | merger.ts:212-226                      | Add minimum risk floor (R2) for LLM-only gap-fill intents                       |
| C-03        | Broadcast trust-compat only checks trustTier, not other policy fields                     | broadcast.ts:295-452                   | Extend trust-compat to check publish restrictions                               |
| A-01        | CLI contains registry client logic — SDK-owns-logic violated                              | publish.ts:46-67                       | Move registry client to claws-sdk                                               |
| F3          | Cache import has no content integrity verification — cache hits skip verifier             | cache.ts:249-270                       | HMAC-sign cache exports or re-verify on extract                                 |

### Test gaps (M)

| ID   | Finding                                           | What to test                                                              |
| ---- | ------------------------------------------------- | ------------------------------------------------------------------------- |
| T-01 | No path traversal regression test for FileStorage | Verify `../`, `/`, `\` in keyId throws                                    |
| T-03 | No adversarial injection test corpus              | Fixtures with "Ignore all instructions", JSON payload injection, etc.     |
| T-04 | No raise-only boundary tests                      | Edge cases: LLM R1 vs regex R5, both undefined, gap-fill with no baseline |

### Warnings (W) — should fix

| ID   | Finding                                                                             | File(s)                                                      |
| ---- | ----------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| D-W1 | No rate limit backoff on sequential LLM extraction                                  | extractor.ts                                                 |
| D-W2 | Fuzzy match allows case-insensitive verification bypass for high-risk               | verifier.ts                                                  |
| S-W1 | Cache file written with no permission restrictions                                  | cache.ts                                                     |
| S-W2 | No TLS/proxy security guidance for enterprise LLM calls                             | anthropic-provider.ts                                        |
| S-W3 | Watch mode silently swallows LLM errors in non-verbose mode                         | watch.ts                                                     |
| S-W4 | JSON parse failures indistinguishable from "no intents found"                       | prompts.ts                                                   |
| A-W1 | Concrete AnthropicLLMProvider exported from main compile barrel                     | compile/index.ts                                             |
| A-W2 | Mutable cache internals                                                             | cache.ts                                                     |
| C-W1 | policyVersion: 'unknown' weakens audit trail value                                  | broadcast.ts                                                 |
| F2   | Verifier drops intents when LLM gets line number wrong but content exists elsewhere | verifier.ts — consider "relocated" tier with 0.6x confidence |

---

## claws-comply-audit

### Must-fix (M)

| ID   | Finding                                                                                   | File(s)                | Fix                                                                            |
| ---- | ----------------------------------------------------------------------------------------- | ---------------------- | ------------------------------------------------------------------------------ |
| D-02 | Audit chain has no chaining hash — entries independently signed, can be deleted/reordered | audit-chain.ts:123-152 | Add previousHash field to AuditChainEntry; compute SHA-256(previous + content) |
| C-02 | PBKDF2 iterations hardcoded at 600k — no config override                                  | ceremony.ts:381        | Add configurable iterations in claws.json                                      |
| T-02 | No audit chain tamper detection test                                                      | audit-chain.ts         | Test: delete entry → verify detects gap; reorder → verify detects break        |

---

## Deep Review (superpowers:code-reviewer)

| ID  | Severity | Finding                                                                   | Thoth Plan                                                               |
| --- | -------- | ------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| F1  | HIGH     | LLM-merged intents never reach GovernanceIR — --llm is observability-only | Intentional for CP-5. Wire into IR in claws-protect via --llm-merge flag |
| F4  | LOW      | Post-parse could reject JSON-shaped sourceText as injection payload       | claws-protect                                                            |
| F7  | LOW      | Provider typed as `any` — minimal type stub would improve safety          | claws-protect                                                            |
