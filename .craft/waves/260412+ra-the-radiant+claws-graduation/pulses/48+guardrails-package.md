---
pulse: 48
slug: guardrails-package
plan: claws-pre-extraction-packaging
depends_on: [46]
governing_roles: [craft:architect, claws:gateway-eng]
scenario_codes: [S40]
stage: implementation
test_tiers:
  L0_unit: 36
  L1_integration: 8
  L2_e2e: 0
  L3_accept: 0
test_scope:
  run:
    - "cd claws-sdk/packages/guardrails && npx vitest run --coverage"
  typecheck:
    - "cd claws-sdk/packages/guardrails && npx tsc --noEmit"
checkpoint: 10
---

# Pulse 48: Create @bic/openclaw-guardrails Package (Absorb Orphans)

## Objective

Create `claws-sdk/packages/guardrails/` with default export (GuardrailProvider + FileIngestProvider interfaces + ProviderLifecycle + HostContext + 5 supporting types: AuditSink, IdentityBridge, HandleBinding, SnapshotMeta, Logger — gateway-eng M1 closure) absorbed from `C:\src\openclaw-governance\spec\` (FLAT — the `spec/` directory IS the guardrail-spec package; spec/src/, spec/package.json). Six subpaths absorbed from `C:\src\openclaw-governance\packages\<x>\`. Explicit per-package rename table (steward M5 closure). Atomic `@openclaw/*` → `@bic/openclaw-guardrails` rename during absorption.

## Deliverables

- [ ] `claws-sdk/packages/guardrails/package.json` — name `@bic/openclaw-guardrails`; single `exports` field declaring: `.` (default), `./audit`, `./approvals`, `./budget`, `./identity`, `./siem`, `./secrets`
- [ ] **Explicit per-orphan-package rename table** executed during absorption (steward M5):
  - `C:\src\openclaw-governance\spec\` (flat dir) → `claws-sdk/packages/guardrails/src/` (default export location); was named `@openclaw/guardrail-spec`
  - `.../packages/approval-events/` → `.../src/approvals/`; was `@openclaw/approval-events`
  - `.../packages/audit-chain/` → `.../src/audit/`; was `@openclaw/audit-chain`
  - `.../packages/budget-meter/` → `.../src/budget/`; was `@openclaw/budget-meter`
  - `.../packages/identity-bridge/` → `.../src/identity/`; was `@openclaw/identity-bridge`
  - `.../packages/secret-scanner/` → `.../src/secrets/`; was `@openclaw/secret-scanner`
  - `.../packages/siem-emitter/` → `.../src/siem/`; was `@openclaw/siem-emitter`
- [ ] `src/index.ts` (default export) ships:
  - `GuardrailProvider`, `FileIngestProvider` interfaces
  - `ProviderLifecycle` interface (init/shutdown/onSnapshotPromoted/onStageModeChanged — all optional)
  - `HostContext` interface with fields: auditSink, identityBridge, approvalHandleSigner, snapshot, stageMode, logger
  - **5 supporting types as named exports** (gateway-eng M1): `AuditSink`, `IdentityBridge`, `HandleBinding`, `SnapshotMeta`, `Logger`
  - Decision types: `AuthorizationDecision`, `IngestDecision`, `RiskLevel`, `Sensitivity`
  - `ShellExecProvider` reference implementation
- [ ] Atomic rename: zero `@openclaw/*` occurrences in `src/` or `package.json` after absorption (all `@bic/openclaw-guardrails` or subpath-referenced)
- [ ] L0 unit tests itemized per subpath:
  - `/audit` hash-chain verify: 6 tests
  - `/approvals` handle-binding round-trip + TTL: 5 tests
  - `/budget` check+record+threshold alert: 6 tests
  - `/identity` OIDC verify + OBO exchange + revocation: 6 tests
  - `/siem` CEF/NDJSON/syslog format: 4 tests
  - `/secrets` default-rule coverage (AWS/GCP/Azure/GitHub/private-key/JWT): 5 tests
  - Default-export interface contracts (including 5 supporting types): 4 tests
    = 36 L0 tests total
- [ ] L1 integration tests itemized: 2 audit↔canonicalize chain tests, 2 approvals↔canonicalize HandleBinding tests, 2 identity↔budget (per-tenant budget via principal) tests, 2 siem↔audit export round-trip tests = 8 L1 tests
- [ ] Peer-dep declarations: `/audit` + `/approvals` declare `@bic/openclaw-workspace` peer in package.json
- [ ] After this pulse, `C:\src\openclaw-governance\` is archivable (all content absorbed; confirmed by diff)
- [ ] Zero `@craftworks/*` runtime imports

## Spec Amendment Absorption

If this pulse surfaces a gap in the proposal spec (main spec, one of the 4 package specs, or the plan) — **the amendment lands inside this pulse's commit**. No deferral, no follow-up pulse. Amendment SHA = pulse SHA.

Commit-message convention for in-pulse amendments:

```
<pulse-type>(<pulse-slug>): <summary>

Spec amendment absorbed in-pulse:
- target: <file>:<section>  (e.g. docs/claws/proposals/openclaw-upstream/snap.md §Semantics)
- trigger: <what surfaced the gap>
- fix: <one-line rationale>
```

Applies especially to cases where the absorption of orphan packages + interface shaping reveals a gap in `guardrails.md` (a HostContext supporting type's shape, an absorbed subpath's actual surface vs the spec, a ProviderLifecycle host-obligation not captured in the spec).

If the amendment crosses spec + plan (e.g., a subpath rename that affects both `snap.md` and `claws-pre-extraction-packaging.md`'s route table), both files are updated in the same commit.

Per the user "no deferrals" directive, this pulse cannot close with a known spec gap marked `TBD`, `// FIXME`, or tracked in `DEFERRED.md`. Either the spec is amended, or the pulse is extended until the amendment lands.

## Acceptance Criteria

- `grep -rE '@openclaw/(guardrail-spec|approval-events|audit-chain|budget-meter|identity-bridge|secret-scanner|siem-emitter)' claws-sdk/packages/guardrails/` — zero matches
- 5 HostContext supporting types (AuditSink, IdentityBridge, HandleBinding, SnapshotMeta, Logger) importable from `@bic/openclaw-guardrails`
- L0 + L1 test counts meet itemized targets (36 + 8)
- C:\src\openclaw-governance\ tree archivable (content fully absorbed)

## Governing Roles

- `craft:architect` — subpath + default-export layering
- `claws:gateway-eng` — interface surface matches guardrails.md contract (+ 5 supporting types for plugin compilation)

## Dependencies

CP-9 gate (P46) passed. S40 (guardrails subpath scenario) is the direct precursor.

## Test Gates

L0: 36 tests per-subpath itemized. L1: 8 tests across subpath pairs. Atomic-rename grep gate. Orphan-absorbable grep gate.
