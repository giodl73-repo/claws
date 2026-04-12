# Experiment d: Contribution Sequencing -- Prioritized Roadmap

**Method**: design analysis
**Date**: 2026-04-11

---

## 1. Priority Matrix

### Scoring Methodology

Each candidate package is scored across four criteria on a 1-10 scale, then weighted:

| Criterion | Weight | Source |
|-----------|--------|--------|
| Community demand | 40% | inv-c demand rankings, reaction counts, third-party tool existence |
| Extraction effort (inverted: 10 = trivial, 1 = massive) | 20% | exp-a separability scores, effort estimates (S/M/L) |
| Funnel value (drives enterprise claws adoption) | 25% | exp-b funnel logic, "before/after" story for security teams |
| Dependency chain (10 = no blockers, 1 = deep dependency tree) | 15% | exp-a cross-dependency analysis, exp-b monorepo structure |

### Scored Matrix

| Package | Community Demand (40%) | Extraction Effort (20%) | Funnel Value (25%) | Dependency Chain (15%) | **Weighted Score** |
|---------|----------------------|------------------------|-------------------|----------------------|-------------------|
| **identity-bridge** | 9 (Rank 1: 28+ reactions, 3+ issues, workarounds built) | 8 (High separability, S effort, runtime-only) | 9 (Unblocks enterprise SSO, direct security review checkbox) | 9 (Standalone, no cross-deps) | **8.85** |
| **budget-meter** | 8 (Rank 2: entire commercial product built for this) | 9 (High separability, S effort, self-contained state machine) | 8 (Most visible pain point, legible before/after) | 10 (Standalone, zero deps) | **8.50** |
| **audit-chain** | 7 (Rank 3: Clawprint third-party exists, enterprise blocker) | 8 (High separability, S effort, node:crypto only) | 9 (Creates audit awareness, deepest compliance funnel) | 10 (Standalone, zero deps) | **8.20** |
| **secret-scanner** | 5 (Rank 5: moderate demand, plaintext exposure known) | 9 (Pure regex arrays, zero deps, trivially extractable) | 6 (Security hygiene, but not a purchase driver) | 10 (Standalone, zero deps) | **6.80** |
| **siem-emitter** | 6 (Rank 4: enterprise SOC requirement, moderate-strong) | 7 (Medium separability, depends on audit-chain entry format) | 7 (Connects to existing SIEM infrastructure, SOC teams) | 6 (Depends on audit-chain for entry format) | **6.55** |
| **policy-templates** | 4 (Background demand for compliance, not active requests) | 10 (YAML files only, zero code deps) | 8 (Thought leadership, EU AI Act / SOC2 positioning) | 10 (Pure config, no deps) | **6.90** |
| **governance-types** | 3 (No direct user demand, developer-facing) | 9 (Pure Zod schemas, trivially extractable) | 5 (Infrastructure, not user-facing) | 10 (Foundational, no deps, others depend on it) | **5.55** |
| **fence-runtime** (FE1+FE2) | 4 (Part of permissions demand, but not directly requested) | 8 (FE1 is pure string analysis, FE2 is a stub) | 7 (Demonstrates defense-in-depth, security credibility) | 9 (Standalone, minimal deps) | **6.15** |
| **governance-composition** | 3 (No direct user demand, infrastructure) | 8 (Pure functional, zero compiler deps) | 6 (Enables policy stacking, advanced use case) | 8 (Depends on governance-types for entry format) | **5.30** |
| **artifact-signer** | 3 (Implicit in audit/compliance demand) | 9 (HMAC-SHA256, node:crypto only) | 7 (Compliance artifact integrity, audit trail companion) | 9 (Standalone, pairs with audit-chain) | **5.70** |
| **fleet-governance** (drift+compliance+registry) | 4 (Moderate: emerging demand, third-party dashboards) | 5 (Medium separability, M effort, 3 modules to extract) | 9 (Strongest funnel: free fleet primitives -> paid fleet orchestration) | 5 (Depends on governance-types, policy-templates) | **5.80** |
| **WAL** (write-ahead log) | 2 (No direct user demand) | 6 (Medium coupling to integrity module) | 4 (Infrastructure, not visible to buyers) | 7 (Depends on hash utilities) | **3.80** |
| **GuardrailProvider spec** | 8 (Issue #46441, architecturally significant) | 9 (Spec document only, no code extraction) | 8 (Positions Craftworks as governance architect) | 10 (Spec, no code deps) | **8.35** |

### Sorted by Weighted Score

| Rank | Package | Score | Wave |
|------|---------|-------|------|
| 1 | identity-bridge | 8.85 | 1 |
| 2 | budget-meter | 8.50 | 1 |
| 3 | GuardrailProvider spec | 8.35 | 1 |
| 4 | audit-chain | 8.20 | 1 |
| 5 | policy-templates | 6.90 | 2 |
| 6 | secret-scanner | 6.80 | 2 |
| 7 | siem-emitter | 6.55 | 2 |
| 8 | fence-runtime | 6.15 | 2 |
| 9 | fleet-governance | 5.80 | 3 |
| 10 | artifact-signer | 5.70 | 3 |
| 11 | governance-types | 5.55 | 2 |
| 12 | governance-composition | 5.30 | 3 |
| 13 | WAL | 3.80 | 3 |

---

## 2. Three-Wave Roadmap

### Wave 1: Foundation Strike (Weeks 1-4)

**Theme**: Solve the top three enterprise blockers with the least effort. Establish Craftworks as the governance authority in the OpenClaw ecosystem.

#### Deliverables

| # | Deliverable | Source Extraction | Effort | Success Metric |
|---|------------|-------------------|--------|----------------|
| 1a | **GuardrailProvider spec PR** | New document (informed by fence pass architecture) | 3-5 days | PR submitted to openclaw/openclaw addressing #46441 |
| 1b | **@openclaw/identity-bridge** | craftworks-sdk `domains/guard/identity/` | 5-7 days | npm publish, OpenClaw docs reference |
| 1c | **@openclaw/budget-meter** | craftworks-sdk `budget-enforcement.ts` + `charter-enforcer.ts` | 4-6 days | npm publish, blog post with cost reduction story |
| 1d | **@openclaw/audit-chain** | craftworks-sdk `audit-trail.ts` + hash utilities | 4-6 days | npm publish, Clawprint comparison benchmark |

#### Wave 1 Extraction Tasks

**1a. GuardrailProvider spec (FIRST PR)**

This is the single highest-leverage contribution. Issue #46441 already proposes a pluggable guardrail interface. Craftworks submits a spec PR that:
- Defines the `GuardrailProvider` interface (check, authorize, audit methods)
- Specifies the tool authorization lifecycle (pre-check, execute, post-audit)
- Defines trust tiers as a configuration concept (without exposing compile-time resolution)
- Includes reference implementations for shell exec (matching OpenClaw's existing pattern)
- References the identity-bridge and budget-meter packages as concrete providers

The spec is congruent with Craftworks' fence pass architecture (FE1-FE6) but defines only the runtime contract. The compile-time enforcement that makes fences powerful stays proprietary. This positions Craftworks as the architect of OpenClaw's governance interface.

Tasks:
1. Draft GuardrailProvider interface spec (TypeScript types + JSDoc)
2. Write lifecycle documentation (pre-check/execute/post-audit flow)
3. Implement reference provider for shell exec authorization
4. Submit PR against openclaw/openclaw referencing #46441
5. Cross-link to identity-bridge and budget-meter as provider implementations

**1b. identity-bridge extraction**

Source: `craftworks-sdk/src/domains/guard/identity/`

Tasks:
1. Extract RBAC model (admin/editor/viewer/deployer roles, permission matrix)
2. Extract OIDC token validation logic (JWT verification, claims mapping)
3. Remove internal type imports (replace with local type definitions)
4. Remove zod dependency (or include as peer dep with optional validation)
5. Add SAML 2.0 assertion parsing (stub with documented extension point)
6. Write role mapping configuration schema (IdP claims -> OpenClaw permissions)
7. Add integration tests against mock OIDC provider
8. Publish to npm, create ClawHub listing

**1c. budget-meter extraction**

Source: `craftworks-sdk/src/budget-enforcement.ts` + `charter-enforcer.ts`

Tasks:
1. Extract BudgetIPC interface + InProcessBudgetEnforcement
2. Extract per-agent ledger with throttle/deny state machine
3. Extract charter enforcer (budget caps, kill switches, ceilings)
4. Remove ExecState type dependency (replace with generic session context)
5. Add configurable threshold alerts (80%, 90%, 100% of budget)
6. Write token counting adapters for Anthropic, OpenAI, and generic providers
7. Add integration tests for overshoot bound calculation
8. Publish to npm, create blog post showing cost reduction

**1d. audit-chain extraction**

Source: `craftworks-sdk/src/audit-trail.ts` + `computeEvidenceHash` + `scrubSecrets`

Tasks:
1. Extract hash-chained audit record implementation
2. Extract crash-safe 2-event pattern (started + completed)
3. Extract scrubSecrets (regex-based scrubber for API keys, tokens)
4. Remove internal imports, replace with standalone crypto utilities
5. Define JSONL schema for audit entries (publishable spec)
6. Add chain verification CLI command (`npx @openclaw/audit-chain verify`)
7. Add integration tests for crash recovery scenarios
8. Publish to npm, benchmark against Clawprint (the third-party alternative)

#### Wave 1 Dependencies

```
GuardrailProvider spec (no deps)
  |
  +-- references --> identity-bridge (no deps)
  +-- references --> budget-meter (no deps)
  
audit-chain (no deps, independent track)
```

The spec PR and three packages can proceed in parallel. The spec references the packages but does not depend on them -- it can ship first with "see also" links added when packages publish.

#### Wave 1 Success Metrics

| Metric | Target |
|--------|--------|
| GuardrailProvider spec PR submitted | Within week 1 |
| PR receives maintainer engagement (comments, review) | Within week 2 |
| 3 packages published to npm | By week 4 |
| Combined weekly downloads (identity-bridge + budget-meter + audit-chain) | >500 by end of week 4 |
| At least 1 OpenClaw community blog/tweet referencing the packages | By week 4 |
| GitHub stars on openclaw-governance repo | >100 by end of week 4 |
| Foundation conversation initiated re: @openclaw/ scope | By week 2 |

---

### Wave 2: Ecosystem Expansion (Weeks 5-8)

**Theme**: Fill out the governance surface area. Add compliance tooling, secret detection, and the type foundations that Wave 3 builds on.

#### Deliverables

| # | Deliverable | Source Extraction | Effort | Success Metric |
|---|------------|-------------------|--------|----------------|
| 2a | **@openclaw/siem-emitter** | craftworks-sdk `domains/guard/audit/siem-emitter.ts` | 5-7 days | npm publish, SIEM integration guide |
| 2b | **@openclaw/secret-scanner** | compiler-sdk `security/secret-patterns.ts` | 3-4 days | npm publish, vulnerability detection demo |
| 2c | **@openclaw/governance-types** | compiler-sdk `types/governance.ts` + craftworks-sdk governance types | 3-5 days | npm publish, typed governance contract |
| 2d | **Policy templates (EU AI Act, SOC2, minimal)** | compiler-sdk `templates/policies/*.yaml` | 2-3 days | PR to openclaw-governance repo |
| 2e | **fence-runtime (FE1+FE2)** | compiler-sdk `compiler/fence/fe1-self-modify.ts`, `fe2-tool-restrict.ts` | 4-5 days | npm publish, GuardrailProvider reference impl |
| 2f | **Audit chain format spec** | New document (from audit-chain JSONL schema) | 3-4 days | Published on docs site |

#### Wave 2 Extraction Tasks

**2a. siem-emitter extraction**

Source: `craftworks-sdk/src/domains/guard/audit/siem-emitter.ts`

Tasks:
1. Extract CEF, NDJSON, and syslog RFC 5424 format emitters
2. Define audit-chain entry reader interface (depends on audit-chain entry format)
3. Add configurable output targets (file, stdout, HTTP endpoint, syslog socket)
4. Write format mapping documentation for SOC teams
5. Add integration tests with mock SIEM collector
6. Publish to npm

**2b. secret-scanner extraction**

Source: `compiler-sdk/src/security/secret-patterns.ts`

Tasks:
1. Extract regex pattern arrays (API keys, tokens, passwords, private keys)
2. Add entropy-based detection (Shannon entropy threshold for hex/base64 strings)
3. Package as both library (import) and CLI (`npx @openclaw/secret-scanner scan .`)
4. Add configurable pattern sets (extend/override default patterns)
5. Write false-positive suppression guide
6. Publish to npm

**2c. governance-types extraction**

Source: `compiler-sdk/src/types/governance.ts` (PhaTypeSchema, ChangeTypeSchema, CgrRecordSchema, CgrLogSchema)

Tasks:
1. Extract Zod schemas for CGR records, PHA types, change types
2. Extract trust tier type definitions (T0-T4 with descriptions)
3. Extract policy rule kind discriminated union (8 kinds)
4. Remove compiler-specific references (keep only the contract types)
5. Add TypeScript-only exports (no Zod required for type consumers)
6. Publish to npm as the canonical governance type package

**2d. Policy templates**

Source: `compiler-sdk/src/templates/policies/*.yaml`

Tasks:
1. Copy EU AI Act, SOC2, and minimal policy YAML templates
2. Strip any compiler-specific directives (keep only policy declarations)
3. Add documentation headers explaining each template
4. Add a template authoring guide
5. Commit to openclaw-governance repo

**2e. fence-runtime extraction**

Source: `compiler-sdk/src/compiler/fence/fe1-self-modify.ts`, `fe2-tool-restrict.ts`

Tasks:
1. Extract FE1 (Bash command analysis against protected path list)
2. Extract FE2 (agent tier type definitions T0-T4, check interface)
3. Package as a GuardrailProvider implementation (conforming to Wave 1 spec)
4. Add configurable protected path lists
5. Write integration tests for common evasion patterns
6. Publish to npm, link from GuardrailProvider spec as reference implementation

**2f. Audit chain format spec**

Tasks:
1. Formalize the JSONL schema from audit-chain as a specification document
2. Document hash chain protocol (SHA-256, previous-hash linking, genesis entry)
3. Document crash recovery protocol (2-event pattern semantics)
4. Publish on governance docs site
5. Submit as RFC candidate when foundation process exists

#### Wave 2 Dependencies

```
governance-types (no deps, foundational)
  |
  +-- used by --> siem-emitter (depends on audit-chain from Wave 1)
  +-- used by --> fence-runtime (standalone, implements GuardrailProvider from Wave 1)

secret-scanner (no deps)
policy-templates (no deps)
audit-chain-format-spec (depends on audit-chain from Wave 1 for reference)
```

siem-emitter is the only Wave 2 package with a hard dependency (audit-chain entry format from Wave 1). governance-types should ship first in Wave 2 since Wave 3 packages depend on it.

#### Wave 2 Success Metrics

| Metric | Target |
|--------|--------|
| 5 additional packages published | By week 8 |
| GuardrailProvider spec PR merged or in active iteration | By week 6 |
| Combined weekly downloads across all packages | >2,000 by end of week 8 |
| At least 1 enterprise POC using identity-bridge + audit-chain | By week 8 |
| Audit chain format spec published on docs site | By week 7 |
| Policy templates referenced in at least 1 community guide | By week 8 |
| Foundation scope decision received | By week 6 |

---

### Wave 3: Enterprise Funnel Completion (Weeks 9-16)

**Theme**: Ship the packages that create the strongest pull toward claws. Fleet governance primitives that work standalone but become dramatically more powerful with compile-time enforcement.

#### Deliverables

| # | Deliverable | Source Extraction | Effort | Success Metric |
|---|------------|-------------------|--------|----------------|
| 3a | **@openclaw/fleet-governance** (drift+compliance+registry) | craftworks-sdk `domains/fleet/governance/` | 10-14 days | npm publish, fleet governance quickstart |
| 3b | **@openclaw/artifact-signer** | craftworks-sdk `domains/guard/audit/artifact-signer.ts` | 3-4 days | npm publish, signing verification demo |
| 3c | **@openclaw/governance-composition** | craftworks-sdk `governance/governance-composition.ts` | 4-6 days | npm publish, multi-scope policy demo |
| 3d | **@openclaw/governance-context** | craftworks-sdk `governance-context.ts` | 3-4 days | npm publish, cross-host trust demo |
| 3e | **Trust tier specification** | New document (from FE5 tier model) | 5-7 days | Published on docs site, RFC candidate |
| 3f | **Governance rule loader (core)** | craftworks-sdk `governance/governance-rule-loader.ts` | 5-7 days | npm publish with parser-injection pattern |

#### Wave 3 Extraction Tasks

**3a. fleet-governance extraction**

Source: `craftworks-sdk/src/domains/fleet/governance/` (policy-registry, drift-detector, compliance-report)

Tasks:
1. Extract policy-registry (8-kind discriminated union, floor-principle composition)
2. Extract drift-detector (hash-based drift, severity classification)
3. Extract compliance-report (JSONL trends, score computation)
4. Replace ViewSchema dependency with generic report interface
5. Add fleet scan CLI command (`npx @openclaw/fleet-governance scan`)
6. Write fleet governance quickstart guide
7. Add integration tests for multi-workspace scenarios
8. Publish to npm

This is the strongest funnel package. Fleet governance gives users drift detection, compliance scoring, and policy enforcement across multiple agent workspaces -- for free. But the free version uses runtime hash comparison. The paid version (claws) adds compile-time policy verification, trust tier resolution through role hierarchies, and RELAX-based structural evaluation. The gap between "good enough for small teams" and "enterprise-grade for 500 agents" is the conversion driver.

**3b. artifact-signer extraction**

Source: `craftworks-sdk/src/domains/guard/audit/artifact-signer.ts`

Tasks:
1. Extract HMAC-SHA256 signing logic
2. Extract manifest generation and verification
3. Add configurable signing algorithms (HMAC-SHA256 default, extensible)
4. Write compliance artifact signing guide
5. Publish to npm as audit-chain companion

**3c. governance-composition extraction**

Source: `craftworks-sdk/src/governance/governance-composition.ts`

Tasks:
1. Extract scope resolution algebra (workspace > project > organization precedence)
2. Extract rule type precedence (deny > review > limit > allow)
3. Define GovernanceEntry interface (depends on governance-types)
4. Write multi-scope policy composition guide
5. Publish to npm

**3d. governance-context extraction**

Source: `craftworks-sdk/src/governance-context.ts`

Tasks:
1. Extract deterministic hashing for cross-host trust verification
2. Extract single-use nonce system with 5-minute TTL
3. Extract canonical JSON serialization
4. Write cross-host governance verification guide
5. Publish to npm

**3e. Trust tier specification**

Tasks:
1. Formalize the T0-T4 tier model (from FE5 architecture)
2. Document tier semantics (what each tier allows/denies)
3. Document tier resolution chain (role inheritance, scope precedence)
4. Publish as spec (runtime semantics only; compile-time resolution is proprietary)
5. Submit as RFC candidate alongside audit chain format spec

**3f. governance-rule-loader (core)**

Source: `craftworks-sdk/src/governance/governance-rule-loader.ts`

Tasks:
1. Extract YAML parsing and GovernanceEntry[] validation
2. Implement parser-injection pattern (pass RELAX parser as optional dependency)
3. Default to prose-only mode (no RELAX predicates) without the injection
4. Document extension point for commercial RELAX integration
5. Publish to npm

#### Wave 3 Dependencies

```
governance-types (from Wave 2)
  |
  +-- used by --> fleet-governance (also depends on policy-templates from Wave 2)
  +-- used by --> governance-composition
  +-- used by --> governance-rule-loader

audit-chain (from Wave 1)
  |
  +-- used by --> artifact-signer

trust-tier-spec (depends on governance-types for T0-T4 definitions)
governance-context (standalone, but pairs with fleet-governance)
```

#### Wave 3 Success Metrics

| Metric | Target |
|--------|--------|
| fleet-governance published with scan CLI | By week 12 |
| All Wave 3 packages published | By week 16 |
| Combined weekly downloads across all packages | >5,000 by week 16 |
| At least 1 enterprise converting from free fleet-governance to paid claws | By week 16 |
| Trust tier spec published, referenced by 2+ community projects | By week 16 |
| Total GitHub stars on openclaw-governance repo | >500 by week 16 |
| ClawHub governance skill referencing Craftworks packages | By week 14 |

---

## 3. The First PR: GuardrailProvider Spec for Issue #46441

### Why This Is the First Contribution

The GuardrailProvider spec targeting issue #46441 is the optimal first PR because it maximizes all four criteria simultaneously:

| Criterion | Score | Rationale |
|-----------|-------|-----------|
| Community demand | 9/10 | #46441 identifies the most architecturally significant governance gap. #8081 (RBAC, 28 reactions) and #48532 (permission escalation) are symptoms of the same root cause: no pluggable authorization interface. |
| Extraction effort | 9/10 | It is a specification document, not code extraction. Write time is 3-5 days. No dependency untangling, no test migration, no npm publishing pipeline. |
| Funnel value | 9/10 | Defining the interface means Craftworks defines the contract that all governance providers must implement. Every future guardrail -- including competitors' -- conforms to our architecture. The compile-time version (fence passes) becomes the premium implementation of our own spec. |
| Dependency chain | 10/10 | A spec PR has zero dependencies. It does not require the monorepo, the npm scope, the foundation agreement, or any extracted package to exist first. |

### The PR Strategy

**Title**: `feat: Pluggable GuardrailProvider interface for tool authorization`

**References**: Closes #46441, relates to #8081, #48532, #7829, #23276

**Content**:

1. **GuardrailProvider interface** (TypeScript)
   - `preAuthorize(tool: ToolInvocation, context: AgentContext): AuthorizationDecision`
   - `postAudit(tool: ToolInvocation, result: ToolResult, context: AgentContext): void`
   - `getCapabilities(): ProviderCapabilities` (declares which tool types the provider handles)

2. **AuthorizationDecision type**
   - `allow` (proceed with execution)
   - `deny(reason: string)` (block with explanation)
   - `review(prompt: string)` (require human approval, with context)
   - `modify(tool: ToolInvocation)` (rewrite the invocation for safety)

3. **Provider registry** (chain-of-responsibility pattern)
   - Multiple providers can be registered, evaluated in priority order
   - First deny wins; all allows required; any review triggers approval flow
   - Composable: organization-level provider + workspace-level provider stack

4. **Reference implementation: ShellExecProvider**
   - Wraps OpenClaw's existing exec approval logic as a GuardrailProvider
   - Demonstrates migration path from current binary allow/deny to the richer model
   - Addresses #48532 (argument-aware authorization, not just binary path matching)

5. **Extension points documented**
   - File write authorization (addresses #46441's `~/.ssh/authorized_keys` example)
   - MCP tool authorization (addresses #46441's arbitrary tool execution concern)
   - Network request authorization (egress control)
   - Identity-aware authorization (when paired with identity-bridge)
   - Budget-aware authorization (when paired with budget-meter)

### Why a Spec PR, Not a Code PR

A code PR requires understanding OpenClaw's internal architecture, matching their coding style, passing their CI, and navigating maintainer preferences on implementation details. That is weeks of back-and-forth.

A spec PR defines the interface contract. It invites the community to implement it. If they accept the spec but want to implement it differently, Craftworks still wins -- the interface was designed with our fence pass architecture in mind. The compile-time version (claws) will be the most complete implementation of a spec we wrote.

### Timing

Submit within week 1. Do not wait for the monorepo, the npm scope, or the foundation agreement. The spec PR has zero prerequisites and maximum signal value. It announces Craftworks' governance expertise to the OpenClaw community before any package ships.

---

## 4. Spec vs Package Sequencing Decision

### Should specs precede or follow package contributions?

**Answer: Specs and packages should ship in parallel, with the GuardrailProvider spec slightly ahead.**

The reasoning:

| Approach | Pros | Cons | Verdict |
|----------|------|------|---------|
| Specs first, packages later | Establishes authority before code ships; community can review architecture before implementation | Delays tangible value; specs without implementations feel academic; risk of "all talk, no code" perception | Partially adopt |
| Packages first, specs later | Immediate tangible value; code speaks louder than specs; proves capability | No architectural authority; spec may not match what shipped; retrofitting is painful | Partially adopt |
| Parallel: spec in week 1, packages in weeks 2-4 | GuardrailProvider spec frames the conversation; packages prove capability within the same breath; spec and packages reference each other | Requires coordinated execution | **Recommended** |

The GuardrailProvider spec PR in week 1 frames the governance conversation. The identity-bridge, budget-meter, and audit-chain packages in weeks 2-4 demonstrate that Craftworks is not just proposing -- it is shipping. The spec references the packages as implementations; the packages reference the spec as their design contract.

The audit chain format spec (Wave 2) and trust tier specification (Wave 3) follow their respective packages. These are formalization specs -- they document what already works, rather than proposing what should exist. They are stronger after the packages have real users.

### Sequencing Summary

```
Week 1:  GuardrailProvider spec PR (proposes interface)
Week 2-4: identity-bridge, budget-meter, audit-chain (ships implementations)
Week 5-7: audit-chain-format-spec (formalizes what shipped)
Week 9-12: trust-tier-spec (formalizes the tier model after fence-runtime proves it)
```

---

## 5. Foundation Politics Sequencing

### The @openclaw/ Scope Decision Gate

From exp-b: "Before publishing anything under `@openclaw/`, secure a formal publishing agreement with the OpenClaw foundation."

This creates a critical-path dependency that must be managed in parallel with Wave 1 extraction work:

| Week | Foundation Track | Engineering Track |
|------|-----------------|-------------------|
| 1 | Initiate foundation contact; request scope publishing rights, RFC process status, docs subdomain | Submit GuardrailProvider spec PR; begin identity-bridge extraction |
| 2 | Follow up on scope request; provide governance package proposal doc | Continue extraction of identity-bridge, budget-meter, audit-chain |
| 3 | Negotiate publishing agreement terms | Complete extraction, test packages internally |
| 4 | **Decision gate**: @openclaw/ scope granted or denied | Publish under @openclaw/ if granted, @craftworks/ if denied |

**If the foundation conversation stalls**: Do not wait. Publish under `@craftworks/` and proceed. The scope can be migrated later (npm supports package renames via deprecation + republish). Losing 4 weeks of momentum to scope politics is worse than using a suboptimal scope temporarily.

**If the foundation explicitly denies scope access**: Publish under `@craftworks/`. Add `openclaw-governance` keyword tags to all package.json files for npm search discoverability. The brand attribution benefit of `@craftworks/` partially compensates for the adoption friction.

---

## 6. Risk Analysis

### Wave 1 Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| **GuardrailProvider spec rejected by maintainers** | Medium (30%) | High -- loses architectural authority positioning | Pre-socialize the spec design with active OpenClaw maintainers before submitting the formal PR. Reference #46441 heavily. If rejected, publish as a standalone spec on the governance docs site and implement it in the contributed packages anyway. |
| **Foundation scope negotiation stalls** | High (50%) | Medium -- delays @openclaw/ publishing, not engineering | Fall back to @craftworks/ scope immediately. Do not block engineering on politics. Scope migration is possible later. |
| **identity-bridge extraction reveals hidden RELAX dependency** | Low (15%) | Medium -- delays extraction by 1-2 weeks | exp-a analysis shows identity/RBAC is runtime-only with High separability. If RELAX deps surface, extract the non-RELAX path and define extension point. |
| **Clawprint maintainer publishes competing @openclaw/audit-chain** | Low (10%) | High -- naming collision, community confusion | Submit to the foundation scope early. If collision occurs, differentiate on features (crash-safe 2-event pattern, SIEM integration path). |
| **Low initial adoption (< 100 downloads/week)** | Medium (40%) | Medium -- slows momentum, weakens funnel argument | Pre-seed with blog posts, OpenClaw community Discord announcements, ClawHub skill listing. Ask early adopters for testimonials. |

### Wave 2 Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| **siem-emitter format diverges from enterprise SIEM expectations** | Medium (30%) | Medium -- requires format iterations | Partner with 1-2 enterprise SOC teams during development. Validate CEF field mappings against Splunk, QRadar, Sentinel. |
| **Policy templates face regulatory accuracy challenges** | Medium (35%) | Low -- templates are starting points, not legal advice | Add prominent disclaimers. Frame as "reference templates" not "compliance solutions." Engage legal review before publishing EU AI Act template. |
| **Community perceives governance-types as premature abstraction** | Low (20%) | Low -- types are infrastructure, low visibility | Ship governance-types alongside concrete packages that use it (siem-emitter, fence-runtime). Never ship types alone. |
| **fence-runtime FE1 bypass discovered post-publication** | Medium (25%) | High -- security credibility damage | Conduct internal red-team exercise before publishing. Document known limitations (FE1 is defense-in-depth, not a sandbox). Frame as "detection" not "prevention." |

### Wave 3 Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| **fleet-governance cannibalizes paid claws fleet product** | Medium (30%) | High -- undermines revenue model | Carefully scope the free version: hash-based drift detection only. Reserve compile-time policy verification, RELAX evaluation, and trust-tier resolution for claws. The free version answers "is something different?" The paid version answers "is it compliant?" |
| **governance-rule-loader parser-injection pattern confuses users** | Medium (35%) | Low -- API design issue, fixable | Ship with comprehensive documentation. Provide zero-config default (prose-only mode) that works without any injection. Make RELAX injection feel like a power-user feature, not a missing dependency. |
| **Trust tier spec reveals too much about FE5 compile-time architecture** | Low (15%) | Medium -- reduces compiler moat | Publish only the runtime tier model (T0-T4 definitions, what each tier allows). Keep the compile-time resolution chain (role inheritance, workspace config lookup, trust tier elevation) proprietary. The spec defines the "what," claws implements the "how." |
| **Enterprise conversion from free fleet-governance to paid claws does not materialize** | Medium (40%) | High -- undermines entire contribution strategy | Track adoption telemetry from day 1. If fleet-governance users do not convert after 16 weeks, reassess the funnel thesis. Consider adding "powered by Craftworks -- upgrade to claws for compile-time enforcement" messaging. |

### Cross-Wave Systemic Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| **OpenClaw foundation takes adversarial stance toward commercial contributors** | Low (15%) | Critical -- blocks all @openclaw/ publishing, damages brand | Contribute the GuardrailProvider spec first (pure community value, no commercial angle). Build goodwill before publishing packages. If adversarial, pivot to @craftworks/ scope entirely and compete on quality. |
| **Competitor (NemoClaw, AxonFlow) submits competing governance packages first** | Medium (25%) | High -- loses first-mover positioning | Move fast. Wave 1 in 4 weeks is aggressive but achievable given the S-effort extraction scores. The GuardrailProvider spec PR in week 1 stakes the claim even if packages follow later. |
| **Maintenance burden of 12+ open-source packages overwhelms Craftworks team** | Medium (30%) | Medium -- quality degrades, community trust erodes | Start with the 4 Wave 1 packages. Do not commit to Wave 2/3 until Wave 1 is stable and maintainable. Use Dependabot, automated CI, and community co-maintainers. Budget 1 engineer-day per week for open-source maintenance. |
| **Contributing runtime primitives teaches competitors how to build governance** | Low (20%) | Low -- the primitives are not the moat (exp-a Finding 3) | The moat is compiler integration, not governance primitives. Any team could build a hash-chain audit logger. The value is in guard passes that analyze skill IR, FE5 trust-tier resolution through role hierarchies, and RELAX-evaluated policies. These stay proprietary. |

---

## 7. Key Findings

### Finding 1: The GuardrailProvider spec is the highest-leverage first move

Across all four scoring criteria, the GuardrailProvider spec PR targeting issue #46441 scores highest (8.35 weighted, and 10/10 on dependency chain). It requires zero code extraction, zero npm publishing infrastructure, zero foundation agreement. It can ship in week 1 and immediately positions Craftworks as the governance architect for the OpenClaw ecosystem. Every subsequent package contribution is a concrete implementation of the interface Craftworks defined.

### Finding 2: The identity-budget-audit triple is the Wave 1 package set

These three packages address the top three community demand signals (RBAC, cost control, audit logging) and all have High separability with S effort estimates. They are independent (no cross-dependencies), so they can be extracted in parallel. Together they solve the three checkboxes that block enterprise security review: "Who can do what?" (identity-bridge), "How much can they spend?" (budget-meter), "What did they do?" (audit-chain).

### Finding 3: Specs should lead packages by days, not weeks

The GuardrailProvider spec in week 1 frames the architectural conversation. Packages in weeks 2-4 prove capability. Later specs (audit chain format, trust tier model) formalize what has already shipped and been validated by real users. This "propose-then-prove" cadence builds credibility faster than either specs-only or code-only approaches.

### Finding 4: Fleet governance is the strongest funnel package but needs the most careful scoping

fleet-governance (drift detection, compliance reporting, policy registry) scores highest on funnel value (9/10) but carries the most cannibalization risk. The free version must clearly stop at "detect drift" and "compute compliance score." The paid version (claws fleet orchestration) must clearly own "enforce policy" and "resolve trust tiers." This boundary must be designed before extraction begins, not discovered during extraction.

### Finding 5: Foundation politics are on the critical path but must not block engineering

The @openclaw/ npm scope is the best outcome for adoption but depends on a foundation relationship that does not yet exist. The engineering roadmap must proceed regardless. Publish under @craftworks/ if necessary and migrate later. The worst outcome is 16 weeks of waiting for a scope decision while competitors ship governance packages.

### Finding 6: The contribution sequence creates a self-reinforcing authority flywheel

```
Week 1: Spec PR -> "Craftworks proposes governance architecture"
Week 4: 3 packages ship -> "Craftworks delivers governance implementations"
Week 8: 8+ packages ship -> "Craftworks IS the governance layer"
Week 16: Fleet governance + specs -> "Enterprise governance requires claws"
```

Each wave strengthens the next. The spec PR creates credibility. The first packages prove execution. The ecosystem expansion creates dependency. The fleet governance creates the purchase trigger. Disrupting this sequence (e.g., shipping fleet-governance before identity-bridge) weakens the flywheel because later steps depend on earlier credibility.

### Finding 7: The "18 CONTRIBUTE" inventory from exp-a maps cleanly to 3 waves

The 18 capabilities tagged CONTRIBUTE in exp-a, when scored against the four criteria, naturally cluster into three tiers matching the wave structure. No capability needs to be forced into a wave where it does not belong. The dependency chains are shallow (max depth 2: governance-types -> fleet-governance) and do not create critical-path bottlenecks between waves.
