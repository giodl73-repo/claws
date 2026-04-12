# CL-06: Platform Ecosystem

**Status**: Draft
**Source**: Q12k, Q12l, Q12n
**Reviewers**: platform-engineer, enterprise-architect, ecosystem-strategist

---

## Overview

This spec defines the package ecosystem that makes claws more than a CLI -- it is a platform. Three tiers of packages serve three audiences: @openclaw/* (5 contributed packages for any OC developer), @claws/* (11+ standalone libraries for governance-aware skill developers), and @craftworks/* (compiler-internal, never in generated output).

The critical insight is that claws does not extract FROM Craftworks -- it is a new frontend for existing Craftworks infrastructure. The governance IR, policy compiler, RELAX engine, audit chain, cache, and report infrastructure already exist (~160 files across 3 SDKs). claws adds new readers, new emitters, a CLI surface, and the shared library ecosystem.

The ecosystem maps to the 5,198-skill OpenClaw ecosystem: 165 skills cross OBO boundaries, 322 browser skills have 100% injection risk surface, 111 R5 TRANSACT skills need budget enforcement, and 98.4% of skills have NO governance relationship today. The @openclaw/* packages are genuine ecosystem contributions that happen to be powered by Craftworks infrastructure. The @claws/* libraries provide standalone value independent of the compiler.

## Scope

**In scope**:
- Three-tier package model (@openclaw/*, @claws/*, @craftworks/*)
- 11+ @claws/* standalone libraries with APIs and size budgets
- 5 @openclaw/* contributed packages
- PRESS-to-pinch mapping (token optimization -> governance optimization)
- Skill package compilation (`claws build` emits installable OC skill packages)
- Adoption path (standalone libraries -> compiler -> fleet -> enterprise)
- OBO census (165 skills across 6 OBO types)
- Three-tier skill adoption (DECLARED/TYPED/VERIFIED)
- ClawHub governance badge integration

**Out of scope**:
- Compilation pipeline internals (CL-04)
- Specific governance rules (CL-02)
- Runtime enforcement (CL-03)
- VS Code extension (CL-05)

**Depends on**: CL-01 (claws.json), CL-04 (compilation pipeline)

## Design

### Three-Tier Package Model

```
@openclaw/* (Tier 1)            @claws/* (Tier 2)              @craftworks/* (Tier 3)
5 contributed packages          11+ standalone libraries       Compiler internal only
OC-native APIs, MIT license     Governance-aware, MIT          Apache 2.0
~40KB total                     ~186KB total                   Never in generated output
    |                               |                               |
    v                               v                               v
Any OC developer               Skill developers                claws compiler
"npm install @openclaw/..."    "npm install @claws/..."       Internal only
```

### Tier 1: @openclaw/* Contributed Packages

| Package | Powered By (Internal) | Size | Ecosystem Value |
|---------|----------------------|------|-----------------|
| `@openclaw/audit-chain` | suite/audit hash chain, WAL, verify, export | ~20KB | Hash-chained audit trails for any OC agent |
| `@openclaw/budget-meter` | govern/GovernanceManager, 80/95/100% thresholds | ~8KB | Token/cost controls with threshold alerts |
| `@openclaw/identity-bridge` | suite/permission, suite/entity-id | ~3KB | Enterprise SSO (OIDC/SAML) for OC agents |
| `@openclaw/siem-emitter` | suite/audit/export (SARIF, CEF, JSON, syslog) | ~5KB | SOC integration in 4 standard formats |
| `@openclaw/secret-scanner` | hashing/computeHash, pattern detection | ~4KB | Credential leak detection for agent workspaces |

Each @openclaw/* package solves a real problem independently. They are genuine contributions to the OC ecosystem, powered by Craftworks infrastructure but useful without the claws compiler.

### Tier 2: @claws/* Standalone Libraries

| Package | Purpose | Standalone? | Size |
|---------|---------|-------------|------|
| `@claws/relax` | Typed expression engine for policy rules | Yes | ~25KB |
| `@claws/audit` | Audit trail with hash chain | Yes | ~15KB |
| `@claws/security` | Input sanitization, injection defense patterns | Yes | ~12KB |
| `@claws/budget` | Token/spending controls for skills | Yes | ~8KB |
| `@claws/data` | Typed data access with sensitivity labels | Yes | ~10KB |
| `@claws/report` | Document generation (markdown, HTML, JSON, PDF) | Yes | ~20KB |
| `@claws/identity` | Agent authentication helpers | Yes | ~5KB |
| `@claws/schema` | Config validation (Zod-based) | Yes | ~8KB |
| `@bic/claws-skill-kit` | skill() factory + 6 governance decorators | Yes | ~35KB |
| `@bic/claws-test` | Scenario runner + governance validator + security scanner | Yes | ~45KB |
| `@claws/runtime` | 7 thin governance helpers (classify, elicit, audit, etc.) | No (needs @openclaw/*) | ~15KB |

All libraries work without the claws compiler. Any OC developer can `npm install @claws/relax` and use typed expressions in their skill. The libraries are standalone value; the compiler is the integration layer.

#### Standalone Usage: @claws/relax (without compiler)

```typescript
import { RelaxEngine, parseExpression } from '@claws/relax';

// Parse a RELAX policy expression
const expr = parseExpression('tool.risk >= R3 AND tool.obo != "none"');

// Evaluate against a tool descriptor
const engine = new RelaxEngine();
const result = engine.evaluate(expr, {
  tool: { name: 'send-email', risk: 'R5', obo: 'email' }
});

console.log(result.matched);  // true
console.log(result.bindings); // { tool: { name: 'send-email', ... } }
```

No claws compiler needed. No claws.json needed. Pure library usage.

#### Standalone Usage: @bic/claws-test (without compiler)

```typescript
import { GovernanceValidator, SecurityScanner } from '@bic/claws-test';

// Validate governance frontmatter against actual skill behavior
const validator = new GovernanceValidator();
const results = await validator.validate({
  skillPath: './SKILL.md',
  handlerPath: './src/handler.ts',
});
console.log(results.passed);   // true/false
console.log(results.findings); // [{ rule: 'declared-vs-actual', ... }]

// Scan for security issues (injection, secrets, eval)
const scanner = new SecurityScanner();
const scan = await scanner.scan('./src/');
console.log(scan.issues);      // [{ rule: 'no-eval', file: '...', line: 42 }]
```

No claws compiler needed. Works as a standalone test library with vitest or jest.

### Tier 3: @craftworks/* (Compiler Internal)

Full SDKs used by the claws compiler. Never appears in generated output:
- compiler-sdk: RELAX engine, CREST parser, format readers/emitters, PRESS IR, cache, diagnostics
- agent-sdk: GovernanceManager, CGR chain, delegation guard, eval framework, discovery
- craftworks-sdk: Not imported by claws-sdk (sibling architecture)

### PRESS-to-pinch Mapping

PRESS (token optimization) generalizes to pinch (governance optimization):

| PRESS Module | pinch Equivalent | Decision |
|-------------|-----------------|----------|
| bipartite-split | governed/ungoverned section split | REUSE (type-parametric) |
| quality-matrix | risk matrix (R1-R5 scoring per tool) | REUSE (injectable config) |
| token-counter | governance cost estimator | CREATE NEW (different algorithm) |
| rewrite-rules | fix-rules (violation auto-remediation) | REUSE (generic transition validator) |
| position-optimizer | rule ordering (cost-based, not attention-based) | CREATE NEW |
| press-profiles | pinch profiles (soc2, hipaa, minimal) | REUSE (generic profile registry) |
| cache-contract | governance cache semantics | REUSE (generic cache contract) |

5 of 7 modules reusable. PRESS modules gain generic interfaces (backward-compatible).

### Skill Package Compilation

`claws build` emits complete installable OC skill packages:

```
my-governance-skill/
  package.json          -- @claws/* as peer deps (deduplication)
  SKILL.md              -- OC skill manifest with governance frontmatter
  src/handlers/         -- before_tool_call, before_agent_delegate, etc.
  src/policies/         -- Compiled rules as typed constants
  tests/                -- Generated test cases
  .claws-manifest.json  -- Build provenance (hash, version, signer)
```

Distribution channels: ClawHub marketplace, private npm registries, `claws broadcast --packages` (fleet push).

### OBO Census (5,198 Skills)

| OBO Type | Count | Highest Concentration |
|----------|-------|----------------------|
| OBO-EMAIL | ~35 | Communication (22), DevOps (8) |
| OBO-MESSAGE | ~25 | Communication (14), Moltbook (8) |
| OBO-CALENDAR | ~20 | Calendar (15), Apple (5) |
| OBO-SOCIAL | ~40 | Marketing (15), Browser (15), Moltbook (10) |
| OBO-PURCHASE | ~15 | Shopping (6), Browser (5), Commerce (4) |
| OBO-TRANSACT | ~30 | Commerce (15), DevOps (10), CLI (5) |
| **Total OBO** | **~165** | **3.2% of ecosystem** |

### Ecosystem Risk Distribution

**Tool Risk (R1-R5)** — per-tool classification based on declared capabilities:

| Risk Level | Skills | % | Governance Response |
|-----------|--------|---|---------------------|
| R2 READ | ~820 | 16% | Audit only, no gate |
| R3 TRANSFORM | ~1,400 | 27% | Data labels required |
| R4 EXECUTE | ~1,850 | 36% | Confirmation gate |
| R5 TRANSACT | ~350 | 7% | Double confirm + budget |
| Unclassified | ~778 | 14% | Capability extraction needed |

**Important**: Tool risk (R1-R5) and regulatory risk classification are SEPARATE frameworks:

| Framework | Scope | Granularity | Command |
|-----------|-------|-------------|---------|
| **Tool Risk (R1-R5)** | Per-tool capability classification | Individual tool | `claws pinch` (G-CLASS) |
| **Regulatory Risk (EU AI Act)** | System-level Article 6 / Annex III classification | Entire agent system | `claws assess` |

`claws assess` maps the agent system to EU AI Act Article 6 risk categories (Unacceptable, High-risk, Limited, Minimal). This is a system-level determination based on the agent's domain, deployment context, and aggregate capabilities -- NOT a rollup of per-tool R1-R5 scores. A system with all R2 tools can still be High-risk under Article 6 if it operates in a regulated domain (healthcare, credit scoring, law enforcement).

### Adoption Path

Each stage provides standalone value. Developers adopt the next stage when their needs grow, not because of lock-in:

```
npm install @claws/relax        Free, standalone, MIT — typed policy expressions
       |
npm install @claws/audit        "We need audit trails" — hash-chained event log
       |
npm install @claws/security     "We need injection defense" — input sanitizers
       |
claws init                      "We want compiled governance" — policy compilation
       |
claws build                     "Compiled governance plugins" — full enforcement
       |
claws pinch --fleet             "Enforce across the org" — fleet consistency
       |
ClawHub + Enterprise license    "Managed governance" — SaaS + support
```

### Three-Tier Skill Adoption

```
Tier 1 DECLARED:   +3 YAML frontmatter   (2-5 min)
  -> Badge + fleet scan + risk visibility

Tier 2 TYPED:      + skill() + decorators (15-30 min)
  -> Type safety + build-time governance validation

Tier 3 VERIFIED:   + claws build          (30-60 min)
  -> Generated tests + signed manifest + full governance
```

98.4% of the 5,198-skill ecosystem has NO governance relationship today. claws's primary value is establishing governance defaults for the ungoverned majority.

### ClawHub Governance Badges

ClawHub displays governance metadata when present:

```
  claws verified
  Risk: R3 (COMMUNICATE)
  OBO: send-email (elicitation)
  Data: INTERNAL
  Supply chain: signed, scanned
  Tier: VERIFIED
```

Badges are additive metadata in the publish API payload. No ClawHub schema changes required.

## Constraints

- **Generated code never imports @craftworks/***: The OC developer test -- if a developer reads the generated code and sees WorkAgentSupervisor, RELAX, or DataFrames, the design has leaked.
- **@claws/* libraries work standalone**: Every library works without the claws compiler. This is the ecosystem play.
- **Peer dependencies for generated packages**: @claws/* libraries are peer deps of generated skill packages for deduplication and version consistency.
- **Capability-based classification, not category tags**: 30% of OC security skills are miscategorized. claws classifies by declared capabilities (file_write, network, exec), not category labels.
- **PRESS generalization is backward-compatible**: Generic interfaces added to PRESS modules do not break existing astro compiler usage.
- **@openclaw/* packages use MIT license**: Matching the OC ecosystem. @craftworks/* proprietary packages use Apache 2.0.

## Anubis-Thoth Amendments

### Skill Lifecycle

**claws/clawhub metadata namespace boundary** *(Source: SK-S03-F08)*: The `claws publish` command wraps `clawhub publish` and injects governance badge metadata into the publish payload. If ClawHub's own metadata fields overlap with claws badge fields (e.g., both define a "security" key), the publish fails or metadata is silently overwritten. The integration point between claws and ClawHub must define a strict namespace boundary for metadata fields -- all claws-injected fields must live under a dedicated namespace prefix (e.g., `claws.*`) to prevent collision with current or future ClawHub metadata.

**ClawHub rendering for skills published without claws** *(Source: SK-S05-F08)*: Skills published directly via `clawhub publish` (bypassing `claws publish`) have no governance badge metadata at all. ClawHub must render these skills without a badge, not with an "unknown" or "error" badge. The absence of a badge is a meaningful signal: the skill was never submitted to governance analysis. This rendering distinction preserves the three-tier adoption model -- ungoverned skills are the 98.4% baseline, not an error state.

### Platform Detection

**Python guard package for LangGraph and CrewAI** *(Source: PD-S06-F02)*: LangGraph guard decorators (e.g., `@claws_guard(risk=3, obo="email")`) must be importable from a claws Python package. This means the ecosystem requires a Python package (`pip install claws-guard`) in addition to the npm @claws/* packages. CL-06's three-tier package model must extend to include a Python tier for the two Python-native platforms (LangGraph and CrewAI). The Python guard package provides the runtime decorators and guard functions that the claws emit phase generates calls to.

**Per-platform OBO context rules** *(Source: PD-S05-F04)*: OBO (on-behalf-of) governance translates differently across platforms. OpenClaw has per-tool OBO declarations in the Gateway; Bedrock operates at the API content-filter level where per-tool OBO has no direct equivalent; LangGraph and CrewAI use Python decorators with OBO parameters. The platform ecosystem must define per-platform OBO context rules that specify how OBO declarations map to each platform's enforcement surface, including which platforms support OBO natively, which require advisory-only OBO, and which lose OBO granularity in translation.

**Enforcement capability versioned per framework release** *(Source: PD-S07-F06)*: The boundary between enforced and advisory governance on semi-enforced platforms (CrewAI, Claude Code) is determined by the framework's guard API capabilities at a specific version. As frameworks evolve and add new guard APIs (e.g., CrewAI adding budget guards or output validators), claws's emission should leverage them. The enforcement capability matrix must be versioned per framework release so that `claws build` targets the correct enforcement surface for the installed framework version.

**Shared Python guard package across LangGraph and CrewAI** *(Source: PD-S07-F03)*: CrewAI is the second Python-adjacent platform after LangGraph, reinforcing that the Python guard package must be shared rather than duplicated. A single `claws-guard` Python package serves both LangGraph (decorator-based guards on graph nodes) and CrewAI (YAML guard configuration and task-level guards). Platform-specific adapters within the shared package handle the differences in guard integration patterns while sharing core governance logic (risk classification, OBO validation, audit chain).

## Pitfall Scenario Amendments (P-162 through P-249)

### Fleet Governance

**P-205: Standing Approval Drift Dashboard** *(Sources: PT1-S09-F06)*: Fleet deployments with hundreds of handlers across many workspaces require fleet-level visibility into standing approval drift. A fleet-level drift dashboard must aggregate standing approval status across all deployed handlers, showing which handlers have stale standing approvals (source configuration changed but handler not recompiled). Fleet operators must be able to trigger batch recompilation from the dashboard. Without fleet-level aggregation, individual workspace drift goes unnoticed until an incident occurs.

**P-208: Per-Workspace Key Isolation** *(Sources: PT1-S12-F10)*: Fleet environments must use per-workspace approval keys rather than a shared fleet-wide key. A single shared key means compromising one workspace compromises all workspaces in the fleet. Per-workspace keys limit the blast radius of a key exposure incident to the affected workspace. The fleet management layer must support per-workspace key provisioning, rotation, and revocation, with an auditable fleet key inventory that tracks key lifecycle across all workspaces.

**P-209: Fleet Identity Impersonation** *(Sources: PT1-S13-F03, PT1-S13-F06, PT1-S13-F07)*: L0 fleet identity (name-only, no cryptographic binding) enables cross-workspace agent impersonation. Three fleet-level controls are required. First, cross-workspace delegation must fail deterministically when agent names are ambiguous -- non-deterministic resolution (dependent on scan order or hash table insertion) means impersonation attacks succeed intermittently, making detection through testing unreliable. Second, fleet broadcast operations (`claws broadcast`) must resolve targets to workspace-qualified identities before delivery; a broadcast to an ambiguous agent name must fail rather than delivering to all matches. Third, the L0-to-L1 migration path must be non-breaking: existing L0 names continue to work within their own workspace but fail on cross-workspace resolution until upgraded to L1 workspace-qualified identity.

**P-215: Cross-Workspace Delegation Tool Listing** *(Sources: PT1-S19-F07)*: The `tools: all` shorthand expands to different tool sets in different workspaces because each workspace may have a different tool manifest. An agent delegated `tools: all` in workspace-A gets a different capability set than the same delegation in workspace-B. This inconsistency is confusing and error-prone in fleet contexts where delegations cross workspace boundaries. Fleet-level governance should require explicit tool listings in all cross-workspace delegations, rejecting the `all` shorthand when the delegation target is in a different workspace.

### ClawHub Marketplace

**P-233: Declared OBO Unverified** *(Sources: PT2-S08-F02, PT2-S08-F07, PT2-S08-F08)*: DECLARED tier badges present self-reported claims without verification, creating three marketplace gaps. First, the ClawHub registry page for a DECLARED skill must include a prominent disclaimer adjacent to the badge (not buried in a details section) stating that claims are self-reported and unverified, with a recommendation to upgrade to VERIFIED tier. Second, badge tier must be filterable in ClawHub search results so consumers can search for "VERIFIED obo: none" skills only, excluding DECLARED skills from results -- without clear visual differentiation, consumers may not notice the trust difference. Third, fleet administrators must be able to set a minimum badge tier for skill installation across their fleet (e.g., "VERIFIED minimum"), providing blanket protection against unverified OBO claims without relying on individual consumers to check badges.

**P-234: Stale Verified Badge** *(Sources: PT2-S09-F06, PT2-S09-F08)*: Handler modifications after verification invalidate the VERIFIED badge, but the ClawHub registry must handle both individual and bulk staleness scenarios. The registry should display the verification date and last-modified date prominently; when verification_date < last_modified_date, the badge should show a visual indicator (e.g., "VERIFIED on Jan 15, updated Jan 18 -- re-verification pending") so consumers can assess badge currency. Additionally, mass downgrade events (e.g., ClawHub discovers a flaw in the verification process and invalidates all badges issued before a certain date) must be handled gracefully with bulk tier downgrade support, notifications to all affected developers, and a re-verification fast track.

## Praetor Integration Amendments

**Package ecosystem distribution** *(CL-07 §2)*: @claws/* and @openclaw/* packages distribute through the craft package output pipeline defined in CL-07. The `packages` section in claws.json declares which governance artifacts are publishable, and the build pipeline handles packaging, manifest generation, and registry upload. This replaces ad-hoc npm publish workflows with a governed distribution channel that includes build provenance and signing.

**OntologyIR for compliance** *(CL-07 §3)*: SOC2, HIPAA, and EU AI Act compliance frameworks are modeled as governance ontologies in OntologyIR format. Each ontology defines the domain's control objectives, risk categories, and evidence requirements as structured IR nodes. The `claws assess` command evaluates workspaces against loaded ontologies. Ontology packages are distributed through the @claws/* tier as versioned compliance definitions (e.g., `@claws/ontology-soc2`, `@claws/ontology-hipaa`).

**Python guard via package output** *(CL-07 §2)*: The `claws-guard` Python package (required by LangGraph and CrewAI platforms) is built through the same package output pipeline as npm packages. The `packages` section in claws.json supports Python package declarations with `format: "wheel"` or `format: "sdist"`. Build provenance and signing apply uniformly across npm and Python distribution channels.

**Platform loss matrix** *(CL-07 §5)*: Each target platform has a governance fidelity profile expressed in the Spec 108 loss matrix format. The matrix classifies every governance rule as fully-enforced, semi-enforced, or advisory-only per platform. The loss matrix is versioned per platform release and influences `--strict-loss` behavior. The @claws/* ecosystem documentation must include the current loss matrix for all 7 supported platforms.

**Ontology packages in adoption** *(CL-07 §3)*: Enterprise customers publish custom compliance ontologies as @claws/* packages through the governed distribution channel. The adoption path extends to include ontology authoring: enterprises define domain-specific governance requirements in `.onto.yaml` format, compile them with `claws compile --ontology`, and distribute them to fleet workspaces via `claws fleet broadcast --packages`. This enables industry-specific governance without modifying the core compiler.

**Badge metadata schema** *(CL-07 §2)*: ClawHub governance badge tier (DECLARED, TYPED, VERIFIED) and associated metadata are stored in the package.json `claws` namespace, generated by the slicer phase of the package output pipeline. The badge metadata includes: tier level, verification timestamp, risk classification summary, OBO declaration count, and signer identity. The slicer extracts badge-relevant fields from the full governance IR and embeds them in the publishable package manifest.

## Integration Scenario Amendments

**Package delegation to fleet workspaces** *(INT-PO-S03)*: Fleet broadcast of governance packages must handle version conflicts when target workspaces depend on different versions of the same @claws/* package. The broadcast must detect conflicts before deployment, report them as fleet drift findings, and support a `--force` flag for override with mandatory audit trail. Workspace-level version pinning takes precedence over fleet broadcast versions.

**Badge tier in incremental builds** *(INT-PO-S04)*: Incremental builds that modify governance rules without full recompilation must invalidate the existing badge tier. A VERIFIED badge downgrades to TYPED when governance IR changes are detected but the full verification pipeline has not re-run. The badge invalidation check must be fast (hash comparison only) and must not require full recompilation to determine if the badge is stale.

**Ontology-driven skill generation** *(INT-OG-S01)*: Compliance ontologies can drive automated skill scaffold generation. A SOC2 ontology declaring "access review" as a control objective can generate a skeleton governance skill with the required tool hooks, data labels, and audit trail integration. The generated skill is DECLARED tier and requires manual upgrade to TYPED/VERIFIED. The generation pipeline flows through `claws new skill --from-ontology`.

**Input resolver for package dependencies** *(INT-IR-S05)*: When governance inputs reference @claws/* packages (e.g., `@claws/ontology-soc2`), the InputResolver must resolve them through npm registry lookup, verify package integrity against the registry-provided SRI hash, and extract governance files from the package contents. The resolution must support private registries configured in `.npmrc` and workspace-level registry overrides in claws.json.

**Package output signing chain** *(INT-PO-S05)*: Published packages must carry a signing chain that traces from the package contents through the build provenance to the signing key in the credential escrow. The signing chain is verified by ClawHub on upload and by fleet workspaces on installation. Broken signing chains (missing intermediate certificates, expired keys) produce installation warnings or errors depending on the workspace trust tier.

**Ontology version compatibility** *(INT-OG-S02)*: Ontology packages must declare compatibility with claws compiler versions. An ontology compiled with claws 2.0 may use IR features not available in claws 1.x. The compatibility check runs during InputResolver resolution and produces CLAWS-E305 if the ontology requires a newer compiler version. Backward-compatible ontology changes (additive controls) must work across compiler versions.

**Ecosystem metrics in loss report** *(INT-LA-S03)*: The `--loss-report` output must include ecosystem-level metrics: total packages affected by lossy emission, per-package fidelity scores, and aggregate fidelity across the package dependency graph. This enables enterprise governance teams to assess the governance quality of their package ecosystem, not just individual workspaces.

## Open Questions

1. Should @claws/* packages be extracted to standalone repos, or remain in the monorepo with clean dependency surfaces?
2. What is the minimum viable governance badge for ClawHub? R-level + OBO declaration + signed manifest?
3. Should claws provide default policies for the top 100 most-installed OC skills (adoption bootstrapping)?
4. How should the 30% skill miscategorization rate be handled? Capability extraction from SKILL.md handler code?
5. When should @claws/relax and @claws/audit ship (highest adoption potential)?

## Research References

| Source | What it contributed |
|--------|-------------------|
| Q12k | Three-tier package model (@openclaw/* + @claws/runtime + @craftworks/*), RELAX/DataFrame compile-to-runtime bridges, module audit (26 direct-reuse, 40+ compile-only, 30+ N/A), generated code OC developer test |
| Q12l | claws-as-new-frontend (not extraction), PRESS-to-pinch mapping (5/7 reusable), skill package compilation, .NET-for-OpenClaw shared library vision, 11 @claws/* packages, adoption path, monorepo workspace architecture |
| Q12n | 5,198 skill ecosystem mapping, OBO census (165 skills, 6 types), risk distribution (R2-R5), replace/complement/enable matrix (8/43/34), three-tier adoption plan (DECLARED/TYPED/VERIFIED), governance badge design |
