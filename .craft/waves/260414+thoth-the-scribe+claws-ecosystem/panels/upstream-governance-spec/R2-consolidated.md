# R2 Consolidated — Upstream Governance Spec Review

**Panel**: upstream-governance-spec
**Type**: spec
**Round**: 2 (verification)
**Date**: 2026-04-15
**Roles**: architect (D), dragon (A), navigator (E), type-system (C)

---

## R1 Resolution Summary

| Severity  | R1 Total  | Resolved | Partially | Unresolved |
| --------- | --------- | -------- | --------- | ---------- |
| Major     | 8 unique  | **8**    | 0         | 0          |
| Warning   | 13 unique | **10**   | 2         | 1          |
| Notes     | 9 unique  | **7**    | 1         | 1          |
| **Total** | **30**    | **25**   | **3**     | **2**      |

**All 5 blockers RESOLVED.** All 5 high-value fixes RESOLVED.

### R1 Blocker Status

| Blocker                                                 | Status   | Verification                                                                                                          |
| ------------------------------------------------------- | -------- | --------------------------------------------------------------------------------------------------------------------- |
| CONSENSUS-M1: `allowed` vs `decision` field mismatch    | RESOLVED | grep confirms zero `allowed:` matches across all 5 files                                                              |
| CONSENSUS-M2: AuthorizationDecision discriminated union | RESOLVED | 4-variant union: AllowDecision, DenyDecision, ReviewDecision, ModifyDecision                                          |
| CONSENSUS-M3: R5 fail-closed bypass paths               | RESOLVED | (a) empty registry → deny, (b) registry forces requiresExternalApproval for R5, (c) readonly + JSON Schema contains:5 |
| CONSENSUS-M4: Unknown risk fail-mode row                | RESOLVED | 4th row added: "Unknown / Missing / Invalid → Fail-closed"                                                            |
| U-M4: risk.level/label coupling                         | RESOLVED | RiskClassification mapped union prevents mismatches                                                                   |

### Dragon Lens Reversal (R1 → R2)

| Verify item                         |  R1  |    R2    |
| ----------------------------------- | :--: | :------: |
| No validation weakened              | FAIL | **PASS** |
| Error paths exhaustive              | FAIL | **PASS** |
| No invariant made conditional       | FAIL | **PASS** |
| R5 fail-closed preserved everywhere | FAIL | **PASS** |
| Timeout safety guaranteed           | FAIL | **PASS** |

### Navigator Lens Reversal (R1 → R2)

| Verify item                    |  R1  |    R2    |
| ------------------------------ | :--: | :------: |
| First-5-minutes path           | FAIL | **PASS** |
| Error messages user-actionable | WARN | **PASS** |
| Progressive disclosure         | WARN | **PASS** |
| User mental model matches spec | FAIL | **PASS** |
| Journey coherence              | WARN | **PASS** |

### Type-System Lens Reversal (R1 → R2)

| Verify item                     |  R1  |    R2    |
| ------------------------------- | :--: | :------: |
| No `as` casts or `any` types    | PASS | **PASS** |
| Discriminated unions exhaustive | FAIL | **PASS** |
| Generic constraints             | WARN | **WARN** |
| Invalid states unrepresentable  | FAIL | **PASS** |
| Type narrowing paths complete   | FAIL | **PASS** |

---

## New R2 Findings

| Severity | architect | dragon | navigator | type-system | Total  |
| -------- | :-------: | :----: | :-------: | :---------: | :----: |
| Major    |     0     |   0    |     0     |      0      | **0**  |
| Warning  |     3     |   2    |     2     |      3      | **10** |
| Notes    |     3     |   2    |     0     |      0      | **5**  |

### New Warnings (after dedup)

| ID    | Roles             | Finding                                                                                              | Priority                                    |
| ----- | ----------------- | ---------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| R2-W1 | architect         | Plan H3 says "3 packages" in Wave 1 but approval-events makes 4                                      | Low — plan text, not spec                   |
| R2-W2 | architect         | siem-emitter format count: plan says 4, spec says 5 (added `json` and `ndjson`)                      | Low — plan text                             |
| R2-W3 | architect, dragon | Aether blob verification integration path still hedges between claws-sdk and @openclaw/audit-chain   | Low — implementation detail                 |
| R2-W4 | dragon            | Aether integration plan validation notes don't reference registry R5 override                        | Low — plan clarity                          |
| R2-W5 | navigator         | Deck "KEEP (8)" lists only 6 items                                                                   | Low — cosmetic                              |
| R2-W6 | navigator         | "OC Firewall" and "Clawprint" demand references lack context for deck audience                       | Low — cosmetic                              |
| R2-W7 | type-system       | `AuditEvent` still uses index signature (`[key: string]: unknown`) — loose typing                    | Acceptable — escape hatch for custom events |
| R2-W8 | type-system       | ShellExecProvider narrows return to `AllowDecision` (covariant) — worth JSDoc note                   | Low — correctness OK                        |
| R2-W9 | type-system       | approval-event-schema.md still has `level` and `label` as independent fields, not RiskClassification | Low — rationale doc is non-normative        |

---

## Verdict

**All 5 R1 blockers: RESOLVED.**
**All 4 lens checklists: PASS** (dragon flipped 5/5, navigator flipped 5/5, type-system flipped 3/5 to pass).
**0 new Major findings.**
**9 new Warnings** — all low priority (plan text alignment, deck cosmetics, acceptable type trade-offs).

**The canonical spec is ready for upstream PR submission.**

The remaining warnings are plan/deck consistency items that can be addressed during wave close flair, not spec blockers. No Round 3 review is needed.
