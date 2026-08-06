---
pulse: 8
slug: security-hardening-trust
plan: claws-protect
depends_on: [5]
governing_roles: [claws:ciso, claws:founder]
scenario_codes: [a2a-governance/S01, a2a-governance/S02, a2a-governance/S03]
stage: implementation
test_tiers:
  L0_unit: 6
  L1_integration: 2
  L2_e2e: 1
  L3_accept: 1
test_scope:
  run:
    - "cd claws-sdk && npx vitest run"
  typecheck:
    - "cd claws-sdk && npx tsc --noEmit"
checkpoint: 1
checkpoint_gate: false
---

# Pulse 08: Security Hardening — Trust Model Integrity

## Objective

Address four THOTH-FINDINGS related to trust model integrity:

**D-01 (amendment can lower trust tier):** The current amendment validation does not enforce monotonic trust tier progression. A malicious or misconfigured amendment could lower a workspace's trust tier from T4 to T2, effectively downgrading security guarantees. Fix: add `newTier >= existingTier` assertion at the amendment boundary in the validation module.

**C-01 (raise-only loophole for LLM gap-fills):** When the LLM extracts intents that have no regex baseline (gap-fill scenario), the raise-only rule doesn't apply because there's no baseline to raise from. An LLM could assign R1 to a tool that should be R3+. Fix: add a minimum risk floor of R2 for all LLM-only gap-fill intents — if the LLM is the sole source for an intent with no regex baseline, the risk tier is at least R2. The R2 floor applies in TWO cases: (a) no regex pattern exists for this tool, AND (b) a regex pattern exists but did not match this specific invocation. Both cases result in LLM-only classification which gets the R2 floor. A tool that has a regex baseline at R5 but dodges the regex via unusual arguments still gets clamped to max(LLM_result, R2), not the full R5 from the regex.

**C-03 (broadcast trust-compat only checks trustTier):** The fleet broadcast trust-compatibility check only verifies that the target workspace's trust tier is compatible with the source policy. It does not check publish restrictions (e.g., "do not broadcast R5 tools to T2 workspaces"). Fix: extend the trust-compat check to include publish restrictions from the policy, not just the raw trust tier number.

**A-01 (CLI contains registry client logic):** The registry client (for publishing to ClawHub) contains business logic that should live in the SDK, not the CLI. Fix: move the registry client to `claws-sdk/src/publish/registry-client.ts` and have the CLI import it.

## Deliverables

- [ ] `claws-sdk/src/validate/validate.ts` (EDIT) — add `newTier >= existingTier` monotonic assertion at amendment boundary. When an amendment attempts to set a lower trust tier, throw a descriptive error: "Trust tier can only increase (current: T{n}, proposed: T{m})".
- [ ] `claws-sdk/src/compile/merger.ts` (EDIT) — add minimum risk floor R2 for LLM-only gap-fill intents. In the merge pipeline, when an intent has `source: 'llm'` and no regex baseline exists, clamp `riskTier = Math.max(riskTier, 2)`.
- [ ] `claws-sdk/src/fleet/broadcast.ts` (EDIT) — extend trust-compat check to verify publish restrictions from the policy. Check both `trustTier >= requiredTier` AND `policy.publishRestrictions` allow the broadcast target.
- [ ] `claws-sdk/src/publish/registry-client.ts` (NEW) — move registry client logic from CLI to SDK. Exports: `publishToRegistry(package, credentials)`, `queryRegistry(query)`, `validatePackageForPublish(package)`. CLI imports this module instead of owning the logic.
- [ ] `claws-sdk/tests/validate/trust-monotonic.unit.test.ts` — L0: amendment lowering tier from T4 to T2 rejected with descriptive error (1 test), amendment raising tier from T2 to T4 accepted (1 test), amendment with same tier accepted (1 test)
- [ ] `claws-sdk/tests/compile/raise-only.unit.test.ts` — L0: LLM gap-fill intent with no regex baseline gets R2 floor (1 test), regex baseline at R5 preserved when LLM agrees (1 test), R2 floor applies when regex pattern exists but did not match invocation (1 test)
- [ ] `claws-sdk/tests/fleet/broadcast-trust.integration.test.ts` — L1: broadcast trust-compat checks publish restrictions — R5 tool blocked to T2 workspace (1 test), trust-compat rejects when policy publishRestrictions disallow target (1 test)
- [ ] `claws-sdk/tests/protect/security-hardening-trust.e2e.test.ts` — L2: full trust model integrity pipeline — monotonic tier enforcement, LLM gap-fill R2 floor, broadcast publish restriction checks, and registry client SDK placement verified end-to-end
- [ ] `claws-sdk/tests/protect/security-hardening-trust.accept.test.ts` — L3: SDK acceptance — consumer exercises amendment validation, merge pipeline risk floor, and fleet broadcast trust-compat through public APIs and validates trust model invariants

## Acceptance Criteria

- [ ] Trust tier can only increase via amendments — lowering throws with descriptive error
- [ ] Same-tier amendments are accepted (no false positive on T3 -> T3)
- [ ] LLM-only gap-fill intents have minimum R2 risk tier
- [ ] Regex baselines are preserved when LLM confirms them (no R5 -> R2 downgrade)
- [ ] R2 floor applies when regex exists but did not match (not just when no regex exists)
- [ ] Fleet broadcast checks both trust tier and publish restrictions
- [ ] R5 tool broadcast to T2 workspace is blocked by publish restriction check
- [ ] Registry client logic lives in claws-sdk, not claws-cli
- [ ] `npm run build` exits 0
- [ ] `npx tsc --noEmit` exits 0

## Governing Roles

Load these role files before starting:

- `.craft/roles/claws/ciso.md` — trust model integrity, monotonic security guarantees, publish restriction enforcement
- `.craft/roles/claws/founder.md` — product security posture, trust tier semantics, gap-fill risk model

## Dependencies

- Pulse 05 (identity-sso): identity config consumed by trust model for role-based tier overrides

## Test Gates

- [ ] L0 unit (6 tests): amendment lowering tier rejected (1), amendment raising tier accepted (1), same tier accepted (1), LLM gap-fill gets R2 floor (1), regex baseline preserved (1), R2 floor applies when regex pattern exists but did not match invocation (1)
- [ ] L1 integration (2 tests): broadcast trust-compat checks publish restrictions (1), trust-compat rejects incompatible policy (1)
- [ ] L2 e2e (1 test): full trust model integrity pipeline end-to-end
- [ ] L3 accept (1 test): SDK acceptance — amendment validation, risk floor, and broadcast trust-compat through public APIs
- [ ] `npm run build` exits 0
- [ ] `npx tsc --noEmit` exits 0
