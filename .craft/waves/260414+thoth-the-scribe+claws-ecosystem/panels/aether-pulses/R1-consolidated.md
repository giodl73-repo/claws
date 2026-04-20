# R1 Consolidated — Aether Integration Pulses 50-52

**Panel**: craft:architect, claws:ciso, claws:gateway-eng, claws:founder
**Type**: plan
**Date**: 2026-04-15

---

## Aggregate

| Role | M | W | N | Total |
|------|---|---|---|-------|
| craft:architect | 4 | 3 | 1 | 8 |
| claws:ciso | 4 | 3 | 2 | 9 |
| claws:gateway-eng | 3 | 5 | 1 | 9 |
| claws:founder | 2 | 3 | 2 | 7 |
| **Total** | **13** | **14** | **6** | **33** |
| **After dedup** | **9** | **11** | **5** | **25** |

---

## Deduplicated Must-Fix (9)

### Cross-role consensus (flagged by 2+ roles)

| # | Finding | Roles | Pulse | Fix |
|---|---------|-------|-------|-----|
| **CM1** | **HMAC key distribution unspecified** — verification function needs key but no key source param or distribution strategy | architect M3, ciso W1, gateway F-04 | P51 | Add `KeyResolver` interface; accept key param in verify function |
| **CM2** | **Fleet override has no audit/approval workflow** — compromised admin can silently ungate R3/R4 | ciso M4, founder F3 | P50 | Fleet overrides require counter-signature + audit entry |
| **CM3** | **Double-gate divergence** — provider sets `requiresExternalApproval` independently of fleet policy → R3 with fleet override still triggers SSE | gateway F-05, ciso W2 | P52 | Provider must read fleet policy; or fleet override wins at host level |
| **CM4** | **Vendor naming in open standard** — `AetherApprovalPolicy` type, `aether-sim.ts` runner | founder F1, founder F2 | P50 | Rename to `HostApprovalPolicy`, `host-policy-sim.ts` |

### Single-role must-fix

| # | Finding | Role | Pulse | Fix |
|---|---------|------|-------|-----|
| **CM5** | **mcpServer field: wrong file ref + no parse-phase edit** — plan says governance-ir.ts but type is in capability-manifest.ts; no deliverable for populating the field during parse | architect M1 | P50 | Fix file ref; add parse-phase deliverable |
| **CM6** | **R1 doesn't exist in ToolRiskLevel type system** — plan references R1 but lowest is R2 (`low`) | architect M2 | P50 | Extend type or use R2 as minimum |
| **CM7** | **New artifact not in manifest** — host-approval-policies.json missing from .claws-manifest.json | ciso M1 | P50/51 | Add to manifest artifact list |
| **CM8** | **Blob verify blocks startup with no timeout** — stalled verification = dead container | gateway F-03 | P51 | Add timeoutMs param + distinct error types |
| **CM9** | **Policy resolution needs index, not linear scan** — 9 servers x N tools exceeds 50ms hook budget | gateway F-02 | P50 | Pre-indexed Map structure + perf test |

---

## Key Warnings (highlights)

- **Backward-compat WARNING mode is permanent downgrade vector** — need `requireSignedArtifacts` fleet flag (ciso M2)
- **Empty-manifest attack** — valid signature with zero artifacts bypasses all checks (gateway F-08)
- **No risk-change audit trail** — policy downgrades invisible to SIEM (ciso M3)
- **mcpServer join strategy unspecified** — unmapped tools get null server (gateway F-06)
- **Provider throw fail-mode undocumented** — hosts diverge on crash behavior (gateway F-09)

---

## Recommended Amendments to Pulse Plans

### P50 amendments
1. Fix file ref: `capability-manifest.ts` not `governance-ir.ts`
2. Add parse-phase deliverable for `mcpServer` population
3. Rename types: `AetherApprovalPolicy` → `HostApprovalPolicy`
4. Rename sim: `aether-sim.ts` → `host-policy-sim.ts`
5. Resolve R1 vs R2 minimum risk level
6. Add pre-indexed policy resolution + perf test
7. Fleet override: require audit entry + counter-signature
8. Include host-approval-policies.json in manifest artifact list

### P51 amendments
1. Add `keySource: KeyResolver` param to verify function
2. Add `timeoutMs` param with default (e.g., 10s)
3. Reject empty-manifest (zero artifacts) as invalid
4. Wire verification failures to SIEM emitter (P48)

### P52 amendments
1. Document provider + fleet override precedence (who wins?)
2. Document provider throw fail-mode per risk level
3. Add `requireSignedArtifacts` fleet policy field

---

## Verdict

**Conditional pass — 9 must-fix findings.** All addressable as pulse plan amendments
before implementation starts. No architectural changes needed. The direction is
sound: single compilation, vendor-neutral artifacts, host-agnostic composition.
The findings are about completeness and precision, not approach.
