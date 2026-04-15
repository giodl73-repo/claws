# R1 — Consolidated Security Review

**Panel**: anubis-security-final
**Wave**: Anubis the Judge (claws-ops)
**Date**: 2026-04-13
**Reviewers**: craft:dragon, craft:security, craft:architect, craft:testing, craft:conformance

---

## Review Scope

All TypeScript source files changed in the Anubis wave across three packages:
- **claws-sdk/src** — 130+ files: keys, fleet, compliance, compile/llm, config, publish, amend, annotate, snapshot, init, watch, doctor, emit, scaffold
- **claws-cli/src** — 43 files: commands, config, core, format, output, ui
- **claws-test/src** — 7 files: gateway-sim, matchers, security rules, tool-call-builder

---

## Aggregate Finding Counts

| Role | M | W | N | Total |
|------|---|---|---|-------|
| craft:dragon | 5 | 5 | 2 | 12 |
| craft:security | 6 | 6 | 2 | 14 |
| craft:architect | 2 | 6 | 3 | 11 |
| craft:testing | 4 | 6 | 2 | 12 |
| craft:conformance | 3 | 6 | 3 | 12 |
| **Total** | **20** | **29** | **12** | **61** |

---

## Critical Findings (M — Must Fix)

These 20 findings represent security risks, invariant violations, or compliance gaps that should be addressed before wave merge.

### Tier 1 — Immediate Security Risk (fix before merge)

| ID | Role | Finding | File(s) |
|----|------|---------|---------|
| S-03 | security | **keyId path traversal in FileStorage** — unsanitized keyId can write key material outside .claws/keys/ | `storage.ts:46-53` |
| S-01 | security | **LLM prompt injection surface** — adversarial guard is instructional only; workspace content can manipulate extraction | `adversarial-guard.ts`, `prompts.ts:32-50` |
| S-05 | security | **Broadcast follows symlinks** — symlinked workspace in fleet dir redirects policy writes to arbitrary location | `broadcast.ts:295-452` |
| D-02 | dragon | **Audit chain has no chaining hash** — entries independently signed, can be deleted/reordered without detection | `audit-chain.ts:123-152` |

### Tier 2 — Key Management Risks (fix before production deployment)

| ID | Role | Finding | File(s) |
|----|------|---------|---------|
| S-02 | security | **EnvStorage writes plaintext keys to .env** — no encryption, no file permissions | `storage.ts:88-186` |
| S-04 | security | **Signing key material persists in JS heap** — returned as string, cannot be zeroed | `key-resolution.ts:22-31` |
| S-06 | security | **HMAC key co-located with audit chain** — same trust boundary, HMAC provides no adversarial protection | `audit-chain.ts:84-98` |
| D-05 | dragon | **Key rotation rollback leaves orphaned archive** — archived key material not cleaned up on failure | `rotate.ts:178-258` |

### Tier 3 — Invariant & Compliance Gaps

| ID | Role | Finding | File(s) |
|----|------|---------|---------|
| D-01 | dragon | **Amendment can lower trust tier** — no monotonic check at amendment boundary | `validate.ts:98-132` |
| D-04 | dragon | **Two bypass evaluation modules** — config/bypass.ts and init/bypass.ts can diverge | `config/bypass.ts`, `init/bypass.ts` |
| D-03 | dragon | **File lock TOCTOU race** — read-delete-recreate pattern allows concurrent acquisition | `rotate.ts:51-89`, `registry.ts:30-67` |
| C-01 | conformance | **Raise-only loophole for LLM gap-fills** — LLM-only intents bypass raise-only invariant | `merger.ts:212-226` |
| C-02 | conformance | **PBKDF2 iterations hardcoded** — no config override for varying compliance requirements | `ceremony.ts:381` |
| C-03 | conformance | **Broadcast can loosen publish restrictions** — trust-compat only checks trustTier, not other policy fields | `broadcast.ts:295-452` |
| A-01 | architect | **CLI contains registry client logic** — SDK-owns-logic boundary violated | `publish.ts:46-67` |
| A-02 | architect | **Dual bypass modules** — overlapping responsibility creates maintenance risk | `config/bypass.ts`, `init/bypass.ts` |

### Tier 4 — Test Coverage Gaps for Security-Critical Paths

| ID | Role | Finding | File(s) |
|----|------|---------|---------|
| T-01 | testing | **No path traversal tests for FileStorage** — security fix has no regression test | `storage.ts` |
| T-02 | testing | **No audit chain tamper detection test** — deletion/reordering not tested | `audit-chain.ts` |
| T-03 | testing | **No adversarial injection test corpus** — prompt injection resistance untested | `adversarial-guard.ts` |
| T-04 | testing | **No raise-only boundary tests** — security invariant edge cases not covered | `merger.ts` |

---

## Cross-Role Convergence

Several findings were independently identified by multiple roles, confirming their significance:

### Bypass Module Duplication
- **D-04** (dragon): bypass invariant could diverge across two modules
- **A-02** (architect): overlapping responsibility creates architecture debt
- **S-06 related**: co-located HMAC key means bypass audit trail can be forged

### Audit Chain Integrity
- **D-02** (dragon): no cryptographic chaining between entries
- **T-02** (testing): no integration test for tamper detection
- **C-07** (conformance): `policyVersion: 'unknown'` weakens audit trail value

### Raise-Only Risk Invariant
- **D-01** (dragon): amendment can lower trust tier (bypassing raise-only at config level)
- **C-01** (conformance): LLM gap-fills bypass raise-only (no regex baseline)
- **T-04** (testing): boundary conditions of raiseOnlyRisk() untested

### Key Material Handling
- **S-02** (security): plaintext .env storage
- **S-03** (security): path traversal in keyId
- **S-04** (security): key material in heap
- **T-01** (testing): no tests for path traversal
- **D-05** (dragon): orphaned archive after rotation rollback

---

## Recommended Fix Ordering

### Phase 1 — Pre-Merge Blockers (4 items)
1. **S-03**: Add keyId validation regex `[a-zA-Z0-9._-]` in FileStorage methods
2. **S-05**: Add `lstat()` check in broadcast to reject symlinked workspace paths
3. **D-02**: Add `previousHash` field to AuditChainEntry for chain linking
4. **T-01 + T-02 + T-03 + T-04**: Write security-critical regression tests

### Phase 2 — Pre-Production (6 items)
5. **S-02**: Apply chmod(0o600) to EnvStorage .env file
6. **D-04 / A-02**: Consolidate bypass evaluation into single module
7. **D-01**: Add monotonic check for trust tier in amendment validation
8. **C-01**: Add minimum risk floor (R2) for LLM-only gap-fill intents
9. **D-03**: Fix TOCTOU race with single-attempt retry loop
10. **A-01**: Move registry client to SDK

### Phase 3 — Hardening (remaining M and high-severity W)
11. **S-06**: Document HMAC co-location limitation; add doctor check
12. **D-05**: Fix rotation rollback to clean up archived keys
13. **C-02**: Add configurable PBKDF2 iterations
14. **C-03**: Extend trust-compat to check publish policy fields

---

## Assessment

The Anubis wave delivers a comprehensive governance toolkit with strong foundations: correct Shamir SSS implementation, HMAC-signed audit chain, atomic writes with retry, monotonic trust tightening, LLM extraction with verification, and proper key lifecycle management.

The security posture is **solid for a v1 release** with the following caveats:

1. **Defense-in-depth is incomplete**: The codebase relies on individual controls (HMAC signing, adversarial guard, raise-only merger) without layered redundancy. Several controls are advisory rather than enforced (adversarial guard, gated fail-mode, co-located HMAC key).

2. **The audit chain is the weakest security boundary**: Without chaining hashes, the tamper-evidence guarantee is limited to per-entry integrity. An attacker with filesystem access can delete or reorder entries without detection.

3. **Key material handling needs tightening**: Path traversal in keyId, plaintext .env storage, and key material in heap memory are all addressable issues that should be fixed before any enterprise deployment.

4. **Test coverage for security invariants is the most urgent gap**: The four testing M-findings (T-01 through T-04) mean that fixes for security issues lack regression protection. Write the tests first, then fix the issues.

**Verdict**: Address Phase 1 blockers (S-03, S-05, D-02, test gaps) before merge. Phase 2 items can be tracked as follow-up but should land before any production fleet deployment.
