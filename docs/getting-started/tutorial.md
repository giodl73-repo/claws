# Getting Started with claws

This tutorial walks through the full claws workflow: initializing a skill,
building it, checking governance, and testing it with @bic/claws-test.

## Prerequisites

- Node.js 20+
- claws CLI installed (`npm install -g @claws/cli`)
- A workspace directory for your skill

## Step 1: Initialize a Skill

Create a new skill with `claws init`:

```bash
mkdir my-skill && cd my-skill
claws init --name file-reader --risk R2
```

This generates:

- `SKILL.md` with governance annotations (risk level, fail mode, audit)
- `handler.ts` with a skeleton handler function
- `tsconfig.json` for TypeScript compilation

The SKILL.md is the source of truth. claws reads it; you own it.

## Step 2: Define Governance

Open `SKILL.md` and configure the Governance section:

```yaml
riskLevel: R2
failMode: closed
audit: true
inputValidation: true
outputGuards: true
supplyChainSignature: true
dataLabels:
  - internal
oboBoundaries: []
elicitationGate: false
reasoningLimits:
  tokenBudget: 10000
  maxRecursionDepth: 3
```

Three tiers of governance:

- **Tier 1** (3 YAML lines): riskLevel, failMode, audit. Two minutes. Most skills stop here.
- **Tier 2** (full YAML): adds inputValidation, outputGuards, supplyChainSignature, dataLabels, elicitationGate, reasoningLimits.
- **Tier 3** (verified): all Tier 2 fields plus `claws test` passing with @bic/claws-test matchers.

## Step 3: Build

Compile the workspace to produce the GovernanceIR:

```bash
claws build
```

The build phase:

1. Parses `SKILL.md` to extract governance annotations
2. Discovers tools, agents, and scenarios
3. Produces the GovernanceIR (capability manifest + analysis)
4. Emits enforcement hooks as executable TypeScript

If the build succeeds, your skill has well-formed governance.

## Step 4: Check Governance

Run the governance checker to validate enforcement:

```bash
claws check
```

This runs all 12 governance checks against the GovernanceIR:

1. Risk-level consistency
2. OBO boundary declarations
3. Data label coverage
4. Fail-mode enforcement
5. Capability restrictions
6. Elicitation gates for R5 tools
7. A2A trust boundaries
8. Input validation
9. Output guards
10. Bounded reasoning limits
11. Audit completeness
12. Supply chain signatures

Each failing check reports severity, target, and a remediation hint.

## Step 5: Test with @bic/claws-test

Install the test framework:

```bash
npm install --save-dev @bic/claws-test vitest
```

Write a governance test:

```typescript
// tests/governance.test.ts
import { describe, it, expect, beforeAll } from "vitest";
import { registerMatchers } from "@bic/claws-test/matchers";
import type { GovernanceCheckInput } from "@bic/claws-test";

beforeAll(() => {
  registerMatchers();
});

describe("file-reader governance", () => {
  const skill: GovernanceCheckInput = {
    tools: [{ name: "file-read", riskLevel: "R2", oboFlag: false, classification: "filesystem" }],
    agents: [{ name: "assistant", delegatesTo: [], hasTrustBoundary: true }],
    declaredRiskLevel: "R2",
    failMode: "closed",
    hasInputValidation: true,
    hasOutputGuards: true,
    hasAuditTrail: true,
    hasSupplyChainSignature: true,
    reasoningLimits: { tokenBudget: 10000, maxRecursionDepth: 3 },
  };

  it("passes all 12 governance checks", () => {
    expect(skill).toPassGovernance();
  });

  it("declares correct risk level", () => {
    expect(skill).toHaveRiskLevel("R2");
  });
});
```

Write a security scan test:

```typescript
// tests/security.test.ts
import { describe, it, expect, beforeAll } from "vitest";
import { readFileSync } from "node:fs";
import { registerMatchers } from "@bic/claws-test/matchers";
import type { ScanInput } from "@bic/claws-test";

beforeAll(() => {
  registerMatchers();
});

describe("file-reader security", () => {
  it("handler has zero security findings", () => {
    const content = readFileSync("handler.ts", "utf-8");
    const scanInput: ScanInput = {
      sources: [{ filePath: "handler.ts", content }],
    };
    expect(scanInput).toPassSecurityScan();
  });
});
```

Run the tests:

```bash
npx vitest run
```

## Step 6: Iterate

When tests fail, the matcher messages tell you exactly what to fix:

- `toPassGovernance()` lists which of the 12 checks failed, with severity and remediation
- `toPassSecurityScan()` lists each finding with rule, file, line, and fix
- `toHaveRiskLevel()` shows expected vs actual risk level
- `toRequireElicitation()` names the R5 tools missing elicitation gates

Fix the issue in SKILL.md or handler.ts, re-run `claws build`, re-run tests.

## Package Boundaries

@bic/claws-test is standalone. It depends on @claws/sdk for types and has no
dependency on the claws compiler, claws CLI, compiler-sdk, or craftworks-sdk.
You can run governance validation and security scanning without installing the
compiler. The matchers extend vitest's `expect()` using the standard
`expect.extend()` API.

## Next Steps

- [GovernanceIR reference](governance-ir.md) -- the intermediate representation
- [Security rules reference](rules-reference.md) -- all 16 scanner rules
- [ClawHub publishing](../../concepts/clawhub-publishing.md) -- publish your skill
