---
pulse: 08
slug: pr5-oc7-conjunctive-merger
plan: claws-openclaw-upstream
checkpoint: cp-4
depends_on: [01, 04, 05, 06, 07]
governing_roles: [claws:gateway-eng, claws:ciso, claws:claws-release-eng]
addresses_findings: [F-17, F-18, F-19, F-20, F-21, F-22, F-23, F-24, F-25, OC7-001..005, OC7-CR-001..004]
addresses_headlines: [H5]
---

# Pulse 08 · PR-5 — OC-7 `requireApproval` Conjunctive Merger

## Objective

Open PR-4 against `github.com/openclaw/openclaw` modifying `src/plugins/hooks.ts:889-893`: replace `??` (nullish coalesce, drops downstream approvals) with array accumulation. Field type at `src/plugins/hook-types.ts:402-410` bumps from `ApprovalDescriptor` to `ApprovalDescriptor | ApprovalDescriptor[]`. Conjunctive (AND) semantics across the plugin chain. Includes try/catch wrapper at plugin invocation site for crash-safety per F-22.

## Deliverables

### Upstream PR
- [ ] PR-4 opened at `github.com/openclaw/openclaw` with title: `fix(plugins): make requireApproval conjunctive across plugin chain (replace ?? with array accumulation)`
- [ ] PR description leads with core-not-extension justification: "approval merger semantics are core gateway behavior; cannot be moved to extension without breaking the chain-of-custody invariant for R5 + RESTRICTED tools"
- [ ] PR description embeds bot-preempt checklist
- [ ] PR description includes upgrade note for downstream consumers (the codemod migration)

### Code change
- [ ] `src/plugins/hooks.ts:889-893` — `??` replaced with array accumulation (~5 lines)
- [ ] `src/plugins/hook-types.ts:402-410` — `requireApproval` type widened to `ApprovalDescriptor | ApprovalDescriptor[]`
- [ ] Plugin invocation site wrapped in try/catch (per F-22 crash-safety): if a plugin throws after appending `requireApproval`, prior approvals survive; the throw is logged with `sourcePluginId` and the merger continues with remaining plugins
- [ ] Merger emits `plugin_invocation_failed` audit event for crashed plugins (per F-24)
- [ ] Spec-declared resolution path (per F-23): "plugin throw isolates that plugin; prior `requireApproval` descriptors survive; downstream plugins still run; final hook-result is conjunctive AND of all surviving descriptors" — documented in upstream's plugin-merger spec or hooks.ts docstring

### Migration codemod note
- [ ] CHANGELOG entry includes "## Migration: requireApproval array adoption" subsection
- [ ] Codemod note: consumers reading `hook-result.requireApproval` as a single object should now coerce: `Array.isArray(x) ? x : x ? [x] : []`
- [ ] Note emphasizes: NO boolean was ever in scope — this is array adoption from single object, NOT field-widening from boolean

### Tests
- [ ] `src/plugins/__tests__/hooks-merger.test.ts` — new tests:
  - Three-plugin merger collects all `requireApproval` descriptors (F-17)
  - Plugin-A appends approval, plugin-B throws, plugin-A's approval survives (F-22)
  - Plugin-B throw emits `plugin_invocation_failed` audit entry with `sourcePluginId` (F-24)
  - Conjunctive AND: supervisor must approve every descriptor (F-21)
  - Companion app receives array of `ApprovalDescriptor` not single (F-20)
- [ ] Existing tests asserting "first-wins" must update — break is the proof (F-19)

### CI / public-API obligations
- [ ] `docs/.generated/plugin-sdk-api-baseline.sha256` refreshed (hook-types.ts is public surface)
- [ ] `docs/sdk-overview.md` table NOT changed (existing entry; only field shape changed)
- [ ] Swift protocol models regenerated for the gateway hook-result envelope shape change (per F-15) — at `apps/macos/Sources/OpenClawProtocol/GatewayModels.swift` and `apps/shared/OpenClawKit/Sources/OpenClawProtocol/GatewayModels.swift`
- [ ] CHANGELOG entry appended at end-of-section, includes migration codemod note

### Internal verification before pushing
- [ ] All upstream tests in `src/plugins/__tests__/` pass
- [ ] `pnpm tsc --noEmit` green
- [ ] Internal consumers (`@bic/openclaw-policy`, `@bic/openclaw-snap`) compile against widened field type — codemod gate per W1

## TDD Tests

- L1 integration (`openclaw-core/src/plugins/__tests__/`):
  - Three-plugin conjunctive collection (F-17)
  - Plugin-B throw isolation: plugin-A's approval survives (F-22)
  - `plugin_invocation_failed` audit on crash (F-24)
  - Companion array shape (F-20)
  - Supervisor must approve all (F-21)
- L0 unit:
  - Type widening: ApprovalDescriptor accepted, ApprovalDescriptor[] accepted (F-18)
  - Try/catch wrapper at right granularity (per-plugin, not per-batch — F-25)

## Verification Gate

```bash
# HARD DEPENDENCY: confirm Wave A merged
gh api repos/openclaw/openclaw/pulls/<PR-1-NUMBER> --jq '.merged' | grep -q true \
  && gh api repos/openclaw/openclaw/pulls/<PR-2-NUMBER> --jq '.merged' | grep -q true \
  || (echo "BLOCKING: Wave A not fully merged"; exit 1)

# Codemod gate (per W1) — internal consumers compile against widened field type LOCALLY first
cd /c/src/claws
pnpm --filter @bic/openclaw-policy tsc --noEmit \
  && pnpm --filter @bic/openclaw-snap tsc --noEmit \
  || (echo "Codemod gate FAILED: internal consumers don't accept widened field"; exit 1)

# Upstream local validation
cd /c/src/openclaw-core
git checkout -b fix/oc7-conjunctive-merger
# ... apply 5-line change to src/plugins/hooks.ts:889-893
# ... apply field-widening to src/plugins/hook-types.ts:402-410
# ... add tests + try/catch wrapper
pnpm test src/plugins/__tests__/
pnpm tsc --noEmit

# Regenerate Swift models (per F-15)
# ... command per upstream's regen script

# Bot-preempt pre-flight
grep -iE "(third.?party|extension|skill|clawhub)" PR-4-DESCRIPTION.md \
  && (echo "AUTO-CLOSE RISK"; exit 1) || echo "PR description clear"

# Open the PR
gh pr create --repo openclaw/openclaw \
  --title "fix(plugins): make requireApproval conjunctive across plugin chain (replace ?? with array accumulation)" \
  --body-file PR-4-DESCRIPTION.md
```

## Post-merge

Pulse 03 verification. Confirm merger conjunctive test green on trunk; codemod gate validates internal consumers; record merge SHA.

## Key Constraints

- 2-PRs-open culture: PR-3 + PR-4 open simultaneously (Wave B). PR-5 / PR-6 cannot open until both merge.
- Surgical scope: ~5 lines source + try/catch + tests + Swift models + codemod note. Anything wider triggers reviewer pushback.
- Codemod gate (W1) is mandatory: PR-5 / PR-6 build against trunk's widened field; if our internal consumers don't compile, halt before opening Wave C.

## Scenario codes addressed

SC-06 (OC-7 conjunctive merger), SC-07 (OC-7 crash-safety / W7).
