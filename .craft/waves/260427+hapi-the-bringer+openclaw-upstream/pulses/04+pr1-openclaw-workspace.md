---
pulse: 04
slug: pr1-openclaw-workspace
plan: claws-openclaw-upstream
checkpoint: cp-2
depends_on: [01, 02, 03]
governing_roles: [claws:gateway-eng, claws:claws-release-eng, claws:claws-repo-steward]
addresses_findings: [F-52, F-53, F-54, F-55, F-56, F-76, F-77, F-78, F-79, F-80, F-81, F-82, F-83, F-84, F-85, F-86, F-87, F-93, F-94, F-98, F-99, F-100, F-101, churn data on doctor-legacy-config.migrations]
addresses_headlines: [H1]
---

# Pulse 04 · PR-1 — `@openclaw/workspace` + `replaceConfigFile` Lossless Conversion

## Objective

Open PR-1 against `github.com/openclaw/openclaw` adding `@openclaw/workspace` (subpaths `/path` for oc:// URIs, `/ast` for PEG grammars + lossless emitters incl. JSONC, `/canonicalize` for RFC 8785 JCS) AND wholesale-converting `src/config/io.ts:replaceConfigFile` from `JSON.stringify(_, null, 2)` to lossless `parse → mutate → emit` via `@openclaw/workspace/ast`. Each subpath earns its keep in the same PR.

**The pitch (PR description hook):**
> Today: every `openclaw update` reformats your config via `JSON.stringify(config, null, 2)` (`config/io.ts:1381`, `config/io.ts:2082`). Comments stripped. Key ordering reset. Indentation forced to 2-space. After this PR: `update` (and every other path through `replaceConfigFile`) round-trips your config through `@openclaw/workspace/ast` — comments, ordering, indentation all preserved across upgrades. Migration is at one chokepoint, not scattered fixers. The AST + emit substrate is then available to migrate any other format-mutation path the same way (e.g., `doctor-legacy-config.migrations` — 14 commits in the last 3 months).

## Deliverables

### `@openclaw/workspace` package
- [ ] `packages/openclaw-workspace/` content copied + renamed from our `@bic/openclaw-workspace`
- [ ] Subpath exports preserved: `/path`, `/ast`, `/canonicalize`, `/staging`, `/path-canonical`
- [ ] **`/ast` includes a JSONC grammar** (covers today's openclaw config files; preserves comments, key ordering, indentation, blank-line layout)
- [ ] `peerDependencies`: none (workspace has zero openclaw-side deps)
- [ ] `package.json` `name` flipped to `@openclaw/workspace`; license `MIT`

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
- [ ] Runtime-config diagnostics still emit `{file, line}` for now (PR-2 will extend the scheme to cover them)
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

### L0 unit (`packages/openclaw-workspace/tests/unit/`)
- oc:// URI parser: malformed inputs, escape rules, query params (3 tests)
- PEG AST round-trip per WorkspaceFileKind: SOUL/TOOLS/AGENTS/IDENTITY/USER/SKILL (6 tests, F-54)
- **JSONC parse + emit round-trip**: comments preserved, key order preserved, indent preserved (3 tests — the headline invariants)
- Trailing whitespace + list-marker style preserved (1 test, F-55)
- Frontmatter ordering preserved (1 test, F-56)

### L1 integration (`packages/openclaw-workspace/tests/integration/`)
- Cross-OS canonicalize CI matrix: same input → byte-identical SHA-256 on Linux / macOS / Windows (1 matrix, F-52)
- CRLF → LF line-ending normalization before JCS (1 test, F-53)

### L1 integration (upstream — landing in PR-1)
- **`replaceConfigFile` round-trip with comments**: input is JSONC config with `// comments` and custom indentation; one field mutated; output preserves all comments + ordering + indent except the changed field (1 test — THE invariant)
- **`replaceConfigFile` plain JSON behavior unchanged**: input has no comments, default 2-space indent; output is byte-identical to today's stringify result (1 test — backward compat proof)
- **`doctor --fix` idempotency**: run `--fix` twice on a clean config; second run = byte-zero diff (1 test, idempotency invariant)
- **`openclaw update` end-to-end with comments**: stub or fixture-driven simulation of a config-mutation flow; user comments survive the round-trip (1 test)

### L2 e2e
- Workspace-file diagnostic emitter cites `oc://` URI: hand-craft a parse error in TOOLS.md; assert diagnostic location is `oc://TOOLS.md/...` (1 test)

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

Run pulse 03's post-merge verification runbook against trunk. Capture merge SHA. Confirm H1 validators GREEN before pulse 06 opens PR-3 (OC-4) — and especially confirm the comment-preservation invariant holds on trunk.

## Key Constraints

- **High blast radius**: `replaceConfigFile` is the chokepoint. Reviewers will scrutinize. Strong test coverage of the existing JSON-without-comments case is mandatory (zero behavior change for the common path).
- **JSONC grammar must be lossless**: parse-emit on user comments preserves byte-for-byte. This is the headline invariant; everything else follows from it.
- **PR-1 + PR-2 open simultaneously** (Wave A 2-PR pairing). They're conceptually independent (PR-1 = lossless emit; PR-2 = scheme extension), so reviewers can chew on both without dependency interlock.
- **The pitch in the PR description must lead with delight**, not with technical detail. "Your config comments survive `openclaw update` now" is the hook.

## Scenario codes addressed

SC-14 (canonicalize cross-OS), SC-15 (AST round-trip), plus NEW scenarios for the conversion: SC-25 (JSONC round-trip with comments), SC-26 (idempotent `--fix`), SC-27 (plain JSON behavior unchanged), SC-28 (workspace-file diagnostic emits oc:// URI).
