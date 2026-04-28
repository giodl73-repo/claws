---
pulse: 06
slug: pr3-oc4-stripfrontmatter
plan: claws-openclaw-upstream
checkpoint: cp-3
depends_on: [01, 04, 05]
governing_roles: [claws:gateway-eng, claws:claws-release-eng]
addresses_findings: [F-50, F-51, OC4-001, OC4-002]
addresses_headlines: [H5]
---

# Pulse 06 · PR-3 — OC-4 stripFrontMatter Raw-Preserve

## Objective

Open PR-3 against `github.com/openclaw/openclaw` modifying `src/agents/workspace.ts:91` `stripFrontMatter()` to preserve original bytes under a sibling `raw` key. Surgical change (~1 line). Non-breaking. Required for governance round-trip on templated SOUL.md / TOOLS.md.

## Deliverables

### Upstream PR
- [ ] PR-3 opened at `github.com/openclaw/openclaw` with title: `fix(workspace): preserve original bytes in stripFrontMatter for round-trip`
- [ ] PR description leads with core-not-extension justification (governance round-trip is core; alternative would be a third-party fork)
- [ ] PR description includes filled-out bot-preempt checklist
- [ ] `src/agents/workspace.ts:91` modified: returned object gains `raw: string` field with original input bytes (sibling to `content` and `frontMatter`)
- [ ] Existing call sites unchanged (they read `.content`, ignore new `.raw`)

### Test
- [ ] `src/agents/__tests__/workspace.test.ts` — new test: round-trip on templated SOUL.md emits byte-identical bytes via `result.raw`
- [ ] Existing tests still pass (non-breaking)

### CI / public-API obligations
- [ ] CHANGELOG entry appended at end-of-section
- [ ] No baseline hash refresh expected (internal helper, not exported public API — but verify with bot-preempt checklist anyway)
- [ ] No sdk-overview table change expected

### Internal verification before pushing
- [ ] `pnpm test src/agents/__tests__/workspace.test.ts` green
- [ ] `pnpm tsc --noEmit` green
- [ ] No new diagnostic codes introduced

## TDD Tests

- L0 unit (`openclaw-core/src/agents/__tests__/workspace.test.ts`):
  - stripFrontMatter on input with frontmatter → returned object has `raw === input` (F-50)
  - stripFrontMatter on input WITHOUT frontmatter → returned object has `raw === input` (no-op preserved, F-50)
  - Existing assertions on `.content` and `.frontMatter` shape still pass (F-51, non-breaking)

## Verification Gate

```bash
cd /c/src/openclaw-core
git checkout -b fix/oc4-strip-frontmatter-raw
# ... make 1-line change to src/agents/workspace.ts:91
# ... add test to src/agents/__tests__/workspace.test.ts
pnpm test src/agents/__tests__/workspace.test.ts
pnpm tsc --noEmit

# Bot-preempt pre-flight
grep -iE "(third.?party|extension|skill|clawhub)" PR-3-DESCRIPTION.md \
  && (echo "AUTO-CLOSE RISK"; exit 1) || echo "PR description clear"

# Open the PR
git push -u origin fix/oc4-strip-frontmatter-raw
gh pr create --repo openclaw/openclaw \
  --title "fix(workspace): preserve original bytes in stripFrontMatter for round-trip" \
  --body-file PR-3-DESCRIPTION.md
```

## Post-merge

Run pulse 03's post-merge verification runbook. Capture merge SHA. Confirm OC-4 regression test green on trunk before declaring H5 partial.

## Key Constraints

- 2-PRs-open culture: PR-1 + PR-3 open simultaneously (Wave A). PR-3 / PR-4 cannot open until both Wave A PRs MERGE.
- Surgical scope: ~1 line of source + 1 test + CHANGELOG. Anything larger triggers reviewer pushback.
- Field name `raw` is the proposed convention; if reviewers prefer alternative (e.g., `original`, `bytes`), accept and update internal consumers.

## Scenario codes addressed

SC-13 (OC-4 stripFrontMatter round-trip).
