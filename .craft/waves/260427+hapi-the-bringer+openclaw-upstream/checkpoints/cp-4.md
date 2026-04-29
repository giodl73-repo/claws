---
checkpoint: 4
pulse_range: [08, 09]
depends_on_cp: 3
review_panel: [claws:gateway-eng, claws:ciso, claws:compliance, claws:claws-release-eng, architect, testing]
---

# Checkpoint 4 · Wave C — Merger + Generator

## Pulse Range

Pulses 08 + 09 (2 pulses).

## Dispatch Plan

Same pattern as cp-3: small surgical (OC-7) + big package (policy) opened in parallel. The OC-7 codemod gate runs FIRST (must validate internal consumers compile) before PR-5 policy can open.

- **Batch 1** (parallel, depend on cp-3 merge AND codemod gate green): pulse 08 (PR-4 OC-7 conjunctive merger), pulse 09 (PR-5 @openclaw/policy + 9-verb subcommand group)

## Pulses

- [ ] Pulse 08 · `pr5-oc7-conjunctive-merger` — Open PR-4 at openclaw/openclaw fixing `src/plugins/hooks.ts:889-893` `??` → array accumulation. ~5 lines + try/catch wrapper for crash-safety + Swift model regen. Surgical pair to PR-5.
- [ ] Pulse 09 · `pr6-openclaw-policy` — Open PR-5 at openclaw/openclaw adding `@openclaw/policy` + 9-verb `openclaw policy` subcommand group. Carries emitted-plugin registration adapter audit. Generator-side R5 fail-open rejection + RESTRICTED stickiness + runtime-gated enforcement model. Policy diagnostics cite `oc://...` URIs (workspace + config).

## Gate

cp-4 closes when BOTH PRs MERGE at openclaw/openclaw AND post-merge verification reports:
- H5 fully GREEN: merger conjunctive test + plugin-B-throw crash-safety test on trunk
- H3 GREEN: deterministic-generation test + R5 fail-closed + RESTRICTED stickiness on trunk
- Codemod gate (W1) reports our internal `@bic/openclaw-policy` + `@bic/openclaw-snap` compile clean against trunk's widened `requireApproval` field

**Critical**:
- adapter-audits.md § 2 (emitted-plugin registration) must be complete BEFORE pulse 09 opens
- Codemod gate is mandatory: PR-6 (snap) builds against trunk's widened field; if internal consumers don't compile, halt before opening cp-5
- Swift protocol model regen for OC-7's hook-result envelope shape change

## Review Panel

Roles: claws:gateway-eng, claws:ciso, claws:compliance, claws:claws-release-eng, architect, testing
Write to: `panels/cp-4/`

Gateway-eng owns the OC-7 surgical change verification (right file:line, right semantics). CISO + compliance own the policy generator's invariant enforcement. Release-eng watches the codemod gate.
