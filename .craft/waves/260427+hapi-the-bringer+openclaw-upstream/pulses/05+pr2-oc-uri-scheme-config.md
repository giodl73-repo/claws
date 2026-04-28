---
pulse: 05
slug: pr2-oc-uri-scheme-config
plan: claws-openclaw-upstream
checkpoint: cp-2
depends_on: [01, 02, 03]
governing_roles: [claws:gateway-eng, claws:claws-release-eng, claws:claws-repo-steward]
addresses_findings: [URI vocabulary unification per user direction 2026-04-27; consumed by PR-4 audit citations + PR-6 policy diagnostics + PR-7 snap resolve endpoint]
addresses_headlines: [H1]
---

# Pulse 05 · PR-2 — `oc://` URI Scheme Extension to Runtime Config

## Objective

Extend the `oc://` URI scheme to address openclaw's runtime config alongside workspace files. After this PR, `oc://config/channels/matrix/accessToken` is a valid, machine-parseable address — symmetric with `oc://TOOLS.md/Tools/send-email/args_from`. Doctor's existing config-mutation paths (the 14-commits-per-3-months `doctor-legacy-config.migrations.test.ts` file and friends) cite URI locations in their diagnostics. Bridges the framing from "oc:// addresses workspace files" → "oc:// is the unified addressing vocabulary across workspace + runtime config."

**The pitch (PR description hook):**
> PR-1 introduced workspace-file diagnostics that cite `oc://...` URIs. This PR extends the scheme to address runtime config too: `oc://config/channels/matrix/accessToken` is the same kind of stable, machine-parseable address that an editor LSP, an audit log entry, a doctor diagnostic, and a future `snap resolve --uri` endpoint can all consume natively. One vocabulary, every surface.

## Deliverables

### Scheme extension
- [ ] `@openclaw/workspace/path` — `parseOcUri()` and `formatOcUri()` recognize the `oc://config/...` form alongside the existing `oc://{file}/...` form
- [ ] Path semantics for config: `oc://config/{section}[/{key}[/{subkey}]]` — e.g., `oc://config/channels/matrix/accessToken` resolves to the corresponding leaf in the OpenClawConfig tree
- [ ] Spec amendment to UG-upstream v0.2 (lands as part of cp-1 deliverable, NOT in this PR's spec dir; this PR consumes it): NEW §X "URI scheme: workspace + runtime config" formalizes the dual addressing modes

### `oc://config/...` resolver (in `@openclaw/workspace/path`)
- [ ] `resolveConfigUri(uri, configRoot)` — walks the OpenClawConfig object tree following the URI path; returns `{ value, parentNode, leafKey, found: bool }`
- [ ] Errors structured: `OC_CONFIG_PATH_NOT_FOUND`, `OC_CONFIG_PATH_AMBIGUOUS`, `OC_CONFIG_PATH_INVALID`
- [ ] Handles arrays (e.g., `oc://config/channels/matrix/account-allowlist/0`) per JSONPath-ish convention

### Doctor diagnostic citations (config-side)
- [ ] `src/commands/doctor-config-flow.ts` and `src/commands/doctor-legacy-config.migrations.ts` (and other migrations) emit diagnostics with `oc://config/...` location URIs
- [ ] Backward compat: existing `{file, line}` form still accepted; both shapes are valid in the unioned diagnostic location type from PR-1
- [ ] LSP / console renderers updated to render URI locations identically to workspace-file URIs

### Snap HTTP resolve endpoint extension (preview; finalized in PR-7)
- [ ] Note in PR description: PR-7's `GET /v1/resolve?uri=oc://...` will accept BOTH workspace and config URIs once snap lands; this PR enables the URI form

### CI / public-API obligations
- [ ] `docs/.generated/plugin-sdk-api-baseline.sha256` refreshed (path/parser export surface adds the config-form)
- [ ] `docs/sdk-overview.md` table updated with the URI-vocabulary entry
- [ ] CHANGELOG entry appended at end-of-section
- [ ] No Swift protocol model changes (URIs are strings)

### Internal verification before pushing
- [ ] `pnpm --filter @openclaw/workspace test` green (URI parser tests)
- [ ] `pnpm test src/commands/doctor-config-flow.test.ts` green (doctor diagnostics use new URI form)
- [ ] `pnpm test src/commands/doctor-legacy-config.migrations.test.ts` green (the hot file — 14 commits/3mo)
- [ ] `pnpm tsc --noEmit` green

## TDD Tests

### L0 unit (`packages/openclaw-workspace/tests/unit/path-config-uri.test.ts`)
- `parseOcUri('oc://config/channels/matrix/accessToken')` returns the right structured object
- `formatOcUri({ kind: 'config', path: ['channels', 'matrix', 'accessToken'] })` round-trips
- `oc://config/channels/matrix/account-allowlist/0` → array index handled
- Malformed URIs rejected with structured error codes
- `resolveConfigUri()` walks an OpenClawConfig fixture; returns `{ value, parentNode, leafKey, found }`
- `resolveConfigUri()` on missing path → `{ found: false, ... }` not exception
- `resolveConfigUri()` on ambiguous path (e.g., wildcards if any) → `OC_CONFIG_PATH_AMBIGUOUS`

### L1 integration (upstream)
- `doctor-config-flow` migration emits a diagnostic with `oc://config/...` location; assert location field is the parsed URI
- `doctor-legacy-config.migrations` (the hot path) — fixture-driven test that the migration's diagnostic cites a stable `oc://config/...` URI
- LSP-renderer consumption: existing console renderer renders both `{file, line}` and `oc://...` locations correctly

### L2 e2e
- End-to-end `openclaw doctor --json`: output includes `oc://config/...` URIs in diagnostic locations; downstream parser (e.g., a CI tool) can consume them

## Verification Gate

```bash
# HARD DEPENDENCY: PR-1 in flight or merged (PR-2 builds on PR-1's diagnostic-shape extension)
gh api repos/openclaw/openclaw/pulls/<PR-1-NUMBER> --jq '.state' | grep -qE '(open|merged)' \
  || (echo "BLOCKING: PR-1 must be at least open"; exit 1)

# Local validation
pnpm --filter @openclaw/workspace build
pnpm --filter @openclaw/workspace test
cd /c/src/openclaw-core
pnpm test src/commands/doctor-config-flow.test.ts
pnpm test src/commands/doctor-legacy-config.migrations.test.ts
pnpm tsc --noEmit

# Round-trip URI proof
node -e "
  const { parseOcUri, formatOcUri } = require('@openclaw/workspace/path');
  const input = 'oc://config/channels/matrix/accessToken';
  const parsed = parseOcUri(input);
  const reformat = formatOcUri(parsed);
  if (reformat !== input) { console.error('Round-trip lossy'); process.exit(1); }
  console.log('URI round-trip clean');
"

# Bot-preempt pre-flight
grep -iE "(third.?party|extension|skill|clawhub)" PR-2-DESCRIPTION.md \
  && (echo "AUTO-CLOSE RISK"; exit 1) || echo "PR description clear"

# Open the PR
gh pr create --repo openclaw/openclaw \
  --title "feat(workspace): extend oc:// URI scheme to address runtime config (oc://config/...)" \
  --body-file PR-2-DESCRIPTION.md
```

## Post-merge

Pulse 03 verification. Confirm `oc://config/...` URIs appear in `openclaw doctor --json` output. Capture merge SHA. Wave A complete.

## Key Constraints

- **Conceptually independent of PR-1** — they pair cleanly: PR-1 = lossless config emit, PR-2 = URI scheme extension. Reviewers can chew on each separately.
- **PR-1 must be at least OPEN** before PR-2 opens — PR-2 builds on PR-1's diagnostic-shape extension.
- **No new top-level CLI verb** — pure scheme + parser + diagnostic-citation work. Avoids the bot-reviewer concern about new CLI surface.
- **Spec amendment locks the dual-addressing mode** — must be in cp-1's adapter-audits.md or UG-upstream amendment v0.2 BEFORE this PR opens, so reviewers see the formalization.

## Scenario codes addressed

NEW: SC-29 (oc://config URI parser round-trip), SC-30 (doctor migration diagnostic emits config URI), SC-31 (LSP / console renderer accepts both location forms), SC-32 (`resolveConfigUri()` correctness on OpenClawConfig fixture).
