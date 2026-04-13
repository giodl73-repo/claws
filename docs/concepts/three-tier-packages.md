# Three-Tier Package Model

<!-- atom:three-tier-packages (C51) -->

claws's package ecosystem has three tiers. Each tier serves a different audience, carries a different license, and follows a strict boundary: generated code never imports from the internal tier.

## The tiers

```
@openclaw/*                    @claws/*                       @craftworks/*
Tier 1: Contributed            Tier 2: Shared libraries       Tier 3: Internal only
5 packages                     11+ packages                   3 SDKs
MIT license                    MIT license                    Apache 2.0
OC-native APIs                 Standalone, governance-aware   Compiler infrastructure
~40KB total                    ~186KB total                   Never in output
     |                              |                              |
     v                              v                              v
Any OC developer               Skill developers               claws compiler
"npm install @openclaw/..."    "npm install @claws/..."       Internal only
```

## Tier 1: @openclaw/* (contributed)

5 packages contributed to the OpenClaw ecosystem. These solve real problems independently. They happen to be powered by Craftworks infrastructure, but they work without claws, without claws.json, without any governance compiler.

| Package | What it does | Size |
|---------|-------------|------|
| `@openclaw/audit-chain` | Hash-chained audit trails for any OC agent | ~20KB |
| `@openclaw/budget-meter` | Token/cost controls with 80/95/100% threshold alerts | ~8KB |
| `@openclaw/identity-bridge` | Enterprise SSO (OIDC/SAML) for OC agents | ~3KB |
| `@openclaw/siem-emitter` | SOC integration in 4 formats (SARIF, CEF, JSON, syslog) | ~5KB |
| `@openclaw/secret-scanner` | Credential leak detection for agent workspaces | ~4KB |

These are genuine ecosystem contributions. An OC developer who never uses claws can `npm install @openclaw/audit-chain` and get a production-quality audit trail. The founder's test: "Are these genuinely useful to the community, or just a funnel?" They are useful.

## Tier 2: @claws/* (shared libraries)

11+ standalone libraries for governance-aware development. Every library works without the claws compiler. The compiler is the integration layer; the libraries are standalone value.

| Package | Purpose | Standalone? | Size |
|---------|---------|-------------|------|
| `@claws/sift` | Typed expression engine for policy rules (sift) | Yes | ~25KB |
| `@claws/audit` | Audit trail with hash chain | Yes | ~15KB |
| `@claws/security` | Input sanitization, injection defense patterns | Yes | ~12KB |
| `@claws/budget` | Token/spending controls for skills | Yes | ~8KB |
| `@claws/data` | Typed data access with sensitivity labels | Yes | ~10KB |
| `@claws/report` | Document generation (markdown, HTML, JSON, PDF) | Yes | ~20KB |
| `@claws/identity` | Agent authentication helpers | Yes | ~5KB |
| `@claws/schema` | Config validation (Zod-based) | Yes | ~8KB |
| `@bic/claws-skill-kit` | `skill()` factory + 6 governance decorators | Yes | ~35KB |
| `@bic/claws-test` | Scenario runner + governance validator + security scanner | Yes | ~45KB |
| `@claws/runtime` | 7 thin governance helpers (classify, elicit, audit) | No* | ~15KB |

\* `@claws/runtime` depends on `@openclaw/*` packages. All others are fully standalone.

### Standalone usage example: @claws/sift

```typescript
import { SiftEngine, parseExpression } from '@claws/sift';

const expr = parseExpression('tool.risk >= R3 AND tool.obo != "none"');
const engine = new SiftEngine();
const result = engine.evaluate(expr, {
  tool: { name: 'send-email', risk: 'R5', obo: 'email' }
});

console.log(result.matched);   // true
console.log(result.bindings);  // { tool: { name: 'send-email', ... } }
```

No claws compiler. No claws.json. Pure library usage. Any OC developer can use typed policy expressions in their skill today.

## Tier 3: @craftworks/* (internal only)

The full SDKs that power the claws compiler. These are never referenced in generated output:

- **compiler-sdk**: sift engine (Spec 139), parser (Spec 115), FormaIR (Spec 109), pinch IR, cache, diagnostics
- **agent-sdk**: GovernanceManager, CGR chain, delegation guard, eval framework, discovery
- **craftworks-sdk**: Not imported by claws-sdk at all (sibling architecture)

The claws-sdk sits as a sibling to craftworks-sdk, both built on compiler-sdk + agent-sdk. claws-sdk never imports from craftworks-sdk. This is a structural rule, not a guideline.

## The OC developer test

**Invariant: No `@craftworks/*` imports in generated output.** Generated code (SKILL.md, plugin TypeScript, exec-approvals.json) references only `@claws/*` (Tier 2) and `@openclaw/*` (Tier 1) packages. Tier 3 packages (`@craftworks/*`) are compiler infrastructure and never appear in output. This is dependency rule #4 from CL-04.

Every line of generated code must look like something an OC developer would write themselves. This is the boundary test:

| In generated code? | Import | Verdict |
|---------------------|--------|---------|
| Yes | `@openclaw/audit-chain` | Correct -- OC-native package |
| Yes | `@claws/sift` | Correct -- standalone library |
| **No** | `@craftworks/compiler-sdk` | **Violation** -- internal infrastructure leaked |
| **No** | `@craftworks/agent-sdk` | **Violation** -- internal infrastructure leaked |

If a developer reads the generated `plugins/claws-governance/index.ts` and sees `import { WorkAgentSupervisor } from '@craftworks/agent-sdk'`, the design has failed. The generated code references `@claws/*` and `@openclaw/*` packages that the developer can inspect, understand, and replace.

## Why three tiers

The tier model serves the adoption funnel without lock-in: free libraries ("these make my skills better") -> compiler ("I want compiled governance") -> fleet ("I want org-wide consistency") -> enterprise ("I want managed governance + support"). At every stage, the developer has standalone value. There is no cliff where free stops and paid begins.

Generated skill packages use `@claws/*` as peer dependencies for deduplication -- multiple governance skills share one copy of each library.

## For the gateway-eng

The packages that run in your process (`@claws/runtime`, `@openclaw/audit-chain`, `@openclaw/budget-meter`) are small, focused, and have zero transitive dependencies on compiler infrastructure. The runtime footprint is ~40KB of OC-native code, not hundreds of KB of compiler SDK.

## For the founder

The @openclaw/* packages are MIT-licensed, maintained, and genuinely useful without claws. They are contributions to the ecosystem, not trojan horses. If claws the company disappeared tomorrow, `@openclaw/audit-chain` would still work. That is the test for community trust: value that survives the vendor.
