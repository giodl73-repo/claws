# cp-1 Review · testing · R1

**Date**: 2026-04-28
**Verdict**: APPROVE-WITH-WARNINGS

## HC-BLOCK findings (testing-discipline blockers — must fix before cp-2 opens)
| # | Title | Where | Why blocking | Action |
|---|---|---|---|---|
| B1 | `null matches anything` in `type-mismatch.ts` is untested AND likely wrong for required string paths | `src/lint/rules/type-mismatch.ts:51-52`; no test exercises it | Today, `{ "homeserver": null }` against a string-required path produces ZERO findings — neither TYPE_MISMATCH nor MISSING_REQUIRED_FIELD (the key is present, just null). This is a silent contract hole, exactly the false-positive-inverse class the testing lens is supposed to catch | Add positive test: schema requires string, value is null → assert SOME finding (decide: should be TYPE_MISMATCH, or MISSING_REQUIRED treats `null` as absence). Document the chosen semantics in the rule docstring. Optionality must be explicit in schema, not implicit-via-null |
| B2 | `closestKnown` distance-3 cap has no boundary test | `src/lint/rules/unknown-field.ts:69-70`; tests only exercise distance-1 ("homserver"→"homeserver") | The cap at 3 is the heuristic that gates the entire did-you-mean UX. Untested, so a refactor that drops the comparator to `<` or bumps to 4 won't break a single test. False positives at distance 4+ ("rolserver" → "homeserver"?) are how did-you-mean kills adoption | Add 2 tests: distance-3 input ("hxmsxrver" or similar) → suggestion populated; distance-4 input → suggestion `undefined`, message falls through to "gateway will reject" wording |

## HC-WARN findings (should address)
| # | Title | Where | Action |
|---|---|---|---|
| W1 | All 12 issue-replay fixtures are ~5-10 line minimal toys, not representative configs | `tests/lint/fixtures/issues/*.jsonc` | At least 2-3 fixtures should be 50-200 line "realistic" configs (channels.matrix + channels.slack + plugins.entries + agents.defaults + gateway.dmPolicy populated) so we exercise rules in the presence of *unrelated correct config*. Otherwise rules-coverage looks great in isolation but explodes on real input via cross-rule interaction (e.g., dead-comment near a deprecated key) |
| W2 | `openclaw-test-schema.ts` will be silently outdated once the real Zod-backed `OpenClawConfig` schema lands | `tests/lint/fixtures/openclaw-test-schema.ts` | Either (a) replace with a thin adapter over the real schema as soon as it exists, or (b) add a CI gate that diffs the test schema's `knownChildKeys('')` against the real schema's keys and fails on drift. As written, the test schema will lie about reality 6 months from now |
| W3 | `oc://config` URI invariant is asserted only via `startsWith` | `tests/lint/issue-replay.test.ts:118-120` | Doesn't catch a regression that emits `oc://config//double-slash` or `oc://config/`. Add a parser round-trip assertion: `formatOcConfigUri(parseOcConfigUri(f.ocUri).path) === f.ocUri` for every finding |
| W4 | Post-merge §3.1 H1 validator delegates byte-identicality to upstream CI; doesn't actually verify the headline locally | `docs/upstream/guides/post-merge-verification.md:93-96` | The runbook checks "the workflow ran green" via `gh run list`, not "linux/mac/windows produced identical bytes". Fragile if upstream's matrix definition drifts. Add a 3-line node script that hashes the canonical output for a known fixture and asserts against a checked-in expected SHA |
| W5 | No concurrent-read test for the lint engine | (missing) | SC-33 covers concurrent *write* via atomic-rename; lint is read-side. Two concurrent `lint(doc)` calls sharing a schema instance — does `pluginIdSources(doc)` mutate any internal state? Today's schema is pure-function, but the contract isn't tested |
| W6 | Engine-level test doesn't verify rule ordering / dedup | (missing) | If two rules fire on the same node (e.g., DEAD_COMMENT + UNKNOWN_FIELD on the same removed key — both fire today on the rules-coverage F-positive case), is the output stable across runs? Add a snapshot test for finding ordering on a fixture that triggers ≥3 rules |

## HC-NOTE findings (capture for follow-up — including additional test cases worth adding)
| # | Title | Where |
|---|---|---|
| N1 | Empty-config test: `lint(parseJsonc('{}'), { schema: openclawTestSchema })` should be silent (no MISSING_REQUIRED for unset top-level optionals) but fire MISSING_REQUIRED for `gateway.dmPolicy`? Today: gateway is absent, so `requiredChildKeys(['gateway'])` is never called. Decide: is missing `gateway` itself an error, or only missing `dmPolicy` *given* `gateway` is present? | (missing) |
| N2 | Deeply-nested config (8+ levels): does the walker stack overflow? Synthetic 100-deep object | (missing) |
| N3 | Unicode in keys: `{ "频道": "x" }` against schema with ASCII keys — does did-you-mean compute byte-distance or codepoint-distance? `editDistance` uses `charCodeAt`, which is UTF-16 code units → suggestions on emoji/surrogate-pair keys will be nonsense | (missing) |
| N4 | Large-fixture perf: 10k-key object — lint completes within ≤500ms? SC-34 covers parse-emit perf, lint perf is uncovered | (missing) |
| N5 | The `isPositive ? rule fires : rule silent` pattern in rules-coverage is good, but no test exercises "rule silent on UNRELATED input" — e.g., does TYPE_MISMATCH fire spuriously on a config where `kindOf` returns 'unknown' for everything? Implicit in current tests, but a single explicit "all 8 schema-aware rules silent on schema with all-unknown kindOf and empty knownChildKeys" guards regressions | (missing) |
| N6 | `OC_CFG_REDACTED_PLACEHOLDER` only tests the exact literal `__OPENCLAW_REDACTED__`. What about case variants (`__openclaw_redacted__`), partial matches, or the placeholder embedded in a larger string (`"prefix__OPENCLAW_REDACTED__suffix"`)? Real corruption may not be the bare literal | (missing) |
| N7 | SC-51 fixer-roadmap contract has no test today (intentionally — future PRs). Worth adding a stub L3 acceptance test that lints the contract markdown for the prefix/LOC rules so the contract itself can't drift | `tests/lint/issue-replay.test.ts` (or new `fixer-contract.test.ts`) |

## Strengths
- Per-rule positive+negative discipline is cleanly applied — every one of the 13 rules has a `silent` companion test. No drive-by "rule fires" entries that ignore false-positive surface.
- The two negative-test fixtures (#14998 `$schema`, #62438 clean `${VAR}`) are exactly the right shape — they encode that *not flagging* is part of the contract, not just *flagging*. This is how false-positive rates stay low.
- Issue-replay test loop's per-finding `ocUri.startsWith('oc://config')` invariant catches the URI-vocabulary regression without needing a separate test
- Schema dependency-injection (smoke test "silent without a schema") is a real architectural property, not just a coincidence — the engine genuinely degrades gracefully
- 1:1 mapping of SC-39..SC-50 → 12 issue replays is clean; SC-37/38 are covered by smoke + the per-finding ocUri loop. No scenario goes untested except SC-51 (intentionally deferred)

## Verdict reasoning

The 43-test suite is solid coverage for a 13-rule catalog *as a starting position* — every rule has positive+negative discipline, every cited issue has a replay fixture, the engine's schema-DI behavior is verified end-to-end, and the negative-test fixtures (#14998, #62438) demonstrate the team understands false-positive-rate-as-contract. For a PR-1 detection-only surface, this is the right shape. Approve.

The two HC-BLOCK findings are testing-discipline gaps the lens demands fixed before cp-2: (B1) the `null matches anything` semantics in `type-mismatch.ts` is a quiet contract decision that fires zero tests today, and on a real openclaw config with a `null` accessToken would silently pass when it should scream — same data-corruption class the package is *named after preventing*. (B2) the distance-3 cap is the entire UX of did-you-mean and has no boundary test; a one-character refactor could break it invisibly.

False-positive rate on a real openclaw config is likely *low for the rules with negative fixtures* (UNKNOWN_FIELD, SECRET_REF_AMBIGUOUS) and *unknown for the others*. The minimal-fixture risk (W1) is the biggest unknown: a 5-line fixture that fires DUPLICATE_KEY tells us nothing about whether DUPLICATE_KEY also fires spuriously on a 200-line config with `// repeated key in two different objects` (which is fine — different scopes). I'd estimate single-digit-percent false-positive rate today, climbing if real configs surface cross-rule interactions the toy fixtures don't model. The unicode case (N3) is a sleeper: any user with non-ASCII keys gets garbage did-you-mean suggestions today. None of this is approval-blocking, but cp-2 should not open without B1 and B2 closed.
