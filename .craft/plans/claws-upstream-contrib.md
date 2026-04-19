---
slug: claws-upstream-contrib
preset: "claws"
plan: "2 headlines: 7 standalone governance packages contributable to the OC team, GuardrailProvider spec ready for OC team presentation"
area: claws
status: Implemented
phase: thoth
atoms: [atom:upstream-contrib, atom:audit-chain, atom:governance-primitives]
specs: [CL-07, CL-06, CL-02]
---

# claws-upstream-contrib — Governance Packages Presented to the OC Team

<!-- Naming note (2026-04-16): the seven packages live under `@bic/*` in this
     monorepo (our internal authoring namespace). The upstream contribution
     model is PR-to-OC-team-repo with whatever naming convention the OC team
     uses (they decide — likely `@openclaw/*` but their call). When the OC
     team accepts the PR upstream, we consume their upstream names; we do
     NOT maintain a long-lived `@openclaw/*` tier in this repo. The MIT
     license stays at source level so upstream can accept verbatim. -->

## Headlines

1. **H1: Seven standalone governance packages are ready for OC-team presentation** — seven runtime packages built under `@bic/*` in this repo, each MIT-licensed at source level, each installable standalone with zero `@craftworks/*` dependencies: (1) `@bic/audit-chain` — hash-chained JSONL audit trails with HMAC-SHA256 integrity verification, WAL for crash recovery, export to SARIF/CEF/JSON/NDJSON/syslog; (2) `@bic/budget-meter` — token and cost controls with 80/95/100% threshold alerts and throttle enforcement; (3) `@bic/identity-bridge` — enterprise SSO integration (OIDC/SAML) for OC agent authentication with RBAC; (4) `@bic/siem-emitter` — SOC integration emitting audit events in 5 standard formats (CEF, NDJSON, JSON, syslog, SARIF); (5) `@bic/secret-scanner` — credential leak detection for agent workspaces using regex patterns + entropy analysis; (6) `@bic/approval-events` — typed approval request/response events with JSON Schema, timeout policies, and correlation by requestId; (7) `@bic/oc-path` — universal addressing scheme for OC workspace files using `oc://` URI syntax, parser + formatter (~1KB). Each package solves a real problem independently. Upstream contribution path: PR to the OC team's repo under whatever naming convention they prefer; our `@bic/*` packages are clean-room and ship-ready.
   - Validation: `npm install @bic/audit-chain && node -e "require('@bic/audit-chain')"` succeeds with zero peer dependencies
   - Validation: `@bic/audit-chain` append + verify round-trip produces valid HMAC chain
   - Validation: `grep -r '@craftworks' node_modules/@bic/` returns zero matches across all 7 packages
   - Validation: each package's source + tests are structured so an upstream PR (rename + relocate) is a mechanical transform, not a rewrite

2. **H2: GuardrailProvider spec is drafted and ready to present to the OC team** — the highest-leverage first deliverable defines the governance interface before implementation. The `GuardrailProvider` interface specifies 3 methods: `preAuthorize(toolCall)` returning `AuthorizationDecision` (allow/deny/review/modify), `postAudit(toolCall, result)` for audit trail recording, and `getCapabilities()` returning provider metadata. A chain-of-responsibility `ProviderRegistry` composes multiple providers (claws is one provider among many). A reference `ShellExecProvider` wraps existing OC exec-approvals.json as a GuardrailProvider implementation. The spec PR body includes TypeScript type definitions, sequence diagrams, and a migration path for existing exec-approval users — ready to present to the OC maintainers.
   - Validation: GuardrailProvider TypeScript interface compiles cleanly with OC Gateway type definitions
   - Validation: ShellExecProvider reference implementation passes 10 scenarios against existing exec-approvals.json behavior
   - Validation: ProviderRegistry chains 3 providers and applies correct priority ordering (deny > review > modify > allow)
   - Validation: spec draft is structured as a clean PR against the OC Gateway repo (naming + imports are mechanical to adjust)

3. **H3: 3-wave roadmap delivers all 7 packages + spec across 16 weeks** — Wave 1 (weeks 1-4): GuardrailProvider spec + `@bic/approval-events` + `@bic/identity-bridge` + `@bic/budget-meter` + `@bic/audit-chain` + `@bic/oc-path`. Wave 2 (weeks 5-8): `@bic/siem-emitter` + `@bic/secret-scanner` + policy templates + audit chain format spec. Wave 3 (weeks 9-16): OC-team feedback integration, enterprise extensions, upstream-PR drafting and coordination. Each wave is independently valuable. Wave 1 positions Craftworks as the governance architect for OC-based agent tooling. Wave 2 fills the ecosystem gaps. Wave 3 takes the packages to upstream.
   - Validation: Wave 1 deliverables (spec + 4 packages) are each independently publishable / contribution-ready
   - Validation: All 7 packages pass their own test suites with >= 90% coverage
   - Validation: Zero breaking changes between Wave 1 and Wave 2 package versions (semver-compatible)

## Summary

This plan ships 7 runtime governance packages for OC-compatible tooling and a `GuardrailProvider` specification — all authored under `@bic/*` in the Craftworks monorepo with the intent of contributing them upstream to the OC team. The packages are powered by existing Craftworks infrastructure (agent-sdk govern/, agent-sdk suite/audit/, compiler-sdk crypto patterns) but wrapped with OC-native APIs and zero Craftworks dependencies. The separable/integrated boundary is architectural: contribute standalone runtime primitives that anyone could build (audit trails, identity, budgets, secrets, SIEM, URI addressing); keep compile-time enforcement that only Craftworks can build (policy compiler, guard passes, RELAX evaluator, CGR emission). The upstream mechanism is PR-to-OC-team-repo: the OC team accepts PRs under whatever naming they use, and we consume their upstream names once accepted. Our repo stores the authoritative development copy under `@bic/*`; we do not maintain a long-lived `@openclaw/*` mirror tier.

## Coverage Contract

### Specs
- [ ] CL-07 — Governance packages roadmap: 3 waves, 16 weeks, separable/integrated boundary, GuardrailProvider spec, upstream-contribution model
- [ ] CL-06 — Single-tier `@bic` development namespace in our repo; upstream naming decided by OC team per PR; MIT license at source level
- [ ] CL-02 — Audit chain (HMAC/Ed25519 hash chain), secret detection, identity/RBAC security foundations

### Concept Guides
- [ ] docs/claws/ecosystem/upstream-packages.md — NEW: 7 packages with APIs, size budgets, usage examples, upstream PR template
- [ ] docs/claws/ecosystem/guardrail-provider.md — NEW: interface spec, chain-of-responsibility, migration path, OC-team presentation deck

### Scenario Coverage
- [ ] upstream/audit-chain-append-verify — append events, verify chain integrity
- [ ] upstream/audit-chain-export-sarif — export audit trail to SARIF format
- [ ] upstream/audit-chain-wal-recovery — crash recovery via write-ahead log
- [ ] upstream/budget-meter-thresholds — 80/95/100% threshold alerts fire correctly
- [ ] upstream/budget-meter-throttle — throttle enforcement blocks at 100% budget
- [ ] upstream/identity-bridge-oidc — OIDC token validation and RBAC check
- [ ] upstream/siem-emitter-4-formats — emit same event in CEF, NDJSON, syslog, SARIF
- [ ] upstream/secret-scanner-patterns — detect API keys, tokens, passwords in workspace files
- [ ] upstream/secret-scanner-entropy — entropy analysis flags high-entropy strings
- [ ] upstream/guardrail-provider-chain — 3 providers chained, deny takes priority
- [ ] upstream/guardrail-shell-exec — ShellExecProvider wraps exec-approvals.json
- [ ] upstream/zero-craftworks-imports — all 7 packages have zero @craftworks/ references (enables clean upstream PR)

### Test Tier Targets
| Tier | Target | Rationale |
|------|--------|-----------|
| L0 unit | 30 | Per-package core logic (5x4), hash chain operations (4), pattern matching (3), threshold logic (3) |
| L1 integration | 10 | Cross-package: audit-chain + siem-emitter pipeline (2), identity + budget composition (2), provider registry chain (3), WAL recovery (1), export round-trip (2) |
| L2 e2e | 5 | Per-package standalone install + usage scenario (5) |
| L3 acceptance | 3 | Standalone npm install test (1), OC workspace integration (1), GuardrailProvider with mock Gateway (1) |

## Scope

### @bic/audit-chain (~20KB)
- `packages/audit-chain/src/chain.ts` (NEW) — Hash-chained JSONL: append, verify, prune, query
- `packages/audit-chain/src/wal.ts` (NEW) — Write-ahead log for crash recovery
- `packages/audit-chain/src/export.ts` (NEW) — Export to SARIF, CEF, JSON, syslog
- `packages/audit-chain/src/verify.ts` (NEW) — Chain integrity verification (HMAC-SHA256)
- `packages/audit-chain/src/types.ts` (NEW) — AuditEvent, ChainEntry, VerifyResult types

### @bic/budget-meter (~8KB)
- `packages/budget-meter/src/meter.ts` (NEW) — Token/cost tracking with threshold alerts
- `packages/budget-meter/src/throttle.ts` (NEW) — Enforcement: block at 100%, warn at 80/95%
- `packages/budget-meter/src/types.ts` (NEW) — BudgetConfig, ThresholdEvent types

### @bic/identity-bridge (~3KB)
- `packages/identity-bridge/src/bridge.ts` (NEW) — OIDC/SAML token validation
- `packages/identity-bridge/src/rbac.ts` (NEW) — Role-based access control checks
- `packages/identity-bridge/src/types.ts` (NEW) — Identity, Role, Permission types

### @bic/siem-emitter (~5KB)
- `packages/siem-emitter/src/emitter.ts` (NEW) — Multi-format event emission dispatcher
- `packages/siem-emitter/src/formats/cef.ts` (NEW) — CEF format serializer
- `packages/siem-emitter/src/formats/ndjson.ts` (NEW) — NDJSON format serializer
- `packages/siem-emitter/src/formats/syslog.ts` (NEW) — Syslog RFC 5424 format serializer
- `packages/siem-emitter/src/formats/sarif.ts` (NEW) — SARIF 2.1.0 format serializer

### @bic/secret-scanner (~4KB)
- `packages/secret-scanner/src/scanner.ts` (NEW) — Workspace file scanning orchestrator
- `packages/secret-scanner/src/patterns.ts` (NEW) — Regex patterns for API keys, tokens, passwords
- `packages/secret-scanner/src/entropy.ts` (NEW) — Shannon entropy analysis for high-entropy strings

### @bic/oc-path (~1KB)
- `packages/oc-path/src/parse.ts` (NEW) — Parse `oc://` URIs into structured OcPath objects
- `packages/oc-path/src/format.ts` (NEW) — Format OcPath objects back to `oc://` URI strings
- `packages/oc-path/src/types.ts` (NEW) — OcPath, OcPathSegment types

### GuardrailProvider Spec (presented to OC team)
- `spec/guardrail-provider.ts` (NEW) — GuardrailProvider interface, AuthorizationDecision type, ProviderRegistry
- `spec/shell-exec-provider.ts` (NEW) — Reference implementation wrapping exec-approvals.json
- `spec/README.md` (NEW) — Spec PR body with rationale, sequence diagrams, migration path, presentation notes for OC maintainers

## Deliverables

### Specs & Design
- [ ] CL-07 amendment — Upstream roadmap finalized with Wave 1 package APIs + OC-team presentation plan
- [ ] GuardrailProvider spec document — TypeScript types, sequence diagrams, chain-of-responsibility, PR-ready for OC team

### Package Code (standalone monorepo under `@bic/*`)
- [ ] packages/audit-chain/ — 5 source files + tests + package.json (MIT)
- [ ] packages/budget-meter/ — 3 source files + tests + package.json (MIT)
- [ ] packages/identity-bridge/ — 3 source files + tests + package.json (MIT)
- [ ] packages/siem-emitter/ — 5 source files + tests + package.json (MIT)
- [ ] packages/secret-scanner/ — 3 source files + tests + package.json (MIT)
- [ ] spec/guardrail-provider.ts — GuardrailProvider + AuthorizationDecision + ProviderRegistry
- [ ] spec/shell-exec-provider.ts — Reference ShellExecProvider implementation

### Tests (per-package)
- [ ] packages/audit-chain/tests/chain.unit.test.ts — append, verify, query
- [ ] packages/audit-chain/tests/wal.unit.test.ts — crash recovery scenarios
- [ ] packages/audit-chain/tests/export.unit.test.ts — 4 format outputs
- [ ] packages/budget-meter/tests/meter.unit.test.ts — threshold events
- [ ] packages/budget-meter/tests/throttle.unit.test.ts — enforcement behavior
- [ ] packages/identity-bridge/tests/bridge.unit.test.ts — token validation
- [ ] packages/identity-bridge/tests/rbac.unit.test.ts — role checks
- [ ] packages/siem-emitter/tests/emitter.unit.test.ts — dispatch to formats
- [ ] packages/siem-emitter/tests/formats.unit.test.ts — per-format serialization
- [ ] packages/secret-scanner/tests/scanner.unit.test.ts — pattern detection
- [ ] packages/secret-scanner/tests/entropy.unit.test.ts — entropy thresholds

### Infrastructure Reuse (internal, wrapped with OC-native APIs)
- [ ] Reuse `agent-sdk/src/govern/cgr-chain.ts` pattern — hash chain data structure for audit-chain
- [ ] Reuse `agent-sdk/src/govern/policy-walker.ts` pattern — policy traversal for provider registry
- [ ] Reuse `agent-sdk/src/suite/audit/hash-chain.ts` — HMAC chain algorithm for audit-chain
- [ ] Reuse `agent-sdk/src/suite/audit/wal.ts` — WAL implementation pattern for audit-chain
- [ ] Reuse `agent-sdk/src/suite/audit/verify.ts` — chain verification for audit-chain
- [ ] Reuse `agent-sdk/src/suite/audit/export.ts` — multi-format export for siem-emitter

### Scenario Findings (added during wave)
*(empty — populated during implementation)*

## Out of Scope

- claws compiler integration (the standalone `@bic` packages work WITHOUT claws)
- Upstream registry mechanics (wherever the OC team publishes — decided by them during PR acceptance)
- Enterprise fleet governance packages (Wave 3 scope, deferred)
- Governance composition algebra (CL-07 Wave 3 scope)
- Telemetry infrastructure (anonymous, opt-in — deferred to post-Wave 2)
- The upstream PR itself (drafted and ready in Wave 3 — actual submission is a coordinated follow-up)

## Notes

- All 7 packages use OC-native APIs only. The internal Craftworks infrastructure (agent-sdk, compiler-sdk) provides the PATTERN and ALGORITHM, but the contributed packages are clean-room implementations with OC-native type signatures. No `@craftworks/*` imports appear in package code — this is what makes the upstream PR mechanical rather than a rewrite.
- The contribute/keep boundary (CL-07): contribute runtime primitives that anyone could build (audit trails, OIDC, state machines); keep compile-time enforcement that only Craftworks can build (policy compiler, guard passes, RELAX evaluator, CGR emission, cross-compilation).
- GuardrailProvider is the highest-leverage first contribution per CL-07: define the interface before shipping implementations. It positions Craftworks as the governance architect for OC-based tooling, not just a vendor.
- Standalone monorepo under `@bic/*` with Changesets for independent versioning. This keeps the packages cleanly separated from the Craftworks monorepo while allowing internal development to reference both. When the upstream PR lands, references update to whatever names the OC team chooses.
- Enterprise demand alignment (CL-07): RBAC (enterprise requirement), cost control (OC Firewall patterns), audit (Clawprint patterns), SIEM (enterprise SOC requirement), secrets (credential leak risk). These are why the contribution lands well with OC maintainers.
- Depends on claws-comply-audit being proven first: the audit chain must work in claws before shipping the standalone package. The standalone package is a simplified version of the proven internal implementation.
- MIT license at source level for all 7 governance packages so the upstream PR accepts verbatim.
- **The GuardrailProvider spec (Wave 1, Week 1 of Q12b roadmap) ships in parallel with Ptah.** The spec costs nothing and establishes Craftworks as the governance architect for OC-based agent tooling. The spec is a Phase 1 (Ptah) deliverable; the 6 runtime packages stay in Phase 4 (Ra). Defining the governance interface before the compiler ships gives the OC team something concrete to review and positions Craftworks as the architect of the interface, not just a vendor shipping against one.
