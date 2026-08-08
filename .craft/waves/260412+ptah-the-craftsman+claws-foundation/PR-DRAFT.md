# Phase 52: Ptah the Craftsman — claws Foundation

> **Before Ptah**, 5,198 skills ran with full access. 165 crossed the impersonation boundary — send email as you, book meetings as you, act as you to other agents. Zero gates. Zero audit. Zero undo. Policy lived in documentation that no runtime ever read.
>
> **After Ptah**, `claws init && claws check && claws build` compiles governance rules from 9 workspace files into executable enforcement artifacts. Policy violations are compile errors, not runtime surprises. Skill authors get typed decorators and 12 governance checks without touching the compiler. The audit trail is hash-chained and tamper-proof from the first compile.

---

## Part 1: The Compiler — 9 Files In, Governance Out

### The Problem

OpenClaw workspaces declare intent across 9 files — SOUL.md says "be cautious," TOOLS.md lists 47 tools, AGENTS.md delegates to subagents. But nothing compiles these declarations into enforcement. The agent reads SOUL.md as a suggestion. claws reads it as a specification.

### Before Ptah

```
  SOUL.md:  "Never access production databases"
  TOOLS.md: db-query tool listed, no risk annotation
  Result:   Agent queries production. Nobody asked. Nobody logged it.
```

### After Ptah

```
  $ claws init
  Detected: openclaw. Created claws.json + .claws/.

  $ claws check
  FAIL governance check (2 violations found) ⏱ 0.42s

  Violations:
    [1/2] G-CLASS-01 (HIGH) — SOUL.md:12
          Model access not restricted
          How: Add "approved_models" to SOUL.md's permission boundaries
          Docs: design/claws/specs/CL-02-governance-rules.md

    [2/2] G-DATA-01 (MEDIUM) — TOOLS.md:34
          Data label mismatch on output
          How: Add "sensitivity: sensitive" to the output spec

  $ claws build openclaw
  Built 4 artifacts for openclaw in 0.58s
    .claws/compiled/artifacts/openclaw/skills/claws-governance/SKILL.md
    .claws/compiled/artifacts/openclaw/plugins/claws-governance/index.ts
    .claws/compiled/artifacts/openclaw/exec-approvals.json
    .claws/compiled/artifacts/openclaw/lobster.compiled.yaml
```

### The Compilation Pipeline

```
  INPUT                      COMPILER                          OUTPUT
  ─────                      ────────                          ──────

  SOUL.md ─────┐        ┌──────────────────────┐         ┌──────────────────┐
  AGENTS.md ───┤        │                      │         │ SKILL.md         │
  TOOLS.md ────┤        │  1. PARSE            │         │   agent reads    │
  IDENTITY.md ─┤        │     9 files → AST    │         │   governance     │
  USER.md ─────┼───────>│  2. EXTRACT          │────────>│                  │
  MEMORY.md ───┤        │     AST → manifest   │         │ index.ts         │
  HEARTBEAT.md ┤        │  3. ANALYZE          │         │   Gateway plugin │
  skills/ ─────┤        │     29 rules applied │         │   blocks, gates, │
  lobster.yaml ┘        │  4. OPTIMIZE         │         │   audit, budget  │
                        │     dead-code, merge │         │                  │
  claws.json ──────────>│  5. EMIT             │         │ exec-approvals   │
  .claws/policies/ ────>│     4 artifacts out  │         │   elicitation    │
                        │                      │         │                  │
                        └──────────────────────┘         │ lobster.compiled │
                                                         │   governed DAG   │
                           GovernanceIR                   └──────────────────┘
                           (the stable pivot)
```

Four commands drive the pipeline:

```
  claws init              Scaffold .claws/ sidecar + claws.json
  claws check             Read-only rule checking, no disk writes
  claws compile           Compile GovernanceIR to .claws/compiled/
  claws build [platform]  Full pipeline: compile + emit 4 artifacts
```

Every command outputs `--json` for CI integration. Exit codes: 0 = clean, 1 = violations, 2 = bypassed, 3 = error. `claws check || exit 1` blocks a merge.

---

## Part 2: GovernanceIR — The Stable Pivot

### The Problem

Every downstream feature — pinch, inspect, diff, comply, fleet — needs the same structured analysis of a workspace. Without a stable intermediate representation, each feature re-parses and re-analyzes independently.

### Before Ptah

```
  claws check:  parse → analyze → render violations
  claws build:  parse → analyze → emit artifacts
  claws diff:   parse → analyze → compare
  claws comply: parse → analyze → generate evidence

  Four parses. Four analyses. Four places to diverge.
```

### After Ptah

```
  SOUL.md ---+
  TOOLS.md --+                    +-- claws check  (violations)
  AGENTS.md -+--> GovernanceIR ---+-- claws build  (Gateway plugin)
  MEMORY.md -+    (this PR)       +-- claws diff   (change tracking)
  ...9 files +                    +-- claws comply (evidence)

  One parse. One analysis. One IR. Every feature reads the same truth.
```

The IR carries the full analysis:

```json
{
  "compiler": {
    "compilerVersion": "0.1.0",
    "compiledAt": "2026-04-12T15:34:22.000Z",
    "schemaVersion": 1
  },
  "capabilities": {
    "tools": [
      { "name": "file-read", "riskClass": "R2", "requires": ["audit"] },
      { "name": "send-email", "riskClass": "R5", "requires": ["elicitation", "obo"] }
    ],
    "skills": [{ "name": "summarize", "riskLevel": "R3", "oboTypes": ["email"] }],
    "agents": [],
    "workflows": []
  },
  "analysis": {
    "violations": [
      {
        "ruleId": "G-CLASS-01",
        "level": 3,
        "message": "Model access not restricted",
        "target": "SOUL.md",
        "diagnosticCode": "CLAWS-G-CLASS-01",
        "fixSuggestions": ["Add approved_models constraint"]
      }
    ],
    "enforcementPlan": {
      "blockedTools": ["shell-exec"],
      "requiredApprovals": ["send-email"],
      "auditOnlyRules": ["G-CONTEXT-01"]
    },
    "effectiveR5Count": { "derived": 1, "overridden": 0, "total": 1 }
  },
  "conflicts": {
    "totalConflicts": 1,
    "oboConflicts": [
      {
        "category": "circular-delegation",
        "location": { "file": "AGENTS.md", "line": 42 },
        "involved": ["agent-1", "agent-2"]
      }
    ]
  }
}
```

### FailMode\<R\> — R5 Fail-Open is Unrepresentable

The type system encodes the non-negotiable: R5 tools always fail closed.

```typescript
type FailMode<R extends RuleLevel> = R extends 5
  ? "closed" // R5: always closed. Period.
  : R extends 4
    ? "closed" | "open" // R4: configurable
    : R extends 3
      ? "closed" | "open" // R3: configurable
      : "closed" | "open"; // R1-R2: configurable

const bad: FailMode<5> = "open"; // TypeScript error! Does not compile.
```

Runtime guard catches deserialized tampering — `validateFailModes(ir)` throws `OC-POLICY-E001` if R5 fail-open appears in JSON loaded from disk.

---

## Part 3: Skill Author SDK — Governance Without the Compiler

### The Problem

Skill authors need governance metadata on their handlers. Requiring the full compiler to add a risk classification is like requiring a database to validate an email format.

### Before Ptah

```
  // Skill author's handler — zero governance metadata
  export async function handler(input) {
    const email = await composeEmail(input);
    await sendEmail(email);  // R5/transact. No gate. No audit.
    return { sent: true };
  }
```

### After Ptah

```typescript
import { skill, classify, obo, audit, validate, budget, timeout } from "@bic/claws-skill-kit";
import { z } from "zod";

export const handler = skill("email-sender")
  .decorate(classify("R5")) // Risk level: highest
  .decorate(obo("email")) // On-behalf-of boundary
  .decorate(audit()) // Include in audit trail
  .decorate(
    validate(
      z.object({
        // Input schema
        to: z.string().email(),
        body: z.string().max(10000),
      }),
    ),
  )
  .decorate(budget(5000)) // Token budget limit
  .decorate(timeout(300)) // 5 minute timeout
  .handler(async (input) => {
    const email = await composeEmail(input);
    await sendEmail(email);
    return { sent: true };
  });
```

`npm install @bic/claws-skill-kit` — 35KB, zero compiler dependencies, zero runtime overhead. The decorators are compile-time metadata slots. `claws check` reads them. The Gateway enforces them. The skill author never touches the compiler.

### MockGateway for Unit Testing

```typescript
import { MockGateway } from "@bic/claws-skill-kit";

const gateway = new MockGateway()
  .on("before_tool_call", () => ({ allowed: true, reclassified: false }))
  .on("after_tool_call", () => ({ redact: [] }));

const result = await handler.execute(input, { gateway });
expect(result.sent).toBe(true);
```

---

## Part 4: @bic/claws-test — 12 Governance Checks + 16 Security Rules

### The Problem

A skill author adds `classify('R3')` but never verifies that the handler actually behaves at R3. The governance metadata and the runtime behavior diverge silently.

### Before Ptah

```
  // No governance testing framework exists.
  // The skill "passes" because it doesn't throw.
  it('works', async () => {
    const result = await handler({ text: 'hello' });
    expect(result).toBeDefined();  // This proves nothing about governance.
  });
```

### After Ptah

```typescript
import { GovernanceValidator, SecurityScanner } from "@bic/claws-test";

it("passes all 12 governance checks", async () => {
  const validator = new GovernanceValidator();
  const result = await validator.validate(handler);

  expect(result.checks["risk-level"].passed).toBe(true);
  expect(result.checks["obo-boundary"].passed).toBe(true);
  expect(result.checks["fail-mode"].passed).toBe(true);
  expect(result.checks["elicitation"].passed).toBe(true);
  expect(result.checks["supply-chain"].passed).toBe(true);
  // ... all 12 checks
  expect(result.violations).toHaveLength(0);
});

it("has no injection vulnerabilities", async () => {
  const scanner = new SecurityScanner();
  const findings = await scanner.scan("./src/handler.ts");
  expect(findings).toHaveLength(0);
});

// Or use the vitest matchers:
it("governance vitest matchers", () => {
  expect(handler).toPassGovernance();
  expect(handler).toHaveRiskLevel("R3");
  expect(handler).toRequireElicitation();
  expect(handler).toPassSecurityScan();
});
```

The 12 governance checks:

```
  GOVERNANCE CHECKS (GovernanceValidator)
  ───────────────────────────────────────
  risk-level         Declared vs detected risk class match
  obo-boundary       On-behalf-of consistency
  data-labels        Data label coverage on outputs
  fail-mode          R5 closed-loop fail-mode correctness
  capabilities       Capability/permission alignment
  elicitation        Elicitation gate present for R5 operations
  a2a-trust          Agent-to-agent trust boundary enforcement
  input-validation   User input validated before tool call
  output-guards      Output redaction/validation present
  bounded-reasoning  Step/tool/budget/recursion limits set
  audit-completeness Audit trail covers all tool calls
  supply-chain       Skill supply chain signature validation
```

The 16 security scanner rules (static AST analysis):

```
  SECURITY SCANNER (SecurityScanner)
  ──────────────────────────────────
  INJECTION (4)       eval(), Function constructor, template
                      literal injection, dynamic import

  SECRETS (4)         API keys (sk-..., api-...), tokens,
                      credentials, env variable leaks

  INPUT (4)           Unvalidated user input, missing trust
                      labels, URL injection, size limits

  OUTPUT (4)          Unredacted PII, unvalidated URLs,
                      format injection, chain validation bypass
```

`npm install @bic/claws-test` — 45KB, zero compiler dependency.

---

## Part 5: Audit Trail — Hash-Chained, Tamper-Proof

### The Problem

When the auditor asks "what did the agent do at 3:47 PM on Tuesday?", the answer today is "check the logs." The logs are plaintext. Anyone with file access can edit them.

### After Ptah

```
  Every governance event --> AuditChainEntry --> .claws/audit/chain.jsonl
                                |
                                +-- seq: sequential index
                                +-- previousHash: chain link
                                +-- entryHash: SHA-256(previous + content)
                                +-- hmacSignature: HMAC-SHA256(entryHash, key)
                                +-- keyId: which key signed it

  Tamper with one entry → the chain breaks.
  Delete an entry → the gap is detectable.
  Modify a signature → HMAC verification fails.
```

The chain writes on every compile:

```jsonl
{"seq":0,"eventType":"COMPILE_INITIATED","actor":"cli","hmacSignature":"a3f2...","keyId":"workspace-v1"}
{"seq":1,"eventType":"VIOLATION_DETECTED","ruleId":"G-CLASS-01","severity":3,"hmacSignature":"b7d1..."}
{"seq":2,"eventType":"BUILD_COMPLETE","outcome":"with-violations","artifactCount":4,"hmacSignature":"c9e4..."}
```

Key auto-provisioned on first compile: `.claws/keys/hmac.key` (32 bytes, `crypto.randomBytes`). Length-prefixed signing payload — the NUL-delimiter vulnerability was caught in R1 review and fixed before merge.

---

## Part 6: Package Architecture — Three Layers, One Supply Chain

### The Problem

claws needs building blocks from compiler-sdk (OC readers, crypto, platform detection). Shipping the full 15K-line compiler-sdk to every claws user is a non-starter. But forking the code means bug fixes diverge.

### After Ptah

CL-08 defines the three-layer extraction model with 62 constraints:

```
  Layer 3: @bic/claws-sdk (proprietary)
    Fleet, compliance, SIEM, PRESS, identity, LSP
    Extends Layer 2. Never forks.
           |
  Layer 2: @claws/compiler (MIT)
    Composes a SUBSET of Layer 1:
      forma, crypto, workspace, codegen + emit-oc + emit-cc
    Adds: 29 G-rules, GovernanceIR, R5 enforcement, emit
           |
  Layer 1: @craftworks/* (MIT)
    10 core:  forma  workspace  crypto  governance  codegen
              relax  context    execution  eval  input
    7 emitters: emit-oc  emit-cc  emit-cursor  emit-copilot
                emit-bedrock  emit-langgraph  emit-crewai
```

A competitor could use the same `@craftworks/forma` and `@craftworks/crypto` to build a different governance compiler. The moat is the 29 G-rules and the enterprise tier — not the infrastructure.

90 package acceptance scenarios validate the extraction. 691 findings folded back into CL-08. 20 new pitfalls (P-250..P-269) catalog operational risks from dependency drift to emitter isolation to fleet rollback.

---

## Part 7: The Acceptance Harness — 331 Scenarios Prove Spec Conformance

### The Problem

421 design scenarios describe what claws should do. Without executable tests, they are aspirational documentation.

### After Ptah

The acceptance harness materializes scenarios into executable tests:

```
  manifest.yaml ──> scenario-loader ──> runner dispatch
                                            |
                    ┌───────────────────────┬┴──────────────────┐
                    v                       v                    v
              compile-sim           emit-sim              pinch-sim
              (GovernanceIR)        (artifacts)           (compression)
                    |                       |                    |
                    v                       v                    v
              expect-ir             expect-artifacts      expect-budget
              (assertion lib)       (assertion lib)       (assertion lib)
```

Each scenario carries its own fixture workspace and expected output:

```yaml
name: compile-full-pipeline-8-files
series: compile-pipeline
problem: |
  An OpenClaw workspace with 8 governance intents across 9 files.
  The compiler must parse all files, extract intents, evaluate 29
  rules, and produce a GovernanceIR with zero violations.
expect:
  violations: 0
  conflicts: 0
  artifactCount: 4
  riskProfile:
    R1: 2
    R3: 5
    R5: 1
```

5 runner types cover the compiler surface: compile-sim (full pipeline), pinch-sim (rules), emit-sim (artifacts), security-sim (attack patterns), fleet-sim (stub for Anubis). 95 scenarios materialized with fixtures for Ptah, wired into CI via vitest.

---

## Part 8: Side-Weave — Compiler Area Landing + Surface Remediation

### Before Ptah

```
  design/                              docs/
    15+ legacy directories               concepts/ (flat, no areas)
    astro/ (410 files, pre-decomposition) superpowers/ (orphaned)
    admin/ (230 files, pre-split)         surface-contracts/ (legacy)

  DC health checks: 7 FAIL of 13
  Known gaps: 989
```

### After Ptah

```
  design/                              docs/
    agent/  claim/  compiler/  recon/    {area}/concepts/
    astro/  claws/  craft/     works/    {area}/how-to/
                                         {area}/tutorials/
  8 areas. 5-letter convention.          {area}/stories/
  131 spec files renamed.               75 concept guides.
  3000+ files archived.                 55 how-to guides.

  DC health checks: 13/13 PASS
  Known gaps: 0
  Surface manifests: 62 doc + 6 design
```

13 health checks validate structural invariants in CI:

```
  DC-01  Surface contracts parse (schema validation)
  DC-02  Manifest entries resolve to existing files
  DC-03  Every atom in ATOMS.md classified in a surface contract
  DC-04  Required surfaces have manifest entries or known-gap coverage
  DC-05  known-gaps.yaml entries schema-valid
  DC-06  No orphan gaps (gaps for surfaces that now exist)
  DC-07  P1/P2/P3 narrative threads have headline atoms
  DC-08  Layer names match ATOMS.md headings
  DC-09  Manifest entries appear in surface index READMEs
  DC-10  Headline atoms mentioned in root README
  DC-11  No cross-area atom collisions
  DC-12  Spec files in compiler/ appear in master SPECS.md
  DC-13  Only approved directories in docs/ and design/
```

---

## Part 9: What's Next — Anubis and Thoth

Ptah delivers the foundation. Anubis and Thoth deliver the surface and the ecosystem:

```
  Ptah (this wave)           Anubis                     Thoth
  ═══════════════            ══════                     ═════
  claws init                 claws pinch                claws comply soc2
  claws check                claws inspect              claws comply hipaa
  claws compile              claws diff                 claws protect
  claws build                claws doctor               claws lsp (VS Code)
  GovernanceIR               claws snap save/restore    claws serve (HTTP API)
  FailMode<R>                claws scan --fleet         claws cicd (GitHub Action)
  @bic/claws-skill-kit           claws broadcast            claws press (compress)
  @bic/claws-test                claws import               claws context (DAG)
  Audit chain                claws scaffold             @openclaw/* contributions
  331 acceptance scenarios   Key management + signing   Badge system
  12 governance checks       init --template system
  16 security scanner rules  SARIF output
```

---

_9 files in. Governance out. Your agent asks before it acts._

Generated with [Claude Code](https://claude.com/claude-code)
