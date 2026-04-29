---
pulse: 06
slug: pr3-openclaw-guardrails
plan: claws-openclaw-upstream
checkpoint: cp-3
depends_on: [01, 04, 05]
governing_roles: [claws:ciso, claws:compliance, claws:gateway-eng, claws:claws-release-eng]
addresses_findings: [F-38, F-39, F-40, F-41, F-42, F-44, F-45, F-46, F-47, F-48, F-49, F-57, F-58, F-59, F-60, F-61, B3, W6]
addresses_headlines: [H2]
---

# Pulse 06 · PR-2 — `@openclaw/guardrails` Upstream PR

## Objective

Open PR-2 against `github.com/openclaw/openclaw` adding `@openclaw/guardrails` (GuardrailProvider + FileIngestProvider peer interfaces + 6 runtime subpaths: `/audit`, `/approvals`, `/budget`, `/identity`, `/siem`, `/secrets`). HARD DEPENDENCY: pulse 01 (adapter-audits.md) must publish the audit-stream wire-shape mapping FIRST per HC-BLOCK F-38.

## Deliverables

### Upstream PR
- [ ] PR-2 opened at `github.com/openclaw/openclaw` with title: `feat: add @openclaw/guardrails (GuardrailProvider + FileIngestProvider + 6 runtime subpaths)`
- [ ] PR description leads with core-not-extension justification: "governance must be core because adversarial-plugin defense requires gateway-level enforcement"
- [ ] PR description embeds bot-preempt checklist + CITES `docs/upstream/guides/adapter-audits.md` § 3 (audit-stream wire-shape) verdict
- [ ] `packages/openclaw-guardrails/` content copied + renamed from our `@bic/openclaw-guardrails`
- [ ] Subpath exports preserved: `/audit`, `/approvals`, `/budget`, `/identity`, `/siem`, `/secrets`, `/handle-binding`
- [ ] `peerDependencies`: `@openclaw/workspace` (version pinned to PR-1 merge SHA-derived release tag)
- [ ] `package.json` `name` flipped to `@openclaw/guardrails`; license `MIT`

### Audit-attribution invariant (per W6 / amendment §6)
- [ ] `AuditEntrySummary.sourcePluginId: string` is NON-OPTIONAL
- [ ] `ProviderRegistryImpl.postAudit()` overrides plugin-supplied `sourcePluginId` with authenticated caller's id
- [ ] Plugin-supplied attribution treated as hint, not ground truth (adversarial-plugin defense per amendment §6.3)
- [ ] Lenient mode flag (`--lenient`) accepts pre-v0.2 audit entries without `sourcePluginId`; default is strict

### Approval lifecycle audit events (per W3 / amendment §5)
- [ ] Every approval handle emits `approval_issued` at issue time
- [ ] Resolution emits `approval_resolved` with `resolution: 'approved' | 'denied' | 'modified'`
- [ ] TTL expiry without resolution emits `approval_expired` with `wasUsed: false`
- [ ] All three events flow into the hash-chained audit log

### CI / public-API obligations
- [ ] `docs/.generated/plugin-sdk-api-baseline.sha256` refreshed
- [ ] `docs/sdk-overview.md` table updated with new package
- [ ] No Swift protocol model changes expected (no gateway protocol surface)
- [ ] CHANGELOG entry appended at end-of-section
- [ ] Zero `@microsoft/*` import gate green (CI-enforced)

### Internal verification before pushing
- [ ] `pnpm --filter @openclaw/guardrails test` green
- [ ] `pnpm --filter @openclaw/guardrails build` green
- [ ] `pnpm --filter @openclaw/guardrails tsc --noEmit` green

## TDD Tests

- L0 unit (`packages/openclaw-guardrails/tests/unit/`):
  - Hash-chain append + verify on N=1, 10, 1000 events (3 tests, F-57)
  - Tamper-detection at exact tampered index (1 test, F-58)
  - `sourcePluginId` rejected when missing in strict mode (1 test, W6)
  - `sourcePluginId` overridden at `postAudit()` boundary (1 test, W6 + adversarial defense)
  - Approval handle replay rejected: same bytes, different `contentHash`, past TTL (3 tests, F-59, F-60)
  - Rotated `keyId` accepted in grace window, rejected outside (1 test, F-61)
- L1 integration (`packages/openclaw-guardrails/tests/integration/`):
  - Audit-stream round-trip through CEF / NDJSON / syslog / SARIF; re-parse identical to original (4 tests, F-38)
  - Approval lifecycle: issued → resolved emits both events (1 test, W3)
  - Approval lifecycle: issued → TTL expires → expired event emitted (1 test, W3)
  - `--verify` flag for `snap export` re-verifies chain before formatting (1 test, F-42)

## Verification Gate

```bash
# HARD DEPENDENCY: confirm adapter-audits.md is published with audit-stream § 3
test -s "docs/upstream/guides/adapter-audits.md" && \
  grep -q "audit-stream wire-shape audit" "docs/upstream/guides/adapter-audits.md" && \
  grep -q "PR-2 hard dependency" "docs/upstream/guides/adapter-audits.md" \
  || (echo "BLOCKING: adapter-audits.md § 3 missing or incomplete"; exit 1)

# HARD DEPENDENCY: confirm Wave A merged
gh api repos/openclaw/openclaw/pulls/<PR-1-NUMBER> --jq '.merged' | grep -q true \
  || (echo "BLOCKING: PR-1 not merged"; exit 1)

# Local validation
pnpm --filter @openclaw/guardrails build
pnpm --filter @openclaw/guardrails test
pnpm --filter @openclaw/guardrails tsc --noEmit

# Bot-preempt pre-flight
grep -iE "(third.?party|extension|skill|clawhub)" PR-2-DESCRIPTION.md \
  && (echo "AUTO-CLOSE RISK"; exit 1) || echo "PR description clear"

# Open the PR
gh pr create --repo openclaw/openclaw \
  --title "feat: add @openclaw/guardrails (GuardrailProvider + FileIngestProvider + 6 runtime subpaths)" \
  --body-file PR-2-DESCRIPTION.md
```

## Post-merge

Pulse 03 verification. Confirm hash-chain integrity test + approval-handle replay-resistance test + zero-`@microsoft/*` gate all green on trunk before pulse 07 (PR-3) opens.

## Key Constraints

- HARD DEPENDENCY chain: pulse 01 (adapter-audits.md) + Wave A merge → pulse 06 → pulse 07
- Audit-stream wire-shape mapping is the single largest integration risk; bot-reviewers (especially Greptile) will read it carefully
- Adversarial-plugin defense (§6.3) is a recurring bot-reviewer pattern category — make it explicit in the PR description

## Scenario codes addressed

SC-11 (audit-stream adapter), SC-16 (audit append-verify), SC-17 (approval handle replay-resistance), partial SC-12 (runtime-gated enforcement requires PR-4's policy plugin too).
