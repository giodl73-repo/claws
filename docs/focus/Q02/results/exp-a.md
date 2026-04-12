# Experiment a: Governance Capability Inventory -- Runtime vs Compile-Time

**Method**: design analysis
**Date**: 2026-04-11

---

## Capability Matrix

| # | Capability | Layer | Package(s) | Separability | Effort | Verdict |
|---|-----------|-------|-----------|-------------|--------|---------|
| 1 | **Policy IR type system** (8-kind discriminated union) | Compile-time | compiler-sdk `ir/policy/policy-ir.ts` | Medium | M | PUBLISH-SPEC-ONLY |
| 2 | **Policy compiler** (YAML -> PolicySet) | Compile-time | compiler-sdk `ir/policy/policy-compiler.ts` | Low | L | KEEP |
| 3 | **Guard passes G1-G4** (skill hardening) | Compile-time | compiler-sdk `optimizer/skill-passes/g1..g4` | Low | L | KEEP |
| 4 | **Guard passes G5-G6** (bias detect, safety eval) | Compile-time | compiler-sdk `optimizer/skill-passes/g5..g6` | Low | L | KEEP |
| 5 | **Fence FE1** (self-modification prevention) | Runtime | compiler-sdk `compiler/fence/fe1-self-modify.ts` | High | S | CONTRIBUTE |
| 6 | **Fence FE2** (tool restriction by trust tier) | Compile-time (stub) | compiler-sdk `compiler/fence/fe2-tool-restrict.ts` | High | S | CONTRIBUTE |
| 7 | **Fence FE5** (trust-tier ACL) | Compile-time | compiler-sdk `compiler/fence/fe5-trust-tier-acl.ts` | Medium | M | PUBLISH-SPEC-ONLY |
| 8 | **Fence FE6** (section locks) | Both | compiler-sdk `compiler/fence/fe6-section-locks-pass.ts`, `section-locks.ts` | Medium | M | CONTRIBUTE |
| 9 | **CGR emitter** (Compile Governance Record) | Compile-time | compiler-sdk `compiler/governance.ts` | Medium | M | PUBLISH-SPEC-ONLY |
| 10 | **CGR type system** (PHA types, change types) | Compile-time | compiler-sdk `types/governance.ts` | High | S | CONTRIBUTE |
| 11 | **Policy Engine** (3-checkpoint runtime evaluation) | Both | craftworks-sdk `policy-engine.ts` | Medium | M | CONTRIBUTE |
| 12 | **Charter Enforcer** (budget caps, kill switches, ceilings) | Runtime-only | craftworks-sdk `charter-enforcer.ts` | High | S | CONTRIBUTE |
| 13 | **Budget Enforcement** (per-agent ledger, throttle/deny) | Runtime-only | craftworks-sdk `budget-enforcement.ts` | High | S | CONTRIBUTE |
| 14 | **Audit Trail** (hash-chained, crash-safe 2-event pattern) | Runtime-only | craftworks-sdk `audit-trail.ts` | High | S | CONTRIBUTE |
| 15 | **Governance Rule Loader** (YAML -> GovernanceEntry[]) | Both | craftworks-sdk `governance/governance-rule-loader.ts` | Medium | M | CONTRIBUTE |
| 16 | **Governance Composition Algebra** (scope resolution) | Runtime-only | craftworks-sdk `governance/governance-composition.ts` | High | S | CONTRIBUTE |
| 17 | **Governance RELAX Evaluator** | Both | craftworks-sdk `governance/governance-relax-evaluator.ts` | Low | M | KEEP |
| 18 | **Governance Adapter** (IR -> DataFrame projection) | Both | craftworks-sdk `adapters/governance-adapter.ts` | Medium | M | PUBLISH-SPEC-ONLY |
| 19 | **Governance Context** (cross-host trust, nonce, hash) | Runtime-only | craftworks-sdk `governance-context.ts` | High | S | CONTRIBUTE |
| 20 | **Artifact Signer** (HMAC-SHA256, manifest, verification) | Runtime-only | craftworks-sdk `domains/guard/audit/artifact-signer.ts` | High | S | CONTRIBUTE |
| 21 | **Fleet Policy Registry** (8-kind union, floor composition) | Runtime-only | craftworks-sdk `domains/fleet/governance/policy-registry.ts` | Medium | M | CONTRIBUTE |
| 22 | **Fleet Drift Detector** (hash-based drift, severity classification) | Runtime-only | craftworks-sdk `domains/fleet/governance/drift-detector.ts` | High | S | CONTRIBUTE |
| 23 | **Fleet Compliance Report** (JSONL trends, ViewSchema) | Runtime-only | craftworks-sdk `domains/fleet/governance/compliance-report.ts` | High | S | CONTRIBUTE |
| 24 | **Identity Provider + RBAC** | Runtime-only | craftworks-sdk `domains/guard/identity/` | High | S | CONTRIBUTE |
| 25 | **Policy Templates** (EU AI Act, SOC2, minimal) | Neither (config) | compiler-sdk `templates/policies/*.yaml` | High | S | CONTRIBUTE |
| 26 | **Guard CLI** (6 commands: check, budget, scan, assess, comply, monitor) | CLI surface | guard-cli `commands/` | Low | L | KEEP |
| 27 | **Expression Policy Enforcement** (deny/review/limit rules) | Both | craftworks-sdk `where/governance.ts` | Low | M | KEEP |
| 28 | **Secret Detection Patterns** | Compile-time | compiler-sdk `security/secret-patterns.ts` | High | S | CONTRIBUTE |
| 29 | **SIEM/Audit event emission** | Runtime-only | craftworks-sdk `audit-trail.ts` (emitAuditedEvent) | High | S | CONTRIBUTE |
| 30 | **WAL** (write-ahead log for crash recovery) | Runtime-only | compiler-sdk `integrity/` | Medium | M | CONTRIBUTE |

---

## Separability Analysis Per Capability

### CONTRIBUTE -- 18 capabilities (clean extraction possible)

**5. Fence FE1: Self-modification prevention**
Layer: Runtime. FE1 is pure string-based Bash command analysis against a protected path list. Zero compiler dependency -- it takes a command string and a workspace root, returns allow/deny. Extractable as a standalone `@openclaw/fence-runtime` module.

**6. Fence FE2: Tool restriction stub**
Layer: Runtime. Currently a stub that emits FE-06 warnings. The type definitions (AgentTier T0-T4) and check interface are clean. Extractable alongside FE1.

**8. Fence FE6: Section locks**
Layer: Both (manifest loading is filesystem, verification is hash-based). The section-locks module uses node:crypto and node:fs only. The RBAC role type is inlined to avoid cross-package deps. The FE6 pass itself reads section-locks.json and calls verifySectionLocks(). Clean extraction after decoupling the schema from zod (or bundling zod as a peer dep).

**10. CGR type system**
Layer: Compile-time types, but the schemas (PhaTypeSchema, ChangeTypeSchema, CgrRecordSchema, CgrLogSchema) are pure Zod schemas with no compiler dependency. They define the governance record contract. Extractable as `@openclaw/governance-types`.

**11. Policy Engine (partial)**
Layer: Both. The PolicyEngine evaluates policies at 3 checkpoints (pre, per-stage, post). It imports RELAX AST types and evaluator from compiler-sdk. The LLM-evaluation path (check functions) has zero compiler dependency. The RELAX-evaluation path requires the RELAX AST and evaluator. **Extraction strategy**: split into `PolicyEngineCore` (LLM rules only, zero deps) and `PolicyEngineRelax` (requires RELAX). The core is CONTRIBUTE; the RELAX extension is KEEP.

**12. Charter Enforcer**
Layer: Runtime-only. Imports only from workspace-types.ts and context-assembler.ts (for CLASSIFICATION_LEVELS array). The enforcer manages budget caps, kill switches with audit trail, classification ceilings, and approval gates. Only dependency is a string-level classification hierarchy. Trivially extractable as `@openclaw/charter-enforcer`.

**13. Budget Enforcement**
Layer: Runtime-only. Self-contained module with BudgetIPC interface + InProcessBudgetEnforcement impl. Per-agent ledgers, throttle/deny decisions, overshoot bound calculation. Only dependency is ExecState type from workspace-types. Extractable as `@openclaw/budget-enforcement`.

**14. Audit Trail**
Layer: Runtime-only. Hash-chained audit records with crash-safe 2-event pattern (started + completed). Uses node:crypto and node:fs. Dependencies: computeEvidenceHash (a SHA-256 helper) and scrubSecrets (regex-based scrubber). Clean extraction as `@openclaw/audit-trail`.

**15. Governance Rule Loader**
Layer: Both. Parses YAML governance files into GovernanceEntry[]. Depends on RELAX parser from compiler-sdk for predicate parsing. **Extraction strategy**: the loader's YAML parsing and validation are clean; the RELAX predicate parsing is a pluggable concern. Extract with a parser-injection pattern (pass RELAX parser as a dependency, default to prose-only mode without it).

**16. Governance Composition Algebra**
Layer: Runtime-only. Pure functional composition of governance rules across scopes. No compiler dependency -- operates on GovernanceEntry[] with scope precedence and rule type precedence. Extractable directly.

**19. Governance Context**
Layer: Runtime-only. Deterministic hashing for cross-host trust verification. SHA-256 with nonce, single-use nonces with 5-minute TTL, canonical JSON. Zero compiler dependency. Extractable as `@openclaw/governance-context`.

**20. Artifact Signer**
Layer: Runtime-only. HMAC-SHA256 signing for compliance artifacts. Manifest generation, signing, verification. Zero external dependencies (node:crypto only). Extractable as `@openclaw/artifact-signer`.

**21. Fleet Policy Registry**
Layer: Runtime-only. 8-kind discriminated union for fleet policies, floor-principle composition (local can only tighten). Depends on zod and node:fs. Extractable with the policy type schemas.

**22. Fleet Drift Detector**
Layer: Runtime-only. Hash-based drift detection across fleet workspaces. Severity classification (critical for security-relevant rule kinds). Clean dependency chain (hash-utils, scan-cache, policy-registry types).

**23. Fleet Compliance Report**
Layer: Runtime-only. JSONL trend tracking, compliance score computation, ViewSchema adaptation. Depends on policy-broadcast types and ViewSchema from agent-sdk. Medium coupling to ViewSchema -- extractable if ViewSchema is also open-sourced or replaced with a generic interface.

**24. Identity Provider + RBAC**
Layer: Runtime-only. Role resolution (admin/editor/viewer/deployer), permission matrix, evaluatePermission(). Clean extraction.

**25. Policy Templates**
Layer: Config only. YAML files defining regulatory frameworks (EU AI Act, SOC2, minimal). No code dependency. Directly publishable.

**28. Secret Detection Patterns**
Layer: Compile-time (used by G3), but the patterns themselves are pure regex arrays. Extractable as a standalone pattern library.

**29. SIEM/Audit event emission**
Layer: Runtime-only. The emitAuditedEvent function implements hash -> scrub -> emit ordering. Clean extraction alongside audit-trail.

**30. WAL (Write-Ahead Log)**
Layer: Runtime-only. Crash recovery for artifact mutations. Medium coupling to the integrity module's hash verification. Extractable with the hash verification utilities.

---

### PUBLISH-SPEC-ONLY -- 4 capabilities

**1. Policy IR type system**
The 8-kind discriminated union (PolicyRuleSchema) is the contract between policy authoring tools and the compiler. Publishing the Zod schemas as a spec allows third-party tooling to validate policies without running the compiler. But the IR design is closely tied to compiler semantics -- the "custom_predicate" kind with "relax" evaluator, for example, is meaningless without the RELAX runtime.

**7. Fence FE5: Trust-tier ACL**
FE5 performs compile-time trust-tier enforcement by resolving agent tiers through role inheritance and checking tool access. The tier model (T0-T4), resolution chain, and diagnostic codes are valuable as a spec. The implementation depends on compiler-sdk's trust-tier types and the ToolTierMapping resolver. Publishing the spec (tier model + resolution semantics) lets others implement compatible enforcement.

**9. CGR emitter**
The CGR emitter takes compiler diagnostics, changes, and PHAs and produces JSON + Markdown governance records. The emitter logic is coupled to compiler output types (GovernanceInput). Publishing the CGR schema (already done via type system #10) and the rendering contract is more useful than extracting the emitter itself.

**18. Governance Adapter (IR -> DataFrame)**
The adapter projects ProgramIR.governance into RELAX-compatible DataFrames. It bridges compiler IR and runtime evaluation. Publishing the DataFrame schema and GovernanceEntry interface enables interop without exposing IR internals.

---

### KEEP -- 8 capabilities (deeply coupled to compiler engine)

**2. Policy compiler (YAML -> PolicySet)**
Deeply integrated with compiler-sdk's config resolution, diagnostic pipeline, and compilation phases. The compiler transforms raw YAML through parse/validation/semantic phases, each producing PolicyDiagnostic records tied to the compiler's diagnostic infrastructure.

**3. Guard passes G1-G4 (skill hardening)**
G1 (input validation), G2 (tool scope), G3 (secret detection), G4 (rate limiting) operate on SkillSet IR and emit diagnostics through DiagnosticSink. They are compiler passes that mutate/annotate skill IR during compilation. Extracting them would require extracting the entire skill IR type system.

**4. Guard passes G5-G6 (bias detect, safety eval)**
Same coupling as G1-G4. These are compiler optimization passes that depend on SkillSet IR, ResolvedConfig, and DiagnosticSink.

**17. Governance RELAX Evaluator**
Tightly coupled to both compiler-sdk's RELAX AST/parser/evaluator and craftworks-sdk's governance adapter. The evaluator bridges compile-time RELAX expressions with runtime governance evaluation. The RELAX language itself is proprietary compiler technology.

**26. Guard CLI (6 commands)**
The CLI is the presentation layer for all governance capabilities. It orchestrates SDK calls, formats output, and manages CLI state. The commands depend on agent-sdk's GovernClient and the full compiler-sdk pipeline. The CLI is the product surface -- keeping it proprietary preserves the commercial offering.

**27. Expression Policy Enforcement**
Uses compiler-sdk's AST pattern matcher for deny/review/limit rules. Deep dependency on RELAX AST types and the pattern matching engine.

---

## Key Findings

### 1. Clean runtime/compile-time split exists

The governance system has a natural architectural boundary:

- **Compile-time** (compiler-sdk): Guard passes (G1-G6), fence enforcement (FE5 trust-tier ACL), CGR emission, policy compilation, RELAX-based evaluation. These operate on compiler IR (SkillSet, ProgramIR, FormaIR) and cannot be extracted without gutting the compiler.

- **Runtime** (craftworks-sdk): Charter enforcer, budget enforcement, audit trail, governance composition, drift detection, compliance reporting, artifact signing, identity/RBAC. These operate on simple data structures (budget caps, hash chains, policy rule arrays) with minimal compiler dependency.

The split is roughly **60% runtime / 40% compile-time** by capability count, but the compile-time capabilities are the ones that provide differentiated value (intelligent skill hardening, trust-tier enforcement, policy compilation).

### 2. RELAX is the coupling point

Five capabilities that would otherwise be runtime-extractable have RELAX dependencies:
- Policy Engine (RELAX rule evaluation path)
- Governance Rule Loader (RELAX predicate parsing)
- Governance RELAX Evaluator (the bridge itself)
- Expression Policy Enforcement (AST pattern matching)
- Governance Adapter (RELAX AST in DataFrame rows)

**Strategy**: Extract the non-RELAX paths of these capabilities and define extension points for RELAX integration. The open-source versions work with LLM-evaluated and prose-only policies; the commercial version adds RELAX-based structural evaluation.

### 3. The "moat" is the compiler integration, not the governance primitives

Individual governance primitives (audit trail, budget enforcement, artifact signing) are not defensible -- any team could build them. The moat is:
- **Guard passes** that analyze skill IR and inject governance instructions
- **FE5 trust-tier resolution** through the role hierarchy at compile time
- **RELAX-evaluated policies** that run at zero token cost
- **CGR emission** that integrates with the full compilation pipeline

Contributing the runtime primitives strengthens the OpenClaw ecosystem (every user gets audit trails, budget caps, compliance reports) without eroding the compiler's competitive advantage.

### 4. Policy templates are high-value, zero-risk contributions

The EU AI Act, SOC2, and minimal policy templates (YAML files) are immediately useful to any OpenClaw user. They contain no proprietary code. Contributing them establishes Craftworks as the governance thought leader in the OpenClaw ecosystem.

### 5. Estimated total extraction effort

| Verdict | Count | Effort range |
|---------|-------|-------------|
| CONTRIBUTE | 18 | 3-6 weeks total (parallelizable) |
| PUBLISH-SPEC-ONLY | 4 | 1 week (spec writing + examples) |
| KEEP | 8 | N/A |

The 18 CONTRIBUTE capabilities can be grouped into 4-5 packages for extraction:
- `@openclaw/governance-types` (CGR schemas, policy types, trust tiers) -- S
- `@openclaw/audit-trail` (hash chain, crash-safe events, artifact signer) -- S
- `@openclaw/budget` (enforcement, per-agent ledger, charter enforcer) -- S
- `@openclaw/policy-runtime` (composition algebra, rule loader, policy engine core) -- M
- `@openclaw/fleet-governance` (drift detector, compliance report, policy registry) -- M

### 6. The identity/RBAC system is a strategic contribution

The identity provider and RBAC model (admin/editor/viewer/deployer with permission matrix) is runtime-only, cleanly separated, and fills a gap in OpenClaw's current offering. Every enterprise deployment needs role-based access control for agent workspaces. Contributing this positions Craftworks as the enterprise governance standard.

### 7. Fence FE1 is uniquely portable

FE1 (self-modification prevention) is pure string analysis -- it checks Bash commands against protected paths using regex patterns. No compiler dependency, no IR, no RELAX. It is the most immediately extractable governance capability and demonstrates Craftworks' defense-in-depth approach.
