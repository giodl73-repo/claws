---
slug: claws-upstream-contrib
preset: "claws"
plan: "2 headlines: npm install @openclaw/audit-chain works standalone with zero claws dependency, GuardrailProvider spec PR submitted to openclaw/openclaw"
area: claws
status: Draft
phase: thoth
atoms: [atom:upstream-contrib, atom:audit-chain, atom:three-tier-packages]
specs: [CL-07, CL-06, CL-02]
---

# claws-upstream-contrib — @openclaw/* Contributed Packages

## Headlines

1. **H1: `npm install @openclaw/audit-chain` works standalone with zero claws dependency** — 5 runtime packages are contributed upstream under the `@openclaw/` scope with MIT license: (1) `@openclaw/audit-chain` -- hash-chained JSONL audit trails with HMAC-SHA256 integrity verification, WAL for crash recovery, export to SARIF/CEF/JSON/syslog; (2) `@openclaw/budget-meter` -- token and cost controls with 80/95/100% threshold alerts and throttle enforcement; (3) `@openclaw/identity-bridge` -- enterprise SSO integration (OIDC/SAML) for OC agent authentication with RBAC; (4) `@openclaw/siem-emitter` -- SOC integration emitting audit events in 4 standard formats (CEF, NDJSON, syslog, SARIF); (5) `@openclaw/secret-scanner` -- credential leak detection for agent workspaces using regex patterns + entropy analysis. Each package solves a real problem independently. Zero `@claws/*` or `@craftworks/*` imports in any package.
   - Validation: `npm install @openclaw/audit-chain && node -e "require('@openclaw/audit-chain')"` succeeds with zero peer dependencies
   - Validation: `@openclaw/audit-chain` append + verify round-trip produces valid HMAC chain
   - Validation: `grep -r '@craftworks' node_modules/@openclaw/` returns zero matches across all 5 packages

2. **H2: GuardrailProvider spec PR submitted to openclaw/openclaw targeting issue #46441** — The highest-leverage first contribution defines the governance interface before implementing it. The `GuardrailProvider` interface specifies 3 methods: `preAuthorize(toolCall)` returning `AuthorizationDecision` (allow/deny/review/modify), `postAudit(toolCall, result)` for audit trail recording, and `getCapabilities()` returning provider metadata. A chain-of-responsibility `ProviderRegistry` composes multiple providers (claws is one provider among many). A reference `ShellExecProvider` wraps existing OC exec-approvals.json as a GuardrailProvider implementation. The spec PR includes TypeScript type definitions, sequence diagrams, and a migration path for existing exec-approval users.
   - Validation: GuardrailProvider TypeScript interface compiles cleanly with OC Gateway type definitions
   - Validation: ShellExecProvider reference implementation passes 10 scenarios against existing exec-approvals.json behavior
   - Validation: ProviderRegistry chains 3 providers and applies correct priority ordering (deny > review > modify > allow)

3. **H3: 3-wave roadmap delivers all 5 packages + spec PR across 16 weeks** — Wave 1 (weeks 1-4): GuardrailProvider spec PR + `@openclaw/identity-bridge` + `@openclaw/budget-meter` + `@openclaw/audit-chain`. Wave 2 (weeks 5-8): `@openclaw/siem-emitter` + `@openclaw/secret-scanner` + policy templates + audit chain format spec. Wave 3 (weeks 9-16): community feedback integration, enterprise extensions, documentation site contributions. Each wave is independently valuable. Wave 1 positions Craftworks as the governance architect. Wave 2 fills the ecosystem gaps. Wave 3 builds community trust.
   - Validation: Wave 1 deliverables (spec PR + 3 packages) are each independently publishable to npm
   - Validation: All 5 packages pass their own test suites with >= 90% coverage
   - Validation: Zero breaking changes between Wave 1 and Wave 2 package versions (semver-compatible)

## Summary

This plan contributes 5 runtime governance packages to the OpenClaw ecosystem under the `@openclaw/` scope and submits a `GuardrailProvider` specification PR to the openclaw/openclaw repository. The packages are powered by existing Craftworks infrastructure (agent-sdk govern/, agent-sdk suite/audit/, compiler-sdk crypto patterns) but wrapped with OC-native APIs and zero Craftworks dependencies. The contribute/keep boundary is architectural: contribute runtime primitives that anyone could build (audit trails, identity, budgets, secrets, SIEM); keep compile-time enforcement that only Craftworks can build (policy compiler, guard passes, RELAX evaluator, CGR emission). A standalone monorepo (`craftworks/openclaw-governance`) hosts all 5 packages with independent versioning via Changesets.

## Coverage Contract

### Specs
- [ ] CL-07 -- Upstream contribution roadmap: 3 waves, 16 weeks, contribute/keep boundary, GuardrailProvider spec
- [ ] CL-06 -- Three-tier package model: @openclaw/* (Tier 1) contributed packages, MIT license, standalone value
- [ ] CL-02 -- Audit chain (HMAC/Ed25519 hash chain), secret detection, identity/RBAC security foundations

### Concept Guides
- [ ] docs/claws/ecosystem/upstream-packages.md -- NEW: 5 packages with APIs, size budgets, usage examples
- [ ] docs/claws/ecosystem/guardrail-provider.md -- NEW: interface spec, chain-of-responsibility, migration path

### Scenario Coverage
- [ ] upstream/audit-chain-append-verify -- append events, verify chain integrity
- [ ] upstream/audit-chain-export-sarif -- export audit trail to SARIF format
- [ ] upstream/audit-chain-wal-recovery -- crash recovery via write-ahead log
- [ ] upstream/budget-meter-thresholds -- 80/95/100% threshold alerts fire correctly
- [ ] upstream/budget-meter-throttle -- throttle enforcement blocks at 100% budget
- [ ] upstream/identity-bridge-oidc -- OIDC token validation and RBAC check
- [ ] upstream/siem-emitter-4-formats -- emit same event in CEF, NDJSON, syslog, SARIF
- [ ] upstream/secret-scanner-patterns -- detect API keys, tokens, passwords in workspace files
- [ ] upstream/secret-scanner-entropy -- entropy analysis flags high-entropy strings
- [ ] upstream/guardrail-provider-chain -- 3 providers chained, deny takes priority
- [ ] upstream/guardrail-shell-exec -- ShellExecProvider wraps exec-approvals.json
- [ ] upstream/zero-craftworks-imports -- all 5 packages have zero @craftworks/ references

### Test Tier Targets
| Tier | Target | Rationale |
|------|--------|-----------|
| L0 unit | 30 | Per-package core logic (5x4), hash chain operations (4), pattern matching (3), threshold logic (3) |
| L1 integration | 10 | Cross-package: audit-chain + siem-emitter pipeline (2), identity + budget composition (2), provider registry chain (3), WAL recovery (1), export round-trip (2) |
| L2 e2e | 5 | Per-package standalone install + usage scenario (5) |
| L3 acceptance | 3 | Standalone npm install test (1), OC workspace integration (1), GuardrailProvider with mock Gateway (1) |

## Scope

### @openclaw/audit-chain (~20KB)
- `packages/audit-chain/src/chain.ts` (NEW) -- Hash-chained JSONL: append, verify, prune, query
- `packages/audit-chain/src/wal.ts` (NEW) -- Write-ahead log for crash recovery
- `packages/audit-chain/src/export.ts` (NEW) -- Export to SARIF, CEF, JSON, syslog
- `packages/audit-chain/src/verify.ts` (NEW) -- Chain integrity verification (HMAC-SHA256)
- `packages/audit-chain/src/types.ts` (NEW) -- AuditEvent, ChainEntry, VerifyResult types

### @openclaw/budget-meter (~8KB)
- `packages/budget-meter/src/meter.ts` (NEW) -- Token/cost tracking with threshold alerts
- `packages/budget-meter/src/throttle.ts` (NEW) -- Enforcement: block at 100%, warn at 80/95%
- `packages/budget-meter/src/types.ts` (NEW) -- BudgetConfig, ThresholdEvent types

### @openclaw/identity-bridge (~3KB)
- `packages/identity-bridge/src/bridge.ts` (NEW) -- OIDC/SAML token validation
- `packages/identity-bridge/src/rbac.ts` (NEW) -- Role-based access control checks
- `packages/identity-bridge/src/types.ts` (NEW) -- Identity, Role, Permission types

### @openclaw/siem-emitter (~5KB)
- `packages/siem-emitter/src/emitter.ts` (NEW) -- Multi-format event emission dispatcher
- `packages/siem-emitter/src/formats/cef.ts` (NEW) -- CEF format serializer
- `packages/siem-emitter/src/formats/ndjson.ts` (NEW) -- NDJSON format serializer
- `packages/siem-emitter/src/formats/syslog.ts` (NEW) -- Syslog RFC 5424 format serializer
- `packages/siem-emitter/src/formats/sarif.ts` (NEW) -- SARIF 2.1.0 format serializer

### @openclaw/secret-scanner (~4KB)
- `packages/secret-scanner/src/scanner.ts` (NEW) -- Workspace file scanning orchestrator
- `packages/secret-scanner/src/patterns.ts` (NEW) -- Regex patterns for API keys, tokens, passwords
- `packages/secret-scanner/src/entropy.ts` (NEW) -- Shannon entropy analysis for high-entropy strings

### GuardrailProvider Spec
- `spec/guardrail-provider.ts` (NEW) -- GuardrailProvider interface, AuthorizationDecision type, ProviderRegistry
- `spec/shell-exec-provider.ts` (NEW) -- Reference implementation wrapping exec-approvals.json
- `spec/README.md` (NEW) -- Spec PR body with rationale, sequence diagrams, migration path

## Deliverables

### Specs & Design
- [ ] CL-07 amendment -- Upstream roadmap finalized with Wave 1 package APIs
- [ ] GuardrailProvider spec document -- TypeScript types, sequence diagrams, chain-of-responsibility

### Package Code (standalone monorepo: craftworks/openclaw-governance)
- [ ] packages/audit-chain/ -- 5 source files + tests + package.json (MIT)
- [ ] packages/budget-meter/ -- 3 source files + tests + package.json (MIT)
- [ ] packages/identity-bridge/ -- 3 source files + tests + package.json (MIT)
- [ ] packages/siem-emitter/ -- 5 source files + tests + package.json (MIT)
- [ ] packages/secret-scanner/ -- 3 source files + tests + package.json (MIT)
- [ ] spec/guardrail-provider.ts -- GuardrailProvider + AuthorizationDecision + ProviderRegistry
- [ ] spec/shell-exec-provider.ts -- Reference ShellExecProvider implementation

### Tests (per-package)
- [ ] packages/audit-chain/tests/chain.unit.test.ts -- append, verify, query
- [ ] packages/audit-chain/tests/wal.unit.test.ts -- crash recovery scenarios
- [ ] packages/audit-chain/tests/export.unit.test.ts -- 4 format outputs
- [ ] packages/budget-meter/tests/meter.unit.test.ts -- threshold events
- [ ] packages/budget-meter/tests/throttle.unit.test.ts -- enforcement behavior
- [ ] packages/identity-bridge/tests/bridge.unit.test.ts -- token validation
- [ ] packages/identity-bridge/tests/rbac.unit.test.ts -- role checks
- [ ] packages/siem-emitter/tests/emitter.unit.test.ts -- dispatch to formats
- [ ] packages/siem-emitter/tests/formats.unit.test.ts -- per-format serialization
- [ ] packages/secret-scanner/tests/scanner.unit.test.ts -- pattern detection
- [ ] packages/secret-scanner/tests/entropy.unit.test.ts -- entropy thresholds

### Infrastructure Reuse (internal, wrapped with OC-native APIs)
- [ ] Reuse `agent-sdk/src/govern/cgr-chain.ts` pattern -- hash chain data structure for audit-chain
- [ ] Reuse `agent-sdk/src/govern/policy-walker.ts` pattern -- policy traversal for provider registry
- [ ] Reuse `agent-sdk/src/suite/audit/hash-chain.ts` -- HMAC chain algorithm for audit-chain
- [ ] Reuse `agent-sdk/src/suite/audit/wal.ts` -- WAL implementation pattern for audit-chain
- [ ] Reuse `agent-sdk/src/suite/audit/verify.ts` -- chain verification for audit-chain
- [ ] Reuse `agent-sdk/src/suite/audit/export.ts` -- multi-format export for siem-emitter

### Scenario Findings (added during wave)
*(empty -- populated during implementation)*

## Out of Scope

- @claws/* standalone libraries (CL-06 Tier 2 -- separate plan scope)
- claws compiler integration (contributed packages work WITHOUT claws)
- @openclaw/ npm scope registration (CL-07 open question #5 -- organizational decision)
- Enterprise fleet governance packages (Wave 3 scope, deferred)
- Governance composition algebra (CL-07 Wave 3 scope)
- Telemetry infrastructure (anonymous, opt-in -- deferred to post-Wave 2)
- OpenClaw core PR process (community engagement timeline is external dependency)

## Notes

- All 5 packages use OC-native APIs only. The internal Craftworks infrastructure (agent-sdk, compiler-sdk) provides the PATTERN and ALGORITHM, but the contributed packages are clean-room implementations with OC-native type signatures. No `@craftworks/*` imports appear in published package code.
- The contribute/keep boundary (CL-07): contribute runtime primitives that anyone could build (audit trails, OIDC, state machines); keep compile-time enforcement that only Craftworks can build (policy compiler, guard passes, RELAX evaluator, CGR emission, cross-compilation).
- GuardrailProvider is the highest-leverage first contribution per CL-07: define the interface before shipping implementations. It positions Craftworks as the governance architect, not just a governance vendor.
- Standalone monorepo (`craftworks/openclaw-governance`) with Changesets for independent versioning. This keeps the contribution cleanly separated from the Craftworks monorepo while allowing internal development to reference both.
- Community demand alignment (CL-07): RBAC (#8081, 28+ reactions), cost control (OC Firewall exists), audit (Clawprint exists), SIEM (enterprise SOC requirement), secrets (1.5M token breach).
- Depends on claws-comply-audit being proven first: the audit chain must work in claws before contributing it upstream. The contributed package is a simplified, standalone version of the proven internal implementation.
- MIT license for all contributed packages (matches OC ecosystem convention per CL-07).
- **The GuardrailProvider spec PR (Wave 1, Week 1 of Q12b roadmap) ships in parallel with Ptah.** The spec PR costs nothing and establishes Craftworks as the governance architect. The spec PR is a Phase 1 (Ptah) deliverable; the 5 runtime packages stay in Phase 4 (Ra). Submitting the governance interface spec to openclaw/openclaw before the compiler ships gives the community something to react to and positions Craftworks as the governance architect, not just a governance vendor.
