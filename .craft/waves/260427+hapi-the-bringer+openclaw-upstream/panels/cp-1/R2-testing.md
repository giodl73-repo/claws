# cp-1 Review · testing · R2

**Date**: 2026-04-28
**R1 verdict**: APPROVE-WITH-WARNINGS (2 HC-BLOCK)
**R2 verdict**: APPROVE

## R1 BLOCKers — verification

| # | Title | Status | Notes |
|---|---|---|---|
| B6 | type-mismatch null-anything untested | CLOSED | Carve-out documented + companion null-as-absence rule + 2 contract tests pass |
| B7 | distance-3 cap untested | CLOSED | Both boundary tests (dist=3 fires, dist=4 falls through) pass |

### B6 evidence

- `src/lint/rules/missing-required.ts:7-13` — TSDoc has the "Null-as-absence semantics" paragraph explaining why null at a required key fires here, and cross-references TYPE_MISMATCH.
- `src/lint/rules/missing-required.ts:53-67` — `run()` extension: detects `member.value.kind === 'null'`, fires `OC_CFG_MISSING_REQUIRED_FIELD` with message "required key \"…\" is null — equivalent to absent for a required slot; gateway will reject this config at startup". Location points at the null literal's range, not the parent object.
- `src/lint/rules/type-mismatch.ts:6-11` — TSDoc has the "Null carve-out" paragraph + cross-reference back to MISSING_REQUIRED. Codebase intent is now bidirectionally documented.
- `tests/lint/rules-coverage.test.ts:220-230` — `'fires when a required key is present but null (null-as-absence semantics)'`: asserts finding present, `path === ['accessToken']`, message contains `'null'`. Pass.
- `tests/lint/rules-coverage.test.ts:231-238` — `'silent when an optional (not required) key is present but null'`: same fixture, empty `requiredChildKeys`, asserts no finding. Pass. This is the critical negative case — confirms the rule does NOT bleed into optional-null territory (which would re-create the false-positive class TYPE_MISMATCH dodges).

The MISSING_REQUIRED describe block is now 4 tests (lines 201-239); all 4 pass.

### B7 evidence

- `tests/lint/rules-coverage.test.ts:113-122` — distance-3 boundary: `"homeser"` → `"homeserver"` is 3 deletions; suggestion expected `=== 'homeserver'`. Pass.
- `tests/lint/rules-coverage.test.ts:123-133` — distance-4 over-cap: `"homese"` → `"homeserver"` is 4 deletions; asserts `suggestion === undefined` AND `message.includes('gateway will reject')` (verifies fall-through path, not just absence of suggestion). Pass.
- Distance math sanity-checked: lengths 7→10 = 3 deletions; 6→10 = 4 deletions. Correct.

The UNKNOWN_FIELD describe block is now 4 tests (lines 96-134); all 4 pass.

### Bonus invariants (unregressed)

- `tests/lint/issue-replay.test.ts:118-120` — per-finding `ocUri.startsWith('oc://config')` invariant in place, unchanged.
- 12 issue-replay fixtures intact (`tests/lint/fixtures/issues/*.jsonc`).
- Full suite: `vitest run` → **20 files, 241 tests, all pass** (304ms for rules-coverage alone). rules-coverage describe count: 26 → 30 (+2 MISSING_REQUIRED, +2 UNKNOWN_FIELD), exactly the claimed delta. The "43→47" figure in the R2 brief seems to reference an aggregated count rather than this file specifically; the +4 delta in rules-coverage is what was promised and what landed.

## New findings (if any)

None. The B6 fix introduces a sharp contract — null is OK at optional paths, gap at required paths — and both halves are now under test. No false-positive surface I can see; no regression in issue-replay.

One minor observation, non-gating: the new MISSING_REQUIRED-on-null finding's `location` points at the null literal's range (correct, more useful than the parent-object range), and the `path` correctly includes the required key. Consistent with how key-absent findings position themselves at the parent. Good.

## R2 verdict reasoning

Both BLOCKers are CLOSED. The contract decision at the heart of B6 — null-as-disable is a feature at optional paths, null-as-absence is a bug at required paths — is now expressed in three places (TYPE_MISMATCH TSDoc, MISSING_REQUIRED TSDoc, two paired tests) such that any future refactor that conflates the two cases will fail a test or contradict comments. That's the level of contract-locking the R1 BLOCKer was asking for. The negative test (`'silent when an optional ... key is present but null'`) is the load-bearing one from a testing-role perspective — without it, a regression that fired MISSING_REQUIRED universally on null would still pass the positive case. It's there.

B7's two boundary tests bracket the distance-3 cap correctly: a refactor that drops `<=` to `<` will fail the dist-3 test, and a refactor that bumps the cap to 4 will fail the dist-4 "no suggestion" test. The dist-4 test also asserts the fall-through message wording, so an accidental message-text drift on the over-cap path also gets caught. This is exactly the boundary discipline the R1 finding asked for. Approve.
