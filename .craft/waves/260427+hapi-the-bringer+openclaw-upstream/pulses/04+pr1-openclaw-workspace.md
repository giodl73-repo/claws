---
pulse: 04
slug: pr1-openclaw-workspace
plan: claws-openclaw-upstream
co_plans: [claws-workspace-lint]
checkpoint: cp-2
depends_on: [01, 02, 03]
governing_roles: [claws:gateway-eng, claws:claws-release-eng, claws:claws-repo-steward]
addresses_findings:
  [
    F-52,
    F-53,
    F-54,
    F-55,
    F-56,
    F-76,
    F-77,
    F-78,
    F-79,
    F-80,
    F-81,
    F-82,
    F-83,
    F-84,
    F-85,
    F-86,
    F-87,
    F-93,
    F-94,
    F-98,
    F-99,
    F-100,
    F-101,
    churn data on doctor-legacy-config.migrations,
  ]
addresses_headlines: [H1]
---

# Pulse 04 · PR-1 — `@openclaw/workspace` + `replaceConfigFile` Lossless Conversion

## Objective

Open PR-1 against `github.com/openclaw/openclaw` adding `@openclaw/workspace` (subpaths `/path` for oc:// URIs, `/ast` for PEG grammars + lossless emitters incl. JSONC, `/lint` for the 13-code JSONC config lint surface, `/canonicalize` for RFC 8785 JCS) AND wholesale-converting `src/config/io.ts:replaceConfigFile` from `JSON.stringify(_, null, 2)` to lossless `parse → mutate → emit` via `@openclaw/workspace/ast`. Each subpath earns its keep in the same PR.

**The pitch (PR description hook — data-driven, see PR-DRAFT 1):**

> 4 open + 6 closed `__OPENCLAW_REDACTED__`-corruption issues, 11 open + 2 closed `Unrecognized key` startup-block issues, plus collision/round-trip/false-positive cases all trace to the same chokepoint: `src/config/io.ts:1381` and `src/config/io.ts:2082` use `JSON.stringify` to write back user config. After this PR: lossless `parse → mutate → emit` at that chokepoint preserves comments + ordering + indent + secrets, AND a 13-code lint surface flags 27+ distinct evidence-backed config-failure patterns. Plain JSON path stays parity-or-faster than `JSON.stringify` via short-circuit detection. Plus the `oc://config/...` URI vocabulary lights up everywhere in one shot — lint findings, doctor migrations, future audit-log correlation.

## Deliverables

### `@openclaw/workspace` package

- [ ] `packages/openclaw-workspace/` content copied + renamed from our `@bic/openclaw-workspace`
- [ ] Subpath exports preserved + extended: `/path`, `/ast`, `/ast/jsonc` (NEW), `/lint` (NEW), `/canonicalize`, `/staging`, `/path-canonical`
- [ ] **`/ast` includes a JSONC grammar** (covers today's openclaw config files; preserves comments, key ordering, indentation, blank-line layout)
- [ ] **`/path` ships dual `oc://` URI scheme** — workspace-file form (`oc://TOOLS.md/...`) + config form (`oc://config/channels/matrix/accessToken`). `parseOcUri` returns a discriminated `ParsedOcUri` (`kind: 'workspace' | 'config'`). `resolveConfigUri(uri, configRoot)` walks the OpenClawConfig tree (with array-index support) and returns `{value, parentNode, leafKey, found}` or `{found:false}` — never throws.
- [ ] **`/lint` ships 13 codes** detection-only (per `claws-workspace-lint` plan H1): `OC_CFG_UNKNOWN_FIELD`, `OC_CFG_REDACTED_PLACEHOLDER` (ERROR), `OC_CFG_DUPLICATE_KEY`, `OC_CFG_DEPRECATED_FIELD`, `OC_CFG_LEGACY_FIELD`, `OC_CFG_PLUGIN_ID_COLLISION`, `OC_CFG_TYPE_MISMATCH`, `OC_CFG_MISSING_REQUIRED_FIELD`, `OC_CFG_TRAILING_COMMA_INCONSISTENT`, `OC_CFG_SECRET_REF_AMBIGUOUS`, `OC_CFG_TRAILING_WHITESPACE`, `OC_CFG_MIXED_INDENT`, `OC_CFG_DEAD_COMMENT`. Schema-aware rules (5/13) consume `LintSchema` via DI. Every finding carries `ocUri: 'oc://config/<path>'`.
- [ ] `peerDependencies`: none (workspace has zero openclaw-side deps)
- [ ] `package.json` `name` flipped to `@openclaw/workspace`; license `MIT`

### Doctor migration emit (absorbed from former PR-2 scope 2026-04-28)

- [ ] `src/commands/doctor-legacy-config.migrations.ts` (14 commits/3mo hot path) emits `oc://config/...` URIs in diagnostic locations instead of `{file, line}` for config-mutation diagnostics
- [ ] `src/commands/doctor-config-flow.ts` (16 commits/3mo) similarly migrated
- [ ] Backward compat: existing `{kind: 'file'}` location consumers continue to work; `DiagnosticLocation` discriminated union accepts both shapes

### Wholesale conversion of `replaceConfigFile`

- [ ] `src/config/io.ts:1381` — `JSON.stringify(persistedRootParsed, null, 2)` → `emit(parse(originalRaw, 'jsonc'), persistedRootParsed)` (preserves source structure)
- [ ] `src/config/io.ts:2082` — `JSON.stringify(stampedOutputConfig, null, 2)` → same lossless emit pattern
- [ ] `replaceConfigFileSync` callers unchanged (no signature changes; only the internal stringify body changes)
- [ ] Plain-JSON-without-comments behavior preserved bit-exactly (zero-behavior-change for the existing common case)
- [ ] JSONC-with-comments: comments preserved across all `update` / `doctor --fix` / config-mutation cycles
- [ ] Key ordering: user's chosen order preserved; merger ops preserve insertion order at AST level

### Diagnostic-location format extension (subpath `/path` earns its keep)

- [ ] Doctor's diagnostic shape extended to accept `oc://...` URIs as a location, parallel to existing `{file, line}` form
- [ ] Workspace-file diagnostics emit URIs via `formatOcUri()` from `@openclaw/workspace/path` (e.g., `oc://TOOLS.md/Tools/send-email/args_from`)
- [ ] Runtime-config diagnostics now also emit `oc://config/...` URIs (this PR ships the dual-form scheme; doctor migration emit covered above)
- [ ] Backward compat: existing diagnostic consumers (LSP, console renderers) keep working with the old shape

### Cross-OS canonicalize CI matrix (subpath `/canonicalize` earns its keep)

- [ ] `.github/workflows/openclaw-workspace-cross-os.yml` runs canonicalize fixture on Linux + macOS + Windows
- [ ] Asserts byte-identical SHA-256 across the three OSes
- [ ] CRLF → LF normalization tested explicitly (Windows checkout doesn't drift)

### CI / public-API obligations

- [ ] `docs/.generated/plugin-sdk-api-baseline.sha256` refreshed
- [ ] `docs/sdk-overview.md` table updated with new package + diagnostic-shape extension
- [ ] No Swift protocol model changes expected for this PR
- [ ] CHANGELOG entry appended at end-of-section per `CLAUDE.md` rule

### Internal verification before pushing

- [ ] `pnpm --filter @openclaw/workspace test` green
- [ ] `pnpm --filter @openclaw/workspace build` green
- [ ] `pnpm --filter @openclaw/workspace tsc --noEmit` green
- [ ] Existing `src/config/io.test.ts` (or wherever the io tests live) — ALL CASES PASS unchanged
- [ ] New tests added for the JSONC-with-comments round-trip cases

## TDD Tests

### L0 unit (`packages/openclaw-workspace/tests/unit/`) — 41 tests

- oc:// URI parser (workspace form): malformed inputs, escape rules, query params (3 tests)
- **oc://config URI parser** (absorbed from PR-2): parser round-trip, array-index form, malformed → structured error codes (3 tests, F-88..F-90)
- **`resolveConfigUri()`**: valid path, missing path returns `{found:false}`, array out-of-bounds returns `{found:false}` not exception (2 tests, F-95..F-97)
- PEG AST round-trip per WorkspaceFileKind: SOUL/TOOLS/AGENTS/IDENTITY/USER/SKILL (6 tests, F-54)
- **JSONC parse + emit round-trip**: comments preserved, key order preserved, indent preserved (3 tests — the headline invariants)
- Trailing whitespace + list-marker style preserved (1 test, F-55)
- Frontmatter ordering preserved (1 test, F-56)
- **JSONC parser unit suite**: BOM, comments, trailing-comma object, trailing-comma array, escape sequences, error recovery, empty doc, nested object (8 tests)
- **JSONC emit unit suite**: pristine round-trip, leaf mutation string, leaf mutation number, leaf mutation null/bool (3 tests)
- **Short-circuit detection**: plain-JSON true positive, JSONC false positive (2 tests)
- **Per-rule unit suite**: one positive + one negative fixture per lint code (13 tests)

### L1 integration (`packages/openclaw-workspace/tests/integration/`) — 14 tests

- Cross-OS canonicalize CI matrix: same input → byte-identical SHA-256 on Linux / macOS / Windows (1 matrix, F-52)
- CRLF → LF line-ending normalization before JCS (1 test, F-53)
- **Real-config issue replay**: one fixture per evidence-cited issue (#14998, #20478, #22272, #31251, #48415, #59070, #60334, #61683, #62281, #62438, #65565, #72872) — fixture replays failure pattern; lint catches with expected codes (12 tests)

### L1 integration (upstream — landing in PR-1)

- **`replaceConfigFile` round-trip with comments**: input is JSONC config with `// comments` and custom indentation; one field mutated; output preserves all comments + ordering + indent except the changed field (1 test — THE invariant)
- **`replaceConfigFile` plain JSON behavior unchanged**: input has no comments, default 2-space indent; output is byte-identical to today's stringify result (1 test — backward compat proof)
- **`doctor --fix` idempotency**: run `--fix` twice on a clean config; second run = byte-zero diff (1 test, idempotency invariant)
- **`openclaw update` end-to-end with comments**: stub or fixture-driven simulation of a config-mutation flow; user comments survive the round-trip (1 test)
- **doctor migration emits config URI** (absorbed from PR-2): fixture-driven test — `doctor-legacy-config.migrations` fires; assert diagnostic location is `oc://config/...` URI not `{file, line}` (1 test, F-91)
- **`doctor-config-flow` similarly migrated** (1 test, F-92)
- **dual-shape diagnostic renderer** consumes both `{kind: 'file'}` and `{kind: 'uri'}` locations correctly (1 test, F-87)

### L2 e2e — 3 tests

- Workspace-file diagnostic emitter cites `oc://` URI: hand-craft a parse error in TOOLS.md; assert diagnostic location is `oc://TOOLS.md/...` (1 test)
- Lint engine end-to-end: parse real openclaw config → run lint → render findings via doctor surface (2 tests)

### L3 acceptance — 2 tests

- `lint()` API stable shape: `LintFinding` fields don't drift across calls (1 test)
- Severity tier conformance: every code's severity matches the catalog table (1 test)

(The earlier "evidence-regen reproducibility" L3 test was removed when
`scripts/regen-lint-evidence.ts` was downgraded to an advisory print-only
script per user direction 2026-04-28; the script no longer writes
EVIDENCE.md so there's nothing to test for reproducibility. Manual
refresh is the contract.)

**Test totals**: 41 L0 + 14 L1 (claws-side) + 7 L1 (upstream — was 4, +3 doctor URI emit absorbed from PR-2) + 3 L2 + 2 L3 = **67 tests** in this pulse. Aligns with `claws-workspace-lint` plan H4 (42 lint tests) + 17 from prior PR-1 scope + 8 absorbed from PR-2 = 67. PR-1 description's "70 new tests" includes these plus 3 prior-scope L2 tests.

## Verification Gate

```bash
# Local validation before push
pnpm --filter @openclaw/workspace build
pnpm --filter @openclaw/workspace test
pnpm --filter @openclaw/workspace tsc --noEmit

# Critical: existing config tests still pass
cd /c/src/openclaw-core
pnpm test src/config/io.test.ts
pnpm test src/commands/doctor-legacy-config.migrations.test.ts  # the hot file (14 commits/3mo)
pnpm test src/commands/doctor-config-flow.test.ts                # 16 commits/3mo

# JSONC-with-comments round-trip proof
node -e "
  const { parse, emit } = require('@openclaw/workspace/ast');
  const input = '{\n  // user comment\n  \"key\": \"value\"\n}\n';
  const ast = parse(input, 'jsonc');
  const output = emit(ast, ast.value);
  if (output !== input) { console.error('LOSSY ROUND-TRIP'); process.exit(1); }
  console.log('Round-trip clean');
"

# Bot-preempt pre-flight
grep -iE "(third.?party|extension|skill|clawhub)" PR-1-DESCRIPTION.md \
  && (echo "AUTO-CLOSE RISK"; exit 1) || echo "PR description clear"

# Confirm baseline hash + sdk-overview updated in same commit
git diff --name-only HEAD~1 | grep -E "(plugin-sdk-api-baseline|sdk-overview)" \
  || (echo "MISSING REFRESH"; exit 1)

# Open the PR
gh pr create --repo openclaw/openclaw \
  --title "feat: add @openclaw/workspace + lossless config round-trip via AST (preserves comments + ordering + indent in update/doctor)" \
  --body-file PR-1-DESCRIPTION.md
```

## Post-merge

Run pulse 03's post-merge verification runbook against trunk. Capture merge SHA. Confirm H1 validators GREEN before pulse 06 opens PR-2 (OC-4) — and especially confirm the comment-preservation invariant holds on trunk.

## Key Constraints

- **High blast radius**: `replaceConfigFile` is the chokepoint. Reviewers will scrutinize. Strong test coverage of the existing JSON-without-comments case is mandatory (zero behavior change for the common path).
- **JSONC grammar must be lossless**: parse-emit on user comments preserves byte-for-byte. This is the headline invariant; everything else follows from it.
- **Perf goal — plain JSON parity-or-faster, JSONC ≤2×, 50ms hard ceiling on 1MB.** The plain-JSON short-circuit is the lever: when no JSONC features are present, fall through to native `JSON.stringify` for the 99% common path. Bench fixture must demonstrate parity.
- **PR-1 + PR-2 open simultaneously** (Wave A 2-PR pairing). They're conceptually independent (PR-1 = lossless emit + lint surface; PR-2 = scheme extension), so reviewers can chew on both without dependency interlock.
- **The pitch in the PR description leads with data, not delight.** Per evidence pull 2026-04-28: 27+ distinct evidence-backed issues across 7 bug classes. Reviewers see issue numbers first, then technical detail.
- **Lint catalog is detection-only in PR-1**; class-by-class fixers ship in follow-up PRs (per `claws-workspace-lint` plan, out-of-scope section).
- **Issue citations may be refreshed pre-push** via `scripts/regen-lint-evidence.ts` (advisory script — prints live counts for manual comparison; not CI-gated). Author decides whether to update EVIDENCE.md + PR description based on the printed delta. Openclaw's issue tracker moves fast (~100 open config-titled at last pull) but a hard freshness threshold would be arbitrary; the human reading the diff is the gate.

## Scenario codes addressed

SC-14 (canonicalize cross-OS), SC-15 (AST round-trip), plus NEW scenarios for the conversion: SC-25 (JSONC round-trip with comments), SC-26 (idempotent `--fix`), SC-27 (plain JSON behavior unchanged), SC-28 (workspace-file diagnostic emits oc:// URI).
