---
pulse: 10
slug: scope-flip-internal
plan: claws-openclaw-upstream
checkpoint: cp-5
depends_on: [04, 05, 06, 07, 08, 09]
governing_roles: [claws:claws-release-eng, claws:claws-repo-steward]
addresses_findings: [B1 from R1-consolidated]
addresses_headlines: [H1, H2, H3, H4]
---

# Pulse 10 · Internal Scope-Flip — `@bic/openclaw-*` → `@openclaw/*`

## Objective

Rename `@bic/openclaw-{workspace,guardrails,policy,snap}` → `@openclaw/{workspace,guardrails,policy,snap}` across this monorepo. Lands AFTER all four upstream package PRs merge (PR-1, PR-2, PR-4, PR-5) and BEFORE any `@openclaw/*` npm publish — closes the transient versioning gap per HC-BLOCK B1 from R1-consolidated.

This pulse is INTERNAL to our monorepo; not an upstream PR.

## Deliverables

### Package renames
- [ ] `packages/openclaw-workspace/package.json` — `name: '@bic/openclaw-workspace'` → `'@openclaw/workspace'`
- [ ] `packages/openclaw-guardrails/package.json` — same rename
- [ ] `packages/openclaw-policy/package.json` — same rename
- [ ] `packages/openclaw-snap/package.json` — same rename
- [ ] `packages/openclaw-lsp/package.json` — same rename (LSP package was carried along; ships with workspace)

### Cross-package import updates
- [ ] All `import ... from '@bic/openclaw-workspace'` → `'@openclaw/workspace'` across:
  - `packages/openclaw-guardrails/src/`, `tests/`
  - `packages/openclaw-policy/src/`, `tests/`
  - `packages/openclaw-snap/src/`, `tests/`
  - `packages/openclaw-lsp/src/`, `tests/`
  - `packages/claws-sdk/src/`, `tests/` (if any)
  - `packages/claws-serve/src/`, `tests/`
  - `packages/claws/src/`, `tests/`
  - `packages/claws-test/src/`, `tests/`
- [ ] Same for `@bic/openclaw-guardrails`, `@bic/openclaw-policy`, `@bic/openclaw-snap`, `@bic/openclaw-lsp`
- [ ] Subpath imports preserved: `'@openclaw/workspace/canonicalize'`, `'@openclaw/guardrails/audit'`, etc.

### Workspace + tsconfig + test config
- [ ] Root `package.json` `workspaces` array — entries unchanged (paths remain `packages/openclaw-*`)
- [ ] `tsconfig.json` path mappings updated if present (e.g., `compilerOptions.paths`)
- [ ] vitest configs / aliases updated if any reference `@bic/openclaw-*`

### Lockfile
- [ ] `package-lock.json` (or `pnpm-lock.yaml`, depending on workspace) regenerated post-rename

### CI verification
- [ ] `npm run build` (workspace-wide) green
- [ ] `npm run test` (workspace-wide) green
- [ ] `npm run typecheck` green if defined
- [ ] No leftover `@bic/openclaw-` references: `grep -r "@bic/openclaw" packages/ --include="*.ts" --include="*.json"` returns zero

### Internal CHANGELOG
- [ ] `docs/upstream/CHANGELOG.md` — append v0.2 closeout entry recording: 4 upstream PR merge SHAs + scope-flip commit SHA + post-rename build SHA

## TDD Tests

No new tests — this is a textual refactor. Verification = full workspace test suite still green after rename.

## Verification Gate

```bash
# HARD DEPENDENCY: all four upstream package PRs merged
for pr in <PR-1> <PR-2> <PR-4> <PR-5>; do
  gh api repos/openclaw/openclaw/pulls/$pr --jq '.merged' | grep -q true \
    || (echo "BLOCKING: PR-$pr not merged"; exit 1)
done

# Local validation
cd /c/src/claws

# Pre-rename: confirm everything green
npm run build && npm run test \
  || (echo "Pre-rename baseline NOT green; halt"; exit 1)

# Apply renames (scripted; not by hand to avoid drift)
node scripts/scope-flip.mjs --from "@bic/openclaw-" --to "@openclaw/"

# Post-rename: confirm no leftover @bic/openclaw- references
grep -r "@bic/openclaw" packages/ --include="*.ts" --include="*.json" --include="*.tsx" \
  && (echo "LEFTOVER @bic/openclaw- references"; exit 1) \
  || echo "Rename clean"

# Post-rename: full workspace build + test
rm -rf node_modules package-lock.json
npm install
npm run build
npm run test
npm run typecheck
```

## Post-pulse

Internal commit; record in `docs/upstream/CHANGELOG.md` as the closeout entry. With this pulse landed, all four headlines (H1–H4) resolve TRUE on this monorepo's main + four upstream merge SHAs, and the wave is ready for closeout (record + delivery stages).

## Key Constraints

- This pulse is INTERNAL — no upstream PR.
- Scripted rename via `scripts/scope-flip.mjs` is preferred over hand-editing to avoid drift across the ~20 packages × N import sites.
- Lockfile regeneration is mandatory; `npm install` after rename to make sure the workspace resolves correctly.
- If npm publish (separate follow-up plan) happens before this pulse lands, internal lockfiles still point at `@bic/*` while npm has `@openclaw/*` — exactly the transient gap B1 warns about. This pulse PRECEDES any publish.

## Contingency (per pulse-review R1 W9)

The implicit contract is "all 7 upstream PRs merge → scope-flip happens." Reality is messier — bot-reviewer auto-close, maintainer-requested splits, multi-week reviews, or rejections-for-unrelated-reasons can leave one or more upstream PRs unmerged.

**Decision matrix at scope-flip time:**

| State | Action |
|---|---|
| All 4 package PRs (PR-1, PR-3, PR-5, PR-6) merged | Run scope-flip (all 4 packages renamed in one commit) |
| 3 of 4 package PRs merged, 1 deferred upstream (e.g., needed split per maintainer) | Run scope-flip on the 3 merged packages; record deferred package in `docs/upstream/CHANGELOG.md` as "scope-flip skipped: package not yet upstream" |
| 2 or fewer package PRs merged | DO NOT run scope-flip. Defer the entire pulse to the next wave. Record state in `docs/upstream/CHANGELOG.md`. |
| OC-4 (PR-2) or OC-7 (PR-4) deferred | No effect on scope-flip — these are upstream-internal patches, not package renames |

**Recording**: every scope-flip attempt (whether full, partial, or deferred) appends an entry to `docs/upstream/CHANGELOG.md` with the date, the four package PR merge SHAs (or "(deferred)"), and the scope-flip commit SHA (or "(deferred)"). This gives the next wave's planner a clean state to resume from.

## Scenario codes addressed

None directly — but resolves H1–H4 as TRUE for the monorepo since the rename is what completes "lives in @openclaw" semantically.
